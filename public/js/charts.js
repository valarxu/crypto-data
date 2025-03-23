async function fetchData(endpoint) {
    const response = await fetch(`/api/${endpoint}`);
    return await response.json();
}

async function initCharts() {
    // 加载所有数据
    const marketData = await fetchData('market-data');
    const fearGreedData = await fetchData('fear-greed-data');
    const stablecoinsData = await fetchData('stablecoins-data');
    const protocolFeesData = await fetchData('protocol-fees-data');

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

    // 协议费用排名图表
    const protocolFeesDiv = document.getElementById('protocolFeesChart').parentElement;
    protocolFeesDiv.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 20px;">
            <div style="height: 400px;">
                <canvas id="protocolFeesRaceChart"></canvas>
            </div>
            <div style="display: flex; justify-content: space-between; gap: 20px; height: 400px;">
                <div style="flex: 1; position: relative;">
                    <canvas id="protocolFeesCategoryChart"></canvas>
                </div>
                <div style="flex: 1; position: relative;">
                    <canvas id="protocolFeesTopChart"></canvas>
                </div>
            </div>
        </div>
    `;

    // 创建协议费用动态排名图表
    createProtocolFeesRaceChart(protocolFeesData);
    // 创建协议分类图表
    createProtocolFeesByCategoryChart(protocolFeesData);
    // 创建Top10协议图表
    createProtocolFeesTopChart(protocolFeesData);
}

// 协议费用动态排名图表
function createProtocolFeesRaceChart(protocolFeesData) {
    // 合并所有时间点的协议名称
    const allProtocols = new Set();
    protocolFeesData.forEach(data => {
        data.protocols.forEach(protocol => {
            allProtocols.add(protocol.name);
        });
    });
    
    // 准备数据
    const seriesData = Array.from(allProtocols).map(name => {
        return {
            name: name,
            data: protocolFeesData.map(data => {
                const protocol = data.protocols.find(p => p.name === name);
                return protocol ? [new Date(data.timestamp).getTime(), protocol.total24h] : null;
            }).filter(point => point !== null)
        };
    });
    
    // 只保留至少有3个数据点的协议
    const filteredSeries = seriesData.filter(series => series.data.length >= 3);
    
    // 按照最新数据（如有）的值进行排序
    filteredSeries.sort((a, b) => {
        const lastA = a.data[a.data.length - 1][1];
        const lastB = b.data[b.data.length - 1][1];
        return lastB - lastA;
    });
    
    // 只取前15个协议
    const topSeries = filteredSeries.slice(0, 15);
    
    new Chart(document.getElementById('protocolFeesRaceChart'), {
        type: 'line',
        data: {
            datasets: topSeries.map((series, index) => ({
                label: series.name,
                data: series.data,
                borderColor: getColor(index),
                backgroundColor: getColor(index, 0.1),
                pointRadius: 3,
                tension: 0.1
            }))
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day'
                    },
                    title: {
                        display: true,
                        text: '日期'
                    }
                },
                y: {
                    type: 'logarithmic', // 对数比例更好展示差异大的数据
                    title: {
                        display: true,
                        text: '24小时费用 (USD)'
                    },
                    ticks: {
                        callback: value => (value / 1e6).toFixed(1) + 'M'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: '协议费用趋势（按最新数据排名）'
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const value = (context.raw[1] / 1e6).toFixed(2);
                            return `${context.dataset.label}: ${value}M USD`;
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
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
}

// 按协议类别分类展示图表
function createProtocolFeesByCategoryChart(protocolFeesData) {
    // 预定义协议类别
    const categories = {
        'DEX': ['Uniswap V3', 'Uniswap V2', 'PancakeSwap AMM', 'Raydium AMM', 'Orca', 'Curve DEX', 'DODO AMM', 'Balancer V2', 'SushiSwap', 'Joe V2', 'Jupiter Aggregator', 'Clipper', 'PancakeSwap StableSwap', 'Banana Gun', 'MetaMask'],
        '借贷': ['AAVE V3', 'AAVE V2', 'Compound V2', 'Venus Core Pool', 'Maple', 'Frax Ether', 'Fluid Lending'],
        '质押': ['Lido', 'Marinade Liquid Staking', 'StakeWise V2', 'ether.fi Liquid', 'Jito', 'Solana'],
        '永续合约': ['GMX V2 Perps', 'Fulcrom Perps', 'Jupiter Perpetual Exchange', 'Hyperliquid Spot Orderbook', 'Drift Trade'],
        '公链': ['Ethereum', 'Bitcoin', 'Tron', 'Binance', 'Optimism', 'Polygon'],
        '稳定币': ['Tether', 'Circle', 'Frax FPI'],
        '预测市场': ['Polymarket']
    };
    
    // 准备数据
    const latestData = protocolFeesData[protocolFeesData.length - 1];
    
    // 计算每个类别的总和
    const categoryTotals = {};
    for (const category in categories) {
        categoryTotals[category] = 0;
    }
    categoryTotals['其他'] = 0;
    
    latestData.protocols.forEach(protocol => {
        let found = false;
        for (const category in categories) {
            if (categories[category].includes(protocol.name)) {
                categoryTotals[category] += protocol.total24h;
                found = true;
                break;
            }
        }
        if (!found) {
            categoryTotals['其他'] += protocol.total24h;
        }
    });
    
    // 过滤掉总和为0的类别
    const filteredCategories = Object.fromEntries(
        Object.entries(categoryTotals).filter(([_, value]) => value > 0)
    );
    
    // 创建饼图
    new Chart(document.getElementById('protocolFeesCategoryChart'), {
        type: 'pie',
        data: {
            labels: Object.keys(filteredCategories),
            datasets: [{
                data: Object.values(filteredCategories),
                backgroundColor: Object.keys(filteredCategories).map((_, index) => getColor(index))
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: '按类别的协议费用分布'
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const value = (context.raw / 1e6).toFixed(2);
                            const percentage = ((context.raw / Object.values(filteredCategories).reduce((a, b) => a + b, 0)) * 100).toFixed(1);
                            return `${context.label}: ${value}M USD (${percentage}%)`;
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
            }
        }
    });
}

// 创建Top10协议图表
function createProtocolFeesTopChart(protocolFeesData) {
    // 获取最新数据
    const latestData = protocolFeesData[protocolFeesData.length - 1];
    
    // 过滤掉Tether并获取前10名协议
    const top10Protocols = latestData.protocols
        .filter(protocol => protocol.name !== 'Tether')
        .slice(0, 10);
    
    // 按照24小时费用排序
    top10Protocols.sort((a, b) => b.total24h - a.total24h);
    
    // 创建横向条形图
    new Chart(document.getElementById('protocolFeesTopChart'), {
        type: 'bar',
        data: {
            labels: top10Protocols.map(p => p.name),
            datasets: [{
                label: '24小时协议费用',
                data: top10Protocols.map(p => p.total24h),
                backgroundColor: top10Protocols.map((_, index) => getColor(index)),
                borderColor: top10Protocols.map((_, index) => getColor(index)),
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Top 10协议费用'
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const value = (context.raw / 1e6).toFixed(2);
                            return `${value}M USD`;
                        }
                    }
                },
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: '24小时费用 (USD)'
                    },
                    ticks: {
                        callback: (value) => (value / 1e6).toFixed(0) + 'M'
                    }
                }
            }
        }
    });
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