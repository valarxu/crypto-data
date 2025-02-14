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

    // 市场占比趋势堆积面积图
    new Chart(document.getElementById('marketDominanceChange'), {
        type: 'line',
        data: {
            labels: marketData.map(d => new Date(d.timestamp).toLocaleDateString()),
            datasets: Object.keys(sortedCoins).map((coin, index) => ({
                label: coin.toUpperCase(),
                data: dailyPercentages.map(day => day[coin]),
                backgroundColor: getColor(index, 0.6),
                borderColor: getColor(index),
                fill: true,
                tension: 0.4
            }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: '市场占比趋势'
                },
                tooltip: {
                    mode: 'index',
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}%`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: '日期'
                    }
                },
                y: {
                    stacked: true,
                    min: 0,
                    max: 100,
                    title: {
                        display: true,
                        text: '占比 (%)'
                    },
                    ticks: {
                        callback: function(value) {
                            return value + '%';
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

    // 稳定币排名堆叠面积图
    const stablecoinSymbols = new Set();
    stablecoinsData.forEach(data => {
        data.topStablecoins.slice(0, 5).forEach(coin => {  // 只显示前5个稳定币，避免图表太乱
            stablecoinSymbols.add(coin.symbol);
        });
    });

    new Chart(document.getElementById('stablecoinsChart'), {
        type: 'line',
        data: {
            labels: stablecoinsData.map(d => new Date(d.timestamp).toLocaleDateString()),
            datasets: Array.from(stablecoinSymbols).map((symbol, index) => ({
                label: symbol,
                data: stablecoinsData.map(d => {
                    const coin = d.topStablecoins.find(c => c.symbol === symbol);
                    return coin ? coin.marketCap : null;
                }),
                backgroundColor: getColor(index, 0.6),  // 添加透明度
                borderColor: getColor(index),
                fill: true,                            // 启用填充
                tension: 0.4
            }))
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: '稳定币市值趋势'
                },
                tooltip: {
                    mode: 'index',  // 显示同一时间点的所有数据
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('zh-CN', {
                                    style: 'currency',
                                    currency: 'USD',
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0
                                }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: '日期'
                    }
                },
                y: {
                    stacked: true,  // 启用堆叠
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '市值 (USD)'
                    },
                    ticks: {
                        callback: function(value) {
                            return new Intl.NumberFormat('zh-CN', {
                                style: 'currency',
                                currency: 'USD',
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0
                            }).format(value);
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

    // 协议费用排名折线图
    const protocolNames = new Set();
    protocolFeesData.forEach(data => {
        data.protocols.slice(0, 10).forEach(protocol => {
            protocolNames.add(protocol.name);
        });
    });

    new Chart(document.getElementById('protocolFeesChart'), {
        type: 'line',
        data: {
            labels: protocolFeesData.map(d => new Date(d.timestamp).toLocaleDateString()),
            datasets: Array.from(protocolNames).map((name, index) => ({
                label: name,
                data: protocolFeesData.map(d => {
                    const protocol = d.protocols.find(p => p.name === name);
                    return protocol ? protocol.total24h : null;
                }),
                borderColor: getColor(index),
                fill: false,
                tension: 0.1
            }))
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: '协议费用趋势'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '24小时费用 (USD)'
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