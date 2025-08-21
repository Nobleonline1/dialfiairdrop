// backend/routes/airdropRoutes.js
const express = require("express");
const { protect } = require("../middleware/auth");
const {
    mineDiFi,
    convertDpower,
    generateNOWPaymentsPayment, // Changed function name
    handleNOWPaymentsWebhook, // NEW: Webhook handler
    getAirdropTasks,
    claimAirdropTask,
    getDiFiLeaderboard,
    getDpowerLeaderboard,
    // REMOVED: getTotalDiFiSupply (this function is removed from controller)
    getTotalSupply, // <-- IMPORT THE CORRECT FUNCTION HERE
} = require("../controllers/airdropController");

const router = express.Router();

// Protected routes (require JWT)
router.post("/mine", protect, mineDiFi);
router.post("/convert-dpower", protect, convertDpower);
router.post("/generate-payment-address", protect, generateNOWPaymentsPayment); // This now initiates NOWPayments
router.get("/tasks", protect, getAirdropTasks);
router.post("/claim-task", protect, claimAirdropTask);

// Public routes (no JWT required)
router.get("/leaderboard/difi", getDiFiLeaderboard);
router.get("/leaderboard/dpower", getDpowerLeaderboard);
router.get("/total-supply", getTotalSupply); // <-- UPDATED THIS LINE TO USE getTotalSupply

// IMPORTANT: Webhook route is PUBLIC as it receives calls from NOWPayments
// Use express.raw() to get the raw body for signature verification before parsing as JSON.
router.post(
    "/webhook/nowpayments",
    express.raw({ type: "application/json" }),
    handleNOWPaymentsWebhook,
);

module.exports = router;
