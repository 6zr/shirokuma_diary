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

const KEYWORDS = process.env.STEP_OUTPUT_KEYWORDS;
const MARKOV = process.env.STEP_OUTPUT_MARKOV;

const outputDir = './diary';
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Directory created: ${outputDir}`);
}

const filename = 'index.md';
const outputPath = path.join(outputDir, filename);

const diary = `[${TODAY}]\n\n${MARKOV}\n\n...ってかんじの日だったワン`;
console.log(diary);
fs.writeFileSync(outputPath, diary);

const keywords = (JSON.parse(KEYWORDS) || [])
    .map(x => ({
        keyword: x.keyword.name, 
        category: x.keyword.keywordCategory.code,
    }))
    .filter(x => !x.keyword.includes('{'))
    .map(x => `${x.category} => ${x.keyword}`)
    .join('\n');
;
console.log(keywords);
