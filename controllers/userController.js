const User = require("../models/userModel");
const createToken = require("../utils/createToken");
const bcrypt = require("bcryptjs");

//Controller for User Signup
const signupUser = async (req, res) => {
    try{
        const {name, email, password, confirmPassword} = req.body;

        //Validate all fields are filled or not
        if(!name || !email || !password || !confirmPassword){
            return res.status(400).json({error: "All fields are required"});
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Basic email format validation using regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedEmail)) {
            return res.status(400).json({ error: "Please enter a valid email address" });
        }

        // Password minimum length check
        if (password.length < 8) {
            return res.status(400).json({ error: "Password must be at least 8 characters long" });
        }

        //Password should match with confirmPassword
        if(password !== confirmPassword){
            return res.status(400).json({error: "Passwords do not match"});
        }

        //Signup logic from model
        const user = await User.signup(name, normalizedEmail, password);

        //Create Token
        const token = createToken(user._id);

        res.status(201).json({
            message: "User registered successfully",
            user:{
                _id: user._id,
                name: user.name,
                email: user.email
            },
            token
        });
    }catch(err){
        res.status(400).json({error: err.message});
    }
};

//Controller for User Login
const loginUser = async (req, res) => {
    try{
        const {email, password} = req.body;

        //Validate input
        if(!email || !password){
            return res.status(400).json({error: "Email and password are required"});
        }

        const normalizedEmail = email.trim().toLowerCase();

        //Login logic from model
        const user = await User.login(normalizedEmail, password);

        //Create Token
        const token = createToken(user._id);

        res.status(200).json({
            message: "Login successfully",
            user: {
                _id: user._id,
                name: user.name,
                email: user.email
            },
            token
        });
    }catch(err){
        res.status(400).json({error: err.message});
    }
};

//Controller for getting Profile for authenticated user
const getProfile = async (req,res) => {
    try{
        //req.user is set by authenticateUser (user ID)
        const user = await User.findById(req.user.id).select("_id name email createdAt updatedAt");
        if(!user){
            return res.status(404).json({error: "User not found"});
        }

        //Split name into firstName and lastName for frontend
        const nameParts = user.name ? user.name.trim().split(" "): [];
        const firstName = nameParts.length ? nameParts[0] : "";
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

        res.status(200).json({
            user:{
                _id: user._id,
                name: user.name,
                firstName,
                lastName,
                email: user.email,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
        });
    }catch(err){
        console.log("getProfile error:", err);
        res.status(500).json({error: "Server error"});
    }
};

//Controller for updating the profile for authenticated user
const updateProfile = async(req,res) => {
    try{
        const userId = req.user.id;
        const {firstName, lastName, password} = req.body;

        const user = await User.findById(userId);
        if(!user){
            return res.status(404).json({error: "User not found"});
        }

        //Merge name back to single string for saving in DB
        const existingName = user.name ? user.name.trim().split(" ") : [];
        const existingFirst = existingName.length ? existingName[0] : "";
        const existingLast = existingName.length > 1 ? existingName.slice(1).join(" ") : "";

        //If from frontend we get an empty string for firstName or lastName, 
        const newFirst = typeof firstName === "string" && firstName.length ? firstName.trim() : existingFirst;
        const newLast = typeof lastName === "string" && lastName.length ? lastName.trim() : existingLast;

        //Compose name to save: if newLast exists then "newFirst newLast" else just newFirst
        const composedName = newLast ? `${newFirst} ${newLast}`.trim() : newFirst;

        user.name = composedName;

        //If password provided, validate (min length), hash it before saving
        if(password){
            if(password.length < 8){
                return res.status(400).json({error: "Password must be at least 8 characters long"});
            }
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(password, salt);
            user.password = hash;
        }

        await user.save();

        //Return the latest fields
        const nameParts = user.name ? user.name.trim().split(" ") : [];
        const responseFirst = nameParts.length ? nameParts[0] : "";
        const responseLast = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

        res.status(200).json({
            message: "Profile updated successfully",
            user: {
                _id: user._id,
                name: user.name,
                firstName: responseFirst,
                lastName : responseLast,
                email: user.email,
                updatedAt: user.updatedAt,
            },
        });

    }catch(err){
        console.error("updateProfile error:", err);
        res.status(500).json({error: "Server error"});
    }
}

module.exports = {
    signupUser,
    loginUser,
    getProfile,
    updateProfile
};

