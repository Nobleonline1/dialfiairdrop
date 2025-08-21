// tasks.js
// Assumes shared.js is loaded BEFORE this script

document.addEventListener("DOMContentLoaded", async () => {
    const usernameDisplay = document.getElementById("username-display");
    const balanceDisplay = document.getElementById("balance-display");
    const tasksList = document.getElementById("social-tasks-list");
    const logoutBtn = document.getElementById("logoutBtn");

    // Check for a token. If none, redirect to login.
    const token = localStorage.getItem("authToken");
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    logoutBtn.addEventListener("click", logoutUser);

    // Function to render a single task item
    const renderTask = (task) => {
        const taskItem = document.createElement("div");
        taskItem.className = "task-item";
        taskItem.dataset.taskId = task.id;

        const taskText = document.createElement("p");
        taskText.innerHTML = `
            <strong>${task.platform} Task</strong>
            <br>
            Earn <strong>${task.reward} diFi</strong>
        `;

        const taskButton = document.createElement("button");
        taskButton.className = "task-btn";
        taskButton.textContent = task.completed ? "Completed" : "Go to Task";
        taskButton.disabled = task.completed;

        // Add a link for the task button
        if (task.link) {
            taskButton.addEventListener("click", () => {
                window.open(task.link, "_blank");
                completeTask(task.id);
            });
        } else {
            taskButton.addEventListener("click", () => {
                completeTask(task.id);
            });
        }

        taskItem.appendChild(taskText);
        taskItem.appendChild(taskButton);
        tasksList.appendChild(taskItem);
    };

    // Function to fetch and display user data and tasks
    const fetchDataAndRenderUI = async () => {
        try {
            // Fetch user profile
            const userProfile = await apiCall(
                "/user/profile",
                "GET",
                null,
                true,
            );
            usernameDisplay.textContent = userProfile.username;
            balanceDisplay.textContent = parseFloat(
                userProfile.balance,
            ).toFixed(2);

            // Fetch tasks
            const tasks = await apiCall("/tasks", "GET", null, true);

            // Clear old tasks and render new ones
            tasksList.innerHTML = "";
            if (tasks.length === 0) {
                tasksList.innerHTML =
                    "<p>No new tasks available. Check back later!</p>";
            } else {
                tasks.forEach(renderTask);
            }
        } catch (error) {
            console.error("Failed to fetch data:", error);
            // If the session has expired, the apiCall will handle the redirect.
            // For other errors, show a message.
            if (error.message !== "Unauthorized: Session expired.") {
                showMessage(
                    "Failed to load data. Please try logging in again.",
                    true,
                );
            }
        }
    };

    // Function to handle task completion
    const completeTask = async (taskId) => {
        const taskButton = tasksList.querySelector(
            `[data-task-id="${taskId}"] button`,
        );
        taskButton.disabled = true;
        taskButton.textContent = "Processing...";

        try {
            const data = await apiCall(
                `/tasks/complete`,
                "POST",
                { taskId },
                true,
            );
            showMessage(
                data.message ||
                    "Task completed successfully! Your balance has been updated.",
                false,
            );

            // Update the UI with the new balance and disable the button
            const updatedBalance =
                parseFloat(balanceDisplay.textContent) + 0.25;
            balanceDisplay.textContent = updatedBalance.toFixed(2);
            taskButton.textContent = "Completed";
            taskButton.disabled = true;
        } catch (error) {
            console.error("Task completion failed:", error);
            const errorMessage =
                (error.response && error.response.message) ||
                "Failed to complete task. Please try again.";
            showMessage(errorMessage, true);

            // Re-enable the button if the API call failed
            taskButton.textContent = "Go to Task";
            taskButton.disabled = false;
        }
    };

    // Initial data fetch
    fetchDataAndRenderUI();
});
