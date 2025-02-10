const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const DATA_FILE_PATH = path.join(__dirname, 'fear_greed_data.json');

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

async function getFearGreedIndex() {
    try {
        const response = await retryOperation(() =>
            axios.get('https://api.alternative.me/fng/', {
                timeout: 10000
            })
        );
        
        const data = response.data;
        
        if (data.data && data.data[0]) {
            const today = data.data[0];
            const timestamp = new Date().toISOString();
            
            console.log('比特币恐慌贪婪指数：');
            console.log(`数值: ${today.value}`);
            console.log(`分类: ${today.value_classification}`);
            console.log(`时间戳: ${timestamp}`);

            const indexData = {
                timestamp,
                value: parseInt(today.value),
                classification: today.value_classification
            };

            await saveData(indexData);
            return indexData;
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