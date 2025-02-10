const axios = require('axios');
const { formatUSD } = require('./utils/formatNumber');
const fs = require('fs').promises;
const path = require('path');

const DATA_FILE_PATH = path.join(__dirname, 'protocol_fees_data.json');

async function retryOperation(operation, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            if (attempt === maxRetries) {
                throw error;
            }
            console.log(`尝试第 ${attempt} 次失败，1分钟后重试...`);
            await new Promise(resolve => setTimeout(resolve, 60000));
        }
    }
}

async function saveData(newData) {
    try {
        let existingData = [];
        try {
            const fileContent = await fs.readFile(DATA_FILE_PATH, 'utf-8');
            existingData = JSON.parse(fileContent);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }

        existingData.push(newData);
        await fs.writeFile(DATA_FILE_PATH, JSON.stringify(existingData, null, 2), 'utf-8');
        console.log('\n数据已保存到:', DATA_FILE_PATH);
    } catch (error) {
        console.error('保存数据时出错：', error.message);
        throw error;
    }
}

async function getTopProtocolFees() {
    try {
        const response = await retryOperation(() =>
            axios.get('https://api.llama.fi/overview/fees', {
                timeout: 10000
            })
        );
        
        const topProtocols = response.data.protocols
            .sort((a, b) => b.total24h - a.total24h)
            .slice(0, 20);
            
        console.log('协议费用 TOP 20（24小时）：');
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

        const protocolData = {
            timestamp: new Date().toISOString(),
            protocols: topProtocols.map(protocol => ({
                name: protocol.name,
                total24h: protocol.total24h,
                total7d: protocol.total7d,
                total30d: protocol.total30d
            }))
        };
        
        await saveData(protocolData);
        return protocolData;
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