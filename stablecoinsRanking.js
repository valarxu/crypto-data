const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const config = require('./config');
const { formatUSD } = require('./utils/formatNumber');

async function getTopStablecoins() {
    try {
        const httpsAgent = new HttpsProxyAgent(`http://${config.proxy.host}:${config.proxy.port}`);
        
        const response = await axios.get('https://stablecoins.llama.fi/stablecoins?includePrices=true', {
            httpsAgent,
            timeout: 10000
        });
        
        // 按市值排序并获取前10名
        const topStablecoins = response.data.peggedAssets
            .sort((a, b) => b.circulating.peggedUSD - a.circulating.peggedUSD)
            .slice(0, 10);
            
        console.log('稳定币市值 TOP 10：');
        console.log('排名\t名称\t\t市值(USD)');
        console.log('--------------------------------');
        
        topStablecoins.forEach((coin, index) => {
            // 格式化输出前确保数据有效
            const formattedValue = formatUSD(coin.circulating.peggedUSD);
            
            console.log(
                `${index + 1}\t` +
                `${coin.symbol.padEnd(8)}\t` +
                formattedValue
            );
        });
        
        return topStablecoins;
    } catch (error) {
        console.error('获取稳定币数据时出错：', error.message);
        throw error;
    }
}

// 如果直接运行此文件则执行
if (require.main === module) {
    getTopStablecoins();
}

module.exports = { getTopStablecoins }; 