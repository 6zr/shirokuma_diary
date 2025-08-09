const fs = require('fs');
const path = require('path');

const outputDir = './output';
const bots = ['shirokuma_bot', 'shirokumadadbot', 'shirokuma_ai_bot', 'goosan_bot', 'ochisou_bot'];

let htmlContent = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>しろくまダイアリー</title>
    <style>
        body { font-family: sans-serif; padding: 2em; background-color: #fdfdfd; color: #333; }
        h1 { text-align: center; color: #555; }
        .container { display: flex; flex-wrap: wrap; gap: 2em; justify-content: center; }
        .bot-card {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 1.5em;
            width: 320px;
            background-color: #fff;
            box-shadow: 0 2px 5px rgba(0,0,0,0.05);
        }
        .bot-card h2 { margin-top: 0; border-bottom: 2px solid #eee; padding-bottom: 0.5em; }
        .bot-card ul { list-style: none; padding-left: 0; }
        .bot-card li { margin-bottom: 0.5em; }
        .bot-card a { text-decoration: none; color: #007bff; }
        .bot-card a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <h1>しろくまダイアリー</h1>
    <div class="container">
`;

bots.forEach(bot => {
    const diaryDir = path.join(outputDir, bot, 'diary');
    if (fs.existsSync(diaryDir)) {
        const files = fs.readdirSync(diaryDir)
            .filter(f => f.endsWith('.md'))
            .sort()
            .reverse(); // 新しい順にソート

        if (files.length > 0) {
            htmlContent += `
            <div class="bot-card">
                <h2>${bot}</h2>
                <ul>
            `;

            const latestDiaries = files.slice(0, 5);

            latestDiaries.forEach(diaryFile => {
                const diaryName = diaryFile.replace('.md', '');
                const diaryPath = path.join(bot, 'diary', diaryFile);
                const isLatest = files.indexOf(diaryFile) === 0;
                htmlContent += `<li><a href="${diaryPath}">${diaryName}</a> ${isLatest ? '<strong>(最新)</strong>' : ''}</li>`;
            });

            htmlContent += `
                </ul>
                <p><a href="${path.join(bot, 'diary', 'archive.html')}">もっと見る</a></p>
            </div>
            `;
        }
    }
});

htmlContent += `
    </div>
</body>
</html>
`;

fs.writeFileSync(path.join(outputDir, 'index.html'), htmlContent);

console.log('index.html has been generated successfully.');
