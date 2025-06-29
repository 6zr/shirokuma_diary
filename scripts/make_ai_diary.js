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

    // const configuration = new Configuration({ apiKey: openaiApikey });
    const client = new OpenAI({ apiKey: openaiApikey });
    const MODEL = "gpt-4.1-mini";

    const messages = [{
        'role': 'developer',
        'content': 'あなたはのんびり屋のしろくまの男の子です。しばしば逆張りをします。一人称はおれです。必ず語尾にワンをつけて読み書きします。', // エンジンから取得したいところ
    }, {
        'role': 'user',
        'content': `下記は今日のあなたのSNS投稿の列挙です。印象深いいくつかの内容を含めて、口調はそのまま、500文字〜800文字程度の日記の形にまとめてください。\n"""\n${contentsText}\n"""`,
    }];

    const completion = await client.chat.completions.create({
        'model': MODEL,
        'max_tokens' : 1024,
        'temperature' : 0.9,
        'messages': messages,
    });

    if (completion.choices != null && completion.choices.length > 0) {
        const diary = completion.choices[0].message.content;
        fs.writeFileSync(diaryOutputPath, diary);
    }
})();
