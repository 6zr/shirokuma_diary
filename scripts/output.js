// const github = require("@actions/github");
const fs = require('fs');
const path = require('path'); // pathモジュールを追加

const today = new Date();
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, '0');
const day = String(today.getDate()).padStart(2, '0');
const dayOfWeek = new Intl.DateTimeFormat('ja-JP', { weekday: 'short' }).format(today);
const shortDayOfWeek = dayOfWeek.replace('曜日', ''); // '月曜日' -> '月'
const TODAY = `${year}/${month}/${day}(${shortDayOfWeek})`;

const outputDir = './diary';
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Directory created: ${outputDir}`);
}

const filename = 'index.md';
const outputPath = path.join(outputDir, filename);

console.log(process.env.STEP_OUTPUT_KEYWORDS);
console.log(process.env.STEP_OUTPUT_DIARY);

const diary = `[${TODAY}]\n\n${result}\n\n...ってかんじの日だったワン`;
console.log(diary);
fs.writeFileSync(outputPath, diary);
