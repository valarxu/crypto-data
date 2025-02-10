const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const DATA_FILE_PATH = path.join(__dirname, 'market_data.json');

async function retryOperation(operation, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            if (attempt === maxRetries) {
                throw error;
            }
            console.log(`尝试第 ${attempt} 次失败，1分钟后重试...`);
            await new Promise(resolve => setTimeout(resolve, 60000)); // 等待1分钟
        }
    }
}

async function saveMarketData(newData) {
    try {
        // 读取现有数据
        let existingData = [];
        try {
            const fileContent = await fs.readFile(DATA_FILE_PATH, 'utf-8');
            existingData = JSON.parse(fileContent);
        } catch (error) {
            // 如果文件不存在或为空，使用空数组
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }

        // 添加新数据
        existingData.push(newData);

        // 写入文件
        await fs.writeFile(DATA_FILE_PATH, JSON.stringify(existingData, null, 2), 'utf-8');
        console.log('\n数据已保存到:', DATA_FILE_PATH);
    } catch (error) {
        console.error('保存数据时出错：', error.message);
        throw error;
    }
}

async function getMarketDominance() {
    try {
        const response = await retryOperation(() => 
            axios.get('https://api.coingecko.com/api/v3/global', {
                timeout: 10000
            })
        );
        
        const data = response.data.data;
        const timestamp = new Date(data.updated_at * 1000);
        
        console.log('数据更新时间：', timestamp.toLocaleString());
        console.log('\n市场总览：');
        console.log(`总市值: $${(data.total_market_cap.usd / 1e9).toFixed(2)}B`);
        
        console.log('\n各代币市值占比：');
        // 输出所有代币占比
        Object.entries(data.market_cap_percentage)
            .sort((a, b) => b[1] - a[1]) // 按占比从大到小排序
            .forEach(([symbol, percentage]) => {
                console.log(`${symbol.toUpperCase()}: ${percentage.toFixed(2)}%`);
            });
        
        // 计算稳定币占比
        const stablecoinDominance = data.market_cap_percentage.usdt + data.market_cap_percentage.usdc;
        console.log(`\n稳定币总占比: ${stablecoinDominance.toFixed(2)}%`);
        
        const marketData = {
            timestamp: timestamp.toISOString(),
            totalMarketCap: data.total_market_cap.usd,
            marketCapPercentages: data.market_cap_percentage,
            stablecoinDominance
        };

        // 保存数据到JSON文件
        await saveMarketData(marketData);
        
        return marketData;
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