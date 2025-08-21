// backend/routes/adminRoutes.js

const express = require("express");
const {
    getDashboardStats,
    getAllUsers,
    getUser,
    updateUser,
    deleteUser,
    searchUsersByUsername, // RENAMED: Changed from searchUsers to searchUsersByUsername
    addTask,
    getTasks,
    updateAirdropTask,
    deleteTask,
    getTotalUsersCount,
    getTopReferrers,
} = require("../controllers/adminController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(protect);
router.use(authorize("admin"));

router.route("/dashboard-stats").get(getDashboardStats);

router.route("/users/all").get(getAllUsers);
// UPDATED ROUTE: Changed from /users/search to /users/search-by-username
router.route("/users/search-by-username").get(searchUsersByUsername);
router.route("/users/:id").get(getUser).put(updateUser).delete(deleteUser);

router.route("/stats/total-users").get(getTotalUsersCount);
router.route("/leaderboard/referrers").get(getTopReferrers);

router // Route for getting all tasks (admin)
    .route("/tasks") // This defines the path as /api/admin/tasks
    .post(addTask)
    .get(getTasks); // Uses getTasks from controller

router.route("/tasks/:id").put(updateAirdropTask).delete(deleteTask);

module.exports = router;
