//backend/routes/userRoutes.js

const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth"); // Correctly imports from auth.js
const User = require("../models/User"); // Assuming your User model is here

// @desc    Get user profile
// @route   GET /api/users/me
// @access  Private (requires token)
router.get("/me", protect, async (req, res) => {
  try {
    // req.user should be set by the 'protect' middleware after successful token verification
    const user = await User.findById(req.user.id).select("-password"); // Exclude password
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;
