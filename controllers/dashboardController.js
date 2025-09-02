const Invoice = require("../models/invoice.js");
const Product = require("../models/product.js");
const Order = require("../models/order.js");

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

    const revenueTotal = revenue[0]?.total || 0;
    const profit = revenueTotal * 0.25; // example
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
        cancel: 5,
        return: 2,
      },
      inventorySummary: {
        qtyInHand: totalStock[0]?.qty || 0,
        toBeReceived: 50,
      },
      productSummary: {
        suppliers: 8,
        categories: 12,
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
    // In real app, compute from DB
    const totalRevenue = 52000;
    const productsSold = 320;
    const productsInStock = 780;

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


// Top Products
const getTopProducts = async (req, res) => {
  try {
    const products = await Product.find().limit(3);

    res.json(
      products.map((p) => ({
        id: p._id,
        name: p.name,
        image: p.image || null,
      }))
    );
  } catch (err) {
    console.error("Error in getTopProducts:", err);
    res.status(500).json({ message: "Failed to fetch top products" });
  }
};

module.exports = {
  getHomeData,
  getStatisticsData,
  getChartData,
  getTopProducts,
};
