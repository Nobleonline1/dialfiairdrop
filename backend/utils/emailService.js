// backend/utils/emailService.js
const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
    // 1. Create a transporter object
    const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    // 2. Define email options - Now correctly using options.html for content
    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: options.to,
        subject: options.subject,
        html: options.html, // CORRECTED: Changed from options.text to options.html
    };

    // 3. Send the email
    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
