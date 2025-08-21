const User = require("../models/User");
const Token = require("../models/Token"); // <-- CORRECTED PATH: changed from "/backend/models/Token"
const AirdropTask = require("../models/AirdropTask"); // For tasks
const nowpaymentsService = require("../services/nowpaymentsService"); // Changed to NOWPayments service

const MINE_DIFI_AMOUNT = 0.25; // DiFi per mine
const MINE_INTERVAL_HOURS = 12; // 12 hours in milliseconds
const REFERRAL_DPOWER_BONUS = 2000;
const DPOWER_CONVERSION_RATE_DIFI = 0.25; // 0.25 DiFi per 250 Dpower
const DPOWER_CONVERSION_AMOUNT = 250; // Minimum Dpower to convert
const DPOWER_PER_USD = 2000; // 10,000 Dpower for $5 USD => 2000 Dpower per USD

// Helper function to update total supply (circulatingSupply increases)
const updateTokenSupply = async (amount) => {
    const tokenData = await Token.findOne({ name: "DiFi" });
    if (!tokenData) {
        throw new Error(
            "DiFi Token data not found. Please initialize the token first.",
        );
    }

    tokenData.circulatingSupply =
        parseFloat(tokenData.circulatingSupply) + parseFloat(amount);
    // Ensure circulating supply doesn't exceed total supply
    if (tokenData.circulatingSupply > tokenData.totalSupply) {
        tokenData.circulatingSupply = tokenData.totalSupply; // Cap at total supply
    }
    await tokenData.save();
    return tokenData.totalSupply - tokenData.circulatingSupply; // Return remaining supply
};

// @desc    Get current total supply of DiFi (remaining supply from the initial pool)
// @route   GET /api/airdrop/total-supply
// @access  Public
exports.getTotalSupply = async (req, res) => {
    try {
        console.log("BACKEND DEBUG: (getTotalSupply) Fetching Token data...");
        let tokenData = await Token.findOne({ name: "DiFi" });

        // If token data doesn't exist, create it with the initial supply
        if (!tokenData) {
            console.log(
                "BACKEND DEBUG: (getTotalSupply) Token data not found. Initializing DiFi token.",
            );
            tokenData = await Token.create({
                name: "DiFi",
                totalSupply: 100000000,
                circulatingSupply: 0,
            });
            console.log(
                "BACKEND DEBUG: (getTotalSupply) New tokenData created:",
                tokenData,
            );
        }

        console.log(
            "BACKEND DEBUG: (getTotalSupply) Retrieved tokenData:",
            tokenData,
        );

        // Calculate the remaining supply
        const remainingSupply =
            tokenData.totalSupply - tokenData.circulatingSupply;
        console.log(
            "BACKEND DEBUG: (getTotalSupply) Calculated remainingSupply (Total - Circulating):",
            remainingSupply,
        );

        res.status(200).json({
            success: true,
            totalSupply: remainingSupply, // This is the REMAINING supply
            circulatingSupply: tokenData.circulatingSupply,
        });
    } catch (error) {
        console.error(
            "BACKEND ERROR: (getTotalSupply) Error fetching total supply:",
            error,
        );
        res.status(500).json({
            success: false,
            message: "Server error fetching total supply.",
        });
    }
};

// @desc    Mine DiFi token
// @route   POST /api/airdrop/mine
// @access  Private (User)
exports.mineDiFi = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res
                .status(404)
                .json({ success: false, message: "User not found." });
        }

        const now = Date.now();
        const lastMineTimestamp = user.lastMineTimestamp
            ? new Date(user.lastMineTimestamp).getTime()
            : 0;
        const nextMineAvailableAt =
            lastMineTimestamp + MINE_INTERVAL_HOURS * 60 * 60 * 1000;

        if (now < nextMineAvailableAt) {
            const timeRemaining = nextMineAvailableAt - now;
            const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
            const minutes = Math.floor(
                (timeRemaining % (1000 * 60 * 60)) / (1000 * 60),
            );
            const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
            return res.status(400).json({
                success: false,
                message: `You can mine again in ${hours}h ${minutes}m ${seconds}s.`,
                lastMineTimestamp: user.lastMineTimestamp, // Return backend's timestamp for accurate countdown
            });
        }

        // Check if enough supply left from the global pool
        const tokenData = await Token.findOne({ name: "DiFi" });
        if (
            !tokenData ||
            tokenData.totalSupply - tokenData.circulatingSupply <
                MINE_DIFI_AMOUNT
        ) {
            return res.status(400).json({
                success: false,
                message: "DiFi supply fully mined! Please try again later.",
            });
        }

        // Update user balance and last mine timestamp
        user.difiBalance += MINE_DIFI_AMOUNT;
        user.lastMineTimestamp = new Date(now); // Set to current time
        await user.save();

        // Update total supply (circulatingSupply increases, remainingSupply decreases)
        const remainingSupply = await updateTokenSupply(MINE_DIFI_AMOUNT);
        console.log(
            `BACKEND DEBUG: (mineDiFi) Mined ${MINE_DIFI_AMOUNT}. New remaining supply: ${remainingSupply}`,
        );

        res.status(200).json({
            success: true,
            message: `Successfully mined ${MINE_DIFI_AMOUNT} DiFi!`,
            userDiFiBalance: user.difiBalance,
            newTotalSupply: remainingSupply, // Sends back the remaining global supply
            lastMineTimestamp: user.lastMineTimestamp,
        });
    } catch (error) {
        console.error("BACKEND ERROR: Error mining DiFi:", error);
        res.status(500).json({
            success: false,
            message: "Server error during mining.",
        });
    }
};

// @desc    Convert Dpower to DiFi
// @route   POST /api/airdrop/convert-dpower
// @access  Private (User)
exports.convertDpower = async (req, res) => {
    const { amount } = req.body; // Amount of Dpower to convert

    if (
        isNaN(amount) ||
        amount <= 0 ||
        amount % DPOWER_CONVERSION_AMOUNT !== 0
    ) {
        return res.status(400).json({
            success: false,
            message: `Invalid Dpower amount. Must be a positive multiple of ${DPOWER_CONVERSION_AMOUNT}.`,
        });
    }

    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res
                .status(404)
                .json({ success: false, message: "User not found." });
        }

        if (user.dpowerBalance < amount) {
            return res.status(400).json({
                success: false,
                message: "Insufficient Dpower balance.",
            });
        }

        const diFiEarned =
            (amount / DPOWER_CONVERSION_AMOUNT) * DPOWER_CONVERSION_RATE_DIFI;

        // Check if enough supply left from the global pool for conversion
        const tokenData = await Token.findOne({ name: "DiFi" });
        if (
            !tokenData ||
            tokenData.totalSupply - tokenData.circulatingSupply < diFiEarned
        ) {
            return res.status(400).json({
                success: false,
                message: "Not enough DiFi in total supply for this conversion.",
            });
        }

        user.dpowerBalance -= amount;
        user.difiBalance += diFiEarned;
        await user.save();

        // Update total supply (circulatingSupply increases, remainingSupply decreases)
        const remainingSupply = await updateTokenSupply(diFiEarned);
        console.log(
            `BACKEND DEBUG: (convertDpower) Converted. New remaining supply: ${remainingSupply}`,
        );

        res.status(200).json({
            success: true,
            message: `Successfully converted ${amount} Dpower to ${diFiEarned.toFixed(2)} DiFi!`,
            userDpowerBalance: user.dpowerBalance,
            userDiFiBalance: user.difiBalance,
            newTotalSupply: remainingSupply,
        });
    } catch (error) {
        console.error("BACKEND ERROR: Error converting Dpower:", error);
        res.status(500).json({
            success: false,
            message: "Server error during Dpower conversion.",
        });
    }
};

// @desc    Generate NOWPayments Payment Details
// @route   POST /api/airdrop/generate-payment-address
// @access  Private
exports.generateNOWPaymentsPayment = async (req, res) => {
    const { usdAmount, crypto } = req.body;

    if (!usdAmount || usdAmount < 5 || usdAmount % 5 !== 0) {
        return res
            .status(400)
            .json({
                success: false,
                message:
                    "Please enter a valid USD amount (minimum $5, in multiples of $5).",
            });
    }
    if (!crypto) {
        return res
            .status(400)
            .json({
                success: false,
                message: "Please select a cryptocurrency.",
            });
    }

    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res
                .status(404)
                .json({ success: false, message: "User not found." });
        }

        const orderId = `DPOWER_${user._id}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const orderDescription = `Dpower purchase for ${usdAmount} USD`;
        const ipnCallbackUrl = `${process.env.BACKEND_URL}/api/airdrop/webhook/nowpayments`; // Your public webhook URL

        const npPayment = await nowpaymentsService.createPayment(
            orderId,
            usdAmount,
            crypto,
            orderDescription,
            ipnCallbackUrl,
        );

        // Store the payment order details in your database
        const PaymentOrder = require("../models/PaymentOrder"); // Ensure PaymentOrder is imported if not at top
        const paymentOrder = await PaymentOrder.create({
            userId: user._id,
            gatewayInvoiceId: npPayment.payment_id,
            status: npPayment.payment_status,
            amountUsd: usdAmount,
            dpowerToCredit: usdAmount * DPOWER_PER_USD,
            cryptoCurrency: npPayment.pay_currency,
            payAddress: npPayment.pay_address,
            payAmountCrypto: npPayment.pay_amount,
        });

        res.status(200).json({
            success: true,
            message: "Payment invoice generated successfully.",
            walletAddress: paymentOrder.payAddress,
            cryptoAmount: paymentOrder.payAmountCrypto,
            cryptoCurrency: paymentOrder.cryptoCurrency,
            gatewayInvoiceId: paymentOrder.gatewayInvoiceId,
            qrcodeUrl: npPayment.qrcode_url,
        });
    } catch (error) {
        console.error(
            "BACKEND ERROR: Error generating NOWPayments payment:",
            error,
        );
        res.status(500).json({
            success: false,
            message: error.message || "Failed to generate payment address.",
        });
    }
};

// @desc    Handle NOWPayments Webhook (IPN Callback)
// @route   POST /api/airdrop/webhook/nowpayments
// @access  Public (only accessible by NOWPayments)
exports.handleNOWPaymentsWebhook = async (req, res) => {
    console.log("BACKEND DEBUG: Received NOWPayments Webhook:", req.body);

    const signature = req.headers["x-callback-sig"]; // NOWPayments webhook signature header

    // IMPORTANT: Verify the webhook signature for security
    if (!nowpaymentsService.verifyIpnSignature(signature, req.body)) {
        console.warn(
            "BACKEND WARNING: NOWPayments Webhook: Invalid signature.",
        );
        return res.status(403).send("Forbidden: Invalid signature.");
    }

    const {
        payment_id,
        payment_status,
        pay_address,
        pay_amount,
        pay_currency,
        order_id,
        actually_paid,
        outcome_amount,
    } = req.body;

    try {
        const PaymentOrder = require("../models/PaymentOrder"); // Ensure PaymentOrder is imported if not at top
        const paymentOrder = await PaymentOrder.findOne({
            gatewayInvoiceId: payment_id,
        });
        if (!paymentOrder) {
            console.warn(
                `BACKEND WARNING: NOWPayments Webhook: PaymentOrder not found for payment ID: ${payment_id}`,
            );
            return res.status(404).send("Payment Order Not Found.");
        }

        // Prevent processing already processed or final payments
        if (
            [
                "finished",
                "failed",
                "expired",
                "refunded",
                "reverse_resolved",
            ].includes(paymentOrder.status)
        ) {
            console.log(
                `BACKEND DEBUG: Payment already in final status: ${paymentOrder.status}. Skipping processing.`,
            );
            return res
                .status(200)
                .send(
                    `Payment already in final status: ${paymentOrder.status}`,
                );
        }

        // Update payment order status
        paymentOrder.status = payment_status;
        paymentOrder.webhookData = req.body; // Store full webhook payload for audit
        paymentOrder.updatedAt = Date.now();

        // Check for successful payment status
        if (payment_status === "finished") {
            const user = await User.findById(paymentOrder.userId);
            if (user) {
                user.dpowerBalance += paymentOrder.dpowerToCredit;
                await user.save();
                console.log(
                    `BACKEND DEBUG: User ${user.username} credited ${paymentOrder.dpowerToCredit} Dpower from NOWPayments payment ${payment_id}`,
                );
                paymentOrder.message = `Dpower credited. Actual paid: ${actually_paid} ${pay_currency}`;
            } else {
                console.error(
                    `BACKEND ERROR: User not found for PaymentOrder ${paymentOrder._id}. Dpower not credited.`,
                );
                paymentOrder.status = "failed"; // Mark as failed if user not found
                paymentOrder.message = `User not found. Dpower not credited. Tx details: ${JSON.stringify(req.body)}`;
            }
        }

        await paymentOrder.save();
        res.status(200).send("Webhook received and processed.");
    } catch (error) {
        console.error(
            "BACKEND ERROR: Error processing NOWPayments webhook:",
            error,
        );
        res.status(500).send("Error processing webhook.");
    }
};

// @desc    Get All Airdrop Tasks
// @route   GET /api/airdrop/tasks
// @access  Private
exports.getAirdropTasks = async (req, res) => {
    try {
        const tasks = await AirdropTask.find();
        res.status(200).json({ success: true, tasks });
    } catch (error) {
        console.error("BACKEND ERROR: Error fetching airdrop tasks:", error);
        res.status(500).json({
            success: false,
            message: "Server error fetching tasks.",
        });
    }
};

// @desc    Claim an Airdrop Task
// @route   POST /api/airdrop/claim-task
// @access  Private
exports.claimAirdropTask = async (req, res) => {
    const { taskId } = req.body;

    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res
                .status(404)
                .json({ success: false, message: "User not found." });
        }

        const task = await AirdropTask.findById(taskId);
        if (!task) {
            return res
                .status(404)
                .json({ success: false, message: "Task not found." });
        }

        if (user.tasksCompleted.includes(taskId)) {
            return res
                .status(400)
                .json({ success: false, message: "Task already claimed." });
        }

        // Check if enough supply left from the global pool for task reward
        const tokenData = await Token.findOne({ name: "DiFi" });
        if (
            !tokenData ||
            tokenData.totalSupply - tokenData.circulatingSupply < task.reward
        ) {
            return res.status(400).json({
                success: false,
                message: "DiFi supply depleted for this task reward.",
            });
        }

        user.tasksCompleted.push(taskId);
        user.difiBalance += task.reward; // Add reward to user's balance
        await user.save();

        // Update total supply (circulatingSupply increases, remainingSupply decreases)
        const remainingSupply = await updateTokenSupply(task.reward);
        console.log(
            `BACKEND DEBUG: (claimAirdropTask) Task claimed. New remaining supply: ${remainingSupply}`,
        );

        res.status(200).json({
            success: true,
            message: `Task "${task.name}" claimed! ${task.reward} DiFi added to your balance.`,
            userDiFiBalance: user.difiBalance,
            userDpowerBalance: user.dpowerBalance,
            newTotalSupply: remainingSupply,
        });
    } catch (error) {
        console.error("BACKEND ERROR: Error claiming airdrop task:", error);
        res.status(500).json({
            success: false,
            message: "Server error claiming task.",
        });
    }
};

// @desc    Get DiFi Leaderboard
// @route   GET /api/airdrop/leaderboard/difi
// @access  Public
exports.getDiFiLeaderboard = async (req, res) => {
    try {
        const leaders = await User.find()
            .select("username difiBalance")
            .sort({ difiBalance: -1 })
            .limit(10); // Top 10
        res.status(200).json(leaders);
    } catch (error) {
        console.error("BACKEND ERROR: Error fetching DiFi leaderboard:", error);
        res.status(500).json({
            success: false,
            message: "Server error fetching DiFi leaderboard.",
        });
    }
};

// @desc    Get Dpower Leaderboard
// @route   GET /api/airdrop/leaderboard/dpower
// @access  Public
exports.getDpowerLeaderboard = async (req, res) => {
    try {
        const leaders = await User.find()
            .select("username dpowerBalance")
            .sort({ dpowerBalance: -1 })
            .limit(10); // Top 10
        res.status(200).json(leaders);
    } catch (error) {
        console.error(
            "BACKEND ERROR: Error fetching Dpower leaderboard:",
            error,
        );
        res.status(500).json({
            success: false,
            message: "Server error fetching Dpower leaderboard.",
        });
    }
};
// NOTE: The previous exports.getTotalDiFiSupply function (which aggregated user balances) has been removed.
// Ensure your backend router (e.g., airdropRoutes.js) maps /api/airdrop/total-supply to exports.getTotalSupply
