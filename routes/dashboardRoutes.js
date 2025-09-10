const express = require("express");
const router = express.Router();

const authenticateUser = require("../middlewares/authenticateUser");
const {
  getHomeData,
  getStatisticsData,
  getChartData,
  getTopProducts,
  getDashboardLayout,
  saveDashboardLayout
} = require("../controllers/dashboardController");

// Dashboard routes
router.get("/home", authenticateUser, getHomeData);
router.get("/statistics", authenticateUser, getStatisticsData);
router.get("/chart", authenticateUser, getChartData);
router.get("/top-products", authenticateUser, getTopProducts);

router.get("/layout", authenticateUser, getDashboardLayout);
router.post("/layout", authenticateUser, saveDashboardLayout);

module.exports = router;
