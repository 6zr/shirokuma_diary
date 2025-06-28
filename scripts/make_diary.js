const core = require("@actions/core");
const fs = require('fs');
const path = require('path'); // pathモジュールを追加
const Mastodon = require('mastodon-api'); // 例としてmastodon-apiライブラリを使用

const instanceUrl = process.env.MASTODON_INSTANCE_URL;
const accessToken = process.env.MASTODON_ACCESS_TOKEN;
const accountId = process.env.MASTODON_ACCOUNT_ID;
const shirokumaEngineUser = process.env.SHIROKUMA_ENGINE_USER;
const shirokumaEnginePassword = process.env.SHIROKUMA_ENGINE_PASSWORD;
const bearId = process.env.BEAR_ID;

let contentsText = '';
let usedKeywords = [];
let markovText = '';

if (!instanceUrl || !accessToken || !accountId) {
    console.error('Mastodon instance URL or access token not found in environment variables.');
    process.exit(1);
}

const M = new Mastodon({
    access_token: accessToken,
    api_url: `https://${instanceUrl}/api/v1/`
});

M.get(`accounts/${accountId}/statuses`, {limit: 40})
    .then(resp => {
        const timeline = resp.data;
        const contents = timeline.map(t => {
            if (t == null || t.content == null) {
                return '';
            }
            return t.content
                .replace(/<.+?>/g, '')
                .replace(/@[a-zA-Z0-9_\-]+? /g, '')
                .replace(/http.*$/g, '')
        });
        contentsText = contents.join('\n');
    })
    .catch(err => {
        console.error('Error downloading timeline:', err);
        // エラーの詳細を出力
        if (err.response) {
            console.error('Mastodon API Error Status:', err.response.status);
            console.error('Mastodon API Error Data:', err.response.data);
        }
        process.exit(1);
    });

const login = async () => {
    const res = await fetch(`http://api.6zr.info/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({
            username: shirokumaEngineUser,
            password: shirokumaEnginePassword,
        }),
    });
    return res.headers.get('set-cookie');
}

const request = async (cookie) => {
    const res = await fetch(`http://api.6zr.info/manage/bear/${bearId}/keyword_used_at/today`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Cookie': cookie,
        }
    });
    return await res.json();
}

(async () => {
    const cookie = await login();
    usedKeywords = await request(cookie);
})();


const kuromoji = require('kuromoji');
const builder = kuromoji.builder({
  dicPath: 'node_modules/kuromoji/dict'
});

// マルコフ連鎖の実装
class Markov {
  constructor(n) {
    this.data = {};
  }

  // データ登録
  add(words) {
    for(var i = 0; i <= words.length; i++) {
      var now = words[i];
      if(now === undefined) { now = null };
      var prev = words[i - 1];
      if(prev === undefined) { prev = null };

      if(this.data[prev] === undefined) {
        this.data[prev] = [];
      }
      this.data[prev].push(now);
    }
  }

  // 指定された文字に続く文字をランダムに返す
  sample(word) {
    var words = this.data[word];
    if(words === undefined) { words = []; }

    return words[Math.floor(Math.random() * words.length)];
  }

  // マルコフ連鎖でつなげた文を返す
  make() {
    var sentence = [];
    var word = this.sample(null);
    while(word) {
      sentence.push(word);
      word = this.sample(word);
    }
    return sentence.join('');
  }
}

var markov = new Markov();

(async () => {
    try {
        const tokenizer = await new Promise((resolve, reject) => {
            builder.build(function(err, builtTokenizer) {
                if (err) {
                    console.error('Failed to build tokenizer:', err);
                    return reject(err); // エラーが発生したらPromiseをrejectする
                }
                resolve(builtTokenizer); // 成功したらPromiseをresolveする
            });
        });
        console.log('Tokenizer built successfully.');

        // const data = fs.readFileSync('data/contents.txt', 'utf-8');
        const data = contentsText;

        var lines = data.split("\n"); // 一行ごとに分割
        lines.forEach(function(line) {
            var tokens = tokenizer.tokenize(line);

            // トークンを文中表記にすべて変換
            var words = tokens.map(function(token) {
                return token.surface_form;
            });

            // データを登録
            markov.add(words);
        });

        // 10回くらい生成してみる
        const sentences = [];
        for(var n = 0; n < 10; n++) {
            const sentence = markov.make();
            const point = sentence.length < 15 ? '、' : '。';
            sentences.push(`${sentence}${point}`);
        }
        markovText = sentences.join('');

    } catch (error) {
        console.error('Error processing timeline data with Kuromoji:', error);
        process.exit(1);
    }
})();


const today = new Date();
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, '0');
const day = String(today.getDate()).padStart(2, '0');
const dayOfWeek = new Intl.DateTimeFormat('ja-JP', { weekday: 'short' }).format(today);
const shortDayOfWeek = dayOfWeek.replace('曜日', ''); // '月曜日' -> '月'
const TODAY = `${year}/${month}/${day}(${shortDayOfWeek})`;

const BEAR_DIRNAME = process.env.BEAR_DIRNAME;

const dataOutputDir = `./output/${BEAR_DIRNAME}/data`;
if (!fs.existsSync(dataOutputDir)) {
    fs.mkdirSync(dataOutputDir, { recursive: true });
    console.log(`Directory created: ${dataOutputDir}`);
}

const contentsFilename = `contents.txt`;
const contentsOutputPath = path.join(dataOutputDir, contentsFilename);
fs.writeFileSync(contentsOutputPath, contentsText);
console.log(`data saved to ${contentsOutputPath}`);


const diaryOutputDir = `./output/${BEAR_DIRNAME}/diary`;
if (!fs.existsSync(diaryOutputDir)) {
    fs.mkdirSync(diaryOutputDir, { recursive: true });
    console.log(`Directory created: ${diaryOutputDir}`);
}

const diaryFilename = 'index.md';
const diaryOutputPath = path.join(diaryOutputDir, diaryFilename);

const diary = `[${TODAY}]\n\n${markovText}\n\n...ってかんじの日だったワン`;
console.log(diary);
fs.writeFileSync(diaryOutputPath, diary);

const keywords = (usedKeywords || [])
    .map(x => ({
        keyword: x.keyword.name, 
        category: x.keyword.keywordCategory.code,
    }))
    .filter(x => !x.keyword.includes('{'))
    .map(x => `${x.category} => ${x.keyword}`)
    .join('\n');
;
console.log(keywords);
