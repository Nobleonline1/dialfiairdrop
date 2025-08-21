// index.js
// Assumes shared.js is loaded BEFORE this script
// Assumes qrcode.min.js is loaded BEFORE this script

document.addEventListener("DOMContentLoaded", async () => {
    // --- UI Elements ---
    const mineButton = document.getElementById("mineButton");
    const totalSupplyDisplay = document.getElementById("total-supply-display");
    const lastMinedTimeDisplay = document.getElementById("last-mined-time");
    const countdownDisplay = document.getElementById("countdown");
    const userDiFiBalanceDisplay = document.getElementById("user-difi-balance");
    const userDpowerBalanceDisplay = document.getElementById(
        "user-dpower-balance",
    );
    const currentDpowerConversionDisplay = document.getElementById(
        "current-dpower-conversion-display",
    );
    const dpowerToConvertInput = document.getElementById("dpower-to-convert");
    const convertDpowerBtn = document.getElementById("convertDpowerBtn");
    const convertedDifiDisplay = document.getElementById("converted-difi");
    const purchaseAmountUsdInput = document.getElementById(
        "purchase-amount-usd",
    );
    const purchaseDpowerBtn = document.getElementById("purchaseDpowerBtn");
    const paymentDetailsDiv = document.getElementById("payment-details");
    const cryptoAmountSpan = document.getElementById("crypto-amount");
    const paymentAddressSpan = document.getElementById("payment-address");
    const cryptoChoiceSelect = document.getElementById("crypto-choice");
    const referralCodeDisplay = document.getElementById("referral-code");
    const copyReferralCodeBtn = document.getElementById("copyReferralCodeBtn");
    const copyPaymentAddressBtn = document.getElementById(
        "copyPaymentAddressBtn",
    );
    const qrcodeDiv = document.getElementById("qrcode"); // QR code container

    // Modals & Menu
    const menuButton = document.getElementById("menuButton");
    const sideMenu = document.getElementById("sideMenu");
    const closeMenuBtn = document.getElementById("closeMenuBtn");
    const tasksLink = document.getElementById("tasksLink");
    const contactLink = document.getElementById("contactLink");
    const whitepaperLink = document.getElementById("whitepaperLink");
    const leaderboardLink = document.getElementById("leaderboardLink");
    const logoutLink = document.getElementById("logoutLink");
    const adminDashboardLink = document.getElementById("adminDashboardLink");
    const tasksModal = document.getElementById("tasksModal");
    const contactModal = document.getElementById("contactModal");
    const whitepaperModal = document.getElementById("whitepaperModal");
    const leaderboardModal = document.getElementById("leaderboardModal");
    const closeTasksModalBtn = document.getElementById("closeTasksModalBtn");
    const closeContactModalBtn = document.getElementById(
        "closeContactModalBtn",
    );
    const closeWhitepaperModalBtn = document.getElementById(
        "closeWhitepaperModalBtn",
    );
    const closeLeaderboardModalBtn = document.getElementById(
        "closeLeaderboardModalBtn",
    );

    const tasksListContainer = document.getElementById("tasks-list");
    const difiLeaderboardList = document.getElementById(
        "difi-leaderboard-list",
    );
    const dpowerLeaderboardList = document.getElementById(
        "dpower-leaderboard-list",
    );

    let currentUserData = null; // Will store user data after successful authentication
    let mineCountdownIntervalId; // To store the interval ID for clearing

    // --- Core Authentication Check and Initial Content Load ---
    async function checkAuthenticationAndLoadContent() {
        const token = localStorage.getItem("authToken");

        if (!token) {
            console.log("No token found. Redirecting to login.");
            window.location.href = "login.html";
            return;
        }

        try {
            const response = await apiCall("/users/me", "GET", null, true);
            currentUserData = response;
            localStorage.setItem(
                "currentUserData",
                JSON.stringify(currentUserData),
            );
            await fetchAndUpdateUI();
        } catch (error) {
            console.error(
                "Authentication check failed on index.html load:",
                error.message,
            );
            logoutUser();
        }
    }

    checkAuthenticationAndLoadContent();

    // --- UI Update Functions (Now fetch from backend) ---
    async function fetchAndUpdateUI() {
        try {
            const latestUserData = await apiCall(
                "/users/me",
                "GET",
                null,
                true,
            );
            currentUserData = latestUserData;
            localStorage.setItem(
                "currentUserData",
                JSON.stringify(currentUserData),
            );

            userDiFiBalanceDisplay.textContent =
                currentUserData.difiBalance.toFixed(2);
            userDpowerBalanceDisplay.textContent =
                currentUserData.dpowerBalance.toLocaleString();
            currentDpowerConversionDisplay.textContent =
                currentUserData.dpowerBalance.toLocaleString();
            referralCodeDisplay.textContent = currentUserData.referralCode;

            updateMiningUI(currentUserData.lastMineTimestamp);

            if (adminDashboardLink) {
                if (currentUserData.isAdmin) {
                    adminDashboardLink.style.display = "block";
                } else {
                    adminDashboardLink.style.display = "none";
                }
            }

            // Call the new function to fetch and display total supply
            await fetchTotalSupplyAndDisplay();
        } catch (error) {
            console.error("Failed to fetch UI data during update:", error);
            if (
                error.message ===
                "Unauthorized: Session expired or invalid token."
            ) {
                logoutUser();
            } else {
                showMessage("Failed to update UI data. Please refresh.", true);
            }
        }
    }

    // Function to fetch and update total supply display
    async function fetchTotalSupplyAndDisplay() {
        try {
            const totalSupplyResponse = await apiCall(
                "/airdrop/total-supply",
                "GET",
                null,
                false,
            );

            if (
                totalSupplyResponse &&
                typeof totalSupplyResponse.totalSupply === "number"
            ) {
                let valueToDisplay = totalSupplyResponse.totalSupply;

                valueToDisplay = parseFloat(valueToDisplay.toFixed(2));

                totalSupplyDisplay.textContent = valueToDisplay.toLocaleString(
                    "en-US",
                    {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                    },
                );
            } else {
                totalSupplyDisplay.textContent = "Error: N/A";
                console.error(
                    "Invalid total supply response or type:",
                    totalSupplyResponse,
                );
            }
        } catch (error) {
            console.error("Failed to fetch total supply:", error);
            totalSupplyDisplay.textContent = "Error: N/A";
            showMessage("Failed to fetch total supply.", true);
        }
    }

    // --- Mining Cooldown Logic ---
    function updateMiningUI(lastMineTimestamp) {
        const now = Date.now();
        const MINE_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

        let lastMineTime = 0;
        if (lastMineTimestamp) {
            lastMineTime = new Date(lastMineTimestamp).getTime();
        }

        const nextMineAvailableAt = lastMineTime + MINE_INTERVAL_MS;

        if (lastMineTime === 0) {
            // If never mined
            mineButton.disabled = false;
            countdownDisplay.textContent = "Ready to Mine!";
            mineButton.textContent = "Mine 0.25 diFi";
            lastMinedTimeDisplay.textContent = "Never";
        } else if (now >= nextMineAvailableAt) {
            mineButton.disabled = false;
            countdownDisplay.textContent = "Ready to Mine!";
            mineButton.textContent = "Mine 0.25 diFi";
        } else {
            mineButton.disabled = true;
            mineButton.textContent = "Mining Cooldown";
            let timeRemaining = nextMineAvailableAt - now;

            if (mineCountdownIntervalId) {
                clearInterval(mineCountdownIntervalId);
            }

            mineCountdownIntervalId = setInterval(() => {
                timeRemaining -= 1000;
                if (timeRemaining <= 0) {
                    clearInterval(mineCountdownIntervalId);
                    mineButton.disabled = false;
                    countdownDisplay.textContent = "Ready to Mine!";
                    mineButton.textContent = "Mine 0.25 diFi";
                    fetchTotalSupplyAndDisplay(); // Call to update total supply on countdown finish
                } else {
                    const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
                    const minutes = Math.floor(
                        (timeRemaining % (1000 * 60 * 60)) / (1000 * 60),
                    );
                    const seconds = Math.floor(
                        (timeRemaining % (1000 * 60)) / 1000,
                    );
                    countdownDisplay.textContent = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
                }
            }, 1000);
        }
    }

    // --- Event Listeners ---

    mineButton.addEventListener("click", async () => {
        if (!mineButton.disabled) {
            try {
                const data = await apiCall("/airdrop/mine", "POST");
                showMessage(data.message);
                currentUserData.difiBalance = data.userDiFiBalance;
                currentUserData.lastMineTimestamp = data.lastMineTimestamp;
                localStorage.setItem(
                    "currentUserData",
                    JSON.stringify(currentUserData),
                );
                updateMiningUI(currentUserData.lastMineTimestamp);
                userDiFiBalanceDisplay.textContent =
                    currentUserData.difiBalance.toFixed(2);
                userDpowerBalanceDisplay.textContent =
                    currentUserData.dpowerBalance.toLocaleString();
                // Dynamically update total supply after a successful mine
                await fetchTotalSupplyAndDisplay(); // Call to update total supply
            } catch (error) {
                console.error("Mining error:", error);
                showMessage(
                    "Mining failed: " +
                        (error.message || "An unknown error occurred."),
                    true,
                );
            }
        }
    });

    // Referral Copy (remains unchanged)
    if (copyReferralCodeBtn && referralCodeDisplay) {
        copyReferralCodeBtn.addEventListener("click", () => {
            const text = referralCodeDisplay.textContent;
            if (text === "Loading..." || !text || text.includes("N/A")) {
                showMessage(
                    "Referral code not available yet. Please wait or refresh.",
                    true,
                );
                return;
            }
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard
                    .writeText(text)
                    .then(() => {
                        showMessage("Referral code copied to clipboard!");
                    })
                    .catch((err) => {
                        console.error(
                            "Failed to copy with clipboard API:",
                            err,
                        );
                        fallbackCopyTextToClipboard(text);
                    });
            } else {
                fallbackCopyTextToClipboard(text);
            }
        });
    }

    function fallbackCopyTextToClipboard(text) {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.top = 0;
        textarea.style.left = 0;
        textarea.style.width = "2em";
        textarea.style.height = "2em";
        textarea.style.padding = 0;
        textarea.style.border = "none";
        textarea.style.outline = "none";
        textarea.style.boxShadow = "none";
        textarea.style.background = "transparent";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        try {
            const successful = document.execCommand("copy");
            if (successful) {
                showMessage("Referral code copied to clipboard (fallback)!");
            } else {
                throw new Error("execCommand('copy') failed");
            }
        } catch (err) {
            console.error("Could not copy text (fallback): ", err);
            showMessage("Failed to copy referral code.", true);
        } finally {
            document.body.removeChild(textarea);
        }
    }

    // Dpower Conversion (minor change to call fetchTotalSupplyAndDisplay)
    dpowerToConvertInput.addEventListener("input", () => {
        const dpowerVal = parseInt(dpowerToConvertInput.value) || 0;
        const userHasEnoughDpower = currentUserData
            ? dpowerVal <= currentUserData.dpowerBalance
            : false;

        if (dpowerVal >= 250 && dpowerVal % 250 === 0 && userHasEnoughDpower) {
            const convertibleDiFi = (dpowerVal / 250) * 0.25;
            convertedDifiDisplay.textContent = convertibleDiFi.toFixed(2);
            convertDpowerBtn.disabled = false;
        } else {
            convertedDifiDisplay.textContent = "0.00";
            convertDpowerBtn.disabled = true;
        }
    });

    convertDpowerBtn.addEventListener("click", async () => {
        const dpowerToConvert = parseInt(dpowerToConvertInput.value);
        if (
            dpowerToConvert > 0 &&
            dpowerToConvert % 250 === 0 &&
            dpowerToConvert <= currentUserData.dpowerBalance
        ) {
            try {
                const data = await apiCall("/airdrop/convert-dpower", "POST", {
                    amount: dpowerToConvert,
                });
                showMessage(data.message);
                currentUserData.dpowerBalance = data.userDpowerBalance;
                currentUserData.difiBalance = data.userDiFiBalance;
                localStorage.setItem(
                    "currentUserData",
                    JSON.stringify(currentUserData),
                );
                userDiFiBalanceDisplay.textContent =
                    currentUserData.difiBalance.toFixed(2);
                userDpowerBalanceDisplay.textContent =
                    currentUserData.dpowerBalance.toLocaleString();
                currentDpowerConversionDisplay.textContent =
                    currentUserData.dpowerBalance.toLocaleString();
                dpowerToConvertInput.value = "";
                convertedDifiDisplay.textContent = "0.00";
                convertDpowerBtn.disabled = true;
                // Dynamically update total supply after a successful conversion
                await fetchTotalSupplyAndDisplay(); // Call to update total supply
            } catch (error) {
                console.error("Conversion error:", error);
                showMessage(
                    "Dpower conversion failed: " +
                        (error.message || "An unknown error occurred."),
                    true,
                );
            }
        } else {
            showMessage(
                "Please enter a valid amount (multiple of 250) and ensure you have enough Dpower.",
                true,
            );
        }
    });

    // Premium Purchase (NOWPayments Integration)
    purchaseDpowerBtn.addEventListener("click", async () => {
        const usdAmount = parseInt(purchaseAmountUsdInput.value);
        if (usdAmount >= 5 && usdAmount % 5 === 0) {
            paymentDetailsDiv.style.display = "block";
            cryptoChoiceSelect.value = ""; // Reset dropdown
            paymentAddressSpan.textContent =
                "Select a crypto to generate payment details.";
            cryptoAmountSpan.textContent = "";
            qrcodeDiv.innerHTML = ""; // Clear any old QR code
            showMessage(
                "Select a cryptocurrency to generate your payment invoice.",
                false,
            );
        } else {
            showMessage(
                "Please enter a valid amount in multiples of $5.",
                true,
            );
            paymentDetailsDiv.style.display = "none";
            qrcodeDiv.innerHTML = "";
        }
    });

    cryptoChoiceSelect.addEventListener("change", async () => {
        const selectedCrypto = cryptoChoiceSelect.value;
        const usdAmount = parseInt(purchaseAmountUsdInput.value);

        if (selectedCrypto && usdAmount > 0 && usdAmount % 5 === 0) {
            try {
                showMessage("Generating NOWPayments invoice...", false);
                const data = await apiCall(
                    "/airdrop/generate-payment-address", // This now points to NOWPayments invoice creation
                    "POST",
                    { usdAmount, crypto: selectedCrypto },
                );

                paymentAddressSpan.textContent = data.walletAddress;
                cryptoAmountSpan.textContent = `${data.cryptoAmount} ${data.cryptoCurrency.toUpperCase()}`;
                showMessage(
                    "Invoice generated! Send payment to the address shown.",
                    false,
                );

                // Generate QR Code
                if (typeof QRCode !== "undefined" && qrcodeDiv) {
                    qrcodeDiv.innerHTML = ""; // Clear previous QR code
                    const qrCodeData = data.qrcodeUrl || data.walletAddress;
                    new QRCode(qrcodeDiv, {
                        text: qrCodeData,
                        width: 128,
                        height: 128,
                        colorDark: "#000000",
                        colorLight: "#ffffff",
                        correctLevel: QRCode.CorrectLevel.H,
                    });
                } else {
                    console.warn(
                        "QRCode.js not loaded or qrcodeDiv not found. Cannot generate QR code.",
                    );
                }
            } catch (error) {
                console.error("Error generating NOWPayments invoice:", error);
                paymentAddressSpan.textContent = "Error getting address.";
                cryptoAmountSpan.textContent = "";
                qrcodeDiv.innerHTML = ""; // Clear QR code on error
                showMessage(
                    "Failed to generate payment invoice: " +
                        (error.message || "An unknown error occurred."),
                    true,
                );
            }
        } else {
            paymentAddressSpan.textContent =
                "Select crypto and enter USD amount.";
            cryptoAmountSpan.textContent = "";
            qrcodeDiv.innerHTML = "";
        }
    });

    // Copy Payment Address (remains unchanged)
    if (copyPaymentAddressBtn && paymentAddressSpan) {
        copyPaymentAddressBtn.addEventListener("click", () => {
            const text = paymentAddressSpan.textContent;
            if (
                text === "Loading..." ||
                !text ||
                text.includes("Select crypto") ||
                text.includes("Error")
            ) {
                showMessage("Payment address not available yet.", true);
                return;
            }
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard
                    .writeText(text)
                    .then(() => {
                        showMessage("Payment address copied to clipboard!");
                    })
                    .catch((err) => {
                        console.error(
                            "Failed to copy with clipboard API:",
                            err,
                        );
                        fallbackCopyTextToClipboard(text);
                    });
            } else {
                fallbackCopyTextToClipboard(text);
            }
        });
    }

    // --- Menu and Modal Functionality (remains unchanged) ---

    menuButton.addEventListener("click", () => {
        sideMenu.style.width = "250px";
    });
    closeMenuBtn.addEventListener("click", () => {
        sideMenu.style.width = "0";
    });

    tasksLink.addEventListener("click", async (e) => {
        e.preventDefault();
        sideMenu.style.width = "0";
        tasksModal.style.display = "flex";
        if (currentUserData) {
            await fetchTasks(currentUserData);
        } else {
            showMessage(
                "User data not loaded. Please try logging in again.",
                true,
            );
            console.error(
                "currentUserData is null when trying to fetch tasks.",
            );
            logoutUser();
        }
    });

    whitepaperLink.addEventListener("click", (e) => {
        e.preventDefault();
        sideMenu.style.width = "0";
        window.open("/whitepaper.html", "_blank");
    });

    leaderboardLink.addEventListener("click", async (e) => {
        e.preventDefault();
        sideMenu.style.width = "0";
        leaderboardModal.style.display = "flex";
        await fetchLeaderboardData();
    });

    contactLink.addEventListener("click", (e) => {
        e.preventDefault();
        sideMenu.style.width = "0";
        contactModal.style.display = "flex";
    });

    logoutLink.addEventListener("click", (e) => {
        e.preventDefault();
        logoutUser();
    });

    adminDashboardLink.addEventListener("click", (e) => {
        e.preventDefault();
        sideMenu.style.width = "0";
        window.location.href = "admin-dashboard.html";
    });

    if (closeTasksModalBtn)
        closeTasksModalBtn.addEventListener(
            "click",
            () => (tasksModal.style.display = "none"),
        );
    if (closeContactModalBtn)
        closeContactModalBtn.addEventListener(
            "click",
            () => (contactModal.style.display = "none"),
        );
    if (closeWhitepaperModalBtn)
        closeWhitepaperModalBtn.addEventListener(
            "click",
            () => (whitepaperModal.style.display = "none"),
        );
    if (closeLeaderboardModalBtn)
        closeLeaderboardModalBtn.addEventListener(
            "click",
            () => (leaderboardModal.style.display = "none"),
        );

    window.addEventListener("click", (event) => {
        if (event.target === tasksModal) tasksModal.style.display = "none";
        if (event.target === contactModal) contactModal.style.display = "none";
        if (event.target === whitepaperModal)
            whitepaperModal.style.display = "none";
        if (event.target === leaderboardModal)
            leaderboardModal.style.display = "none";
    });

    // --- Dynamic Task Loading and Claiming (remains unchanged) ---
    async function fetchTasks(userData) {
        if (!userData || !userData._id) {
            console.warn(
                "Cannot fetch tasks: user not authenticated or user ID missing.",
            );
            tasksListContainer.innerHTML =
                "<p>Please log in to view tasks.</p>";
            return;
        }
        try {
            const data = await apiCall("/airdrop/tasks", "GET");
            tasksListContainer.innerHTML = "";
            if (data.tasks && data.tasks.length > 0) {
                data.tasks.forEach((task) => {
                    const tasksCompleted = userData.tasksCompleted || [];
                    const isClaimed = tasksCompleted.includes(task._id);
                    const isTaskLinkVisited =
                        sessionStorage.getItem(`task_visited_${task._id}`) ===
                        "true";

                    const taskItem = document.createElement("div");
                    taskItem.className = "task-item";
                    taskItem.innerHTML = `
                        <p>${task.name}</p>
                        <a href="${task.link}" target="_blank" class="btn task-btn go-to-task-link" data-task-id="${task._id}">Go to ${task.platform || "Page"}</a>
                        <button class="btn primary-btn claim-task-btn" data-reward="${task.reward}" data-task-id="${task._id}" ${isClaimed || !isTaskLinkVisited ? "disabled" : ""}>
                            ${isClaimed ? "Claimed!" : `Claim ${task.reward} DiFi`}
                        </button>
                    `;
                    tasksListContainer.appendChild(taskItem);
                });
            } else {
                tasksListContainer.innerHTML =
                    "<p>No tasks available at the moment.</p>";
            }

            tasksListContainer
                .querySelectorAll(".go-to-task-link")
                .forEach((link) => {
                    link.addEventListener("click", (e) => {
                        const clickedTaskId = e.target.dataset.taskId;
                        sessionStorage.setItem(
                            `task_visited_${clickedTaskId}`,
                            "true",
                        );
                        const claimButton = tasksListContainer.querySelector(
                            `.claim-task-btn[data-task-id="${clickedTaskId}"]`,
                        );
                        if (claimButton && !claimButton.disabled) {
                            claimButton.disabled = false;
                            claimButton.textContent = `Claim ${claimButton.dataset.reward} DiFi`;
                        }
                    });
                });

            tasksListContainer
                .querySelectorAll(".claim-task-btn")
                .forEach((button) => {
                    button.addEventListener("click", async (e) => {
                        const taskId = e.target.dataset.taskId;
                        const reward = parseFloat(e.target.dataset.reward);
                        const isTaskLinkVisited =
                            sessionStorage.getItem(`task_visited_${taskId}`) ===
                            "true";

                        if (!e.target.disabled && isTaskLinkVisited) {
                            try {
                                const data = await apiCall(
                                    "/airdrop/claim-task",
                                    "POST",
                                    { taskId },
                                );
                                showMessage(data.message);
                                e.target.disabled = true;
                                e.target.textContent = "Claimed!";
                                e.target.classList.add("btn-claimed");

                                currentUserData.difiBalance =
                                    data.userDiFiBalance;
                                currentUserData.dpowerBalance =
                                    data.userDpowerBalance;
                                if (!currentUserData.tasksCompleted) {
                                    currentUserData.tasksCompleted = [];
                                }
                                currentUserData.tasksCompleted.push(taskId);
                                localStorage.setItem(
                                    "currentUserData",
                                    JSON.stringify(currentUserData),
                                );
                                userDiFiBalanceDisplay.textContent =
                                    currentUserData.difiBalance.toFixed(2);
                                userDpowerBalanceDisplay.textContent =
                                    currentUserData.dpowerBalance.toLocaleString();

                                fetchTasks(currentUserData);
                                await fetchTotalSupplyAndDisplay(); // Call to update total supply after claiming a task
                            } catch (error) {
                                console.error("Error claiming task:", error);
                                showMessage(
                                    "Failed to claim task: " +
                                        (error.message ||
                                            "An unknown error occurred."),
                                    true,
                                );
                                if (isTaskLinkVisited) {
                                    e.target.disabled = false;
                                    e.target.textContent = `Claim ${reward} DiFi`;
                                    e.target.classList.remove("btn-claimed");
                                }
                            }
                        } else if (!isTaskLinkVisited) {
                            showMessage(
                                "Please click the 'Go to Task' link first to visit the task page.",
                                true,
                            );
                        }
                    });
                });
        } catch (error) {
            console.error("Failed to fetch tasks:", error);
            tasksListContainer.innerHTML =
                "<p>Could not load tasks. Please try again later. (Error: " +
                (error.message || "Unknown") +
                ")</p>";
            showMessage(
                "Failed to load tasks: " +
                    (error.message || "An unknown error occurred."),
                true,
            );
        }
    }

    // --- Leaderboard Data Fetching (remains unchanged) ---
    async function fetchLeaderboardData() {
        try {
            const difiLeaders = await apiCall(
                "/airdrop/leaderboard/difi",
                "GET",
                null,
                false,
            );
            difiLeaderboardList.innerHTML = "";
            if (difiLeaders.length === 0) {
                difiLeaderboardList.innerHTML = "<li>No DiFi leaders yet.</li>";
            } else {
                difiLeaders.forEach((user) => {
                    const li = document.createElement("li");
                    li.innerHTML = `<span class="leaderboard-username">${user.username}</span>: <span class="leaderboard-balance">${user.difiBalance.toFixed(2)} DiFi</span>`;
                    difiLeaderboardList.appendChild(li);
                });
            }

            const dpowerLeaders = await apiCall(
                "/airdrop/leaderboard/dpower",
                "GET",
                null,
                false,
            );
            dpowerLeaderboardList.innerHTML = "";
            if (dpowerLeaders.length === 0) {
                dpowerLeaderboardList.innerHTML =
                    "<li>No Dpower leaders yet.</li>";
            } else {
                dpowerLeaders.forEach((user) => {
                    const li = document.createElement("li");
                    li.innerHTML = `<span class="leaderboard-username">${user.username}</span>: <span class="leaderboard-balance">${user.dpowerBalance.toLocaleString()} Dpower</span>`;
                    dpowerLeaderboardList.appendChild(li);
                });
            }
        } catch (error) {
            console.error("Failed to fetch leaderboard data:", error);
            difiLeaderboardList.innerHTML =
                "<li>Error loading DiFi leaders.</li>";
            dpowerLeaderboardList.innerHTML =
                "<li>Error loading Dpower leaders.</li>";
            showMessage(
                "Failed to load leaderboard data: " +
                    (error.message || "An unknown error occurred."),
                true,
            );
        }
    }

    const messages = [
        "DialFi Airdrop",
        "DialFi Airdrop",
        "DialFi Airdrop",
        "DialFi Airdrop",
        "DialFi Airdrop",
        "DialFi Airdrop",
        "DialFi Airdrop",
        "DialFi Airdrop",
        "DialFi Airdrop",
    ];
    let currentIndex = 0;
    const dialfiHeaderElement = document.getElementById("dialfiHeader");

    function displayNextMessage() {
        if (dialfiHeaderElement) {
            if (currentIndex < messages.length) {
                dialfiHeaderElement.textContent = messages[currentIndex];
                currentIndex++;
            } else {
                currentIndex = 0;
            }
        }
    }
    if (dialfiHeaderElement) {
        const messageInterval = setInterval(displayNextMessage, 2000);
    }
});
