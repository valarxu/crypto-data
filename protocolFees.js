const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const config = require('./config');
const { formatUSD } = require('./utils/formatNumber');

async function getTopProtocolFees() {
    try {
        const httpsAgent = new HttpsProxyAgent(`http://${config.proxy.host}:${config.proxy.port}`);
        
        const response = await axios.get('https://api.llama.fi/overview/fees', {
            httpsAgent,
            timeout: 10000
        });
        
        // 按24小时费用排序并获取前10名
        const topProtocols = response.data.protocols
            .sort((a, b) => b.total24h - a.total24h)
            .slice(0, 20);
            
        console.log('协议费用 TOP 10（24小时）：');
        console.log('排名\t名称\t\t费用(USD)');
        console.log('--------------------------------');
        
        topProtocols.forEach((protocol, index) => {
            const formattedFees = formatUSD(protocol.total24h);
            
            console.log(
                `${index + 1}\t` +
                `${protocol.name.padEnd(8)}\t` +
                formattedFees
            );
        });
        
        return topProtocols;
    } catch (error) {
        console.error('获取协议费用数据时出错：', error.message);
        throw error;
    }
}

// 如果直接运行此文件则执行
if (require.main === module) {
    getTopProtocolFees();
}

module.exports = { getTopProtocolFees }; 