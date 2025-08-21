// forgot_password.js
// Assumes shared.js is loaded BEFORE this script

document.addEventListener("DOMContentLoaded", () => {
    const forgotEmailInput = document.getElementById("forgot-email");
    const sendResetLinkBtn = document.getElementById("sendResetLinkBtn");
    const backToLoginLink = document.getElementById("backToLoginLink");

    sendResetLinkBtn.addEventListener("click", async () => {
        const email = forgotEmailInput.value.trim();
        if (!email) {
            showMessage("Please enter your email address.", true);
            return;
        }

        try {
            const data = await apiCall(
                "/auth/forgot-password",
                "POST",
                { email },
                false,
            );
            showMessage(
                data.message ||
                    "If an account with that email exists, a password reset link has been sent.",
                false,
            );
            // Optionally redirect to login or show a success message
            window.location.href = "login.html";
        } catch (error) {
            console.error("Forgot password error:", error.message);
            // Show a generic, non-specific error to prevent user enumeration
            showMessage("An error occurred. Please try again.", true);
        }
    });

    backToLoginLink.addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = "login.html";
    });
});
