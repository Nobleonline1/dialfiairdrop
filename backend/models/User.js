const mongoose = require("mongoose");
const bcrypt = require("bcryptjs"); // For password hashing
const jwt = require("jsonwebtoken"); // For JWT token
const shortid = require("shortid"); // For generating referral codes
const validator = require("validator"); // For email validation
const crypto = require("crypto"); // For generating verification tokens

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, "Please add a username"],
        unique: true,
        trim: true,
        maxlength: [30, "Username cannot be more than 30 characters"],
        minlength: [3, "Username must be at least 3 characters"],
    },
    email: {
        type: String,
        required: [true, "Please add an email"],
        unique: true,
        trim: true,
        lowercase: true,
        validate: [validator.isEmail, "Please add a valid email"],
    },
    password: {
        type: String,
        required: [true, "Please add a password"],
        minlength: [6, "Password must be at least 6 characters"],
        select: false, // This means the password won't be returned in query results by default
    },
    difiBalance: {
        type: Number,
        default: 0.0,
    },
    dpowerBalance: {
        type: Number,
        default: 0,
    },
    referralCode: {
        type: String,
        unique: true,
        default: () => shortid.generate(), // Generate a unique short code for referrals
    },
    referredBy: {
        type: String, // Store the referral code of the user who referred this user
        default: null,
    },
    lastMineTimestamp: {
        type: Date,
        default: null, // Timestamp of the last mining operation
    },
    tasksCompleted: [
        {
            type: mongoose.Schema.ObjectId,
            ref: "AirdropTask", // Reference to an AirdropTask model
        },
    ],
    isAdmin: {
        type: Boolean,
        default: false,
    },
    isBlocked: {
        type: Boolean,
        default: false,
    },
    // --- NEW FIELDS FOR EMAIL VERIFICATION ---
    isVerified: {
        type: Boolean,
        default: false, // User is not verified by default
    },
    emailVerificationToken: String, // Hashed token for email verification
    emailVerificationExpires: Date, // Expiry for verification token
    // --- END NEW FIELDS ---
    passwordResetToken: String,
    passwordResetExpires: Date,
    usernameResetToken: String,
    usernameResetExpires: Date,
    createdAt: {
        type: Date,
        default: Date.now,
    },
    // --- NEW FIELD FOR SOLANA ADDRESS ---
    solanaAddress: {
        type: String,
        trim: true,
        sparse: true, // Allows null values, so users don't all need an address
        unique: true, // Ensures each address is unique if submitted
        default: null,
        // Basic validation for Solana address format (example - consider more robust validation with a library if needed)
        validate: {
            validator: function (v) {
                // Solana addresses are typically 32-44 characters, base58 encoded.
                // This is a very basic check. For production, consider a dedicated library.
                return (
                    v === null ||
                    (v.length >= 32 &&
                        v.length <= 44 &&
                        /^[1-9A-HJ-NP-Za-km-z]+$/.test(v))
                );
            },
            message: (props) => `${props.value} is not a valid Solana address!`,
        },
    },
});

// --- Mongoose Middleware and Methods ---

// Hash password before saving to database
UserSchema.pre("save", async function (next) {
    if (!this.isModified("password")) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Generate JWT token for user
UserSchema.methods.getSignedJwtToken = function () {
    return jwt.sign(
        { id: this._id, isAdmin: this.isAdmin }, // Include isAdmin in token payload
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN,
        },
    );
};

// Compare user entered password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and hash password reset token
UserSchema.methods.getResetPasswordToken = function () {
    // Generate token
    const resetToken = crypto.randomBytes(20).toString("hex"); // Use crypto for more secure token

    // Hash the token and set to passwordResetToken field
    this.passwordResetToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

    // Set expire
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes from now

    return resetToken; // Return the unhashed token to send via email
};

// --- NEW: Generate and hash email verification token ---
UserSchema.methods.getEmailVerificationToken = function () {
    // Generate token
    const verificationToken = crypto.randomBytes(20).toString("hex");

    // Hash the token and set to emailVerificationToken field
    this.emailVerificationToken = crypto
        .createHash("sha256")
        .update(verificationToken)
        .digest("hex");

    // Set expiry (e.g., 24 hours from now)
    this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;

    return verificationToken; // Return the unhashed token to send via email
};

module.exports = mongoose.model("User", UserSchema);
