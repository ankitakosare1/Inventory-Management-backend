const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

const authenticateUser = async (req, res, next) => {
    try{
        //Get the Authorization header
        const authHeader = req.headers.authorization;

        //Check if token is present and starts with Bearer
        if(!authHeader || !authHeader.startsWith("Bearer ")){
            return res.status(401).json({error: "Authorization token missing or invalid"});
        }

        //Extract token from Bearer Token
        const token = authHeader.split(" ")[1];

        //Verify token using secret key
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        //Check if user exists in DB even if token is valid
        const user = await User.findById(decoded._id).select("_id email");

        if(!user){
            return res.status(401).json({error: "User no longer exists"});
        }

        //Attach user ID to request object
        req.user = {id: user._id.toString(), email: user.email};

        //Continue to next middleware or controller
        next();
    }catch(err){
        console.error("Authentication error:", err.message);
        return res.status(401).json({error: "Request not authorized, token invalid or expired"});
    }
};


module.exports = authenticateUser;