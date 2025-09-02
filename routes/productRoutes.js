const express = require("express");
const router = express.Router();

const authenticateUser = require("../middlewares/authenticateUser");
const {upload} = require("../config/multer");
const {createProduct, listProducts, getStats, orderProduct, bulkUploadProducts} = require("../controllers/productController");

router.get("/", authenticateUser, listProducts);
router.get("/stats", authenticateUser, getStats);
router.post("/", authenticateUser, upload.single("image"), createProduct);
router.post("/:id/order", authenticateUser, orderProduct);

// BULK CSV UPLOAD
router.post("/bulk-upload", authenticateUser, upload.single("file"), bulkUploadProducts);

module.exports = router;