// backend/models/AirdropTask.js
const mongoose = require("mongoose");

const AirdropTaskSchema = new mongoose.Schema({
    name: {
        // e.g., "Follow us on X (Twitter)"
        type: String,
        required: [true, "Please add a task name"],
        trim: true,
        maxlength: [100, "Task name cannot be more than 100 characters"],
    },
    // Description is kept for backend data, but frontend currently doesn't use it for task creation.
    description: {
        type: String,
        required: false, // Made optional as frontend doesn't provide it
    },
    link: {
        // URL to the social media page
        type: String,
        required: [true, "Please add a link for the task"],
        match: [
            /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/,
            "Please use a valid URL with HTTP or HTTPS",
        ],
    },
    platform: {
        // e.g., "X", "Telegram", "Facebook"
        type: String,
        required: [true, "Please add a platform for the task"], // Made required as frontend provides it
        trim: true,
        maxlength: [50, "Platform cannot be more than 50 characters"],
    },
    reward: {
        // DiFi reward for completing this task (e.g., 0.25 DiFi)
        type: Number,
        required: [true, "Please add a reward amount"],
        min: [0, "Reward cannot be a negative number"],
        default: 0.25, // As specified by user for DiFi
    },
    isActive: {
        // Admins can activate/deactivate tasks
        type: Boolean,
        default: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model("AirdropTask", AirdropTaskSchema);
