// backend/models/Token.js
const mongoose = require("mongoose");

const TokenSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        default: "DiFi",
    },
    totalSupply: {
        type: Number,
        required: true,
        default: 100000000, // Initial total supply as specified: 100,000,000 DiFi
    },
    circulatingSupply: {
        type: Number,
        default: 0, // Amount of DiFi that has been mined/distributed
    },
});

module.exports = mongoose.model("Token", TokenSchema);
