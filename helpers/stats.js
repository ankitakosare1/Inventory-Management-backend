// Helpers to build last-7-days windows and stats.
export const lastNDaysRange = (days = 7) => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);
  return { start, end };
};

// Revenue from orders in last 7 days
export const revenueFromOrders = (orders) =>
  orders.reduce((sum, o) => sum + o.qty * o.priceAtOrder, 0);
