const express = require("express");
const router = express.Router();

const authenticateUser = require("../middlewares/authenticateUser");
const {
  getHomeData,
  getStatisticsData,
  getChartData,
  getTopProducts,
} = require("../controllers/dashboardController");

// Dashboard routes
router.get("/home", authenticateUser, getHomeData);
router.get("/statistics", authenticateUser, getStatisticsData);
router.get("/chart", authenticateUser, getChartData);
router.get("/top-products", authenticateUser, getTopProducts);

module.exports = router;
