const core = require("@actions/core");
const fs = require('fs');
const path = require('path');
const Mastodon = require('mastodon-api');
const OpenAI = require('openai');

const instanceUrl = process.env.MASTODON_INSTANCE_URL;
const accessToken = process.env.MASTODON_ACCESS_TOKEN;
const openaiApikey = process.env.OPENAI_APIKEY;

const CONFIG = {
    abe_kuma_bot: {
        accountId: '113773089403594754',
        bearId: '9',
        bearDirname: 'abe_kuma_bot',
        diaryPrefix: 'アベマ・試合結果速報！\n\n',
        diaryPostfix: '\n\n Thank you for Watching !',
        imagePromptPrefix: '下記の日記から1試合選び、そのハイライトシーンを描いてください。画風は80-90年代のVHS録画風（低解像度・ノイズ・ボケ）です。選手の「顔」は精密に描かずぼかしてください。その代わり、選手の「アイコニックなコスチュームの色と形状」「その決まり手（技）を繰り出している特徴的なポーズ」を強調して描くことで、プロレスファンなら誰であるか推測できるように表現してください。会場のライティングは、時に眩しいスポットライトで明るく、時にドラマチックな影で暗く、試合ごとに変化のあるダイナミックな光の演出にしてください。',
    },
};
const config = CONFIG[process.env.BEAR_NAME] || CONFIG.abe_kuma_bot;

const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, '0');
const day = String(today.getDate()).padStart(2, '0');
const dayOfWeek = new Intl.DateTimeFormat('ja-JP', { weekday: 'short' }).format(today);
const shortDayOfWeek = dayOfWeek.replace('曜日', '');
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
                console.error('Error downloading timeline:', error);
                process.exit(1);
                reject(error)
            });
    });

    const nowDate = new Date();
    const oneDayAgo = new Date(nowDate.getTime() - (24 * 60 * 60 * 1000));

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
    
    // VSが含まれる行（マッチカードと思われるもの）を抽出
    const matchCards = contents
        .filter(line => line.toLowerCase().includes(' vs '))
        .map(line => line.trim())
        .filter(line => line.length > 0);

    const client = new OpenAI({ apiKey: openaiApikey });

    let diaryText = '';
    let bestMatchText = '';

    if (matchCards.length > 0) {
        // マッチカードがある場合、OpenAIにリザルト形式への変換を依頼
        const prompt = `
    以下のプロレスのマッチカードを、試合結果（リザルト）形式に変換してください。

    【ルール】
    1. 各カードについて、左右どちらの選手を勝者にするかはランダムに決めてください。
    2. 試合時間は「n分nn秒」という形式で、5分から25分の間でランダムに生成してください。
    3. 勝者の選手名から、その選手が実際に使うフィニッシャーまたはそれに準じるプロレス技を推測して記述してください。低確率で、敗者側の得意技や、一般的なプロレス技を記述してもよいです。
    4. 出力形式は必ず「○{勝者の名前} ({試合時間} {技名}) {敗者の名前}●」の1行にしてください。
    5. 最後に改行して、「【本日のベストショット】: (選んだ1試合の結果)」という形式で、画像化するのに最も適した劇的な試合を一つだけ挙げてください。


    【マッチカード一覧】
    ${matchCards.join('\n')}
        `;

        const textCompletion = await client.chat.completions.create({
            'model': 'gpt-4o-mini', 
            'messages': [
                { 'role': 'system', 'content': 'あなたはプロレス中継の記録員です。' },
                { 'role': 'user', 'content': prompt }
            ],
        });

        const fullResponse = textCompletion.choices[0].message.content;
        const bestShotMatch = fullResponse.match(/【本日のベストショット】:\s*(.*)/);
        bestMatchText = bestShotMatch ? bestShotMatch[1] : '';
        // diaryTextからはベストショットの行を消して純粋なリストにする
        diaryText = fullResponse.replace(/【本日のベストショット】:.*\n?/, '').trim();

    } else {
        diaryText = '本日の試合カードはありませんでした。';
    }

    const dataOutputDir = `./output/${config.bearDirname}/data`;

    if (!fs.existsSync(dataOutputDir)) {
        fs.mkdirSync(dataOutputDir, { recursive: true });
    }

    const contentsFilename = `contents.txt`;
    const contentsText = contents.join('\n');
    const contentsOutputPath = path.join(dataOutputDir, contentsFilename);
    fs.writeFileSync(contentsOutputPath, contentsText);

    const diaryOutputDir = `./output/${config.bearDirname}/diary`;
    if (!fs.existsSync(diaryOutputDir)) {
        fs.mkdirSync(diaryOutputDir, { recursive: true });
    }

    const dateString = `${year}-${month}-${day}`;
    const diaryFilename = `${dateString}.html`;
    const diaryOutputPath = path.join(diaryOutputDir, diaryFilename);

    const diary = `${config.diaryPrefix || ''}${diaryText}${config.diaryPostfix}`;
    console.log(diary);

    const imageCompletion = await client.images.generate({
        'model':'gpt-image-1-mini',
        'prompt': `${config.imagePromptPrefix}\n\"""\n${bestMatchText || diaryText}\n\"""`,
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
        .image-caption { font-size: 0.8em; color: #666; margin-top: 0.5em; font-style: italic; }
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
            ${bestMatchText ? `<div class="image-caption">「${bestMatchText}」</div>` : ''}
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
