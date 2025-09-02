const OTP = require("../models/otpModel");
const User = require("../models/userModel");
const sendEmail = require("../utils/sendEmail");
const bcrypt = require("bcryptjs");

//Generate 6-digit random OTP
const generateOTP = () => {
    const digits = "0123456789".split("");
    let otp = "";

    //shuffle digits
    for(let i=digits.length-1; i>0; i--){
        const j = Math.floor(Math.random()*(i+1));
        [digits[i], digits[j]] = [digits[j], digits[i]];
    }

    //Take the first 6 unique digits
    otp = digits.slice(0, 6).join("");
    return otp;
};

//Send OTP
const sendOTP = async (req,res) => {
    try{
        const {email} = req.body;

        if(!email){
            return res.status(400).json({error: "Email is required"});
        }

        const normalizedEmail = email.trim().toLowerCase();

        const user = await User.findOne({email: normalizedEmail});

        if(!user){
            return res.status(404).json({error: "User with this email does not exist"});
        }

        const otp = generateOTP();

        const hashedOTP = await bcrypt.hash(otp, 10); // Hash OTP before storing

        await OTP.deleteMany({email: normalizedEmail}); //Remove old OTPs
        await OTP.create({email: normalizedEmail, otp: hashedOTP});

        await sendEmail(
            normalizedEmail,
            "Reset Your Password - OTP",
            user.name || "User",
            otp
        );

        res.status(200).json({message: "OTP sent to email"});
    }catch(err){
        console.error("Send OTP error:", err.message);
        res.status(500).json({error: "Failed to send OTP"});
    }
};

//Verify OTP
const verifyOTP = async (req,res) => {
    try{
        const {email, otp} = req.body;

        if(!email || !otp){
            return res.status(400).json({error: "Email and OTP are required"});
        }

        const normalizedEmail = email.trim().toLowerCase();
        const existingOTP = await OTP.findOne({email: normalizedEmail});

        if(!existingOTP){
            return res.status(400).json({error: "Invalid or expired OTP"});
        }

        const match = await bcrypt.compare(otp, existingOTP.otp);

        if(!match){
            return res.status(400).json({error: "Invalid OTP"});
        }

        res.status(200).json({message: "OTP verified successfully"});
    }catch(err){
        console.error("Verify OTP error:", err.message);
        res.status(500).json({error: "OTP verification failed"});
    }
};

//Reset Password Controller
const resetPassword = async (req, res) => {
    try{
        const {email, newPassword} = req.body;

        if(!email || !newPassword){
            return res.status(400).json({message: "Email and new password are required"});
        }

        const user = await User.findOne({email});
        if(!user){
            return res.status(404).json({message: "User not found"});
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;

        await user.save();

        res.status(200).json({message: "Password reset successful"});
    }catch(error){
        console.error("Error while resetting password", error);
        res.status(500).json({message: "Internal server error"});
    }
};

module.exports = {sendOTP, verifyOTP, resetPassword};
