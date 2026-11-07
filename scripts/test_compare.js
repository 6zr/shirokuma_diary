const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const apiKey = process.env.OPENAI_APIKEY;
if (!apiKey) {
    console.error('OPENAI_APIKEY is not set');
    process.exit(1);
}

const client = new OpenAI({ apiKey });

// 別の日のサンプル日記 A（ひつじ・ラズベリー・ズッキーニ・じゃがいも）
const diaryTextA = `じゃがいもにはちみつかけると美味しいワン。白菜って食感が柔らかすぎて好みが分かれるワン。ラズベリー・果実の詩人♪ワン。ひつじは運動不足になりやすく健康管理が難しいワン。ズッキーニねワン...美味しさが感じられないワン。...ってかんじの日だったワン`;

// 別の日のサンプル日記 B（スムージー・ふとん・すじこ・冷や奴ソース）
const diaryTextB = `れんこんショウガ豆乳スムージーだワン。冷や奴と中濃ソースって合うよねワン。ふとんもいいけどふとんもいいよねワン。井の中のすじこ大海を知らずワン。ザボン狩りにいきたいワン。...ってかんじの日だったワン`;

function makePrompt9B(diary) {
    return `A delightfully crude, clumsy, and primitive crayon drawing by a 3-year-old toddler on white paper.
- The child tried to draw the motifs from the diary, but lacks motor skills: lines are extremely wobbly, shaky, and all shapes are heavily distorted and crooked.
- Crayon coloring spills significantly outside the outlines, leaving lots of uncolored white gaps and rough crayon texture.
- Do NOT draw meaningless random scribble lines or scribbly messes in the background; focus on the diary motifs drawn very crudely and clumsily.
- Strictly NO text, letters, or words. NO dogs, NO humans.
- Strictly forbid polished outlines, neat coloring, or clean symmetrical shapes. Must look genuinely unskilled and primitive.
"""
${diary}
"""`;
}

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
    console.log('--- Starting Pattern 9B Multi-Day Test ---');

    // 日記 A (ひつじ・ラズベリー等)
    console.log('\n[Day A] Sheep, Raspberry, Potato, Zucchini');
    await generate('pattern9B_dayA_sheep_raspberry', 'gpt-image-2', makePrompt9B(diaryTextA));

    // 日記 B (ふとん・すじこ・スムージー等)
    console.log('\n[Day B] Futon, Salmon roe, Smoothie, Tofu');
    await generate('pattern9B_dayB_futon_sujiko', 'gpt-image-2', makePrompt9B(diaryTextB));

    console.log('\n--- Test Completed! ---');
}

main();
