import Invoice from "../models/invoice.js";
import Order from "../models/order.js";

const generateReferenceNumber = () => `INV-${Math.floor(Math.random() * 900 + 100)}`;

// GET /api/invoices?page=1&limit=10&q=...
export const listInvoices = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    // const limit = Math.max(1, Math.min(25, parseInt(req.query.limit || "10", 10)));
    const limit = 5;
    const q = (req.query.q || "").trim();

    let or = [];

    if (q) {
      const numericQ = Number(q);
      const isNumeric = !isNaN(numericQ);

      // Due date handling (dd/mm/yyyy)
      let dueDateMatch = null;
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(q)) {
        const [day, month, year] = q.split("/").map(Number);

        // keep original UTC validation
        const parsedUTC = new Date(Date.UTC(year, month - 1, day));
        const isValid =
          parsedUTC.getUTCFullYear() === year &&
          parsedUTC.getUTCMonth() === (month - 1) &&
          parsedUTC.getUTCDate() === day;

        if (isValid) {
          // try both UTC and local day windows to avoid TZ misses (fixes 10/09/2025)
          const startUTC = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
          const endUTC = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

          const startLocal = new Date(year, month - 1, day, 0, 0, 0, 0);
          const endLocal = new Date(year, month - 1, day, 23, 59, 59, 999);

          dueDateMatch = {
            $or: [
              { dueDate: { $gte: startUTC, $lte: endUTC } },
              { dueDate: { $gte: startLocal, $lte: endLocal } }
            ]
          };
        }
      }


      let statusMatch = null;
      const lowered = q.toLowerCase();
      if (lowered === "paid" || lowered === "unpaid") {
        statusMatch = { status: lowered.charAt(0).toUpperCase() + lowered.slice(1) };
      }

      or = [
        { invoiceId: new RegExp(q, "i") },
        { referenceNumber: new RegExp(q, "i") },
        ...(isNumeric ? [{ amount: numericQ }] : []),
        ...(dueDateMatch ? [dueDateMatch] : []),
        ...(statusMatch ? [statusMatch] : [{ status: new RegExp(q, "i") }]),
      ];
    }

    const filter = or.length ? { $or: or } : {};

    const total = await Invoice.countDocuments(filter);
    const invoices = await Invoice.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({
      invoices,
      page,
      totalPages: Math.ceil(total / limit) || 1
    });
  } catch (err) {
    console.error("Error listing invoices:", err);
    res.status(500).json({ message: "Failed to fetch invoices" });
  }
};

// GET /api/invoices/stats
export const getInvoiceStats = async (req, res) => {
  try {
    const recentTransactions = await Invoice.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    const totalInvoices = await Invoice.countDocuments();

    const paidAmountAgg = await Invoice.aggregate([
      { $match: { status: "Paid" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const paidAmount = paidAmountAgg.length ? paidAmountAgg[0].total : 0;

    const unpaidAmountAgg = await Invoice.aggregate([
      { $match: { status: "Unpaid" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const unpaidAmount = unpaidAmountAgg.length ? unpaidAmountAgg[0].total : 0;

    const pending = await Invoice.countDocuments({ status: "Unpaid" });

    const processed = await Invoice.aggregate([
      { $group: { _id: null, total: { $sum: "$processedCount" } } }
    ]);
    const processedTotal = processed.length ? processed[0].total : 0;

    // Count unique customers from orders
    const customers = await Order.distinct("createdBy"); // distinct customer IDs
    const customersCount = customers.length;

    res.json({
      recentTransactions,
      totalInvoices,
      paidAmount,
      unpaidAmount,
      pending,
      processed: processedTotal,
      customers: customersCount
    });
  } catch (err) {
    console.error("Error fetching invoice stats:", err);
    res.status(500).json({ message: "Failed to fetch invoice stats" });
  }
};


export const markAsPaid = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    invoice.status = "Paid";
    invoice.referenceNumber = generateReferenceNumber();
    await invoice.save();

    res.json(invoice);
  } catch (err) {
    res.status(500).json({ message: "Error updating invoice", error: err.message });
  }
};


export const deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    // Save status & amount before deleting
    const deletedInfo = {
      status: invoice.status,
      amount: invoice.amount,
      createdAt: invoice.createdAt
    };

    await invoice.deleteOne();

    res.json({
      message: "Invoice deleted",
      deleted: deletedInfo
    });
  } catch (err) {
    res.status(500).json({ message: "Error deleting invoice", error: err.message });
  }
};


// GET /api/invoices/:id  -> details for modal
export const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;

    const inv = await Invoice.findById(id)
      .populate({
        path: "products.product",
        select: "name"
      })
      .lean();

    if (!inv) return res.status(404).json({ message: "Invoice not found" });


    // Build table rows (support multiple items)
    const rows = (inv.products || []).map((it) => {
      const name = it?.product?.name || "Unknown";
      const qty = Number(it?.qty || 0);
      const price = Number(it?.price || 0);
      return { name, qty, price, lineTotal: qty * price };
    });

    const subtotal = rows.reduce((s, r) => s + r.lineTotal, 0);
    const tax = Math.round(subtotal * 0.10); // 10% rounded (matches your Figma example)
    const totalDue = subtotal + tax;

    res.json({
      _id: inv._id,
      invoiceId: inv.invoiceId,                 // e.g., INV-1001
      referenceNumber: inv.referenceNumber,     // e.g., INV-605
      createdAt: inv.createdAt,                 // invoice date
      dueDate: inv.dueDate,
      status: inv.status,
      rows,
      totals: { subtotal, tax, totalDue }
    });
  } catch (err) {
    console.error("Error getInvoiceById:", err);
    res.status(500).json({ message: "Failed to fetch invoice" });
  }
};

// PUT /api/invoices/:id/increment
export const incrementProcessed = async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { $inc: { processedCount: 1 } }, // increment
      { new: true }
    );

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    res.json(invoice);
  } catch (err) {
    console.error("Error incrementing processed:", err.message);
    res.status(500).json({ message: "Error incrementing processed count" });
  }
};
