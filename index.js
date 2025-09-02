const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/database");

const app = express();

dotenv.config();
//console.log("FRONTEND_URL:", process.env.FRONTEND_URL);

//DB Connection
connectDB();

//Port
const port = process.env.PORT || 4000

//Middleware
app.use(cors());
app.use(express.json()); //To parse JSON requests
app.use("/uploads", express.static("uploads"));


//Require Routes
const userRoutes = require("./routes/userRoutes")
const otpRoutes = require("./routes/otpRoutes");
const productRoutes = require("./routes/productRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const startExpiryCron = require("./utils/expiryCron");

// Debug route (for testing backend)
app.get("/", (req, res) => {
  res.send("Backend is running successfully!");
});

//Routes
app.use("/api/user", userRoutes);
app.use("/api/otp", otpRoutes);
app.use("/api/products", productRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Health
app.get("/health", (_, res) => res.json({ ok: true }));

//Start the Server
app.listen(port, () => {
    console.log(`Server is running at PORT: ${port}`);
    //start daily cron that checks expiries
    startExpiryCron();
})
