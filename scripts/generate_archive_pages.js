const fs = require('fs');
const path = require('path');

const outputDir = './output';
const bots = ['shirokuma_bot', 'shirokumadadbot', 'shirokuma_ai_bot', 'goosan_bot', 'shirokuma_neo_bot', 'abe_kuma_bot', 'ochisou_bot'];
const templatesDir = path.join(__dirname, 'templates');

bots.forEach(bot => {
    const diaryDir = path.join(outputDir, bot, 'diary');
    if (!fs.existsSync(diaryDir)) return;

    // 0. style.css と diary.js を各 bot の diary ディレクトリに配置
    const destStylePath = path.join(diaryDir, 'style.css');
    const destJsPath = path.join(diaryDir, 'diary.js');
    if (fs.existsSync(path.join(templatesDir, 'style.css'))) {
        fs.copyFileSync(path.join(templatesDir, 'style.css'), destStylePath);
    }
    if (!fs.existsSync(destJsPath) && fs.existsSync(path.join(templatesDir, 'diary.js'))) {
        fs.copyFileSync(path.join(templatesDir, 'diary.js'), destJsPath);
    }

    // 1. 各日記HTMLファイルへのナビゲーションリンク・共通CSS/JSの一括更新
    // 日付順（古い順）にソート
    const chronologicalFiles = fs.readdirSync(diaryDir)
        .filter(f => f.endsWith('.html') && f !== 'archive.html' && f !== 'index.html')
        .sort();

    chronologicalFiles.forEach((file, index) => {
        const filePath = path.join(diaryDir, file);
        let htmlContent = fs.readFileSync(filePath, 'utf8');

        const prevFile = chronologicalFiles[index - 1];
        const nextFile = chronologicalFiles[index + 1];

        const prevDate = prevFile ? prevFile.replace('.html', '') : null;
        const nextDate = nextFile ? nextFile.replace('.html', '') : null;

        const prevLinkHtml = prevDate ? `<a href="${prevFile}">← ${prevDate}</a>` : `<span style="visibility: hidden;">← 前日</span>`;
        const nextLinkHtml = nextDate ? `<a href="${nextFile}">${nextDate} →</a>` : `<span style="visibility: hidden;">翌日 →</span>`;

        const navHtml = `<div class="back-link" style="display: flex; justify-content: space-between; align-items: center; max-width: 600px; margin: 2em auto 0; gap: 10px; flex-wrap: wrap;">
        ${prevLinkHtml}
        <a href="../../index.html">トップページに戻る</a>
        ${nextLinkHtml}
    </div>`;

        let updatedHtml = htmlContent;

        // 古いインライン <style>...</style> を除去
        updatedHtml = updatedHtml.replace(/<style>[\s\S]*?<\/style>\s*/gi, '');

        // 過去のインライン <script>...</script> を除去
        updatedHtml = updatedHtml.replace(/<script>\s*\(function\(\)\s*\{[\s\S]*?<\/script>\s*/gi, '');

        // <link rel="stylesheet" href="style.css"> と <script src="diary.js"></script> が無ければ <head> に追加
        if (!updatedHtml.includes('href="style.css"')) {
            updatedHtml = updatedHtml.replace('</head>', '    <link rel="stylesheet" href="style.css">\n    <script src="diary.js"></script>\n</head>');
        }

        // <body class="page-diary"> の設定
        if (!updatedHtml.includes('class="page-diary"')) {
            updatedHtml = updatedHtml.replace(/<body[^>]*>/i, '<body class="page-diary">');
        }

        // <button id="theme-toggle"...> が無ければ <body> 直後に挿入
        if (!updatedHtml.includes('id="theme-toggle"')) {
            updatedHtml = updatedHtml.replace(/<body[^>]*>/i, '$&\n    <button id="theme-toggle" onclick="toggleTheme()" title="ライト/ダークモード切替">🌙</button>');
        }

        // 【重複防止】既存のすべての <div class="back-link"...>...</div> を一括削除
        updatedHtml = updatedHtml.replace(/<div[^>]*class=["']back-link["'][^>]*>[\s\S]*?<\/div>/gi, '');

        // </body> の直前に、最新のナビゲーションリンクを常に1セットだけきれいに挿入
        updatedHtml = updatedHtml.replace('</body>', `${navHtml}\n</body>`);

        // 内容が変更された場合のみディスクに書き込み保存（パフォーマンス最適化）
        if (updatedHtml !== htmlContent) {
            fs.writeFileSync(filePath, updatedHtml);
            console.log(`Updated navigation links and assets in ${filePath}`);
        }
    });

    // 2. アーカイブ一覧ページ (archive.html) の生成
    const files = [...chronologicalFiles].reverse(); // 新しい順にソート

    let archiveHtmlContent = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${bot} - 日記アーカイブ</title>
    <link rel="stylesheet" href="style.css">
    <script src="diary.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap" rel="stylesheet">
</head>
<body class="page-archive">
    <button id="theme-toggle" onclick="toggleTheme()" title="ライト/ダークモード切替">🌙</button>
    <h1>${bot} - 日記アーカイブ</h1>
    <p><a href="../../index.html">トップページに戻る</a></p>
    <ul>
`;

    files.forEach(diaryFile => {
        const diaryName = diaryFile.replace('.html', '');
        archiveHtmlContent += `<li><a href="${diaryFile}">${diaryName}</a></li>\n`;
    });

    archiveHtmlContent += `    </ul>
</body>
</html>
`;

    fs.writeFileSync(path.join(diaryDir, 'archive.html'), archiveHtmlContent);
    console.log(`Generated archive.html for ${bot}`);
});

console.log('All archive pages and diary navigation links updated successfully.');
