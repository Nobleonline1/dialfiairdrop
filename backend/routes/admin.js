// backend/controllers/adminController.js
const User = require("../models/User");
const Token = require("../models/Token"); // Assuming Token model is still used for supply data
const AirdropTask = require("../models/AirdropTask");

// @desc    Get admin dashboard stats
// @route   GET /api/admin/dashboard-stats
// @access  Private/Admin
exports.getDashboardStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const tokenData = await Token.findOne({ name: "DiFi" });
        const totalDiFiSupply = tokenData ? tokenData.totalSupply : 0;
        const circulatingDiFiSupply = tokenData
            ? tokenData.circulatingSupply
            : 0;
        const remainingDiFiSupply = totalDiFiSupply - circulatingDiFiSupply;
        const activeTasks = await AirdropTask.countDocuments({
            isActive: true,
        });
        const totalTasks = await AirdropTask.countDocuments();

        res.status(200).json({
            success: true,
            data: {
                totalUsers,
                totalDiFiSupply,
                circulatingDiFiSupply,
                remainingDiFiSupply,
                activeTasks,
                totalTasks,
            },
        });
    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        res.status(500).json({
            success: false,
            message: "Server error fetching dashboard stats.",
        });
    }
};

// @desc    Get total number of users
// @route   GET /api/admin/stats/total-users
// @access  Private/Admin
exports.getTotalUsersCount = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        res.status(200).json({ success: true, totalUsers });
    } catch (error) {
        console.error("Error fetching total users count:", error);
        res.status(500).json({
            success: false,
            message: "Server error fetching total users count.",
        });
    }
};

// @desc    Get top 10 users with highest referrals
// @route   GET /api/admin/leaderboard/referrers
// @access  Private/Admin
exports.getTopReferrers = async (req, res) => {
    try {
        const topReferrers = await User.aggregate([
            {
                $lookup: {
                    from: "users", // The collection to join with (User model's collection name is usually lowercase plural of model name)
                    localField: "referralCode", // Field from the input documents (User's own referralCode)
                    foreignField: "referredBy", // Field from the "users" collection (other users' referredBy field)
                    as: "referredUsers", // Output array field
                },
            },
            {
                $project: {
                    _id: 1,
                    username: 1,
                    referralCode: 1,
                    difiBalance: 1,
                    dpowerBalance: 1,
                    referralCount: { $size: "$referredUsers" },
                },
            },
            {
                $match: {
                    referralCount: { $gt: 0 },
                },
            },
            {
                $sort: { referralCount: -1 },
            },
            {
                $limit: 10,
            },
        ]);

        res.status(200).json({ success: true, data: topReferrers });
    } catch (error) {
        console.error("Error fetching top referrers:", error);
        res.status(500).json({
            success: false,
            message: "Server error fetching top referrers.",
        });
    }
};

// @desc    Get all users (for admin)
// @route   GET /api/admin/users/all
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({}).select("-password");
        res.status(200).json({ success: true, data: users });
    } catch (error) {
        console.error("Error fetching all users:", error);
        res.status(500).json({
            success: false,
            message: "Server error fetching users.",
        });
    }
};

// @desc    Search users by username or email (for admin)
// @route   GET /api/admin/users/search?q=<query>
// @access  Private/Admin
exports.searchUsers = async (req, res) => {
    const query = req.query.q;
    if (!query) {
        return res
            .status(400)
            .json({ success: false, message: "Search query 'q' is required." });
    }

    try {
        const users = await User.find({
            $or: [
                { username: { $regex: query, $options: "i" } },
                { email: { $regex: query, $options: "i" } },
            ],
        }).select("-password");
        res.status(200).json({ success: true, data: users });
    } catch (error) {
        console.error("Error searching users:", error);
        res.status(500).json({
            success: false,
            message: "Server error searching users.",
        });
    }
};

// @desc    Get single user by ID (for admin)
// @route   GET /api/admin/users/:id
// @access  Private/Admin
exports.getUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("-password");
        if (!user) {
            return res
                .status(404)
                .json({ success: false, message: "User not found." });
        }
        res.status(200).json({ success: true, data: user });
    } catch (error) {
        console.error("Error fetching single user:", error);
        res.status(500).json({
            success: false,
            message: "Server error fetching user.",
        });
    }
};

// @desc    Update user details (for admin)
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res) => {
    const { difiBalance, dpowerBalance, isAdmin, isBlocked } = req.body;
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res
                .status(404)
                .json({ success: false, message: "User not found." });
        }

        if (difiBalance !== undefined) {
            user.difiBalance = parseFloat(difiBalance);
        }
        if (dpowerBalance !== undefined) {
            user.dpowerBalance = parseInt(dpowerBalance);
        }
        if (isAdmin !== undefined) {
            user.isAdmin = Boolean(isAdmin);
        }
        if (isBlocked !== undefined) {
            user.isBlocked = Boolean(isBlocked);
        }

        await user.save();

        res.status(200).json({
            success: true,
            message: "User updated successfully.",
            data: user,
        });
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({
            success: false,
            message: "Server error updating user.",
        });
    }
};

// @desc    Delete user (for admin)
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res
                .status(404)
                .json({ success: false, message: "User not found." });
        }

        await user.deleteOne();

        res.status(200).json({
            success: true,
            message: "User deleted successfully.",
        });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({
            success: false,
            message: "Server error deleting user.",
        });
    }
};

// @desc    Create a new airdrop task
// @route   POST /api/admin/tasks
// @access  Private/Admin
exports.addTask = async (req, res) => {
    const { name, platform, link, reward } = req.body;
    try {
        const newTask = await AirdropTask.create({
            name,
            platform,
            link,
            reward,
            isActive: true,
        });
        res.status(201).json({
            success: true,
            message: "Airdrop task created successfully.",
            data: newTask,
        });
    } catch (error) {
        console.error("Error creating airdrop task:", error);
        res.status(500).json({
            success: false,
            message: "Server error creating task.",
        });
    }
};

// @desc    Get all airdrop tasks (for admin view)
// @route   GET /api/admin/tasks/all
// @access  Private/Admin
exports.getTasks = async (req, res) => {
    try {
        const tasks = await AirdropTask.find({});
        res.status(200).json({ success: true, data: tasks });
    } catch (error) {
        console.error("Error fetching admin tasks:", error);
        res.status(500).json({
            success: false,
            message: "Server error fetching tasks for admin.",
        });
    }
};

// @desc    Update an airdrop task
// @route   PUT /api/admin/tasks/:id
// @access  Private/Admin
exports.updateAirdropTask = async (req, res) => {
    const { name, platform, link, reward, isActive } = req.body;
    try {
        const task = await AirdropTask.findById(req.params.id);
        if (!task) {
            return res
                .status(404)
                .json({ success: false, message: "Task not found." });
        }

        task.name = name || task.name;
        task.platform = platform || task.platform;
        task.link = link || task.link;
        task.reward = reward !== undefined ? reward : task.reward;
        task.isActive = isActive !== undefined ? isActive : task.isActive;

        await task.save();

        res.status(200).json({
            success: true,
            message: "Airdrop task updated successfully.",
            data: task,
        });
    } catch (error) {
        console.error("Error updating airdrop task:", error);
        res.status(500).json({
            success: false,
            message: "Server error updating task.",
        });
    }
};

// @desc    Delete an airdrop task
// @route   DELETE /api/admin/tasks/:id
// @access  Private/Admin
exports.deleteTask = async (req, res) => {
    try {
        const task = await AirdropTask.findById(req.params.id);
        if (!task) {
            return res
                .status(404)
                .json({ success: false, message: "Task not found." });
        }

        await task.deleteOne();

        res.status(200).json({
            success: true,
            message: "Airdrop task deleted successfully.",
        });
    } catch (error) {
        console.error("Error deleting airdrop task:", error);
        res.status(500).json({
            success: false,
            message: "Server error deleting task.",
        });
    }
};
