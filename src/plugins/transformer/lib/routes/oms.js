//
// fetch hapi route options from ../handlers/oms/* files - handled this way to allow IDE goto handler definition.
// ['orders', 'invoices', ...].forEach(routeKey => {
//     HandlerRouteOptions[routeKey] = require(`../handlers/oms/${routeKey}`).routeOptions;
// });
//
const HandlerRouteOptions = {
  orders: require("../handlers/oms/orders"),
  invoices: require("../handlers/oms/invoices"),
};

module.exports = [
  {
    method: "POST",
    path: "/orders",
    options: HandlerRouteOptions.orders.post,
  },
  {
    method: "POST",
    path: "/orders/bulk",
    options: HandlerRouteOptions.orders.postBulk,
  },
  {
    method: "PUT",
    path: "/suborders/{suborder_id}/status",
    options: HandlerRouteOptions.orders.changeSuborderStatus,
  },
  {
    method: "PATCH",
    path: "/order-addresses/{order_address_id}",
    options: HandlerRouteOptions.orders.updateOrderAddress,
  },
  {
    method: "POST",
    path: "/invoices",
    options: HandlerRouteOptions.invoices.post,
  },
];
