const express = require("express");
const router = express.Router();

const authenticateUser = require("../middlewares/authenticateUser");

const {listInvoices, getInvoiceStats, markAsPaid, deleteInvoice, getInvoiceById, incrementProcessed } = require("../controllers/invoiceController");

router.get("/", authenticateUser, listInvoices);
router.get("/stats", authenticateUser, getInvoiceStats);
router.post("/:id/paid", authenticateUser, markAsPaid);
router.delete("/:id", authenticateUser, deleteInvoice);

router.get("/:id", authenticateUser, getInvoiceById); 

router.put("/:id/increment", authenticateUser, incrementProcessed);

module.exports = router;