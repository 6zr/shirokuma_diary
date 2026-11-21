#!/usr/bin/env node

/**
 * 過去の日記 HTML および archive.html を、共通の外部 style.css / diary.js 参照へ移行するスクリプト
 * 
 * 使い方:
 *   # 特定の bot だけ移行
 *   node scripts/migrate_diary_assets.js ochisou_bot
 * 
 *   # 全 bot を移行
 *   node scripts/migrate_diary_assets.js --all
 * 
 *   # 変更を書き込まずに確認（ドライラン）
 *   node scripts/migrate_diary_assets.js ochisou_bot --dry-run
 */

const fs = require('fs');
const path = require('path');

const ALL_BOTS = [
    'shirokuma_bot',
    'shirokumadadbot',
    'shirokuma_ai_bot',
    'goosan_bot',
    'shirokuma_neo_bot',
    'abe_kuma_bot',
    'ochisou_bot'
];

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isAll = args.includes('--all');
const specifiedBots = args.filter(a => !a.startsWith('--'));

if (!isAll && specifiedBots.length === 0) {
    console.log(`
使用方法:
  node scripts/migrate_diary_assets.js <bot名> [--dry-run]
  node scripts/migrate_diary_assets.js --all [--dry-run]

指定可能な bot名:
  ${ALL_BOTS.join(', ')}

オプション:
  --dry-run   ファイルを書き込まずに対象ファイルと差分確認のみ行います
  --all       全 bot を対象に一括実行します
`);
    process.exit(0);
}

const targetBots = isAll ? ALL_BOTS : specifiedBots;

// 実行場所の判定 (mainのoutput配下か、gh-pagesルートか)
const rootDir = process.cwd();
const templatesDir = path.join(__dirname, 'templates');

if (!fs.existsSync(templatesDir)) {
    console.error(`エラー: テンプレートディレクトリが見つかりません: ${templatesDir}`);
    process.exit(1);
}

const templateStyle = fs.readFileSync(path.join(templatesDir, 'style.css'), 'utf8');
const templateJs = fs.readFileSync(path.join(templatesDir, 'diary.js'), 'utf8');

function resolveDiaryDir(bot) {
    // 1. カレント直下に bot/diary があるか (gh-pages ブランチなど)
    const directPath = path.join(rootDir, bot, 'diary');
    if (fs.existsSync(directPath)) return directPath;

    // 2. output/bot/diary があるか (main ブランチなど)
    const outputPath = path.join(rootDir, 'output', bot, 'diary');
    if (fs.existsSync(outputPath)) return outputPath;

    return null;
}

let grandTotalFiles = 0;
let grandTotalUpdated = 0;

targetBots.forEach(bot => {
    const diaryDir = resolveDiaryDir(bot);
    if (!diaryDir) {
        console.warn(`[スキップ] ${bot} の diary ディレクトリが見つかりません。`);
        return;
    }

    console.log(`\n========================================`);
    console.log(`対象: ${bot} (${diaryDir})`);
    console.log(`モード: ${isDryRun ? '【ドライラン（書き込みなし）】' : '実書き込み'}`);
    console.log(`========================================`);

    // 1. style.css と diary.js の配置
    const styleDest = path.join(diaryDir, 'style.css');
    const jsDest = path.join(diaryDir, 'diary.js');

    if (!isDryRun) {
        fs.writeFileSync(styleDest, templateStyle, 'utf8');
        fs.writeFileSync(jsDest, templateJs, 'utf8');
        console.log(`✓ style.css と diary.js を配置/更新しました`);
    } else {
        console.log(`[DRY-RUN] style.css と diary.js を配置予定`);
    }

    // 2. HTML ファイルの走査・置換
    const htmlFiles = fs.readdirSync(diaryDir)
        .filter(f => f.endsWith('.html'))
        .sort();

    let updatedCount = 0;

    htmlFiles.forEach(file => {
        const filePath = path.join(diaryDir, file);
        const original = fs.readFileSync(filePath, 'utf8');
        let html = original;
        const isArchive = file === 'archive.html';

        // インライン style の削除
        html = html.replace(/<style>[\s\S]*?<\/style>\s*/gi, '');

        // インライン script の削除
        html = html.replace(/<script>\s*\(function\(\)\s*\{[\s\S]*?<\/script>\s*/gi, '');
        html = html.replace(/<script>\s*\(function\(\)[\s\S]*?<\/script>\s*/gi, '');

        // style.css / diary.js の link & script タグ追加
        if (!html.includes('href="style.css"')) {
            html = html.replace('</head>', '    <link rel="stylesheet" href="style.css">\n    <script src="diary.js"></script>\n</head>');
        }

        // body タグのクラス指定 (.page-archive または .page-diary)
        const targetBodyClass = isArchive ? 'page-archive' : 'page-diary';
        if (!html.includes(`class="${targetBodyClass}"`)) {
            html = html.replace(/<body[^>]*>/i, `<body class="${targetBodyClass}">`);
        }

        if (isArchive) {
            // archive.html のみ theme-toggle ボタンを配置
            if (!html.includes('id="theme-toggle"')) {
                html = html.replace(/<body[^>]*>/i, '$&\n    <button id="theme-toggle" onclick="toggleTheme()" title="ライト/ダークモード切替">🌙</button>');
            }
        } else {
            // 日記ページには theme-toggle ボタンを置かない（もしあれば除去）
            html = html.replace(/\s*<button id="theme-toggle"[\s\S]*?<\/button>/gi, '');
        }

        if (html !== original) {
            updatedCount++;
            if (!isDryRun) {
                fs.writeFileSync(filePath, html, 'utf8');
            }
        }
    });

    console.log(`HTML ファイル: ${htmlFiles.length} 件中 ${updatedCount} 件${isDryRun ? 'が更新対象' : 'を更新'}`);
    grandTotalFiles += htmlFiles.length;
    grandTotalUpdated += updatedCount;
});

console.log(`\n----------------------------------------`);
console.log(`処理完了: 合計 ${grandTotalFiles} 件中 ${grandTotalUpdated} 件${isDryRun ? 'が更新対象' : 'を更新しました'}`);
console.log(`----------------------------------------\n`);
