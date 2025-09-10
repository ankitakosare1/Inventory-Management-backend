const mongoose = require("mongoose");

const dashboardLayoutSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User",
        required: true,
        unique: true
    },
    groupA: {
        type: [String],
        default: ["sales", "purchase", "salesPurchase"]
    },
    groupB: {
        type: [String],
        default: ["inventory", "product", "topProducts"]
    }
},
    { timestamps: true }
);

module.exports = mongoose.model("DashboardLayout", dashboardLayoutSchema);