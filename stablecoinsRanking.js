const axios = require('axios');
const { formatUSD } = require('./utils/formatNumber');
const fs = require('fs').promises;
const path = require('path');

const DATA_FILE_PATH = path.join(__dirname, 'stablecoins_data.json');

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

async function getTopStablecoins() {
    try {
        const response = await retryOperation(() =>
            axios.get('https://stablecoins.llama.fi/stablecoins?includePrices=true', {
                timeout: 10000
            })
        );
        
        // 计算稳定币总市值
        const totalStablecoinsCap = response.data.peggedAssets.reduce(
            (sum, coin) => sum + coin.circulating.peggedUSD, 
            0
        );

        // 获取前3大稳定币
        const topStablecoins = response.data.peggedAssets
            .sort((a, b) => b.circulating.peggedUSD - a.circulating.peggedUSD)
            .slice(0, 3);
            
        console.log('稳定币市值统计：');
        console.log('--------------------------------');
        console.log(`稳定币总市值：${formatUSD(totalStablecoinsCap)}`);
        console.log('\n前3大稳定币：');
        console.log('排名\t名称\t\t市值(USD)\t占比');
        console.log('--------------------------------');
        
        topStablecoins.forEach((coin, index) => {
            const marketCap = coin.circulating.peggedUSD;
            const percentage = (marketCap / totalStablecoinsCap * 100).toFixed(2);
            console.log(
                `${index + 1}\t` +
                `${coin.symbol.padEnd(8)}\t` +
                `${formatUSD(marketCap)}\t` +
                `${percentage}%`
            );
        });

        const stablecoinsData = {
            timestamp: new Date().toISOString(),
            totalStablecoinsCap: totalStablecoinsCap,
            topStablecoins: topStablecoins.map(coin => ({
                symbol: coin.symbol,
                name: coin.name,
                marketCap: coin.circulating.peggedUSD
            }))
        };
        
        await saveData(stablecoinsData);
        return stablecoinsData;
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