// backend/utils/cryptoPayments.js

exports.generateRandomWalletAddress = (crypto) => {
    // In a real app, this would generate a valid address or fetch from a gateway
    return `simulated_wallet_address_for_${crypto}_${Date.now()}`;
};

exports.getCryptoPrice = async (crypto, usdAmount) => {
    // In a real app, this would fetch live prices
    const simulatedPricePerUsd = {
        BTC: 0.00004,
        USDT: 1,
        SOL: 0.005,
        TRX: 10,
        TON: 0.5,
        ETH: 0.0006,
    };
    const rate = simulatedPricePerUsd[crypto] || 0.00001; // Default fallback
    return usdAmount * rate;
};
