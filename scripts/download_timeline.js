const fs = require('fs');
const path = require('path'); // pathモジュールを追加
const Mastodon = require('mastodon-api'); // 例としてmastodon-apiライブラリを使用
const instanceUrl = process.env.MASTODON_INSTANCE_URL;
const accessToken = process.env.MASTODON_ACCESS_TOKEN;

if (!instanceUrl || !accessToken) {
    console.error('Mastodon instance URL or access token not found in environment variables.');
    process.exit(1);
}

const M = new Mastodon({
    access_token: accessToken,
    api_url: `https://${instanceUrl}/api/v1/`
});


// ファイルを保存するディレクトリのパス
const outputDir = './data'; // または path.join(__dirname, '../data'); など、適切なパスを設定


// M.get('timelines/home', {limit: 40}) // ホームタイムラインの例
M.get('accounts/898916/statuses', {limit: 40}) // ホームタイムラインの例
    .then(resp => {
        const timeline = resp.data;
        const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, ''); // ミリ秒を除去
        const rawFilename = `timeline-${timestamp}.json`;
        const contentsFilename = `contents.txt`;
        const rawOutputPath = path.join(outputDir, rawFilename); // path.joinでパスを結合
        const contentsOutputPath = path.join(outputDir, contentsFilename);

        // ここが重要: ディレクトリが存在しない場合は作成する
        // { recursive: true } を指定することで、途中のディレクトリも全て作成される
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
            console.log(`Directory created: ${outputDir}`);
        }

        const contents = timeline.map(t => {
            if (t == null || t.content == null) {
                return '';
            }
            return t.content.replace(/<.+?>/g, '')
        });
        const contentsText = contents.join('\n');

        fs.writeFileSync(rawOutputPath, JSON.stringify(timeline, null, 2));
        fs.writeFileSync(contentsOutputPath, contentsText);
        console.log(`Timeline saved to ${rawOutputPath}, ${contentsOutputPath}`);
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
