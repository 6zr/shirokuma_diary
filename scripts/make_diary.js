const core = require("@actions/core");
const fs = require('fs');
const path = require('path'); // pathモジュールを追加
const Mastodon = require('mastodon-api'); // 例としてmastodon-apiライブラリを使用
const kuromoji = require('kuromoji');
const OpenAI = require('openai');

const instanceUrl = process.env.MASTODON_INSTANCE_URL;
const accessToken = process.env.MASTODON_ACCESS_TOKEN;
const accountId = process.env.MASTODON_ACCOUNT_ID;
const shirokumaEngineUser = process.env.SHIROKUMA_ENGINE_USER;
const shirokumaEnginePassword = process.env.SHIROKUMA_ENGINE_PASSWORD;
const bearId = process.env.BEAR_ID;
const bearDirname = process.env.BEAR_DIRNAME;
const openaiApikey = process.env.OPENAI_APIKEY;

const today = new Date();
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


if (!instanceUrl || !accessToken || !accountId) {
    console.error('Mastodon instance URL or access token not found in environment variables.');
    process.exit(1);
}


(async () => {

    const M = new Mastodon({
        access_token: accessToken,
        api_url: `https://${instanceUrl}/api/v1/`
    });

    const mastodonResponse = await new Promise((resolve, reject) => {
        M.get(`accounts/${accountId}/statuses`, {limit: 40})
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

    const contents = mastodonResponse.data.map(t => {
        if (t == null || t.content == null) {
            return '';
        }
        return t.content
            .replace(/<.+?>/g, '')
            .replace(/@[a-zA-Z0-9_\-]+? /g, '')
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

    const res = await fetch(`http://api.6zr.info/manage/bear/${bearId}/keyword_used_at/today`, {
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

    const dataOutputDir = `./output/${bearDirname}/data`;
    if (!fs.existsSync(dataOutputDir)) {
        fs.mkdirSync(dataOutputDir, { recursive: true });
        console.log(`Directory created: ${dataOutputDir}`);
    }

    const contentsFilename = `contents.txt`;
    const contentsOutputPath = path.join(dataOutputDir, contentsFilename);
    fs.writeFileSync(contentsOutputPath, contentsText);
    console.log(`data saved to ${contentsOutputPath}`);

    const diaryOutputDir = `./output/${bearDirname}/diary`;
    if (!fs.existsSync(diaryOutputDir)) {
        fs.mkdirSync(diaryOutputDir, { recursive: true });
        console.log(`Directory created: ${diaryOutputDir}`);
    }

    const diaryFilename = 'index.md';
    const diaryOutputPath = path.join(diaryOutputDir, diaryFilename);

    const diary = `[${TODAY}]\n\n${markovText}\n\n...ってかんじの日だったワン`;
    console.log(diary);
    fs.writeFileSync(diaryOutputPath, diary);

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
    const MODEL = "gpt-4.1-mini";
    const imageCompletion = await client.chat.completions.create({
        'model': MODEL,
        'max_tokens' : 1024,
        'temperature' : 0.9,
        'messages': [{
            'role': 'developer',
            'content': '絵日記に使う縦横256pxの画像を生成してbase64文字列で返してください。画風は子供の手描きのようなデフォルメ・水彩で、日記の著者も含め人物は描かないこと。',
        }, {
            'role': 'user',
            'content': `下記が日記です。特徴的な一場面を選んで画像にしてください。"""\n${markovText}\n"""`,
        }],
    });
    if (imageCompletion.choices != null && imageCompletion.choices.length > 0) {
        fs.writeFileSync(diaryOutputPath, `${diary}\n\n<img src="${imageCompletion.choices[0].message.content}">`);
    }
})();
