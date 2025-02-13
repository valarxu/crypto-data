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

    // 市场占比堆叠面积图
    const marketDominanceChart = new Chart(document.getElementById('marketDominanceChart'), {
        type: 'line',
        data: {
            labels: marketData.map(d => new Date(d.timestamp).toLocaleDateString()),
            datasets: Object.keys(marketData[0].marketCapPercentages).map((coin, index) => ({
                label: coin.toUpperCase(),
                data: marketData.map(d => d.marketCapPercentages[coin]),
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
                    text: '市场占比趋势'
                },
                tooltip: {
                    mode: 'index'  // 显示同一时间点的所有数据
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
                        text: '占比 (%)'
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });

    // 恐慌贪婪指数图表
    new Chart(document.getElementById('fearGreedChart'), {
        type: 'line',
        data: {
            labels: fearGreedData.map(d => new Date(d.timestamp).toLocaleDateString()),
            datasets: [{
                label: '恐慌贪婪指数',
                data: fearGreedData.map(d => d.value),
                borderColor: '#36A2EB',
                fill: false,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: '恐慌贪婪指数趋势'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
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

// 修改颜色生成函数，添加透明度支持
function getColor(index, alpha = 1) {
    const colors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
        '#FF9F40', '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
        '#2ecc71', '#e74c3c', '#9b59b6', '#f1c40f', '#1abc9c',
        '#e67e22', '#3498db', '#2c3e50', '#27ae60', '#c0392b'
    ];
    const color = colors[index % colors.length];
    
    if (alpha !== 1) {
        // 将十六进制颜色转换为 rgba
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    
    return color;
}

initCharts(); 