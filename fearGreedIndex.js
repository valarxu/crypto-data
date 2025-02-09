const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const config = require('./config');

async function getFearGreedIndex() {
    try {
        const httpsAgent = new HttpsProxyAgent(`http://${config.proxy.host}:${config.proxy.port}`);
        
        const response = await axios.get('https://api.alternative.me/fng/', {
            httpsAgent,
            timeout: 10000 // 设置10秒超时
        });
        
        const data = response.data;
        
        if (data.data && data.data[0]) {
            const today = data.data[0];
            console.log('比特币恐慌贪婪指数：');
            console.log(`数值: ${today.value}`);
            console.log(`分类: ${today.value_classification}`);
            console.log(`时间戳: ${today.timestamp}`);
            return today;
        }
    } catch (error) {
        console.error('获取恐慌贪婪指数时出错：', error.message);
        throw error;
    }
}

// 如果直接运行此文件则执行
if (require.main === module) {
    getFearGreedIndex();
}

module.exports = { getFearGreedIndex }; 