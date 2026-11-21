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
        :root {
            --bg: #fdfdfd;
            --text: #333;
            --heading: #555;
            --card-bg: #fff;
            --card-shadow: rgba(0,0,0,0.05);
            --muted: #777;
            --link: #007bff;
            --link-hover-bg: #007bff;
            --link-hover-text: #fff;
            --img-shadow: rgba(0,0,0,0.1);
            --toggle-bg: #e0e0e0;
            --toggle-text: #333;
        }
        body.dark {
            --bg: #121212;
            --text: #e0e0e0;
            --heading: #90caf9;
            --card-bg: #1e1e1e;
            --card-shadow: rgba(0,0,0,0.5);
            --muted: #9e9e9e;
            --link: #90caf9;
            --link-hover-bg: #90caf9;
            --link-hover-text: #121212;
            --img-shadow: rgba(0,0,0,0.5);
            --toggle-bg: #333;
            --toggle-text: #e0e0e0;
        }
        body { font-family: 'Noto Sans JP', sans-serif; padding: 1em; line-height: 1.6; color: var(--text); background-color: var(--bg); max-width: 800px; margin: 0 auto; transition: background-color 0.3s, color 0.3s; }
        h1 { text-align: center; color: var(--heading); margin-bottom: 0.5em; font-size: 1.5em; }
        .diary-content { background-color: var(--card-bg); border-radius: 8px; padding: 1em; box-shadow: 0 2px 5px var(--card-shadow); }
        .diary-date { text-align: right; color: var(--muted); font-size: 0.9em; margin-bottom: 1em; }
        .diary-text { white-space: pre-wrap; margin-bottom: 1.5em; font-size: 1em; }
        .diary-image { text-align: center; margin-top: 1.5em; }
        .diary-image img { width: 100%; height: auto; border-radius: 4px; box-shadow: 0 2px 5px var(--img-shadow); }
        .back-link { display: block; text-align: center; margin-top: 2em; font-size: 1.1em; }
        .back-link a { text-decoration: none; color: var(--link); padding: 0.5em 1em; border: 1px solid var(--link); border-radius: 5px; }
        .back-link a:hover { background-color: var(--link-hover-bg); color: var(--link-hover-text); }
        #theme-toggle { position: fixed; top: 1em; right: 1em; padding: 0.4em 0.8em; border-radius: 20px; border: 1px solid var(--link); background: var(--toggle-bg); color: var(--toggle-text); cursor: pointer; font-size: 1.1em; transition: all 0.3s; z-index: 100; }
        #theme-toggle:hover { background-color: var(--link-hover-bg); color: var(--link-hover-text); }
    </style>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap" rel="stylesheet">
</head>
<body>
    <button id="theme-toggle" onclick="toggleTheme()" title="ライト/ダークモード切替">🌙</button>
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
    <script>
        (function() {
            var saved = localStorage.getItem('theme');
            if (saved === 'dark') {
                document.body.classList.add('dark');
                var btn = document.getElementById('theme-toggle');
                if (btn) btn.textContent = '☀️';
            }
        })();
        function toggleTheme() {
            var body = document.body;
            var btn = document.getElementById('theme-toggle');
            if (body.classList.toggle('dark')) {
                btn.textContent = '☀️';
                localStorage.setItem('theme', 'dark');
            } else {
                btn.textContent = '🌙';
                localStorage.setItem('theme', 'light');
            }
        }
    </script>
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