// login.js
// Assumes shared.js is loaded BEFORE this script

document.addEventListener("DOMContentLoaded", () => {
    // --- UI Elements ---
    const usernameOrEmailInput = document.getElementById("usernameOrEmail"); // Corrected ID
    const passwordInput = document.getElementById("password"); // Corrected ID
    const loginButton = document.getElementById("loginBtn");
    const messageBox = document.getElementById("messageBox");
    const messageText = document.getElementById("messageText");

    // --- Helper function to display messages ---
    function showMessage(message, isError = false) {
        messageText.textContent = message;
        messageBox.style.display = "block";
        if (isError) {
            messageBox.style.backgroundColor = "#ff4d4d"; // Red for errors
        } else {
            messageBox.style.backgroundColor = "#4CAF50"; // Green for success
        }
        setTimeout(() => {
            messageBox.style.display = "none";
        }, 5000); // Hide after 5 seconds
    }

    // --- Login Functionality ---
    if (loginButton) {
        loginButton.addEventListener("click", async (e) => {
            e.preventDefault(); // Prevent default form submission

            const usernameOrEmail = usernameOrEmailInput.value.trim();
            const password = passwordInput.value.trim();

            if (!usernameOrEmail || !password) {
                showMessage(
                    "Please enter both username/email and password.",
                    true,
                );
                return;
            }

            try {
                // Show loading state
                loginButton.disabled = true;
                loginButton.textContent = "Logging in...";

                const response = await apiCall("/auth/login", "POST", {
                    usernameOrEmail,
                    password,
                });

                if (response.token) {
                    localStorage.setItem("authToken", response.token);
                    showMessage("Login successful! Redirecting...", false);
                    setTimeout(() => {
                        window.location.href = "index.html"; // Redirect to main app page
                    }, 1000);
                } else {
                    showMessage(
                        response.message || "Login failed. Please try again.",
                        true,
                    );
                }
            } catch (error) {
                console.error("Login error:", error);
                showMessage(
                    error.message ||
                        "An unexpected error occurred during login.",
                    true,
                );
            } finally {
                loginButton.disabled = false;
                loginButton.textContent = "Login";
            }
        });
    } else {
        console.error("Login button not found in the DOM.");
    }

    // Handle form submission on Enter key press
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault(); // Prevent default form submission
            loginButton.click(); // Programmatically click the login button
        });
    } else {
        console.error("Login form not found in the DOM.");
    }
});
