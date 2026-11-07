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

// Pattern 8A: 日本語案（立体感・構図の自然な崩れ、手先のふにゃふにゃブレ）
const prompt8A = `絵日記用に、下記の日記から特徴的な場面やモチーフを、子供がクレヨンで楽しく描いたような絵にしてください。
- 雑な殴り書きではなく、幼い子供らしい素朴で不器用なタッチにすること。
- 手先がおぼつかない子供が描いたように、線が少しふにゃふにゃと震えていたり、形が歪んでいたりして構いません。
- 立体感や遠近感は正確でなくてよく、平面的に崩れていて構いません。
- 構図やものの大きさの比率も整いすぎず、少しアンバランスで自由な配置にしてください。
- プロのような洗練されたイラスト、リアルな陰影は避けてください。
- 文字やセリフ（日本語・英語・数字問わず）は絶対に描かないこと。
- 日記の著者の姿と犬は絶対に描かないこと。
"""
${diaryText}
"""`;

// Pattern 8B: 英語案（flat perspective, tilted angles, clumsy little hands）
const prompt8B = `A cheerful crayon drawing by a young child in a sketchbook, depicting motifs from the diary.
- Not a violent scribble, but a sweet, clumsy, and naive drawing by clumsy little hands.
- Line work can wobble and shake; shapes and outlines can be slightly distorted and charmingly lopsided.
- Perspective and depth do NOT need to be accurate; flat, tilted, and uneven childlike proportions are encouraged.
- Composition should be free and slightly unbalanced, rather than neatly arranged like a professional graphic design.
- Strictly NO text, letters, numbers, or words of any kind.
- NO dogs, NO human characters.
- Avoid polished illustration, 3D shading, or neat outlines.
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
    console.log('--- Starting Image Comparison Test (Pattern 8A & 8B) ---');
    console.log('Diary Text:\n', diaryText);

    // 8A: 自然な立体感・構図の崩れ（日本語プロンプト） + gpt-image-2
    console.log('\n[Pattern 8A] Japanese unbalanced & natural clumsy + gpt-image-2');
    await generate('pattern8A_natural_clumsy_ja_gpt-image-2', 'gpt-image-2', prompt8A);

    // 8B: 自然な立体感・構図の崩れ（英語プロンプト） + gpt-image-2
    console.log('\n[Pattern 8B] English unbalanced & natural clumsy + gpt-image-2');
    await generate('pattern8B_natural_clumsy_en_gpt-image-2', 'gpt-image-2', prompt8B);

    console.log('\n--- Test Completed! ---');
}

main();
