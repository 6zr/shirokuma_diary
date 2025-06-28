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

const CONTENTS_TEXT = process.env.STEP_OUTPUT_CONTENTS_TEXT;
const KEYWORDS = process.env.STEP_OUTPUT_KEYWORDS;
const MARKOV = process.env.STEP_OUTPUT_MARKOV;
const BEAR_DIRNAME = process.env.BEAR_DIRNAME;

const dataOutputDir = `./${BEAR_DIRNAME}/data`;
if (!fs.existsSync(dataOutputDir)) {
    fs.mkdirSync(dataOutputDir, { recursive: true });
    console.log(`Directory created: ${dataOutputDir}`);
}

const contentsFilename = `contents.txt`;
const contentsOutputPath = path.join(dataOutputDir, contentsFilename);
fs.writeFileSync(contentsOutputPath, CONTENTS_TEXT);
console.log(`data saved to ${contentsOutputPath}`);


const diaryOutputDir = `./${BEAR_DIRNAME}/diary`;
if (!fs.existsSync(diaryOutputDir)) {
    fs.mkdirSync(diaryOutputDir, { recursive: true });
    console.log(`Directory created: ${diaryOutputDir}`);
}

const diaryFilename = 'index.md';
const diaryOutputPath = path.join(diaryOutputDir, diaryFilename);

const diary = `[${TODAY}]\n\n${MARKOV}\n\n...ってかんじの日だったワン`;
console.log(diary);
fs.writeFileSync(diaryOutputPath, diary);

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
