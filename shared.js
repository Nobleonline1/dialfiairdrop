// shared.js
// This script provides global utility functions used across the frontend.

// IMPORTANT: When deploying to Render, your frontend (Static Site) and backend (Web Service)
// are on different URLs. We need to explicitly set the backend's URL here.
const BACKEND_RENDER_URL = "https://dialfi-backend.onrender.com"; // <-- REPLACE WITH YOUR ACTUAL RENDER BACKEND URL

// Global API call utility function
// Handles fetching data, authentication headers, and basic error handling
// authRequiredParam: Boolean to indicate if a JWT token should be sent.
//                   Defaults to true, but overridden to false for publicEndpoints.
const apiCall = async (
    endpoint,
    method = "GET",
    body = null,
    authRequiredParam = true, // Default to true, assuming most calls need auth
) => {
    // Construct the URL using the explicit backend URL for Render deployments.
    // This ensures frontend communicates with the correct backend service.
    const url = `${BACKEND_RENDER_URL}/api${endpoint}`; // <-- UPDATED THIS LINE

    const headers = {
        "Content-Type": "application/json",
    };

    // Use a mutable variable for internal logic, initialized by the parameter
    let isAuthNeeded = authRequiredParam;

    // List of endpoints that are inherently public and should never require authentication.
    // If an endpoint starts with any of these, `isAuthNeeded` will be set to `false`.
    const publicEndpoints = [
        "/auth/login",
        "/auth/register",
        "/auth/forgot-password",
        "/auth/reset-password",
        "/auth/verify-email",
        "/auth/resend-verification",
        "/airdrop/total-supply",
        "/airdrop/leaderboard/difi",
        "/airdrop/leaderboard/dpower",
        "/airdrop/webhook/nowpayments", // Webhooks are also public
    ];

    // Check if the current endpoint is one of the public ones
    if (publicEndpoints.some((publicPath) => endpoint.startsWith(publicPath))) {
        isAuthNeeded = false; // Explicitly override to false for public endpoints
    }

    // If authentication is needed (after potential override), check for and add token
    if (isAuthNeeded) {
        const token = localStorage.getItem("authToken");
        if (!token) {
            // If token is required but not found, redirect to login
            showMessage("Authentication required. Please log in.", true);
            setTimeout(() => (window.location.href = "login.html"), 1500);
            throw new Error("No authentication token found.");
        }
        headers["Authorization"] = `Bearer ${token}`;
    }

    const options = {
        method,
        headers,
        body: body ? JSON.stringify(body) : null,
    };

    try {
        const response = await fetch(url, options);

        // Check if the response is JSON before trying to parse it
        const contentType = response.headers.get("content-type");
        let data;

        if (contentType && contentType.includes("application/json")) {
            data = await response.json();
        } else {
            // If not JSON, read as text and throw an error with the raw response
            const text = await response.text();
            throw new Error(
                `Expected JSON response, but received non-JSON (Status: ${response.status}). Response text: ${text.substring(0, 200)}...`,
            );
        }

        // Handle non-OK HTTP statuses (e.g., 4xx, 5xx)
        if (!response.ok) {
            const errorMessage =
                data.message ||
                `API call failed with status ${response.status}`;
            const error = new Error(errorMessage);
            error.response = data; // Attach the full response data from backend
            throw error;
        }

        return data; // Return successful JSON data
    } catch (error) {
        console.error("API Call Error:", error);
        throw error; // Re-throw to be caught by the calling function
    }
};

// Global utility for showing a temporary message in a consistent way
const showMessage = (text, isError = false) => {
    const messageBox = document.getElementById("messageBox");
    const messageText = document.getElementById("messageText");
    if (!messageBox || !messageText) {
        console.error("Message box elements not found.");
        return;
    }

    messageText.textContent = text;
    messageBox.style.display = "block";

    messageBox.classList.remove("message-success", "message-error"); // Clear previous classes
    if (isError) {
        messageBox.classList.add("message-error");
    } else {
        messageBox.classList.add("message-success");
    }

    setTimeout(() => {
        messageBox.style.display = "none";
    }, 5000); // Hide after 5 seconds
};

// Global logout function
const logoutUser = () => {
    console.log("Logging out user...");
    localStorage.removeItem("authToken"); // Remove JWT token
    localStorage.removeItem("currentUserData"); // Clear any stored user data
    window.location.replace("login.html"); // Redirect to login page
};
