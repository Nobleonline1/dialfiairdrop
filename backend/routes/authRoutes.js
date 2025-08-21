//backend/routes/authRoutes.js
const express = require("express");
const {
    registerUser,
    loginUser,
    getMe,
    forgotPassword,
    resetPassword,
    forgotUsername,
    verifyEmail,
    resendVerificationEmail,
    updateSolanaAddress, // NEW: Import the new updateSolanaAddress function
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", protect, getMe);
router.post("/forgot-password", forgotPassword);
router.put("/reset-password/:token", resetPassword);
router.post("/forgot-username", forgotUsername);
router.get("/verify-email/:token", verifyEmail);
router.post("/resend-verification", resendVerificationEmail);
router.put("/update-solana-address", protect, updateSolanaAddress); // NEW: Route for updating Solana address

module.exports = router;
