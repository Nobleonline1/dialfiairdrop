// signup.js
// Assumes shared.js is loaded BEFORE this script

document.addEventListener("DOMContentLoaded", () => {
    const registerUsernameInput = document.getElementById("register-username");
    const registerEmailInput = document.getElementById("register-email");
    const registerPasswordInput = document.getElementById("register-password");
    const registerReferralCodeInput = document.getElementById(
        "register-referral-code",
    );
    const registerBtn = document.getElementById("registerBtn");
    const showLoginFormLink = document.getElementById("showLoginForm");
    const resendVerificationLink = document.getElementById(
        "resendVerificationLink",
    ); // NEW: Get resend link element

    registerBtn.addEventListener("click", async (e) => {
        e.preventDefault();

        const username = registerUsernameInput.value.trim();
        const email = registerEmailInput.value.trim();
        const password = registerPasswordInput.value.trim();
        const referralCode = registerReferralCodeInput.value.trim() || null;

        if (!username || !email || !password) {
            showMessage(
                "Please fill in all required fields: Username, Email, and Password.",
                true,
            );
            return;
        }

        if (password.length < 6) {
            showMessage("Password must be at least 6 characters long.", true);
            return;
        }

        try {
            const data = await apiCall(
                "/auth/register",
                "POST",
                { username, email, password, referralCode },
                false, // Registration does not require an auth token
            );

            if (data && data.success) {
                showMessage(
                    data.message ||
                        "Registration successful! Please check your email to verify your account before logging in.",
                    false, // Not an error message
                );

                // Clear form fields after successful registration
                registerUsernameInput.value = "";
                registerEmailInput.value = "";
                registerPasswordInput.value = "";
                if (registerReferralCodeInput) {
                    registerReferralCodeInput.value = "";
                }
            } else {
                showMessage(
                    data.message || "Registration failed. Please try again.",
                    true,
                );
            }
        } catch (error) {
            console.error("Registration failed:", error);
            const errorMessage =
                (error.response && error.response.message) ||
                "An unexpected error occurred during registration.";
            showMessage("Registration failed: " + errorMessage, true);
        }
    });

    // NEW: Event listener for resending verification email
    resendVerificationLink.addEventListener("click", async (e) => {
        e.preventDefault();
        const email = registerEmailInput.value.trim(); // Try to get email from the form

        if (!email) {
            showMessage(
                "Please enter your email in the form above to resend the verification link.",
                true,
            );
            return;
        }

        try {
            showMessage("Sending verification link...", false);
            const data = await apiCall(
                "/auth/resend-verification",
                "POST",
                { email },
                false, // No auth token required for this public endpoint
            );
            showMessage(
                data.message || "Verification email resent successfully!",
                false,
            );
        } catch (error) {
            console.error("Failed to resend verification email:", error);
            const errorMessage =
                (error.response && error.response.message) ||
                "Failed to resend verification email. Please try again later.";
            showMessage("Resend failed: " + errorMessage, true);
        }
    });

    showLoginFormLink.addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = "login.html";
    });
});
