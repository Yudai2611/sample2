// Slackにメッセージを送信する関数
async function sendToSlack(message) {
    const slackUrl = process.env.SLACK_WEBHOOK_URL;

    // SLACK_WEBHOOK_URLが設定されているか確認
    if (!slackUrl) {
        console.error('SLACK_WEBHOOK_URL is not defined. Please set it in your environment variables.');
        return; // URLが未定義の場合は処理を中止
    }

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
    const message = "hello slack"; // 送信するメッセージ
    await sendToSlack(message); // Slackにメッセージを送信
}

// 関数を呼び出して実行
main();
