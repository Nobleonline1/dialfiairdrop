// admin-dashboard.js
// Assumes shared.js is loaded BEFORE this script

document.addEventListener("DOMContentLoaded", async () => {
    // --- UI Elements ---
    const messageBox = document.getElementById("messageBox");
    const messageText = document.getElementById("messageText"); // These are now handled by shared.js showMessage

    const totalUsersDisplay = document.getElementById("totalUsersDisplay"); // New
    const topReferrersList = document.getElementById("topReferrersList"); // New

    const searchUser = document.getElementById("searchUser");
    const searchUserBtn = document.getElementById("searchUserBtn");
    const userSearchResults = document.getElementById("userSearchResults");
    const loadAllUsersBtn = document.getElementById("loadAllUsersBtn");

    const taskNameInput = document.getElementById("taskName");
    const taskPlatformInput = document.getElementById("taskPlatform");
    const taskLinkInput = document.getElementById("taskLink");
    const taskRewardInput = document.getElementById("taskReward");
    const addTaskBtn = document.getElementById("addTaskBtn");
    const existingTasksList = document.getElementById("existingTasksList");
    const backToMainBtn = document.getElementById("backToMainBtn");

    // Edit User Modal Elements
    const editUserModal = document.getElementById("editUserModal"); // New
    const closeEditUserModalBtn = document.getElementById(
        "closeEditUserModalBtn",
    ); // New
    const editUserId = document.getElementById("editUserId"); // Hidden input for user ID
    const editUsername = document.getElementById("editUsername");
    const editEmail = document.getElementById("editEmail");
    const editSolanaAddress = document.getElementById("editSolanaAddress"); // NEW: Solana Address Input Element
    const editDiFiBalance = document.getElementById("editDiFiBalance");
    const editDpowerBalance = document.getElementById("editDpowerBalance");
    const editIsAdmin = document.getElementById("editIsAdmin");
    const editIsBlocked = document.getElementById("editIsBlocked");
    const saveUserChangesBtn = document.getElementById("saveUserChangesBtn");
    const cancelEditUserBtn = document.getElementById("cancelEditUserBtn");

    // --- Authentication Check ---
    const token = localStorage.getItem("authToken");
    if (!token) {
        showMessage("You are not logged in. Redirecting to login.", true);
        setTimeout(() => (window.location.href = "login.html"), 2000);
        return;
    }

    let currentUserData = null; // To store admin user data

    try {
        currentUserData = JSON.parse(localStorage.getItem("currentUserData"));
        if (!currentUserData || !currentUserData.isAdmin) {
            const response = await apiCall("/auth/me", "GET", null, true); // Corrected endpoint for /auth/me
            currentUserData = response;
            localStorage.setItem(
                "currentUserData",
                JSON.stringify(currentUserData),
            );

            if (!currentUserData.isAdmin) {
                showMessage(
                    "Access Denied: You are not authorized to view this page.",
                    true,
                );
                setTimeout(() => (window.location.href = "index.html"), 2000);
                return;
            }
        }
        // If we reach here, the user is an admin. Proceed to load dashboard content.
        loadDashboardContent();
    } catch (error) {
        console.error("Admin authentication failed:", error);
        showMessage("Authentication failed. Redirecting to login.", true);
        setTimeout(() => (window.location.href = "login.html"), 2000);
    }

    // --- Dashboard Content Loading ---
    async function loadDashboardContent() {
        await fetchTotalUsers();
        await fetchAllUsers(); // Initial load of all users
        await fetchTopReferrers();
        await fetchAllTasks();
    }

    // --- User Management Functions ---
    async function fetchTotalUsers() {
        try {
            const response = await apiCall(
                "/admin/stats/total-users",
                "GET",
                null,
                true,
            );
            totalUsersDisplay.textContent =
                response.totalUsers.toLocaleString();
        } catch (error) {
            console.error("Failed to fetch total users count:", error);
            totalUsersDisplay.textContent = "Error";
            showMessage("Failed to load total users count.", true);
        }
    }

    async function fetchAllUsers() {
        try {
            const response = await apiCall(
                "/admin/users/all",
                "GET",
                null,
                true,
            );
            const users = response.data;
            displayUsers(users);
        } catch (error) {
            console.error("Failed to fetch all users:", error);
            showMessage(
                "Failed to load users: " +
                    (error.message || "An unknown error occurred."),
                true,
            );
        }
    }

    async function searchUsers() {
        const query = searchUser.value.trim();
        if (!query) {
            showMessage("Please enter a username or email to search.", true);
            return;
        }
        try {
            // NEW API ROUTE: /admin/users/search-by-username
            // This expects a 'username' query parameter
            const response = await apiCall(
                `/admin/users/search-by-username?username=${encodeURIComponent(query)}`,
                "GET",
                null,
                true,
            );
            const users = response.data; // This endpoint should return an array, even if it's just one user
            displayUsers(users);
            if (users.length === 0) {
                showMessage("No user found with that username/email.", false);
            }
        } catch (error) {
            console.error("Failed to search users:", error);
            showMessage(
                "Failed to search users: " +
                    (error.message || "An unknown error occurred."),
                true,
            );
            userSearchResults.innerHTML = "<p>Error during search.</p>";
        }
    }

    function displayUsers(users) {
        userSearchResults.innerHTML = "";
        if (!users || users.length === 0) {
            userSearchResults.innerHTML = "<p>No users found.</p>";
            return;
        }
        users.forEach((user) => {
            const userItem = document.createElement("div");
            userItem.className = "user-item";
            userItem.innerHTML = `
                <p><strong>Username:</strong> <span>${user.username}</span></p>
                <p><strong>Email:</strong> <span>${user.email}</span></p>
                <p><strong>Solana Address:</strong> <span>${user.solanaAddress || "Not set"}</span></p> <!-- NEW: Display Solana Address -->
                <p><strong>DiFi:</strong> <span>${user.difiBalance.toFixed(2)}</span></p>
                <p><strong>Dpower:</strong> <span>${user.dpowerBalance.toLocaleString()}</span></p>
                <p><strong>Role:</strong> <span>${user.isAdmin ? "Admin" : "User"}</span></p>
                <p><strong>Status:</strong> <span>${user.isBlocked ? "Blocked" : "Active"}</span></p>
                <div class="actions">
                    <button class="btn primary-btn edit-user-btn" data-user-id="${user._id}">Edit</button>
                    <button class="btn secondary-btn delete-user-btn" data-user-id="${user._id}">Delete</button>
                </div>
            `;
            userSearchResults.appendChild(userItem);
        });

        // Attach event listeners for edit and delete buttons
        userSearchResults
            .querySelectorAll(".edit-user-btn")
            .forEach((button) => {
                button.addEventListener("click", (e) => {
                    const userId = e.target.dataset.userId;
                    openEditUserModal(userId); // Call function to open and populate modal
                });
            });

        userSearchResults
            .querySelectorAll(".delete-user-btn")
            .forEach((button) => {
                button.addEventListener("click", async (e) => {
                    const userId = e.target.dataset.userId;
                    showMessage(
                        "Deleting user... (This action cannot be undone)",
                        false,
                    );
                    try {
                        const data = await apiCall(
                            `/admin/users/${userId}`,
                            "DELETE",
                            null,
                            true,
                        );
                        showMessage(
                            data.message || "User deleted successfully!",
                            false,
                        );
                        fetchAllUsers(); // Refresh the list
                        fetchTotalUsers(); // Refresh total users count
                    } catch (error) {
                        console.error("Failed to delete user:", error);
                        showMessage(
                            "Failed to delete user: " +
                                (error.message || "An unknown error occurred."),
                            true,
                        );
                    }
                });
            });
    }

    // --- Edit User Modal Functions ---
    async function openEditUserModal(userId) {
        try {
            const response = await apiCall(
                `/admin/users/${userId}`,
                "GET",
                null,
                true,
            );
            const user = response.data;

            editUserId.value = user._id;
            editUsername.value = user.username;
            editEmail.value = user.email;
            editSolanaAddress.value = user.solanaAddress || ""; // NEW: Populate Solana Address
            editDiFiBalance.value = user.difiBalance.toFixed(2);
            editDpowerBalance.value = user.dpowerBalance;
            editIsAdmin.checked = user.isAdmin;
            editIsBlocked.checked = user.isBlocked || false; // Ensure it's false if undefined

            editUserModal.style.display = "flex"; // Show the modal
        } catch (error) {
            console.error("Failed to fetch user for editing:", error);
            showMessage("Failed to load user data for editing.", true);
        }
    }

    closeEditUserModalBtn.addEventListener("click", () => {
        editUserModal.style.display = "none";
    });

    cancelEditUserBtn.addEventListener("click", () => {
        editUserModal.style.display = "none";
    });

    saveUserChangesBtn.addEventListener("click", async () => {
        const userId = editUserId.value;
        const updatedData = {
            difiBalance: parseFloat(editDiFiBalance.value),
            dpowerBalance: parseInt(editDpowerBalance.value),
            isAdmin: editIsAdmin.checked,
            isBlocked: editIsBlocked.checked,
            solanaAddress: editSolanaAddress.value.trim() || null, // NEW: Include Solana Address, set to null if empty
        };

        try {
            const data = await apiCall(
                `/admin/users/${userId}`, // This route typically handles updates to user fields
                "PUT",
                updatedData,
                true,
            );
            showMessage(data.message || "User updated successfully!", false);
            editUserModal.style.display = "none"; // Close modal
            fetchAllUsers(); // Refresh user list
            fetchTotalUsers(); // Refresh total users count
        } catch (error) {
            console.error("Failed to save user changes:", error);
            showMessage(
                "Failed to save changes: " +
                    (error.message || "An unknown error occurred."),
                true,
            );
        }
    });

    // --- Top Referrers Functions ---
    async function fetchTopReferrers() {
        try {
            const response = await apiCall(
                "/admin/leaderboard/referrers",
                "GET",
                null,
                true,
            );
            const referrers = response.data;
            displayTopReferrers(referrers);
        } catch (error) {
            console.error("Failed to fetch top referrers:", error);
            topReferrersList.innerHTML = "<p>Error loading top referrers.</p>";
            showMessage("Failed to load top referrers.", true);
        }
    }

    function displayTopReferrers(referrers) {
        topReferrersList.innerHTML = "";
        if (!referrers || referrers.length === 0) {
            topReferrersList.innerHTML = "<p>No referrers found yet.</p>";
            return;
        }
        referrers.forEach((referrer, index) => {
            const referrerItem = document.createElement("div");
            referrerItem.className = "referrer-item";
            referrerItem.innerHTML = `
                <p><strong>${index + 1}.</strong> <span>${referrer.username}</span></p>
                <p><strong>Referrals:</strong> <span>${referrer.referralCount}</span></p>
                <p><strong>DiFi:</strong> <span>${referrer.difiBalance.toFixed(2)}</span></p>
                <p><strong>Dpower:</strong> <span>${referrer.dpowerBalance.toLocaleString()}</span></p>
            `;
            topReferrersList.appendChild(referrerItem);
        });
    }

    // --- Task Management Functions ---
    async function fetchAllTasks() {
        try {
            const response = await apiCall(
                "/admin/tasks", // This now matches the backend route in adminRoutes.js
                "GET",
                null,
                true,
            );
            const tasks = response.data;
            displayTasks(tasks);
        } catch (error) {
            console.error("Failed to fetch tasks:", error);
            showMessage(
                "Failed to load tasks: " +
                    (error.message || "An unknown error occurred."),
                true,
            );
        }
    }

    async function addTask() {
        const name = taskNameInput.value.trim();
        const platform = taskPlatformInput.value.trim();
        const link = taskLinkInput.value.trim();
        const reward = parseFloat(taskRewardInput.value);

        if (!name || !platform || !link || isNaN(reward) || reward <= 0) {
            showMessage(
                "Please fill in all task fields correctly (Name, Platform, Link, Reward > 0).",
                true,
            );
            return;
        }

        try {
            const data = await apiCall(
                "/admin/tasks", // This matches backend route
                "POST",
                { name, platform, link, reward },
                true,
            );
            showMessage(data.message || "Task added successfully!", false);
            taskNameInput.value = "";
            taskPlatformInput.value = "";
            taskLinkInput.value = "";
            taskRewardInput.value = "0.25";
            fetchAllTasks();
        } catch (error) {
            console.error("Failed to add task:", error);
            showMessage(
                "Failed to add task: " +
                    (error.message || "An unknown error occurred."),
                true,
            );
        }
    }

    function displayTasks(tasks) {
        existingTasksList.innerHTML = "";
        if (!tasks || tasks.length === 0) {
            existingTasksList.innerHTML = "<p>No tasks created yet.</p>";
            return;
        }
        tasks.forEach((task) => {
            const taskItem = document.createElement("div");
            taskItem.className = "task-item-admin";
            taskItem.innerHTML = `
                <p><strong>Name:</strong> <span>${task.name}</span></p>
                <p><strong>Platform:</strong> <span>${task.platform}</span></p>
                <p><strong>Link:</strong> <a href="${task.link}" target="_blank">${task.link.substring(0, 30)}...</a></p>
                <p><strong>Reward:</strong> <span>${task.reward} DiFi</span></p>
                <div class="actions">
                    <button class="btn primary-btn edit-task-btn" data-task-id="${task._id}">Edit</button>
                    <button class="btn secondary-btn delete-task-btn" data-task-id="${task._id}">Delete</button>
                </div>
            `;
            existingTasksList.appendChild(taskItem);
        });

        existingTasksList
            .querySelectorAll(".edit-task-btn")
            .forEach((button) => {
                button.addEventListener("click", (e) => {
                    const taskId = e.target.dataset.taskId;
                    showMessage(
                        `Edit task functionality for ID: ${taskId} (Not implemented yet)`,
                        false,
                    );
                });
            });

        existingTasksList
            .querySelectorAll(".delete-task-btn")
            .forEach((button) => {
                button.addEventListener("click", async (e) => {
                    const taskId = e.target.dataset.taskId;
                    showMessage(
                        "Deleting task... (This action cannot be undone)",
                        false,
                    );
                    try {
                        const data = await apiCall(
                            `/admin/tasks/${taskId}`, // This matches backend route
                            "DELETE",
                            null,
                            true,
                        );
                        showMessage(
                            data.message || "Task deleted successfully!",
                            false,
                        );
                        fetchAllTasks();
                    } catch (error) {
                        console.error("Failed to delete task:", error);
                        showMessage(
                            "Failed to delete task: " +
                                (error.message || "An unknown error occurred."),
                            true,
                        );
                    }
                });
            });
    }

    // --- Event Listeners ---
    searchUserBtn.addEventListener("click", searchUsers);
    loadAllUsersBtn.addEventListener("click", fetchAllUsers);
    addTaskBtn.addEventListener("click", addTask);
    backToMainBtn.addEventListener("click", () => {
        window.location.href = "index.html";
    });

    // Close modal when clicking outside of it
    window.addEventListener("click", (event) => {
        if (event.target == editUserModal) {
            editUserModal.style.display = "none";
        }
    });
});
