const core = require("@actions/core");
const shirokumaEngineUser = process.env.SHIROKUMA_ENGINE_USER;
const shirokumaEnginePassword = process.env.SHIROKUMA_ENGINE_PASSWORD;

if (!shirokumaEngineUser || !shirokumaEnginePassword) {
    console.error('user or password not found in environment variables.');
    process.exit(1);
}

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
    const res = await fetch(`http://api.6zr.info/manage/bear/1/keyword_used_at/today`, {
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
    const results = await request(cookie);
    core.setOutput('keywords', results);
})();
