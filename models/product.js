const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        index: true,
    },
    productId: {
        type: String,
        required: true,
        index: true,
    },
    category: {
        type: String,
        required: true,
        index: true,
    },
    price: {
        type: Number,
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
        default: 0,
    },
    unit: {             // e.g., "Packets", "Kg"
        type: String,
        required: true,
    },
    threshold: {
        type: Number,
        required: true,
        default: 0,
    },
    expiryDate: {
        type: Date,
        required: true
    },

    //status of Product
    status:
    {
        type: String,
        enum: ["in_stock", "low_stock", "out_of_stock", "expired"],
        default: "in_stock"
    },

    //Image path served from /uploads/...
    imageUrl: {
        type: String
    },

    //Audits
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
},
    { timestamps: true }
);

//Keep status in sync whenever we save/update
productSchema.methods.refreshStatus = function() {
    if(this.quantity <= 0){
        this.status = "out_of_stock";
        return;
    }
    if(new Date(this.expiryDate) < new Date()){
        this.status = "expired";
        this.quantity = 0;
        return;
    }
    this.status = this.quantity > this.threshold ? "in_stock" : "low_stock";
};

productSchema.pre("save", function (next){
    this.refreshStatus();
    next();
});

module.exports = mongoose.model("Product", productSchema);