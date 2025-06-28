var fs = require('fs');
const path = require('path'); // pathモジュールを追加
var kuromoji = require('kuromoji');
var builder = kuromoji.builder({
  dicPath: 'node_modules/kuromoji/dict'
});

const today = new Date();
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, '0');
const day = String(today.getDate()).padStart(2, '0');
const dayOfWeek = new Intl.DateTimeFormat('ja-JP', { weekday: 'short' }).format(today);
const shortDayOfWeek = dayOfWeek.replace('曜日', ''); // '月曜日' -> '月'
const TODAY = `${year}/${month}/${day}(${shortDayOfWeek})`;

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

const outputDir = './diary';
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Directory created: ${outputDir}`);
}

const filename = 'index.md';
const outputPath = path.join(outputDir, filename);

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

        const data = fs.readFileSync('data/contents.txt', 'utf-8');

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
        const result = sentences.join('');

        const diary = `[${TODAY}]\n\n${result}\n\n...ってかんじの日だったワン`;
        console.log(diary);

        fs.writeFileSync(outputPath, diary);
        console.log(`Diary saved to ${outputPath}`);
    } catch (error) {
        console.error('Error processing timeline data with Kuromoji:', error);
        process.exit(1);
    }
})();
