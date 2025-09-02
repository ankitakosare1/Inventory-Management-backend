import Product from "../models/product.js";
import Order from "../models/order.js";
import Invoice from "../models/invoice.js";
import { lastNDaysRange, revenueFromOrders } from "../helpers/stats.js";

import { getNextInvoiceId } from "../helpers/invoiceId.js";

import mongoose from "mongoose";
import fs from 'fs';
import csvParser from "csv-parser";


// POST /api/products (single)
export const createProduct = async (req, res) => {
  const body = req.body;
  const imageUrl = req.file ? `/${req.file.path.replace(/\\/g, "/")}` : null;

  const product = new Product({
    name: body.name,
    productId: body.productId,
    category: body.category,
    price: Number(body.price),
    quantity: Number(body.quantity),
    unit: body.unit,
    threshold: Number(body.threshold),
    expiryDate: new Date(body.expiryDate),
    imageUrl,
    createdBy: req.user?.id
  });
  await product.save();

  const invoiceId = await getNextInvoiceId();

  // Generate Invoice Automatically
  const lineTotal = product.price * product.quantity;

  const invoice = await Invoice.create({
    invoiceId,
    products: [
      {
        product: product._id,
        qty: product.quantity,
        price: product.price
      }
    ],
    amount: lineTotal,
    dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) // +10 days
  });

  res.status(201).json({
    message: "Product added and invoice generated automatically",
    product,
    invoice
  });
};

// GET /api/products
// query: page=1, limit=10, q=searchTerm
export const listProducts = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || "1", 10));
  //const limit = Math.max(1, Math.min(25, parseInt(req.query.limit || "10", 10)));
  const limit = 5;
  const q = (req.query.q || "").trim();


  let or = [];

  if (q) {
    const numericQ = Number(q);
    const isNumeric = !isNaN(numericQ);

    // Expiry date handling (dd/mm/yyyy)
    let expiryMatch = null;
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(q)) {
      const [day, month, year] = q.split("/").map(Number);

      const parsed = new Date(Date.UTC(year, month - 1, day));
      if (
        parsed.getUTCFullYear() === year &&
        parsed.getUTCMonth() === month - 1 &&
        parsed.getUTCDate() === day
      ) {
        const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
        const end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
        expiryMatch = { expiryDate: { $gte: start, $lte: end } };
      }
    }

    or = [
      { name: new RegExp(q, "i") },
      { productId: new RegExp(q, "i") },
      { category: new RegExp(q, "i") },
      { unit: new RegExp(q, "i") },
      ...(isNumeric
        ? [
          { price: numericQ },
          { quantity: numericQ },
          { threshold: numericQ },
        ]
        : []),
      ...(expiryMatch ? [expiryMatch] : []),
      // Availability (status)
      {
        status: new RegExp(q.replace(/-/g, "_"), "i"), // allow "In-stock" or "in stock"
      },
    ];
  }


  const filter = or.length ? { $or: or } : {};

  const total = await Product.countDocuments(filter);
  const products = await Product.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  res.json({
    page,
    totalPages: Math.ceil(total / limit) || 1,
    total,
    products
  });
};

// GET /api/products/stats (last 7 days dashboard)
export const getStats = async (req, res) => {
  const { start, end } = lastNDaysRange(7);

  // Average number of categories per day over last 7 days
  // (Counts distinct categories created each day; then average)
  const daily = await Product.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: {
          y: { $year: "$createdAt" },
          m: { $month: "$createdAt" },
          d: { $dayOfMonth: "$createdAt" }
        },
        categories: { $addToSet: "$category" }
      }
    },
    { $project: { count: { $size: "$categories" } } }
  ]);

  const avgCategories =
    daily.length === 0 ? 0 : Math.round((daily.reduce((a, d) => a + d.count, 0) / daily.length) * 10) / 10;

  // Total products created in last 7 days
  const totalProducts = await Product.countDocuments({ createdAt: { $gte: start, $lte: end } });

  // Revenue in last 7 days from orders
  const recentOrders = await Order.find({ createdAt: { $gte: start, $lte: end } }).lean();
  const revenue = revenueFromOrders(recentOrders);

  // Top 5 selling products (by total qty ordered in last 7 days)
  const top = await Order.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end } } },
    { $group: { _id: "$product", qty: { $sum: "$qty" }, amount: { $sum: { $multiply: ["$qty", "$priceAtOrder"] } } } },
    { $sort: { qty: -1 } },
    { $limit: 5 }
  ]);

  const topSellingCount = 5; // static “5” on UI per requirement
  const topSellingCost = top.reduce((s, t) => s + t.amount, 0);

  // Low stocks: ordered vs not-in-stock counts (last 7 days orders vs current out_of_stock)
  const orderedCount = recentOrders.length;
  const notInStock = await Product.countDocuments({ status: "out_of_stock" });

  res.json({
    categoriesAvgLast7Days: avgCategories,
    totalProductsLast7Days: totalProducts,
    revenueLast7Days: revenue,
    topSelling: { count: topSellingCount, cost: topSellingCost },
    lowStocks: { ordered: orderedCount, notInStock }
  });
};

// POST /api/products/:id/order  { qty }
export const orderProduct = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid product id" });
  }

  const qty = Math.max(1, parseInt(req.body.qty, 10));
  const product = await Product.findById(id);
  if (!product) return res.status(404).json({ message: "Product not found" });

  if (product.quantity <= 0) {
    return res.status(400).json({ message: "Can't order, product out of stock" });
  }

  // decrement quantity
  product.quantity = Math.max(0, product.quantity - qty);
  product.refreshStatus();
  await product.save();

  // create order record
  const order = await Order.create({
    product: product._id,
    qty,
    priceAtOrder: product.price,
    createdBy: req.user?.id
  });

  res.json({ product, order });
};

// BULK UPLOAD via CSV
export const bulkUploadProducts = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "CSV file is required" });
  }

  const results = [];
  const filePath = req.file.path;

  fs.createReadStream(filePath)
    .pipe(
      csvParser({
        separator: ",", // CSV is comma separated
        mapHeaders: ({ header }) => header.trim(), // trim spaces in headers
      })
    )
    .on("data", (row) => results.push(row))
    .on("end", async () => {
      try {
        const createdProducts = [];

        for (let row of results) {
          // handle expiry date safely
          let expiryDate = null;
          const expiryRaw = row["Expiry Date"];
          if (expiryRaw) {
            const expiryParts = expiryRaw.split(/[-\/]/); // supports dd-mm-yyyy or dd/mm/yyyy
            if (expiryParts.length === 3) {
              expiryDate = new Date(
                `${expiryParts[2]}-${expiryParts[1]}-${expiryParts[0]}`
              );
            }
          }

          const product = await Product.findOneAndUpdate(
            { productId: row["Product ID"]?.trim() }, // match by productId
            {
              name: row["Product Name"]?.trim(),
              category: row["Category"]?.trim(),
              price: Number(row["Price"]) || 0,
              quantity: Number(row["Quantity"]) || 0,
              unit: row["Unit"]?.trim(),
              expiryDate,
              threshold: Number(row["Threshold Value"]) || 0,
              createdBy: req.user?.id,
            },
            { upsert: true, new: true } // insert if not exists, update if exists
          );


          console.log("Row data:", row);

          await product.save();
          createdProducts.push(product);
        }

        // create one invoice for all products
        const invoiceId = await getNextInvoiceId();

        const invoice = await Invoice.create({
          invoiceId,
          products: createdProducts.map((p) => ({
            product: p._id,
            qty: p.quantity,
            price: p.price,
          })),
          amount: createdProducts.reduce(
            (sum, p) => sum + p.price * p.quantity,
            0
          ),
          dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // +10 days
        });

        res.json({
          message: "Bulk products uploaded and invoice generated",
          products: createdProducts,
          invoice,
        });
      } catch (err) {
        console.error("Bulk upload error:", err);
        res.status(500).json({ message: "Failed to process CSV" });
      } finally {
        fs.unlinkSync(filePath); // cleanup uploaded file
      }
    });
};
