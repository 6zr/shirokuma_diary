const fs = require('fs');
const path = require('path');

const outputDir = './output';

const convertMdToHtml = (mdFilePath) => {
    const dir = path.dirname(mdFilePath);
    const filename = path.basename(mdFilePath, '.md');
    const htmlFilePath = path.join(dir, `${filename}.html`);
    const imageFilename = `${filename}.png`;

    const mdContent = fs.readFileSync(mdFilePath, 'utf8');

    // Markdownの内容から日記テキストと画像パスを抽出
    // 例: [2025/08/03(日)]
    // 
    // 日記の本文
    // 
    // <img width="360px" src="2025-08-08.png">
    const lines = mdContent.split('\n');
    const dateLine = lines[0]; // 例: [2025/08/03(日)]
    const diaryText = lines.slice(2, lines.length - 2).join('\n'); // 日記本文
    const imageTagMatch = lines[lines.length - 1].match(/src="(.*?)"/);
    const imageUrl = imageTagMatch ? imageTagMatch[1] : '';

    let htmlOutput = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${dateLine.replace(/[[]]/g, '')} - 日記</title>
    <style>
        body { font-family: 'Noto Sans JP', sans-serif; padding: 1em; line-height: 1.6; color: #333; background-color: #fdfdfd; max-width: 800px; margin: 0 auto; }
        h1 { text-align: center; color: #555; margin-bottom: 0.5em; font-size: 1.5em; }
        .diary-content { background-color: #fff; border-radius: 8px; padding: 1em; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
        .diary-date { text-align: right; color: #777; font-size: 0.9em; margin-bottom: 1em; }
        .diary-text { white-space: pre-wrap; margin-bottom: 1.5em; font-size: 1em; }
        .diary-image { text-align: center; margin-top: 1.5em; }
        .diary-image img { width: 100%; height: auto; border-radius: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .back-link { display: block; text-align: center; margin-top: 2em; font-size: 1.1em; }
        .back-link a { text-decoration: none; color: #007bff; padding: 0.5em 1em; border: 1px solid #007bff; border-radius: 5px; }
        .back-link a:hover { background-color: #007bff; color: #fff; }
    </style>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap" rel="stylesheet">
</head>
<body>
    <h1>日記</h1>
    <div class="diary-content">
        <div class="diary-date">${dateLine.replace(/[[]]/g, '')}</div>
        <div class="diary-text">
`;

    if (imageUrl) {
        htmlOutput += `
        <div class="diary-image">
            <img width="360px" src="${imageUrl}">
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

    fs.writeFileSync(htmlFilePath, htmlOutput);
    console.log(`Converted ${mdFilePath} to ${htmlFilePath}`);
    fs.unlinkSync(mdFilePath); // 元の.mdファイルを削除
    console.log(`Deleted ${mdFilePath}`);
};

// outputディレクトリ内のすべての.mdファイルを検索して変換
const findMdFiles = (dir) => {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            findMdFiles(fullPath); // サブディレクトリを再帰的に検索
        } else if (file.endsWith('.md')) {
            convertMdToHtml(fullPath);
        }
    });
};

findMdFiles(outputDir);

console.log('MD to HTML conversion complete.');