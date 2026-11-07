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

// Pattern 6: 身体的制約とデッサン崩壊を強調した日本語プロンプト
const prompt6 = `3歳の幼児がクレヨンを握りこぶしで持って、画用紙に力任せに殴り書きしたような、非常に不器用で拙い落書き（crude toddler crayon scribbles）。
- 日記に出てくる食べ物や出来事を描こうとしていますが、形がうまく捉えられず丸や線がガタガタに歪んで崩れています。
- クレヨンの色は輪郭からはみ出しまくっており、塗り残しの隙間だらけです。
- 文字、セリフ、犬、人物の姿は一切描かないこと。
- プロのようなまとまり、綺麗なデッサン、整った構図は厳禁。とにかく下手で稚拙な子供のなぐり描きにしてください。
"""
${diaryText}
"""`;

// Pattern 7: 英語の拙さキーワード（crude toddler scribbles, naive art）を軸にしたプロンプト
const prompt7 = `A crude, clumsy crayon scribbling by a 3-year-old toddler on rough white paper.
The child tried to draw the foods and motifs from the following diary, but the shapes are highly distorted, lopsided, naive, and barely recognizable.
- Thick, trembling, unsteady crayon lines. Colors scribbled violently outside the lines with messy white gaps.
- Absolutely NO text, letters, Japanese characters, or words.
- NO dogs, NO human characters.
- Must look like authentic, completely unskilled, primitive toddler scribbles. Strictly forbid polished children's book illustrations or neat outlines.
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
    console.log('--- Starting Image Comparison Test (Pattern 6 & 7) ---');
    console.log('Diary Text:\n', diaryText);

    // 6. 拙さ特化（日本語プロンプト） + gpt-image-2
    console.log('\n[Pattern 6] Clumsy toddler Japanese + gpt-image-2');
    await generate('pattern6_clumsy_ja_gpt-image-2', 'gpt-image-2', prompt6);

    // 7. 拙さ特化（英語プロンプト） + gpt-image-2
    console.log('\n[Pattern 7] Clumsy toddler English + gpt-image-2');
    await generate('pattern7_clumsy_en_gpt-image-2', 'gpt-image-2', prompt7);

    console.log('\n--- Test Completed! ---');
}

main();
