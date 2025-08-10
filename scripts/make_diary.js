const core = require("@actions/core");
const fs = require('fs');
const path = require('path'); // pathモジュールを追加
const Mastodon = require('mastodon-api'); // 例としてmastodon-apiライブラリを使用
const kuromoji = require('kuromoji');
const OpenAI = require('openai');

const instanceUrl = process.env.MASTODON_INSTANCE_URL;
const accessToken = process.env.MASTODON_ACCESS_TOKEN;
const shirokumaEngineUser = process.env.SHIROKUMA_ENGINE_USER;
const shirokumaEnginePassword = process.env.SHIROKUMA_ENGINE_PASSWORD;
const openaiApikey = process.env.OPENAI_APIKEY;

const CONFIG = {
    shirokuma_bot: {
        accountId: '898916',
        bearId: '1',
        bearDirname: 'shirokuma_bot',
        diaryPostfix: '\n\n...ってかんじの日だったワン',
        imagePromptPrefix: '絵日記用に、下記の日記から特徴的な場面を子供がクレヨンで描いたような絵にしてください。ただし日記の著者の姿と犬は絶対に描かないこと。',
    },
    shirokumadadbot: {
        accountId: '899678',
        bearId: '2',
        bearDirname: 'shirokumadadbot',
        diaryPostfix: '\n\n...ってかんじの日でしたなワン',
        imagePromptPrefix: '絵日記用に、下記の日記から特徴的な場面を"素人の趣味の油絵"といった雰囲気の絵にしてください。ただし日記の著者の姿と犬は絶対に描かないこと。',
    },
    ochisou_bot: {
        accountId: '109289980042219018',
        bearId: '6',
        bearDirname: 'ochisou_bot',
        diaryPostfix: '\n\n...つまるところ〜ワン',
        imagePromptPrefix: '絵日記用に、下記の日記から特徴的な場面を幼児が色鉛筆でぐりぐりっと書いたような画風の絵にしてください。ただし日記の著者の姿も含め人間と犬は絶対に描かないこと。できるだけ文字も書かないこと。',
    },
};
const config = CONFIG[process.env.BEAR_NAME];

// タイムゾーンをJSTに固定して日付を取得する
// new Date()が実行環境のタイムゾーンに依存するため、toLocaleStringでJSTの現在時刻文字列を生成し、それを再度Dateオブジェクトに変換する
// ロケールにen-USを指定しているのは、new Date()が日付文字列を安定して解釈できる形式(MM/DD/YYYY, hh:mm:ss AM/PM)にするため
const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, '0');
const day = String(today.getDate()).padStart(2, '0');
const dayOfWeek = new Intl.DateTimeFormat('ja-JP', { weekday: 'short' }).format(today);
const shortDayOfWeek = dayOfWeek.replace('曜日', ''); // '月曜日' -> '月'
const TODAY = `${year}/${month}/${day}(${shortDayOfWeek})`;

// マルコフ連鎖の実装========================================
class Markov {
    constructor(n) {
        this.data = {};
    }
    add(words) {
        for(var i = 0; i <= words.length; i++) {
            var now = words[i];
            if(now === undefined) { now = null };
            var prev = words[i - 1];
            if(prev === undefined) { prev = null };
            if(this.data[prev] === undefined) {
                this.data[prev] = [];
            }
            this.data[prev].push(now);
        }
    }
    sample(word) {
        var words = this.data[word];
        if(words === undefined) { words = []; }
        return words[Math.floor(Math.random() * words.length)];
    }
    make() {
        var sentence = [];
        var word = this.sample(null);
        while(word) {
            sentence.push(word);
            word = this.sample(word);
        }
        return sentence.join('');
    }
}
// /マルコフ連鎖の実装========================================

(async () => {

    const M = new Mastodon({
        access_token: accessToken,
        api_url: `https://${instanceUrl}/api/v1/`
    });

    const mastodonResponse = await new Promise((resolve, reject) => {
        M.get(`accounts/${config.accountId}/statuses`, {limit: 40})
            .then(response => resolve(response))
            .catch(error => {
                console.error('Error downloading timeline:', err);
                // エラーの詳細を出力
                if (err.response) {
                    console.error('Mastodon API Error Status:', err.response.status);
                    console.error('Mastodon API Error Data:', err.response.data);
                }
                process.exit(1);
                reject(error)
            });
    });

    const nowDate = new Date();
    const oneDayAgo = new Date(nowDate.getTime() - (24 * 60 * 60 * 1000)); // 24時間前

    const contents = mastodonResponse.data
        .filter(status => {
            const createdAt = new Date(status.created_at);
            return createdAt >= oneDayAgo;
        })
        .map(status => {
            if (status == null || status.content == null) {
                return '';
            }
            return status.content
                .replace(/<.+?>/g, '')
                .replace(/@[a-zA-Z0-9_\-]+\s/g, '')
                .replace(/http.*$/g, '')
        });
    const contentsText = contents.join('\n');

    const engineLoginResponse = await fetch(`http://api.6zr.info/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({
            username: shirokumaEngineUser,
            password: shirokumaEnginePassword,
        }),
    });
    const cookie = engineLoginResponse.headers.get('set-cookie');

    const res = await fetch(`http://api.6zr.info/manage/bear/${config.bearId}/keyword_used_at/today`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Cookie': cookie,
        }
    });
    const usedKeywords = await res.json();


    const markov = new Markov();
    const builder = kuromoji.builder({
        dicPath: 'node_modules/kuromoji/dict'
    });

    const tokenizer = await new Promise((resolve, reject) => {
        builder.build(function(err, builtTokenizer) {
            if (err) {
                console.error('Failed to build tokenizer:', err);
                process.exit(1);
                return reject(err);
            }
            resolve(builtTokenizer);
        });
    });

    const markovText = (() => {
        try {
            const lines = contentsText.split("\n"); // 一行ごとに分割
            lines.forEach(function(line) {
                const tokens = tokenizer.tokenize(line);
                const words = tokens.map(function(token) {
                    return token.surface_form;
                });
                markov.add(words);
            });

            // 10回くらい生成してみる
            const sentences = [];
            for(var n = 0; n < 10; n++) {
                const sentence = markov.make();
                const point = sentence.length < 15 ? '、' : '。';
                sentences.push(`${sentence}${point}`);
            }
            return sentences.join('');
        } catch (error) {
            console.error('Error processing timeline data with Kuromoji:', error);
            process.exit(1);
            return '';
        }
    })();

    const dataOutputDir = `./output/${config.bearDirname}/data`;
    if (!fs.existsSync(dataOutputDir)) {
        fs.mkdirSync(dataOutputDir, { recursive: true });
        console.log(`Directory created: ${dataOutputDir}`);
    }

    const contentsFilename = `contents.txt`;
    const contentsOutputPath = path.join(dataOutputDir, contentsFilename);
    fs.writeFileSync(contentsOutputPath, contentsText);
    console.log(`data saved to ${contentsOutputPath}`);

    const diaryOutputDir = `./output/${config.bearDirname}/diary`;
    if (!fs.existsSync(diaryOutputDir)) {
        fs.mkdirSync(diaryOutputDir, { recursive: true });
        console.log(`Directory created: ${diaryOutputDir}`);
    }

    const dateString = `${year}-${month}-${day}`;
    const diaryFilename = `${dateString}.html`; // .md から .html に変更
    const diaryOutputPath = path.join(diaryOutputDir, diaryFilename);

    const diary = `${markovText}${config.diaryPostfix}`;
    console.log(diary);

    const keywords = (usedKeywords || [])
        .map(x => ({
            keyword: x.keyword.name, 
            category: x.keyword.keywordCategory.code,
        }))
        .filter(x => !x.keyword.includes('{'))
        .map(x => `${x.category} => ${x.keyword}`)
        .join('\n');
    ;
    console.log(keywords);

    const client = new OpenAI({ apiKey: openaiApikey });
    const imageCompletion = await client.images.generate({
        'model':'gpt-image-1',
        'prompt': `${config.imagePromptPrefix}\n\"""\n${markovText}\n\"""`,
        size: '1024x1024',
        quality: 'low',
    });

    let htmlOutput = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${TODAY} - ${config.bearDirname}の日記</title>
    <style>
        body { font-family: 'Noto Sans JP', sans-serif; padding: 2em; line-height: 1.6; color: #333; background-color: #fdfdfd; max-width: 800px; margin: 0 auto; }
        h1 { text-align: center; color: #555; margin-bottom: 1em; }
        .diary-content { background-color: #fff; border-radius: 8px; padding: 2em; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
        .diary-date { text-align: right; color: #777; font-size: 0.9em; margin-bottom: 1em; }
        .diary-text { white-space: pre-wrap; margin-bottom: 1.5em; }
        .diary-image { text-align: center; margin-top: 1.5em; }
        .diary-image img { max-width: 100%; height: auto; border-radius: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .back-link { display: block; text-align: center; margin-top: 2em; font-size: 1.1em; }
        .back-link a { text-decoration: none; color: #007bff; padding: 0.5em 1em; border: 1px solid #007bff; border-radius: 5px; }
        .back-link a:hover { background-color: #007bff; color: #fff; }
    </style>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap" rel="stylesheet">
</head>
<body>
    <h1>${config.bearDirname}の日記</h1>
    <div class="diary-content">
        <div class="diary-date">${TODAY}</div>
        <div class="diary-text">${diary}</div>
`;

    if (imageCompletion.data != null && imageCompletion.data.length > 0) {
        const imageFilename = `${dateString}.png`;
        const imageOutputPath = path.join(diaryOutputDir, imageFilename);
        fs.writeFileSync(imageOutputPath, imageCompletion.data[0]['b64_json'], { encoding: "base64" });
        htmlOutput += `
        <div class="diary-image">
            <img width="360px" src="${imageFilename}">
        </div>
`;
    }

    htmlOutput += `
    </div>
    <div class="back-link">
        <a href="../../index.html">トップページに戻る</a>
    </div>
</body>
</html>
`;

    fs.writeFileSync(diaryOutputPath, htmlOutput);
})();
