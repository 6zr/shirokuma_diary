const fs = require('fs');
const path = require('path');

const outputDir = './output';
const bots = ['shirokuma_bot', 'shirokumadadbot', 'shirokuma_ai_bot', 'goosan_bot', 'ochisou_bot'];

bots.forEach(bot => {
    const diaryDir = path.join(outputDir, bot, 'diary');
    if (fs.existsSync(diaryDir)) {
        const files = fs.readdirSync(diaryDir)
            .filter(f => f.endsWith('.md'))
            .sort()
            .reverse(); // 新しい順にソート

        let archiveHtmlContent = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${bot} - 日記アーカイブ</title>
    <style>
        body { font-family: sans-serif; padding: 2em; background-color: #fdfdfd; color: #333; }
        h1 { text-align: center; color: #555; }
        ul { list-style: none; padding-left: 0; }
        li { margin-bottom: 0.5em; }
        a { text-decoration: none; color: #007bff; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <h1>${bot} - 日記アーカイブ</h1>
    <p><a href="../../index.html">トップページに戻る</a></p>
    <ul>
`;

        files.forEach(diaryFile => {
            const diaryName = diaryFile.replace('.md', '');
            // アーカイブページからの相対パスを考慮
            const diaryPath = diaryFile;
            archiveHtmlContent += `<li><a href="${diaryPath}">${diaryName}</a></li>`;
        });

        archiveHtmlContent += `
    </ul>
</body>
</html>
`;

        fs.writeFileSync(path.join(diaryDir, 'archive.html'), archiveHtmlContent);
        console.log(`Generated archive.html for ${bot}`);
    }
});

console.log('All archive pages generated successfully.');
