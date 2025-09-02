const cron = require("node-cron");
const Product = require("../models/product.js");

const startExpiryCron = async () => {
  // Runs daily at 2 AM
  cron.schedule("0 2 * * *", async () => {
    try {
      const cutoff = new Date();
      cutoff.setHours(0, 0, 0, 0); // today 00:00 UTC
      // move cutoff forward by 5h30m so it represents IST midnight
      cutoff.setTime(cutoff.getTime() + (5.5 * 60 * 60 * 1000));

      // Bulk update products whose expiryDate has passed
      const result = await Product.updateMany(
        {
          expiryDate: { $lte: cutoff },
          status: { $ne: "expired" }
        },
        {
          $set: { status: "expired", quantity: 0 }
        }
      );

      const toExpire = await Product.find(
        { status: { $ne: "expired" } }
      ).select("name expiryDate status");

      console.log("Now:", cutoff.toISOString());
      console.log("Products:", toExpire.map(p => ({
        name: p.name,
        expiryDate: p.expiryDate,
        expired: p.expiryDate <= cutoff
      })));

      console.log(
        `[CRON] Expiry check at ${cutoff.toISOString()} → Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`
      );
    } catch (error) {
      console.error("[CRON] Expiry check failed:", error);
    }
  });
};

module.exports = startExpiryCron;



