const User = require("../models/User");
const jwt = require("jsonwebtoken");
const crypto = require("crypto"); // For token generation (reset password, email verification)
const sendEmail = require("../utils/emailService"); // Utility for sending emails

// Define the referral bonus constant
const REFERRAL_DPOWER_BONUS = 2000;

// Helper function to get token from user and create cookie
const getSignedToken = (user) => {
    return jwt.sign(
        { id: user._id, isAdmin: user.isAdmin },
        process.env.JWT_SECRET,
        {
            // Ensure isAdmin is in token
            expiresIn: process.env.JWT_EXPIRES_IN,
        },
    );
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.registerUser = async (req, res) => {
    const { username, email, password, referralCode } = req.body;

    try {
        if (!username || !email || !password) {
            return res
                .status(400)
                .json({ success: false, message: "Please enter all fields" });
        }

        const existingUser = await User.findOne({
            $or: [{ email }, { username }],
        });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "User with that email or username already exists",
            });
        }

        const userData = {
            username,
            email,
            password,
            isVerified: false, // NEW: Set to false on registration
        };

        let referrer = null;
        if (referralCode) {
            referrer = await User.findOne({ referralCode });
            if (referrer) {
                userData.referredBy = referrer.referralCode;
            } else {
                console.warn(
                    `Referral code '${referralCode}' not found. New user registered without a referrer.`,
                );
            }
        }

        const user = await User.create(userData);

        if (referrer) {
            referrer.dpowerBalance += REFERRAL_DPOWER_BONUS;
            await referrer.save();
            console.log(
                `Referral bonus of ${REFERRAL_DPOWER_BONUS} Dpower given to referrer: ${referrer.username} (${referrer.referralCode})`,
            );
        }

        // --- NEW: Generate email verification token and send email ---
        const verificationToken = user.getEmailVerificationToken();
        await user.save({ validateBeforeSave: false }); // Save user with verification token

        // UPDATED: Use .html and query parameter for static site
        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email.html?token=${verificationToken}`;

        const emailMessage = `
            <h1>Welcome to DialFi!</h1>
            <p>Please verify your email address by clicking on the link below:</p>
            <a href="${verificationUrl}" clicktracking="off">${verificationUrl}</a>
            <p>This link will expire in 24 hours.</p>
            <p>Thank you for registering!</p>
        `;

        try {
            await sendEmail({
                to: user.email,
                subject: "DialFi: Email Verification",
                html: emailMessage, // Ensure this is 'html'
            });

            res.status(201).json({
                success: true,
                message:
                    "Registration successful! Please check your email to verify your account before logging in.",
            });
        } catch (emailError) {
            console.error("Error sending verification email:", emailError);
            // If email fails, unset token and still allow registration, but alert user
            user.emailVerificationToken = undefined;
            user.emailVerificationExpires = undefined;
            await user.save({ validateBeforeSave: false });
            return res.status(500).json({
                success: false,
                message:
                    "Registration successful, but failed to send verification email. Please contact support.",
            });
        }
        // --- END NEW EMAIL VERIFICATION LOGIC ---
    } catch (error) {
        console.error("Error during user registration:", error);
        if (error.code === 11000) {
            const field = Object.keys(error.keyValue)[0];
            const message = `A user with that ${field} already exists.`;
            return res.status(400).json({ success: false, message });
        }
        res.status(500).json({
            success: false,
            message: "Server error during registration.",
        });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.loginUser = async (req, res) => {
    // MODIFIED: Use usernameOrEmail from the frontend's request body
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail || !password) {
        return res.status(400).json({
            success: false,
            message: "Please enter username/email and password.",
        });
    }

    try {
        // MODIFIED: Query for user using $or on usernameOrEmail for both email and username fields
        const user = await User.findOne({
            $or: [{ email: usernameOrEmail }, { username: usernameOrEmail }],
        }).select("+password");

        if (!user) {
            return res
                .status(401)
                .json({ success: false, message: "Invalid credentials." });
        }

        // --- MODIFIED: Check if email is verified, but allow old users without `isVerified` field ---
        if (!user.isVerified && user.isVerified !== undefined) {
            return res.status(401).json({
                success: false,
                message:
                    "Your email is not verified. Please check your inbox for a verification link.",
            });
        }
        // --- END MODIFIED CHECK ---

        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            return res
                .status(401)
                .json({ success: false, message: "Invalid credentials." });
        }

        const token = getSignedToken(user);
        res.status(200).json({
            success: true,
            token,
            message: "Login successful!",
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                difiBalance: user.difiBalance,
                dpowerBalance: user.dpowerBalance,
                referralCode: user.referralCode,
                referredBy: user.referredBy,
                isAdmin: user.isAdmin,
                tasksCompleted: user.tasksCompleted || [],
                isVerified: user.isVerified, // Include verification status in response
                solanaAddress: user.solanaAddress, // NEW: Include solanaAddress in login response
            },
        });
    } catch (error) {
        console.error("Error during user login:", error);
        res.status(500).json({
            success: false,
            message: "Server error during login.",
        });
    }
};

// @desc    Verify User Email
// @route   GET /api/auth/verify-email/:token
// @access  Public
exports.verifyEmail = async (req, res) => {
    const emailVerificationToken = crypto
        .createHash("sha256")
        .update(req.params.token)
        .digest("hex");

    try {
        const user = await User.findOne({
            emailVerificationToken,
            emailVerificationExpires: { $gt: Date.now() },
        });

        if (!user) {
            // Send JSON response for invalid/expired link
            return res.status(400).json({
                success: false,
                message: "Email verification link is invalid or has expired.",
            });
        }

        user.isVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save({ validateBeforeSave: false });

        // CORRECTED: Send JSON response for success
        res.status(200).json({
            success: true,
            message: "Email verified successfully! You can now log in.",
        });
    } catch (error) {
        console.error("Error verifying email:", error);
        res.status(500).json({
            success: false,
            message: "Server error during email verification.",
        });
    }
};

// @desc    Resend Email Verification Link
// @route   POST /api/auth/resend-verification
// @access  Public
exports.resendVerificationEmail = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({
            success: false,
            message: "Please provide an email address.",
        });
    }

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found with that email.",
            });
        }

        if (user.isVerified) {
            return res.status(400).json({
                success: false,
                message: "Email is already verified.",
            });
        }

        // Generate a new verification token
        const verificationToken = user.getEmailVerificationToken();
        await user.save({ validateBeforeSave: false }); // Save user with new token

        // UPDATED: Use .html and query parameter for static site
        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email.html?token=${verificationToken}`;

        const emailMessage = `
            <h1>Resend Verification for DialFi!</h1>
            <p>You requested to resend your email verification link. Please click on the link below:</p>
            <a href="${verificationUrl}" clicktracking="off">${verificationUrl}</a>
            <p>This link will expire in 24 hours.</p>
            <p>Thank you!</p>
        `;

        await sendEmail({
            to: user.email,
            subject: "DialFi: Resend Email Verification",
            html: emailMessage,
        });

        res.status(200).json({
            success: true,
            message:
                "Verification email sent successfully. Please check your inbox.",
        });
    } catch (error) {
        console.error("Error resending verification email:", error);
        res.status(500).json({
            success: false,
            message: "Failed to resend verification email. Server error.",
        });
    }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
        return res
            .status(404)
            .json({ success: false, message: "User not found." });
    }

    res.status(200).json({
        success: true,
        _id: user._id,
        username: user.username,
        email: user.email,
        difiBalance: user.difiBalance,
        dpowerBalance: user.dpowerBalance,
        referralCode: user.referralCode,
        referredBy: user.referredBy,
        lastMineTimestamp: user.lastMineTimestamp,
        tasksCompleted: user.tasksCompleted || [],
        isAdmin: user.isAdmin,
        isBlocked: user.isBlocked,
        isVerified: user.isVerified, // Include verification status in response
        solanaAddress: user.solanaAddress, // NEW: Include solanaAddress in getMe response
        createdAt: user.createdAt,
    });
};

// @desc    Update user's Solana address
// @route   PUT /api/auth/update-solana-address
// @access  Private
exports.updateSolanaAddress = async (req, res) => {
    const { solanaAddress } = req.body;

    if (!solanaAddress) {
        return res
            .status(400)
            .json({ success: false, message: "Solana address is required." });
    }

    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res
                .status(404)
                .json({ success: false, message: "User not found." });
        }

        // Validate Solana address format using the schema's validator
        // The validator on the schema will automatically run on .save()
        user.solanaAddress = solanaAddress;

        // Use validateBeforeSave to ensure the validator runs.
        // If the address is not valid, the save() will throw an error caught below.
        await user.save({ validateBeforeSave: true });

        res.status(200).json({
            success: true,
            message: "Solana address updated successfully.",
            solanaAddress: user.solanaAddress,
        });
    } catch (error) {
        console.error("Error updating Solana address:", error);
        // Handle validation errors specifically
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: error.message || "Invalid Solana address format.",
            });
        }
        // Handle unique constraint error for solanaAddress
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "This Solana address is already linked to another account.",
            });
        }
        res.status(500).json({
            success: false,
            message: "Server error updating Solana address.",
        });
    }
};

// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User with that email does not exist.",
            });
        }

        const resetToken = user.getResetPasswordToken();
        await user.save({ validateBeforeSave: false });

        // UPDATED: Use .html and query parameter for static site
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password.html?token=${resetToken}`;

        const message = `
            <h1>You have requested a password reset</h1>
            <p>Please go to this link to reset your password:</p>
            <a href="${resetUrl}" clicktracking="off">${resetUrl}</a>
            <p>This link will expire in 10 minutes.</p>
        `;

        try {
            await sendEmail({
                to: user.email,
                subject: "Password Reset Request",
                html: message,
            });

            res.status(200).json({
                success: true,
                message: "Email sent successfully.",
            });
        } catch (error) {
            console.error("Error sending email:", error);
            user.passwordResetToken = undefined;
            user.passwordResetExpires = undefined;
            await user.save({ validateBeforeSave: false });
            return res.status(500).json({
                success: false,
                message: "Email could not be sent. Server error.",
            });
        }
    } catch (error) {
        console.error("Error in forgot password:", error);
        res.status(500).json({ success: false, message: "Server error." });
    }
};

// @desc    Reset Password
// @route   PUT /api/auth/reset-password/:token
// @access  Public
exports.resetPassword = async (req, res) => {
    const resetPasswordToken = crypto
        .createHash("sha256")
        .update(req.params.token)
        .digest("hex");

    try {
        const user = await User.findOne({
            passwordResetToken: resetPasswordToken,
            passwordResetExpires: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired reset token.",
            });
        }

        user.password = req.body.password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        const token = getSignedToken(user);
        res.status(200).json({
            success: true,
            message: "Password reset successfully.",
            token,
        });
    } catch (error) {
        console.error("Error resetting password:", error);
        res.status(500).json({
            success: false,
            message: "Server error during password reset.",
        });
    }
};

// @desc    Forgot Username
// @route   POST /api/auth/forgot-username
// @access  Public
exports.forgotUsername = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User with that email does not exist.",
            });
        }

        const message = `
            <h1>Your username is: ${user.username}</h1>
            <p>Please keep this information secure.</p>
        `;

        try {
            await sendEmail({
                to: user.email,
                subject: "Your DialFi Username",
                html: message, // Ensure this is 'html'
            });

            res.status(200).json({
                success: true,
                message: "Username sent to email successfully.",
            });
        } catch (error) {
            console.error("Error sending username email:", error);
            return res.status(500).json({
                success: false,
                message: "Email could not be sent. Server error.",
            });
        }
    } catch (error) {
        console.error("Error in forgot username:", error);
        res.status(500).json({ success: false, message: "Server error." });
    }
};
