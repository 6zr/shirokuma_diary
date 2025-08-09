const fs = require('fs');
const path = require('path'); // pathモジュールを追加
const Mastodon = require('mastodon-api'); // 例としてmastodon-apiライブラリを使用
const OpenAI = require('openai');

const instanceUrl = process.env.MASTODON_INSTANCE_URL;
const accessToken = process.env.MASTODON_ACCESS_TOKEN;
const openaiApikey = process.env.OPENAI_APIKEY;

const CONFIG = {
    shirokuma_ai_bot: {
        accountId: '110084966389366193',
        // bearId: '7',
        bearDirname: 'shirokuma_ai_bot',
        // diaryPostfix: '\n\n...ってかんじの日だったワン',
        systemPrompt: 'あなたはのんびり屋のしろくまの男の子です。しばしば逆張りをします。一人称はおれです。必ず語尾にワンをつけて読み書きします。',
        imagePromptPrefix: '絵日記用に、下記の日記から特徴的な場面をサイバーで古めかしいローポリCG風の絵にしてください。ただし日記の著者の姿と犬は絶対に描かないこと。',
    },
    goosan_bot: {
        accountId: '111713508453320063',
        // bearId: '8',
        bearDirname: 'goosan_bot',
        // diaryPostfix: '\n\n...ってかんじの日だったワン',
        systemPrompt: 'あなたは達観したグリズリーです。一人称は「ワシ」で、老人のような口調で話します。ですます調と「〜じゃ」という語尾を混ぜて使います。',
        imagePromptPrefix: '下記の日記から特徴的な場面を遠景の写真にしてください。遠くに小さくグリズリーを一頭描いてください。',
    },
};
const config = CONFIG[process.env.BEAR_NAME];

const today = new Date();
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, '0');
const day = String(today.getDate()).padStart(2, '0');
const dayOfWeek = new Intl.DateTimeFormat('ja-JP', { weekday: 'short' }).format(today);
const shortDayOfWeek = dayOfWeek.replace('曜日', ''); // '月曜日' -> '月'
const TODAY = `${year}/${month}/${day}(${shortDayOfWeek})`;

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

    const client = new OpenAI({ apiKey: openaiApikey });

    const textCompletion = await client.chat.completions.create({
        'model':"gpt-4.1-mini",
        'max_tokens' : 1024,
        'temperature' : 0.9,
        'messages': [{
            'role': 'developer',
            'content': config.systemPrompt, // エンジンから取得したいところ
        }, {
            'role': 'user',
            'content': `下記は今日のあなたのSNS投稿の列挙です。印象深いいくつかの内容を上手くミックスして、口調はそのまま、400文字程度の日記の形にまとめてください。\n"""\n${contentsText}\n"""`,
        }],
    });

    if (textCompletion.choices == null || textCompletion.choices.length < 1) {
        return;
    }
    const diaryText = textCompletion.choices[0].message.content;

    const imageCompletion = await client.images.generate({
        'model':'gpt-image-1',
        'prompt': `${config.imagePromptPrefix}\n"""\n${diaryText}\n"""`,
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
        <div class="diary-text">${diaryText}</div>
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