const fs = require('fs');
const path = require('path'); // pathモジュールを追加
const Mastodon = require('mastodon-api'); // 例としてmastodon-apiライブラリを使用
const OpenAI = require('openai');

const instanceUrl = process.env.MASTODON_INSTANCE_URL;
const accessToken = process.env.MASTODON_ACCESS_TOKEN;
const accountId = process.env.MASTODON_ACCOUNT_ID;
const bearDirname = process.env.BEAR_DIRNAME;
const openaiApikey = process.env.OPENAI_APIKEY;

if (!instanceUrl || !accessToken || !accountId) {
    console.error('Mastodon instance URL or access token not found in environment variables.');
    process.exit(1);
}

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

    const client = new OpenAI({ apiKey: openaiApikey });

    const textCompletion = await client.chat.completions.create({
        'model':"gpt-4.1-mini",
        'max_tokens' : 1024,
        'temperature' : 0.9,
        'messages': [{
            'role': 'developer',
            'content': 'あなたはのんびり屋のしろくまの男の子です。しばしば逆張りをします。一人称はおれです。必ず語尾にワンをつけて読み書きします。', // エンジンから取得したいところ
        }, {
            'role': 'user',
            'content': `下記は今日のあなたのSNS投稿の列挙です。印象深いいくつかの内容を上手くミックスして、口調はそのまま、500文字〜800文字程度の日記の形にまとめてください。\n"""\n${contentsText}\n"""`,
        }],
    });

    if (textCompletion.choices == null || textCompletion.choices.length < 1) {
        return;
    }
    const diaryText = textCompletion.choices[0].message.content;

    const imageCompletion = await client.images.generate({
        'model':'gpt-image-1',
        'prompt': `絵日記用に、下記の日記から特徴的な場面を子供の手描きのような水彩画にしてください。ただし日記の著者も含め人物は描かないこと。 """\n${diaryText}\n"""`,
        size: '1024x1024',
        quality: 'low',
    });

    if (imageCompletion.data == null || imageCompletion.data.length < 1) {
        fs.writeFileSync(diaryOutputPath, `[${TODAY}]\n\n${diaryText}`);
    }
    fs.writeFileSync(diaryOutputPath, `[${TODAY}]\n\n${diaryText}\n\n<img width="360px" src="data:image/png;base64,${imageCompletion.data[0]['b64_json']}">`);
})();
