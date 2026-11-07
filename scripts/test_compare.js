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

// Pattern 9A: 3歳児のガタガタ線＋激しいはみ出し＆塗り残し（無意味な落書き線は禁止）
const prompt9A = `3歳の幼児がクレヨンで描いたような、非常に下手で不器用な絵日記のイラスト。
- 3歳児のため手先がうまく動かず、丸や線はガタガタに激しく歪み、形が崩れています。
- クレヨンの色は輪郭線から大幅にはみ出しており、塗りつぶしには白い塗り残しの隙間がたくさんあります。
- 食べ物や出来事以外の「意味のないぐるぐる殴り書き線」や「乱暴な汚れ線」は描かず、日記のモチーフだけを一生懸命描いてください。
- 文字、セリフ、犬、人物の姿は絶対に描かないこと。
- プロのような綺麗なデッサン、整った線、均一な塗りつぶしは厳禁です。とにかく下手で拙い幼児のタッチにしてください。
"""
${diaryText}
"""`;

// Pattern 9B: 英語（crude 3-year-old, heavily distorted, coloring outside the lines, no random mess）
const prompt9B = `A delightfully crude, clumsy, and primitive crayon drawing by a 3-year-old toddler on white paper.
- The child tried to draw the motifs from the diary, but lacks motor skills: lines are extremely wobbly, shaky, and all shapes are heavily distorted and crooked.
- Crayon coloring spills significantly outside the outlines, leaving lots of uncolored white gaps and rough crayon texture.
- Do NOT draw meaningless random scribble lines or scribbly messes in the background; focus on the diary motifs drawn very crudely and clumsily.
- Strictly NO text, letters, or words. NO dogs, NO humans.
- Strictly forbid polished outlines, neat coloring, or clean symmetrical shapes. Must look genuinely unskilled and primitive.
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
    console.log('--- Starting Image Comparison Test (Pattern 9A & 9B) ---');
    console.log('Diary Text:\n', diaryText);

    // 9A: 3歳児のガタガタ線＆はみ出し（日本語） + gpt-image-2
    console.log('\n[Pattern 9A] 3yo toddler distorted & spillover (JA) + gpt-image-2');
    await generate('pattern9A_3yo_clumsy_ja_gpt-image-2', 'gpt-image-2', prompt9A);

    // 9B: 3歳児のガタガタ線＆はみ出し（英語） + gpt-image-2
    console.log('\n[Pattern 9B] 3yo toddler distorted & spillover (EN) + gpt-image-2');
    await generate('pattern9B_3yo_clumsy_en_gpt-image-2', 'gpt-image-2', prompt9B);

    console.log('\n--- Test Completed! ---');
}

main();
