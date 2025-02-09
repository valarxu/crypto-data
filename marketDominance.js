const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const config = require('./config');

async function getMarketDominance() {
    try {
        const httpsAgent = new HttpsProxyAgent(`http://${config.proxy.host}:${config.proxy.port}`);
        
        const response = await axios.get('https://api.coingecko.com/api/v3/global', {
            httpsAgent,
            timeout: 10000 // 设置10秒超时
        });
        
        const data = response.data.data;
        
        const btcDominance = data.market_cap_percentage.btc;
        const usdtDominance = data.market_cap_percentage.usdt;
        const usdcDominance = data.market_cap_percentage.usdc;
        
        console.log('市场占比数据：');
        console.log(`比特币占比: ${btcDominance.toFixed(2)}%`);
        console.log(`USDT占比: ${usdtDominance.toFixed(2)}%`);
        console.log(`USDC占比: ${usdcDominance.toFixed(2)}%`);
        console.log(`稳定币总占比: ${(usdtDominance + usdcDominance).toFixed(2)}%`);
        
        return {
            btcDominance,
            usdtDominance,
            usdcDominance,
            stablecoinDominance: usdtDominance + usdcDominance
        };
    } catch (error) {
        console.error('获取市场占比数据时出错：', error.message);
        throw error;
    }
}

// 如果直接运行此文件则执行
if (require.main === module) {
    getMarketDominance();
}

module.exports = { getMarketDominance }; 