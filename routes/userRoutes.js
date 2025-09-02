const express = require("express");
const router = express.Router();

const {signupUser, loginUser, getProfile, updateProfile} = require("../controllers/userController");
const authenticateUser = require("../middlewares/authenticateUser");

//Signup route
router.post("/signup", signupUser);

//Login route
router.post("/login", loginUser);

//Protected route
router.use(authenticateUser);

router.get("/profile", getProfile);
router.put("/profile", updateProfile);

module.exports = router;