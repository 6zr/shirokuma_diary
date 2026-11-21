const fs = require('fs');
const path = require('path');

const outputDir = './output';
const bots = ['shirokuma_bot', 'shirokumadadbot', 'shirokuma_ai_bot', 'goosan_bot', 'shirokuma_neo_bot', 'abe_kuma_bot', 'ochisou_bot'];

bots.forEach(bot => {
    const diaryDir = path.join(outputDir, bot, 'diary');
    if (!fs.existsSync(diaryDir)) return;

    // 1. 各日記HTMLファイルへの「前日」「翌日」ナビゲーションリンクの一括更新・付与
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

        // 【重複防止】既存のすべての <div class="back-link"...>...</div> を一括削除
        updatedHtml = updatedHtml.replace(/<div[^>]*class=["']back-link["'][^>]*>[\s\S]*?<\/div>/gi, '');

        // </body> の直前に、最新のナビゲーションリンクを常に1セットだけきれいに挿入
        updatedHtml = updatedHtml.replace('</body>', `${navHtml}\n</body>`);

        // 内容が変更された場合のみディスクに書き込み保存（パフォーマンス最適化）
        if (updatedHtml !== htmlContent) {
            fs.writeFileSync(filePath, updatedHtml);
            console.log(`Updated navigation links in ${filePath}`);
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
    <style>
        :root {
            --bg: #fdfdfd; --text: #333; --heading: #555;
            --link: #007bff; --toggle-bg: #e0e0e0; --toggle-text: #333;
        }
        body.dark {
            --bg: #121212; --text: #e0e0e0; --heading: #90caf9;
            --link: #90caf9; --toggle-bg: #333; --toggle-text: #e0e0e0;
        }
        body { font-family: sans-serif; padding: 2em; background-color: var(--bg); color: var(--text); transition: background-color 0.3s, color 0.3s; }
        h1 { text-align: center; color: var(--heading); }
        ul { list-style: none; padding-left: 0; }
        li { margin-bottom: 0.5em; }
        a { text-decoration: none; color: var(--link); }
        a:hover { text-decoration: underline; }
        #theme-toggle { position: fixed; top: 1em; right: 1em; padding: 0.4em 0.8em; border-radius: 20px; border: 1px solid var(--link); background: var(--toggle-bg); color: var(--toggle-text); cursor: pointer; font-size: 1.1em; transition: all 0.3s; z-index: 100; }
    </style>
</head>
<body>
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

    fs.writeFileSync(path.join(diaryDir, 'archive.html'), archiveHtmlContent);
    console.log(`Generated archive.html for ${bot}`);
});

console.log('All archive pages and diary navigation links updated successfully.');
