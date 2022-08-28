//
// fetch hapi route options from ../handlers/oms/* files - handled this way to allow IDE goto handler definition.
// ['orders', 'invoices', ...].forEach(routeKey => {
//     HandlerRouteOptions[routeKey] = require(`../handlers/oms/${routeKey}`).routeOptions;
// });
//
const HandlerRouteOptions = {
  stocks: require("../handlers/stocks/stocks"),
};

module.exports = [
  {
    method: "POST",
    path: "/stocks",
    options: HandlerRouteOptions.stocks.post,
  },
];
