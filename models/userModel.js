const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
        minlength: 8
    },
}, {timestamps: true});

//Static signup function
userSchema.statics.signup = async function (name, email, password){
    const exists = await this.findOne({email});
    if(exists){
        throw Error("Email already exists!")
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const user = await this.create({name, email, password:hash});
    return user;
};

//Static login function
userSchema.statics.login = async function (email, password) {
    const user = await this.findOne({email});
    if(!user){
        throw Error("Incorrect Email");
    }

    const match = await bcrypt.compare(password, user.password);

    if(!match){
        throw Error("Incorrect password");
    }

    return user;
};

const User = mongoose.model("User", userSchema);
module.exports = User;

