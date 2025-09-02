const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
    },
    qty: {
        type: Number,
        required: true,
    },
    priceAtOrder: {
        type: Number,
        required: true
    },
    createdBy: {   
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
},
    { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);