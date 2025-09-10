const Invoice = require("../models/invoice.js");
const Product = require("../models/product.js");
const Order = require("../models/order.js");
const DashboardLayout = require("../models/dashboardLayout.js");

// Home Dashboard Data
const getHomeData = async (req, res) => {
  try {
    const totalSales = await Invoice.countDocuments();

    const revenue = await Invoice.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const totalPurchase = await Product.countDocuments();

    const totalStock = await Product.aggregate([
      { $group: { _id: null, qty: { $sum: "$quantity" } } },
    ]);

    const cancelledCount = await Invoice.countDocuments({ status: "Unpaid" });
    const returnCount = await Order.countDocuments({ qty: { $lte: 0 } });

    // Orders placed but product not yet delivered (simulate "to be received")
    const toBeReceivedAgg = await Order.aggregate([
      { $group: { _id: null, qty: { $sum: "$qty" } } },
    ]);
    const toBeReceived = toBeReceivedAgg[0]?.qty || 0;

    // Product summary
    const suppliers = await Product.distinct("createdBy");
    const categories = await Product.distinct("category");

    const revenueTotal = revenue[0]?.total || 0;
    const profit = revenueTotal * 0.25; 
    const cost = revenueTotal * 0.75;

    res.json({
      salesOverview: {
        sales: totalSales,
        revenue: revenueTotal,
        profit,
        cost,
      },
      purchaseOverview: {
        purchase: totalPurchase,
        cost,
        cancel: cancelledCount,
        return: returnCount,
      },
      inventorySummary: {
        qtyInHand: totalStock[0]?.qty || 0,
        toBeReceived,
      },
      productSummary: {
        suppliers: suppliers.length,
        categories: categories.length,
      },
    });
  } catch (err) {
    console.error("Error in getHomeData:", err);
    res.status(500).json({ message: "Failed to fetch home dashboard data" });
  }
};

// Statistics Page Data
const getStatisticsData = async (req, res) => {
  try {
    // --- Total Revenue ---
    const revenueAgg = await Invoice.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const totalRevenue = revenueAgg[0]?.total || 0;

    // --- Products Sold (sum of all quantities in invoices) ---
    const soldAgg = await Invoice.aggregate([
      { $unwind: "$products" },
      { $group: { _id: null, qty: { $sum: "$products.qty" } } }
    ]);
    const productsSold = soldAgg[0]?.qty || 0;

   // --- Products in Stock (current stock in inventory) ---
    const stockAgg = await Product.aggregate([
      { $group: { _id: null, qty: { $sum: "$quantity" } } }
    ]);
    const productsInStock = stockAgg[0]?.qty || 0;

    res.json({
      totalRevenue: { value: totalRevenue, change: "+12%" },
      productsSold: { value: productsSold, change: "+8%" },
      productsInStock: { value: productsInStock, change: "9%" },
    });
  } catch (err) {
    console.error("Error in getStatisticsData:", err);
    res.status(500).json({ message: "Failed to fetch statistics data" });
  }
};


const getChartData = async (req, res) => {
  try {
    const { type } = req.query; // weekly | monthly | yearly
    let labels = [];
    let sales = [];
    let purchases = [];

    if (type === "weekly") {
      labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

      // Sales (Invoices grouped by day of week)
      const salesAgg = await Invoice.aggregate([
        {
          $group: {
            _id: { day: { $dayOfWeek: "$createdAt" } }, // 1=Sunday ... 7=Saturday
            total: { $sum: "$amount" },
          },
        },
      ]);

      // Purchases (Orders grouped by day of week)
      const purchasesAgg = await Order.aggregate([
        {
          $group: {
            _id: { day: { $dayOfWeek: "$createdAt" } },
            total: { $sum: { $multiply: ["$qty", "$priceAtOrder"] } },
          },
        },
      ]);

      sales = labels.map((_, i) => {
        const found = salesAgg.find((s) => ((s._id.day + 5) % 7) === i); 
        // shift MongoDB dayOfWeek to Mon=0
        return found ? found.total : 0;
      });

      purchases = labels.map((_, i) => {
        const found = purchasesAgg.find((p) => ((p._id.day + 5) % 7) === i);
        return found ? found.total : 0;
      });

    } else if (type === "monthly") {
      labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

      const salesAgg = await Invoice.aggregate([
        {
          $group: {
            _id: { month: { $month: "$createdAt" } },
            total: { $sum: "$amount" },
          },
        },
      ]);

      const purchasesAgg = await Order.aggregate([
        {
          $group: {
            _id: { month: { $month: "$createdAt" } },
            total: { $sum: { $multiply: ["$qty", "$priceAtOrder"] } },
          },
        },
      ]);

      sales = labels.map((_, i) => {
        const found = salesAgg.find((s) => s._id.month === i + 1);
        return found ? found.total : 0;
      });

      purchases = labels.map((_, i) => {
        const found = purchasesAgg.find((p) => p._id.month === i + 1);
        return found ? found.total : 0;
      });

    } else if (type === "yearly") {
      labels = [2025, 2026, 2027, 2028, 2029, 2030];

      const salesAgg = await Invoice.aggregate([
        {
          $group: {
            _id: { year: { $year: "$createdAt" } },
            total: { $sum: "$amount" },
          },
        },
      ]);

      const purchasesAgg = await Order.aggregate([
        {
          $group: {
            _id: { year: { $year: "$createdAt" } },
            total: { $sum: { $multiply: ["$qty", "$priceAtOrder"] } },
          },
        },
      ]);

      sales = labels.map((y) => {
        const found = salesAgg.find((s) => s._id.year === y);
        return found ? found.total : 0;
      });

      purchases = labels.map((y) => {
        const found = purchasesAgg.find((p) => p._id.year === y);
        return found ? found.total : 0;
      });
    }

    res.json({ labels, sales, purchases });
  } catch (err) {
    console.error("Error in getChartData:", err);
    res.status(500).json({ message: "Failed to fetch chart data" });
  }
};

module.exports = { getChartData };


// Top Products (based on sales qty)
const getTopProducts = async (req, res) => {
  try {
    const top = await Invoice.aggregate([
      { $unwind: "$products" }, // break array into individual product entries
      {
        $group: {
          _id: "$products.product",        // group by product ID
          totalQty: { $sum: "$products.qty" },   // total qty sold
          totalRevenue: { $sum: { $multiply: ["$products.qty", "$products.price"] } }
        }
      },
      { $sort: { totalQty: -1 } }, // sort by sold qty (descending)
      { $limit: 3 }                // top 3
    ]);

    // populate product details
    const productIds = top.map(t => t._id);
    const products = await Product.find({ _id: { $in: productIds } })
      .select("name imageUrl")
      .lean();

    // map back with sales info
    const result = top.map(t => {
      const p = products.find(p => p._id.toString() === t._id.toString());
      return {
        id: t._id,
        name: p?.name || "Unknown",
        image: p?.imageUrl || null,
        totalQty: t.totalQty,
        totalRevenue: t.totalRevenue
      };
    });

    res.json(result);
  } catch (err) {
    console.error("Error in getTopProducts:", err);
    res.status(500).json({ message: "Failed to fetch top products" });
  }
};

// Get user layout
const getDashboardLayout = async (req, res) => {
  try {
    const layout = await DashboardLayout.findOne({ user: req.user._id });
    if (!layout) {
      // if not exist → create default
      const newLayout = await DashboardLayout.create({
        user: req.user._id,
      });
      return res.json(newLayout);
    }
    res.json(layout);
  } catch (err) {
    console.error("Error in getDashboardLayout:", err);
    res.status(500).json({ message: "Failed to fetch dashboard layout" });
  }
};

// Save/update layout
const saveDashboardLayout = async (req, res) => {
  try {
    const { groupA, groupB } = req.body;
    const layout = await DashboardLayout.findOneAndUpdate(
      { user: req.user._id },
      { groupA, groupB },
      { new: true, upsert: true }
    );
    res.json(layout);
  } catch (err) {
    console.error("Error in saveDashboardLayout:", err);
    res.status(500).json({ message: "Failed to save dashboard layout" });
  }
};

module.exports = {
  getHomeData,
  getStatisticsData,
  getChartData,
  getTopProducts,
  getDashboardLayout,
  saveDashboardLayout
};
