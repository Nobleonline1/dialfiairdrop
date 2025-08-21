// linkwallet.js
// Assumes shared.js is loaded BEFORE this script

document.addEventListener("DOMContentLoaded", async () => {
    // --- UI Elements ---
    const solanaAddressInput = document.getElementById("solanaAddressInput");
    const currentSolanaAddressDisplay = document.getElementById(
        "currentSolanaAddress",
    );
    const submitSolanaAddressBtn = document.getElementById(
        "submitSolanaAddressBtn",
    );
    const backToMainBtn = document.getElementById("backToMainBtn");

    // --- Authentication Check ---
    const token = localStorage.getItem("authToken");
    if (!token) {
        showMessage("You are not logged in. Redirecting to login.", true);
        setTimeout(() => (window.location.href = "login.html"), 2000);
        return;
    }

    // --- Fetch Current Solana Address on Load ---
    async function fetchUserSolanaAddress() {
        try {
            const response = await apiCall("/auth/me", "GET", null, true);
            if (response.success && response.solanaAddress) {
                currentSolanaAddressDisplay.textContent =
                    response.solanaAddress;
                solanaAddressInput.value = response.solanaAddress; // Pre-fill input with existing address
            } else {
                currentSolanaAddressDisplay.textContent = "Not set";
                solanaAddressInput.value = ""; // Ensure input is empty if no address
            }
        } catch (error) {
            console.error("Failed to fetch user's Solana address:", error);
            currentSolanaAddressDisplay.textContent = "Error loading address";
            showMessage("Failed to load your current Solana address.", true);
        }
    }

    // Call fetch function on page load
    fetchUserSolanaAddress();

    // --- Event Listeners ---
    submitSolanaAddressBtn.addEventListener("click", async () => {
        const solanaAddress = solanaAddressInput.value.trim();

        // Basic client-side validation (backend will do more robust validation)
        if (!solanaAddress) {
            showMessage("Please enter your Solana address.", true);
            return;
        }

        // Simple length check for Solana addresses (typically 32-44 base58 chars)
        // This is a basic check. For production, consider a more robust Solana address validation library.
        if (solanaAddress.length < 32 || solanaAddress.length > 44) {
            showMessage(
                "Please enter a valid Solana address (typically 32-44 characters).",
                true,
            );
            return;
        }

        showMessage("Submitting address...", false);
        try {
            const response = await apiCall(
                "/auth/update-solana-address",
                "PUT",
                { solanaAddress },
                true,
            );

            if (response.success) {
                showMessage(response.message, false);
                currentSolanaAddressDisplay.textContent =
                    response.solanaAddress;
            } else {
                showMessage(
                    response.message || "Failed to update Solana address.",
                    true,
                );
            }
        } catch (error) {
            console.error("Error submitting Solana address:", error);
            showMessage(
                "Error submitting Solana address. Please try again.",
                true,
            );
        }
    });

    backToMainBtn.addEventListener("click", () => {
        window.location.href = "index.html";
    });
});
