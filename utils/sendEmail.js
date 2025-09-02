const nodemailer = require("nodemailer");

const sendEmail = async (email, subject, name, otp) => {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const htmlTemplate = `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <p>Hi ${name},</p>
            <p>You requested to reset your password. Please use the below OTP: </p>

            <div style="background: #ffeb3b; display: inline-block; padding: 12px 24px; 
                            font-size: 20px; font-weight: bold; border-radius: 8px; 
                            letter-spacing: 4px; margin: 10px 0;">
                ${otp}
            </div>

            <p>This OTP will expire in <b>5 minutes</b>.</p>
            <br />

            <p>Thanks & Regards,<br/>
            <b>Inventory Management App Team</b></p>
        </div>
        `

        await transporter.sendMail({
            from: `"Inventory Management App" <${process.env.EMAIL_USER}>`,
            to: email,
            subject,
            html: htmlTemplate,
        });
    } catch (err) {
        console.error("Email sending failed:", err);
    }
};

module.exports = sendEmail;