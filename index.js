require('dotenv').config();
const cron = require('node-cron');
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const path = require('path');
const { getMarketDominance } = require('./marketDominance');
const { getFearGreedIndex } = require('./fearGreedIndex');
const { getTopStablecoins } = require('./stablecoinsRanking');


// 初始化 Express 应用
const app = express();
const PORT = 3030;

// 设置静态文件目录
app.use(express.static('public'));

// API 路由
app.get('/api/market-data', (req, res) => {
    res.sendFile(path.join(__dirname, 'market_data.json'));
});

app.get('/api/stablecoins-data', (req, res) => {
    res.sendFile(path.join(__dirname, 'stablecoins_data.json'));
});

app.get('/api/fear-greed-data', (req, res) => {
    res.sendFile(path.join(__dirname, 'fear_greed_data.json'));
});



// 主页路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});

// 初始化 Telegram Bot
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// 运行所有任务并发送报告
async function runAllTasks() {
    const results = [];
    const timestamp = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    
    // 定义所有任务
    const tasks = [
        { name: '市场占比数据', func: getMarketDominance },
        { name: '恐慌贪婪指数', func: getFearGreedIndex },
        { name: '稳定币排名', func: getTopStablecoins },

    ];

    // 执行所有任务
    for (const task of tasks) {
        try {
            await task.func();
            results.push(`✅ ${task.name}: 成功`);
        } catch (error) {
            results.push(`❌ ${task.name}: 失败 (${error.message})`);
        }
    }

    // 生成报告消息
    const message = `
📊 加密市场数据采集报告
🕒 ${timestamp}

${results.join('\n')}
`;

    // 发送到 Telegram
    try {
        await bot.sendMessage(TELEGRAM_CHAT_ID, message);
        console.log('Telegram 通知已发送');
    } catch (error) {
        console.error('发送 Telegram 通知失败:', error.message);
    }
}

// 设置定时任务 - 每天早上 8:00 运行
cron.schedule('0 8 * * *', runAllTasks, {
    timezone: 'Asia/Shanghai'
});

console.log('定时任务已启动，将在每天早上 8:00 (东八区) 运行');

// 立即执行一次（用于测试）
if (process.argv.includes('--run-now')) {
    console.log('立即执行任务...');
    runAllTasks();
}