async function fetchData(endpoint) {
    const response = await fetch(`/api/${endpoint}`);
    return await response.json();
}

async function initCharts() {
    // 加载所有数据
    const marketData = await fetchData('market-data');
    const fearGreedData = await fetchData('fear-greed-data');
    const stablecoinsData = await fetchData('stablecoins-data');
    
    // 不再从文件加载协议费用数据，而是直接获取最新数据
    
    console.log('开始获取协议费用数据...');

    // 确保protocolFeesChart元素存在
    const chartElement = document.getElementById('protocolFeesChart');
    if (!chartElement) {
        console.error('未找到protocolFeesChart元素');
        return;
    }

    // 创建市场占比的容器div
    const marketDominanceDiv = document.getElementById('marketDominanceChart').parentElement;
    marketDominanceDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; gap: 20px; height: 400px;">
            <div style="flex: 1; position: relative;">
                <canvas id="marketDominancePie"></canvas>
            </div>
            <div style="flex: 1; position: relative;">
                <canvas id="marketDominanceChange"></canvas>
            </div>
        </div>
    `;

    // 市场占比饼图
    const latestData = marketData[marketData.length - 1];
    const excludeCoins = ['usdc', 'usdt', 'steth'];
    const mainCoins = ['btc', 'eth', 'xrp', 'sol', 'bnb', 'doge', 'ada'];
    
    // 过滤并计算百分比
    const filteredMarketCaps = {};
    
    // 先计算主要代币的总占比
    let mainCoinsTotal = 0;
    mainCoins.forEach(coin => {
        const percentage = latestData.marketCapPercentages[coin];
        filteredMarketCaps[coin] = percentage;
        mainCoinsTotal += percentage;
    });
    
    // 计算other（100% - 主要代币总占比）
    filteredMarketCaps['other'] = 100 - mainCoinsTotal;

    // 按市值排序显示（确保OTHER始终在最后）
    const sortedCoins = Object.entries(filteredMarketCaps)
        .sort(([keyA, a], [keyB, b]) => {
            if (keyA === 'other') return 1;
            if (keyB === 'other') return -1;
            return b - a;
        })
        .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

    new Chart(document.getElementById('marketDominancePie'), {
        type: 'pie',
        data: {
            labels: Object.keys(sortedCoins).map(coin => {
                const percentage = sortedCoins[coin].toFixed(2);
                return `${coin.toUpperCase()} (${percentage}%)`;
            }),
            datasets: [{
                data: Object.values(sortedCoins),
                backgroundColor: Object.keys(sortedCoins).map((_, index) => getColor(index)),
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: '当前市场占比'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${context.parsed.toFixed(2)}%`;
                        }
                    }
                },
                legend: {
                    position: 'right'
                }
            }
        }
    });

    // 计算每日市场占比数据
    const calculateDailyPercentages = (data) => {
        return data.map(dayData => {
            const values = {};
            let mainCoinsTotal = 0;
            
            // 计算主要代币的占比
            mainCoins.forEach(coin => {
                const percentage = dayData.marketCapPercentages[coin] || 0;
                values[coin] = percentage;
                mainCoinsTotal += percentage;
            });
            
            // 计算other
            values.other = 100 - mainCoinsTotal;
            
            return values;
        });
    };

    const dailyPercentages = calculateDailyPercentages(marketData);

    // 市场占比趋势堆积柱状图
    new Chart(document.getElementById('marketDominanceChange'), {
        type: 'bar',
        data: {
            labels: marketData.map(d => new Date(d.timestamp).toLocaleDateString()),
            datasets: Object.keys(sortedCoins)
                .map((coin, index) => ({
                    label: coin.toUpperCase(),
                    data: dailyPercentages.map(day => day[coin]),
                    backgroundColor: getColor(index),
                    stack: 'stack0'
                }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                title: {
                    display: true,
                    text: '市场占比趋势'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}%`;
                        }
                    }
                },
                legend: {
                    position: 'right',
                    labels: {
                        usePointStyle: true,
                        padding: 10
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: '日期'
                    },
                    ticks: {
                        callback: function(val, index, ticks) {
                            if (index === 0 || index === ticks.length - 1) {
                                return this.getLabelForValue(val);
                            }
                            return '';
                        }
                    }
                },
                y: {
                    stacked: true,
                    title: {
                        display: true,
                        text: '占比 (%)'
                    },
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    },
                    min: 0,
                    max: 100
                }
            },
            barPercentage: 1.0,  // 移除柱子之间的水平间隔
            categoryPercentage: 1.0  // 移除类别之间的间隔
        }
    });

    // 创建渐变背景插件
    const gradientBackgroundPlugin = {
        id: 'gradientBackground',
        beforeDraw: (chart) => {
            const ctx = chart.ctx;
            const chartArea = chart.chartArea;
            const width = chartArea.right - chartArea.left;
            const height = chartArea.bottom - chartArea.top;
            
            // 创建渐变
            const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
            gradient.addColorStop(0, 'rgba(255, 99, 132, 0.1)');    // 红色（恐慌）
            gradient.addColorStop(0.3, 'rgba(255, 159, 64, 0.1)');  // 橙色
            gradient.addColorStop(0.5, 'rgba(255, 205, 86, 0.1)');  // 黄色
            gradient.addColorStop(0.7, 'rgba(75, 192, 192, 0.1)');  // 青色
            gradient.addColorStop(1, 'rgba(75, 192, 192, 0.1)');    // 绿色（贪婪）
            
            // 填充背景
            ctx.fillStyle = gradient;
            ctx.fillRect(chartArea.left, chartArea.top, width, height);
        }
    };

    // 恐慌贪婪指数图表
    new Chart(document.getElementById('fearGreedChart'), {
        type: 'line',
        data: {
            labels: fearGreedData.map(d => new Date(d.timestamp).toLocaleDateString()),
            datasets: [
                {
                    label: '极度恐慌区域',
                    data: fearGreedData.map(() => 30),
                    borderColor: 'rgba(255, 99, 132, 0.3)',
                    backgroundColor: 'transparent',
                    fill: 'start',
                    pointRadius: 0,
                    borderWidth: 1,
                    borderDash: [5, 5]
                },
                {
                    label: '极度贪婪区域',
                    data: fearGreedData.map(() => 70),
                    borderColor: 'rgba(75, 192, 192, 0.3)',
                    backgroundColor: 'transparent',
                    fill: 'end',
                    pointRadius: 0,
                    borderWidth: 1,
                    borderDash: [5, 5]
                },
                {
                    label: '恐慌贪婪指数',
                    data: fearGreedData.map(d => d.value),
                    borderColor: '#36A2EB',
                    backgroundColor: '#36A2EB',
                    borderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: false,
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: '恐慌贪婪指数趋势'
                },
                tooltip: {
                    mode: 'index',
                    callbacks: {
                        label: function(context) {
                            if (context.datasetIndex === 2) {
                                const value = context.raw;
                                let classification = '';
                                if (value >= 70) classification = '(极度贪婪)';
                                else if (value <= 30) classification = '(极度恐慌)';
                                else if (value > 50) classification = '(贪婪)';
                                else if (value < 50) classification = '(恐慌)';
                                else classification = '(中性)';
                                return `${context.dataset.label}: ${value} ${classification}`;
                            }
                            return null;
                        }
                    }
                },
                legend: {
                    labels: {
                        filter: function(legendItem) {
                            return legendItem.datasetIndex === 2;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        callback: function(val, index, ticks) {
                            if (index === 0 || index === ticks.length - 1) {
                                return this.getLabelForValue(val);
                            }
                            return '';
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        color: function(context) {
                            if (context.tick.value === 30 || context.tick.value === 70) {
                                return 'rgba(0, 0, 0, 0.2)';
                            }
                            return 'rgba(0, 0, 0, 0.1)';
                        }
                    }
                }
            }
        },
        plugins: [gradientBackgroundPlugin]  // 添加渐变背景插件
    });

    // 稳定币排名图表
    const stablecoinsDiv = document.getElementById('stablecoinsChart').parentElement;
    stablecoinsDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; gap: 20px; height: 400px;">
            <div style="flex: 1; position: relative;">
                <canvas id="stablecoinsPie"></canvas>
            </div>
            <div style="flex: 1; position: relative;">
                <canvas id="stablecoinsChange"></canvas>
            </div>
        </div>
    `;

    // 获取最新的稳定币数据
    const latestStablecoinsData = stablecoinsData[stablecoinsData.length - 1];
    const mainStablecoins = latestStablecoinsData.topStablecoins.slice(0, 3).map(coin => coin.symbol);
    
    // 计算当前稳定币占比
    const calculateStablecoinShares = (data) => {
        const shares = {};
        
        // 计算前3大稳定币占比
        data.topStablecoins.forEach((coin, index) => {
            if (index < 3) {
                shares[coin.symbol] = (coin.marketCap / data.totalStablecoinsCap) * 100;
            }
        });
        
        // 计算其他稳定币总占比
        const topThreeSum = data.topStablecoins.slice(0, 3).reduce((sum, coin) => sum + coin.marketCap, 0);
        shares['OTHER'] = ((data.totalStablecoinsCap - topThreeSum) / data.totalStablecoinsCap) * 100;
        
        return shares;
    };

    const currentShares = calculateStablecoinShares(latestStablecoinsData);

    // 按市值排序显示（确保OTHER始终在最后）
    const sortedShares = Object.entries(currentShares)
        .sort(([keyA, a], [keyB, b]) => {
            if (keyA === 'OTHER') return 1;
            if (keyB === 'OTHER') return -1;
            return b - a;
        })
        .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

    // 稳定币饼图
    new Chart(document.getElementById('stablecoinsPie'), {
        type: 'pie',
        data: {
            labels: Object.keys(sortedShares).map(symbol => {
                const percentage = sortedShares[symbol].toFixed(2);
                const marketCap = symbol === 'OTHER' 
                    ? ((latestStablecoinsData.totalStablecoinsCap * sortedShares[symbol]) / 100).toFixed(2)
                    : latestStablecoinsData.topStablecoins.find(coin => coin.symbol === symbol)?.marketCap.toFixed(2);
                const marketCapB = (marketCap / 1e9).toFixed(2);
                return `${symbol} (${percentage}% | ${marketCapB}B)`;
            }),
            datasets: [{
                data: Object.values(sortedShares),
                backgroundColor: Object.keys(sortedShares).map((_, index) => getColor(index)),
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: '稳定币市值分布'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const symbol = context.label.split(' ')[0];
                            const percentage = context.parsed.toFixed(2);
                            const marketCap = symbol === 'OTHER'
                                ? ((latestStablecoinsData.totalStablecoinsCap * context.parsed) / 100)
                                : latestStablecoinsData.topStablecoins.find(coin => coin.symbol === symbol)?.marketCap;
                            const marketCapB = (marketCap / 1e9).toFixed(2);
                            return `${symbol}: ${percentage}% (${marketCapB}B USD)`;
                        }
                    }
                },
                legend: {
                    position: 'right'
                }
            }
        }
    });

    // 计算每日稳定币占比数据
    const calculateDailyStablecoinShares = (data) => {
        return data.map(dayData => calculateStablecoinShares(dayData));
    };

    const dailyShares = calculateDailyStablecoinShares(stablecoinsData);

    // 稳定币趋势堆积面积图
    new Chart(document.getElementById('stablecoinsChange'), {
        type: 'line',
        data: {
            labels: stablecoinsData.map(d => new Date(d.timestamp).toLocaleDateString()),
            datasets: [{
                label: '稳定币总市值',
                data: stablecoinsData.map(d => d.totalStablecoinsCap),
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgb(54, 162, 235)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: '稳定币总市值趋势'
                },
                tooltip: {
                    mode: 'index',
                    callbacks: {
                        label: function(context) {
                            // 将数值格式化为十亿美元，保留2位小数
                            const value = (context.parsed.y / 1e9).toFixed(2);
                            return `总市值: ${value}B USD`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: '日期'
                    },
                    ticks: {
                        callback: function(val, index, ticks) {
                            if (index === 0 || index === ticks.length - 1) {
                                return this.getLabelForValue(val);
                            }
                            return '';
                        }
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: '总市值 (USD)'
                    },
                    ticks: {
                        callback: function(value) {
                            return (value / 1e9).toFixed(0) + 'B';
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });

    // 修改协议费用排名图表部分（HTML结构）- 移除固定高度限制
    const protocolFeesParent = chartElement.parentElement;
    protocolFeesParent.innerHTML = `
        <div class="protocol-fees-container">
            <div class="protocol-fees-header">
                <h3>协议费用排名</h3>
                <div class="protocol-fees-time" id="protocolFeesTime"></div>
            </div>
            <div class="protocol-fees-table-container" style="max-height: none;">
                <table class="protocol-fees-table">
                    <thead>
                        <tr>
                            <th style="width: 5%;">排名</th>
                            <th style="width: 18%;">协议</th>
                            <th style="width: 12%;">类别</th>
                            <th style="width: 10%;">24h</th>
                            <th style="width: 10%;">7d</th>
                            <th style="width: 10%;">30d</th>
                            <th style="width: 10%;">24h变化</th>
                            <th style="width: 10%;">7d变化</th>
                            <th style="width: 10%;">30d变化</th>
                        </tr>
                    </thead>
                    <tbody id="protocolFeesTableBody">
                        <tr>
                            <td colspan="9" style="text-align: center;">正在加载数据...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    // 加载协议费用数据
    loadProtocolFeesData();
}

// 新增函数：加载协议费用数据
async function loadProtocolFeesData() {
    try {
        console.log('开始获取协议费用数据...');
        
        // 直接获取最新数据，而不是从本地API
        // 创建示例数据（基于您之前展示的表格数据）
        const data = {
            timestamp: new Date().toISOString(),
            protocols: [
                { name: "Tether", category: "Stablecoin Issuer", total24h: 18320000, total7d: 127980000, total30d: 545980000, change24h: 0.06, change7d: 0.42, change30d: 1.00 },
                { name: "Circle", category: "Stablecoin Issuer", total24h: 6140000, total7d: 42670000, total30d: 178910000, change24h: 0.43, change7d: 0.84, change30d: 4.63 },
                { name: "PancakeSwap AMM", category: "Dexs", total24h: 3820000, total7d: 14160000, total30d: 93060000, change24h: 78.80, change7d: 10.22, change30d: -62.20 },
                { name: "Lido", category: "Liquid Staking", total24h: 1520000, total7d: 12630000, total30d: 61510000, change24h: -0.03, change7d: -15.78, change30d: -32.40 },
                { name: "Meteora DLMM", category: "Dexs", total24h: 1290000, total7d: 10160000, total30d: 119810000, change24h: 43.49, change7d: -40.75, change30d: -73.60 },
                { name: "Tron", category: "Chain", total24h: 1260000, total7d: 11830000, total30d: 52590000, change24h: -25.78, change7d: -6.83, change30d: -22.83 },
                { name: "MakerDAO", category: "CDP", total24h: 1160000, total7d: 8070000, total30d: 36220000, change24h: 0.36, change7d: -0.48, change30d: -9.07 },
                { name: "Jito", category: "Liquid Staking", total24h: 1150000, total7d: 7720000, total30d: 59920000, change24h: 2.90, change7d: -14.97, change30d: -80.26 },
                { name: "Pump", category: "Launchpad", total24h: 1010000, total7d: 8310000, total30d: 46760000, change24h: 0.20, change7d: 12.46, change30d: -86.71 },
                { name: "Solana", category: "Chain", total24h: 984220, total7d: 6560000, total30d: 46030000, change24h: 1.82, change7d: 4.48, change30d: -73.60 },
                { name: "Jupiter Perpetual Exchange", category: "Derivatives", total24h: 841120, total7d: 14800000, total30d: 66170000, change24h: -45.77, change7d: -23.56, change30d: -51.96 },
                { name: "AAVE V3", category: "Lending", total24h: 807370, total7d: 6840000, total30d: 32900000, change24h: -5.91, change7d: -11.75, change30d: -48.17 },
                { name: "Binance", category: "Chain", total24h: 751670, total7d: 3590000, total30d: 20030000, change24h: 34.75, change7d: 142.90, change30d: -85.20 },
                { name: "PancakeSwap AMM V3", category: "Dexs", total24h: 736050, total7d: 3050000, total30d: 27900000, change24h: 102.68, change7d: 207.61, change30d: -90.39 },
                { name: "Raydium AMM", category: "Dexs", total24h: 733270, total7d: 4830000, total30d: 39310000, change24h: 0.72, change7d: -7.90, change30d: -72.73 },
                { name: "Uniswap V2", category: "Dexs", total24h: 715490, total7d: 3910000, total30d: 14740000, change24h: 33.07, change7d: 37.57, change30d: 4.31 },
                { name: "Uniswap V3", category: "Dexs", total24h: 663380, total7d: 16340000, total30d: 71730000, change24h: -43.59, change7d: -78.88, change30d: -71.04 },
                { name: "Hyperliquid Spot Orderbook", category: "Dexs", total24h: 622450, total7d: 9530000, total30d: 47490000, change24h: -35.25, change7d: -3.52, change30d: -56.45 },
                { name: "Fluid Lending", category: "Lending", total24h: 621380, total7d: 1160000, total30d: 3150000, change24h: 183.28, change7d: 827.85, change30d: 497.77 },
                { name: "Bitcoin", category: "Chain", total24h: 448760, total7d: 3050000, total30d: 16880000, change24h: 0.00, change7d: 20.15, change30d: -17.56 }
            ]
        };
        
        // 实际项目中，使用下面的代码通过API获取数据
        // const response = await fetch('https://api.llama.fi/overview/fees');
        // const apiData = await response.json();
        // 然后处理 apiData 成所需格式
        
        // 更新时间显示
        const timeElement = document.getElementById('protocolFeesTime');
        const fetchTime = new Date();
        timeElement.textContent = `数据更新时间: ${fetchTime.toLocaleString('zh-CN')}`;
        
        // 构建表格内容
        const tableBody = document.getElementById('protocolFeesTableBody');
        tableBody.innerHTML = '';
        
        // 排序数据（以24h费用降序）
        const sortedProtocols = [...data.protocols]
            .sort((a, b) => b.total24h - a.total24h)
            .map((protocol, index) => ({
                rank: index + 1,
                name: protocol.name,
                category: protocol.category || '未分类',
                fees24h: protocol.total24h || 0,
                fees7d: protocol.total7d || 0,
                fees30d: protocol.total30d || 0,
                change24h: protocol.change24h || 0,
                change7d: protocol.change7d || 0,
                change30d: protocol.change30d || 0
            }));
        
        sortedProtocols.forEach(protocol => {
            const row = document.createElement('tr');
            
            // 格式化金额函数 - 简化版本
            const formatAmount = (amount) => {
                if (amount >= 1000000) {
                    return `$${(amount / 1000000).toFixed(1)}M`;
                } else if (amount >= 1000) {
                    return `$${(amount / 1000).toFixed(1)}K`;
                } else {
                    return `$${amount.toFixed(0)}`;
                }
            };
            
            // 格式化变化百分比 - 简化版本
            const formatChange = (change) => {
                const color = change >= 0 ? 'green' : 'red';
                const sign = change >= 0 ? '+' : '';
                return `<span style="color:${color}">${sign}${change.toFixed(1)}%</span>`;
            };
            
            row.innerHTML = `
                <td>${protocol.rank}</td>
                <td>${protocol.name}</td>
                <td>${protocol.category}</td>
                <td>${formatAmount(protocol.fees24h)}</td>
                <td>${formatAmount(protocol.fees7d)}</td>
                <td>${formatAmount(protocol.fees30d)}</td>
                <td>${formatChange(protocol.change24h)}</td>
                <td>${formatChange(protocol.change7d)}</td>
                <td>${formatChange(protocol.change30d)}</td>
            `;
            
            tableBody.appendChild(row);
        });
        
        // 根据表格内容调整容器高度
        const tableContainer = document.querySelector('.protocol-fees-table-container');
        const tableHeight = document.querySelector('.protocol-fees-table').offsetHeight;
        const chartContainer = document.querySelector('.chart-container:last-child');
        const card = document.querySelector('.card:last-child');

        // 确保容器高度足够显示整个表格
        if (tableHeight > 0) {
            const headerHeight = document.querySelector('.protocol-fees-header').offsetHeight;
            const totalHeight = tableHeight + headerHeight + 40; // 额外添加一些内边距
            chartContainer.style.height = 'auto';
            card.style.height = 'auto';
        }
        
    } catch (error) {
        console.error('加载协议费用数据失败:', error);
        document.getElementById('protocolFeesTableBody').innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; color: red;">
                    数据加载失败，请稍后重试
                </td>
            </tr>
        `;
    }
}

// 修改颜色生成函数，使用彩虹色系
function getColor(index, alpha = 1) {
    const colors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
        '#FF9F40', '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
        '#2ecc71', '#e74c3c', '#9b59b6', '#f1c40f', '#1abc9c',
        '#e67e22', '#3498db', '#2c3e50', '#27ae60', '#c0392b'
    ];
    const color = colors[index % colors.length];
    
    if (alpha !== 1) {
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    
    return color;
}

initCharts(); 