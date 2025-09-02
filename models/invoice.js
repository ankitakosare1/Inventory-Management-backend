const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema({
    invoiceId: {
        type: String,
        required: true,
        unique: true
    },
    referenceNumber: {
        type: String,
        default: null
    },
    products: [
        {
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Product"
            },
            qty: Number,
            price: Number
        }
    ],
    amount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ["Paid", "Unpaid"],
        default: "Unpaid"
    },
    dueDate: {
        type: Date,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    processedCount: {
        type: Number,
        default: 0
    }
});

module.exports = mongoose.model("Invoice", invoiceSchema);