// backend/services/nowpaymentsService.js
const axios = require("axios");
const crypto = require("crypto");

const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY;
const NOWPAYMENTS_IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET;
const NOWPAYMENTS_API_BASE_URL = process.env.NOWPAYMENTS_API_BASE_URL;

if (
    !NOWPAYMENTS_API_KEY ||
    !NOWPAYMENTS_IPN_SECRET ||
    !NOWPAYMENTS_API_BASE_URL
) {
    console.error(
        "NOWPayments API credentials or IPN secret are not fully configured in .env",
    );
    // process.exit(1);
}

const nowpaymentsAxios = axios.create({
    baseURL: NOWPAYMENTS_API_BASE_URL,
    headers: {
        "x-api-key": NOWPAYMENTS_API_KEY,
        "Content-Type": "application/json",
    },
});

/**
 * Creates a new payment invoice with NOWPayments.
 * ... (unchanged) ...
 */
async function createPayment(
    orderId,
    amount,
    payCurrency,
    orderDescription,
    ipnCallbackUrl,
) {
    const endpoint = "/payment";
    const requestBody = {
        price_amount: amount,
        price_currency: "usd",
        pay_currency: payCurrency,
        order_id: orderId,
        order_description: orderDescription,
        ipn_callback_url: ipnCallbackUrl,
        // ...
    };

    try {
        const response = await nowpaymentsAxios.post(endpoint, requestBody);
        console.log("NOWPayments Payment Creation Response:", response.data);
        return response.data;
    } catch (error) {
        console.error(`Error creating NOWPayments payment: ${error.message}`);
        if (error.response) {
            console.error(
                "NOWPayments Error Response Data:",
                error.response.data,
            );
            console.error("NOWPayments Error Status:", error.response.status);
        }
        throw new Error(
            `Failed to create NOWPayments payment: ${error.response?.data?.message || error.message}`,
        );
    }
}

/**
 * Verifies the incoming webhook signature (IPN) from NOWPayments.
 * ... (unchanged) ...
 */
function verifyIpnSignature(signatureHeader, payload) {
    if (!signatureHeader || !payload) {
        console.warn("Missing NOWPayments webhook signature or payload.");
        return false;
    }

    try {
        const hash = crypto
            .createHmac("sha512", NOWPAYMENTS_IPN_SECRET)
            .update(JSON.stringify(payload))
            .digest("hex");

        return hash === signatureHeader;
    } catch (e) {
        console.error(
            "Error during NOWPayments IPN signature verification:",
            e,
        );
        return false;
    }
}

/**
 * Fetches available currencies and their minimum/maximum payment amounts from NOWPayments.
 * This is useful for client-side validation.
 * @returns {Promise<object>} An object containing currency data.
 */
async function getAvailableCurrencies() {
    const endpoint = "/currencies?full=true"; // 'full=true' to get min_amount
    try {
        const response = await nowpaymentsAxios.get(endpoint);
        // The response typically has a `currencies` array
        return response.data.currencies;
    } catch (error) {
        console.error(
            `Error fetching NOWPayments currencies: ${error.message}`,
        );
        if (error.response) {
            console.error(
                "NOWPayments Error Response Data:",
                error.response.data,
            );
        }
        throw new Error(
            `Failed to fetch NOWPayments currencies: ${error.response?.data?.message || error.message}`,
        );
    }
}

module.exports = {
    createPayment,
    verifyIpnSignature,
    getAvailableCurrencies, // NEW: Export the new function
};
