// Slackにメッセージを送信する関数
async function sendToSlack(message) {
    const slackUrl = process.env.SLACK_WEBHOOK_URL;
    const body = JSON.stringify({ text: message });

    try {
        const response = await fetch(slackUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: body,
        });
        if (!response.ok) throw new Error(`Slack error! status: ${response.status}`);
    } catch (error) {
        console.error('Error sending to Slack:', error);
    }
}

// メイン関数
async function main() {
    const message = "hello world"; // 送信するメッセージ
    await sendToSlack(message); // Slackにメッセージを送信
}

// 関数を呼び出して実行
main();
