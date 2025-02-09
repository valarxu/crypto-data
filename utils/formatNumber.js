function formatUSD(value) {
    if (isNaN(value) || value === null) return '$0';
    
    const billion = 1e9;
    const million = 1e6;
    const thousand = 1e3;
    
    if (value >= billion) {
        return `$${(value / billion).toFixed(2)}B`;
    } else if (value >= million) {
        return `$${(value / million).toFixed(2)}M`;
    } else if (value >= thousand) {
        return `$${(value / thousand).toFixed(2)}K`;
    } else {
        return `$${value.toFixed(2)}`;
    }
}

module.exports = { formatUSD }; 