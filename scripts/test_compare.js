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

// 従来プロンプト
const legacyPromptPrefix = '絵日記用に、下記の日記から特徴的な場面を子供がクレヨンで描いたような絵にしてください。ただし日記の著者の姿と犬は絶対に描かないこと。';
const legacyPrompt = `${legacyPromptPrefix}\n"""\n${diaryText}\n"""`;

// 改善プロンプト（gpt-image-2向け）
const newPrompt = `絵日記用に、下記の日記から【最も印象的なモチーフを1つだけ】選んで、4〜5歳の幼稚園児がクレヨンで画用紙に殴り書きしたような、非常にシンプルで拙い絵にしてください。
- 背景は何も描かず、白い余白のままにしてください。
- 遠近感や立体感、陰影は一切つけず、ふにゃふにゃした太い線とはみ出したベタ塗りで描くこと。
- プロのイラストや絵本のような細かい描き込み・リアルな質感は禁止です。
- 日記の著者の姿と犬は絶対に描かないこと。
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
    console.log('--- Starting Image Comparison Test ---');
    console.log('Diary Text:\n', diaryText);

    // 1. 従来プロンプト + gpt-image-1 (または 1-mini)
    console.log('\n[Pattern 1] Legacy Prompt + gpt-image-1');
    const p1Success = await generate('pattern1_legacy_gpt-image-1', 'gpt-image-1', legacyPrompt);
    if (!p1Success) {
        console.log('gpt-image-1 failed. Falling back to gpt-image-1-mini for Pattern 1...');
        await generate('pattern1_legacy_gpt-image-1-mini', 'gpt-image-1-mini', legacyPrompt);
    }

    // 2. 従来プロンプト + gpt-image-2
    console.log('\n[Pattern 2] Legacy Prompt + gpt-image-2');
    await generate('pattern2_legacy_gpt-image-2', 'gpt-image-2', legacyPrompt);

    // 3. 新プロンプト + gpt-image-2
    console.log('\n[Pattern 3] New Prompt + gpt-image-2');
    await generate('pattern3_new_gpt-image-2', 'gpt-image-2', newPrompt);

    console.log('\n--- Test Completed! ---');
}

main();
