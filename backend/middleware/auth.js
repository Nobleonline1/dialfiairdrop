// backend/middleware/auth.js

const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Protect routes
exports.protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        try {
            // Get token from header
            token = req.headers.authorization.split(" ")[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Attach user to the request object (excluding password)
            req.user = await User.findById(decoded.id).select("-password");

            // NEW: Set a 'role' property based on isAdmin for the authorize middleware
            if (req.user) {
                req.user.role = req.user.isAdmin ? "admin" : "user";
            }

            // If user not found, throw an error
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: "Not authorized, user not found.",
                });
            }

            next();
        } catch (error) {
            console.error("Auth middleware error:", error); // Log the actual error
            if (error.name === "JsonWebTokenError") {
                return res.status(401).json({
                    success: false,
                    message: "Not authorized. Invalid token.",
                });
            }
            if (error.name === "TokenExpiredError") {
                return res.status(401).json({
                    success: false,
                    message: "Not authorized. Token expired.",
                });
            }
            // Generic catch-all for other errors
            res.status(401).json({
                success: false,
                message: "Not authorized. Token verification failed.",
            });
        }
    }

    if (!token) {
        res.status(401).json({
            success: false,
            message: "Not authorized, no token",
        });
    }
};

// Authorize users by roles: Ensures the authenticated user has the required role (e.g., 'admin').
exports.authorize = (...roles) => {
    return (req, res, next) => {
        // Now req.user.role will be 'admin' or 'user'
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `User role ${req.user ? req.user.role : "none"} is not authorized to access this route`,
            });
        }
        next();
    };
};
