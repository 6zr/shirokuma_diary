const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const apiKey = process.env.OPENAI_APIKEY;
if (!apiKey) {
    console.error('OPENAI_APIKEY is not set');
    process.exit(1);
}

const client = new OpenAI({ apiKey });

// shirokuma_bot の典型的な日記テキスト
const diaryText = `今日はおやつにゴマ団子を食べたワン。やっぱりエビフライには醤油だねワン。おぼろげながら浮かんできたんです81という数字がワン。クリームシチューもおすすめワン。...ってかんじの日だったワン`;

// Pattern 4: モチーフ複数並べる + 文字/リアル質感禁止
const prompt4 = `絵日記用に、下記の日記に出てくる食べ物や出来事をいくつか、4〜5歳の子供が画用紙いっぱいにクレヨンで描いたような絵にしてください。
- 日記の著者の姿、犬、そして【文字やセリフ（日本語・英語・数字問わず）は絶対に描かないこと】。
- 遠近感や立体感、リアルな陰影はつけず、ふにゃふにゃした素朴な線とクレヨンのベタ塗りで、平面的に描くこと。
- プロのような凝ったイラスト、美しいグラデーション、小洒落たPOP風の仕上げは禁止です。
"""
${diaryText}
"""`;

// Pattern 5: 絵日記の場面（食卓や情景）+ 子供のクレヨンタッチ
const prompt5 = `下記の日記の情景を、子供がクレヨンでお絵かき帳に描いたような素朴な絵日記のイラストにしてください。
- 日記に登場する食べ物や出来事をいくつか散りばめて描いてください。
- 文字、文字風の記号、セリフ、犬、日記の著者の姿は一切描かないこと。
- 子供らしい歪んだ太い輪郭線と粗いクレヨンの塗りつぶしで、平面的に描くこと。リアルな立体感や緻密な描き込みは禁止。
"""
${diaryText}
"""`;

const outputDir = path.join(__dirname, '../test_outputs');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

async function generate(filename, model, prompt) {
    console.log(`\n========================================`);
    console.log(`Generating: ${filename}`);
    console.log(`Model: ${model}`);
    console.log(`========================================`);
    try {
        const res = await client.images.generate({
            model: model,
            prompt: prompt,
            size: '1024x1024',
            quality: 'low',
        });
        const imgPath = path.join(outputDir, `${filename}.png`);
        fs.writeFileSync(imgPath, res.data[0].b64_json, 'base64');
        console.log(`Saved: ${imgPath}`);
        return true;
    } catch (err) {
        console.error(`Error generating ${filename}:`, err.message);
        return false;
    }
}

async function main() {
    console.log('--- Starting Image Comparison Test (Pattern 4 & 5) ---');
    console.log('Diary Text:\n', diaryText);

    // 4. 新プロンプト改善案A（モチーフ複数・文字禁止） + gpt-image-2
    console.log('\n[Pattern 4] Multiple motifs + gpt-image-2');
    await generate('pattern4_motifs_gpt-image-2', 'gpt-image-2', prompt4);

    // 5. 新プロンプト改善案B（お絵かき帳情景風） + gpt-image-2
    console.log('\n[Pattern 5] Scene sketchbook + gpt-image-2');
    await generate('pattern5_scene_gpt-image-2', 'gpt-image-2', prompt5);

    console.log('\n--- Test Completed! ---');
}

main();
