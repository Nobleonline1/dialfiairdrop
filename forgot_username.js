// forgot_username.js
// Assumes shared.js is loaded BEFORE this script

document.addEventListener('DOMContentLoaded', () => {
    const forgotUsernameEmailInput = document.getElementById('forgot-username-email');
    const sendUsernameBtn = document.getElementById('sendUsernameBtn');
    const backToLoginLink = document.getElementById('backToLoginLink');

    sendUsernameBtn.addEventListener('click', async () => {
        const email = forgotUsernameEmailInput.value.trim();
        if (!email) {
            alert('Please enter your email address.');
            return;
        }

        try {
            const data = await apiCall('/auth/forgot-username', 'POST', { email }, false);
            alert(data.message);
            // Optionally redirect to login or show a success message
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Forgot username error:', error.message);
        }
    });

    backToLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'login.html';
    });
});