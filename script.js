const https = require('https');

const slackUrl = "https://hooks.slack.com/services/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";
const message = {
    text: "Hello, World! This script is running!"
};

const data = JSON.stringify(message);

const options = {
    hostname: 'hooks.slack.com',
    path: '/services/T0833P36XN1/B0854H09E0H/lotvEMaBxFBFm1JV0vJ44ZGc',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = https.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.setEncoding('utf8');
    res.on('data', (d) => {
        process.stdout.write(d);
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

// データを送信
req.write(data);
req.end();
