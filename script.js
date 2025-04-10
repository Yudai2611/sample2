// 検索する日付を指定する。
const cmStartDt = new Date("2025-03-24");
const cmEndDt = new Date("2025-04-18");
const pmStartDt = new Date("2025-01-01"); //
const pmEndDt = new Date(cmStartDt);
pmEndDt.setDate(pmEndDt.getDate() - 1);

const startId = 1000; // 要削除
const endId = 1200; // 要削除

// プロジェクトとステータスの条件
const targetProject = { name: '問い合わせ' };
const targetStatusNew = { id: 1, name: '新規' };
const targetStatusEnd = { id: 5, name: '終了' };

// データを取得する関数
async function fetchData(id) {
    const url = `http://redmine.service.jissou.kccs.local:3000/issues/${id}.json?format=json&key=c7017a6546852205f40b8a410b82ca5756842010`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return (await response.json()).issue;
    } catch (error) {
        return null;
    }
}

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

// 一致するかどうかを判定する関数
function isMatching1(issue, status) {
    return issue.project.name === targetProject.name && issue.status.id === status.id;
}

function isMatching2(issue) {
    return issue.project.name === targetProject.name;
}

// 日付を比較する関数
function isUpdatedRecently(updatedOn) {
    const updatedDate = new Date(updatedOn);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    return updatedDate.toDateString() === today.toDateString() || updatedDate.toDateString() === yesterday.toDateString();
}

// メイン関数
async function findIssues() {
    // countとstoreを初期化
    let count = { NDone: { period1: 0, period2: 0 }, Doing: { period1: 0, period2: 0 }, Done: { period1: 0, period2: 0 } };
    const store = { NDone: { period1: [], period2: [] }, Doing: { period1: [], period2: [] }, Done: { period1: [], period2: [] } };
    
    for (let id = startId; id <= endId; id++) {
        const issue = await fetchData(id);
        if (!issue) continue;

        const issueStartDate = new Date(issue.start_date);
        const assignedTo = issue.assigned_to ? issue.assigned_to.name : "未割り当て";
        const isRecentlyUpdated = isUpdatedRecently(issue.updated_on);

        // 未対応
        if (isMatching1(issue, targetStatusNew)) {
            if (issueStartDate >= cmStartDt && issueStartDate <= cmEndDt) {
                count.NDone.period1++;
                store.NDone.period1.push(`${isRecentlyUpdated ? '*' : ''}[未対応][${assignedTo.split(' ')[0]}] ${issue.subject}${isRecentlyUpdated ? '(更新)*' : ''}`);
            } else if (issueStartDate >= pmStartDt && issueStartDate <= pmEndDt) {
                count.NDone.period2++;
                store.NDone.period2.push(`${isRecentlyUpdated ? '*' : ''}[未対応][${assignedTo.split(' ')[0]}] ${issue.subject}${isRecentlyUpdated ? '(更新)*' : ''}`);
            }
        }
        // 対応中
        else if (isMatching2(issue) && issue.status.id !== targetStatusNew.id && issue.status.id !== targetStatusEnd.id) {
            if (issueStartDate >= cmStartDt && issueStartDate <= cmEndDt) {
                count.Doing.period1++;
                store.Doing.period1.push(`${isRecentlyUpdated ? '*' : ''}[対応中][${assignedTo.split(' ')[0]}] ${issue.subject}${isRecentlyUpdated ? '(更新)*' : ''}`);
            } else if (issueStartDate >= pmStartDt && issueStartDate <= pmEndDt) {
                count.Doing.period2++;
                store.Doing.period2.push(`${isRecentlyUpdated ? '*' : ''}[対応中][${assignedTo.split(' ')[0]}] ${issue.subject}${isRecentlyUpdated ? '(更新)*' : ''}`);
            }
        }
        // 完了
        if (isMatching1(issue, targetStatusEnd)) {
            const issueEndDate = new Date(issue.custom_fields.find(field => field.name === "完了日")?.value);
            if (issueStartDate >= pmStartDt && issueStartDate <= pmEndDt && issueEndDate >= cmStartDt && issueEndDate <= cmEndDt) {
                count.Done.period2++;
                store.Done.period2.push(`${isRecentlyUpdated ? '*' : ''}[完了][${assignedTo.split(' ')[0]}] ${issue.subject}${isRecentlyUpdated ? '(更新)*' : ''}`);
            } else if (issueStartDate >= cmStartDt && issueStartDate <= cmEndDt) {
                count.Done.period1++;
                store.Done.period1.push(`${isRecentlyUpdated ? '*' : ''}[完了][${assignedTo.split(' ')[0]}] ${issue.subject}${isRecentlyUpdated ? '(更新)*' : ''}`);
            }
        }
    }

    const formatDate = (date) => date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric' });
    const month = cmEndDt.getMonth() + 1;

    let summaryMessage = `問い合わせ状況の共有です。\n[${month}月度状況　${formatDate(cmStartDt)} ～ ${formatDate(cmEndDt)}]\n【問い合わせ件数】\n`;
    const totalNew = count.NDone.period1 + count.Doing.period1 + count.Done.period1;
    const totalCarryover = count.NDone.period2 + count.Doing.period2 + count.Done.period2;

    summaryMessage += `・新規：${totalNew}件\n・前月からの持越し：${totalCarryover}件\n合計: ${totalNew + totalCarryover}件\n\n【対応状況】\n`;

    const summaries = [
        { count: count.NDone, issues: store.NDone, label: '未対応' },
        { count: count.Doing, issues: store.Doing, label: '対応中' },
        { count: count.Done, issues: store.Done, label: '完了' },
    ];

    for (const { count, issues, label } of summaries) {
        summaryMessage += `★${label}：${count.period1 + count.period2}件\n＜新規＞\n${count.period1}件\n`;
        if (count.period1 > 0) {
            issues.period1.forEach((subject, index) => {
                summaryMessage += `${index + 1}. ${subject}\n`;
            });
        }
        summaryMessage += `＜前月からの持越し＞\n${count.period2}件\n`;
        if (count.period2 > 0) {
            issues.period2.forEach((subject, index) => {
                summaryMessage += `${index + 1}. ${subject}\n`;
            });
        }
        summaryMessage += '\n';
    }

    // Slackに一括でメッセージを送信
    console.log(summaryMessage);
    await sendToSlack(summaryMessage);
}

// 関数を呼び出して実行
findIssues();
