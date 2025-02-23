# DeFi 数据监控工具

这是一个用于监控加密货币和 DeFi 相关数据的自动化工具集。该工具可以定时采集市场数据，并通过 Telegram 机器人发送通知，同时提供 Web 界面查看数据。

## 功能特性

- 🔄 市场占比数据监控
- 📊 恐慌贪婪指数追踪
- 💰 稳定币市值排行 (TOP 10)
- 💸 协议费用排行 (TOP 20)
- 🤖 Telegram 机器人通知
- 🌐 Web 数据展示界面
- ⏰ 自动定时数据更新（每天早上 8:00）

## 技术栈

- Node.js
- Express.js
- node-cron
- Telegram Bot API

## 安装步骤

1. 克隆项目代码
```bash
git clone [项目地址]
cd crypto-data
```

2. 安装依赖
```bash
npm install
```

3. 配置环境变量
```bash
cp .env.example .env
```
编辑 `.env` 文件，填入以下配置：
- TELEGRAM_BOT_TOKEN：Telegram 机器人 token
- TELEGRAM_CHAT_ID：接收通知的聊天 ID

## 使用说明

### 启动服务
```bash
node index.js
```
服务将在 http://localhost:3030 启动

### 立即执行数据采集
```bash
node index.js --run-now
```

## API 接口

- GET `/api/market-data` - 获取市场占比数据
- GET `/api/stablecoins-data` - 获取稳定币排名数据
- GET `/api/fear-greed-data` - 获取恐慌贪婪指数
- GET `/api/protocol-fees-data` - 获取协议费用排名

## 数据更新频率

- 所有数据每天早上 8:00（东八区）自动更新
- 更新后通过 Telegram 机器人发送通知

## 注意事项

- 请确保 `.env` 文件中的 Telegram 配置正确
- 需要稳定的网络连接以确保数据采集
- 建议使用 PM2 等工具确保服务持续运行 