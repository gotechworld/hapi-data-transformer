//
// fetch hapi route options from ../handlers/oms/* files - handled this way to allow IDE goto handler definition.
// ['prices', 'coupons', bundles, promotions, ...].forEach(routeKey => {
//     HandlerRouteOptions[routeKey] = require(`../handlers/oms/${routeKey}`).routeOptions;
// });
//
const HandlerRouteOptions = {
  prices: require("../handlers/priceAndPromo/prices"),
  coupons: require("../handlers/priceAndPromo/coupons"),
  bundles: require("../handlers/priceAndPromo/bundles"),
  promotions: require("../handlers/priceAndPromo/promotions"),
};

module.exports = [
  {
    method: "POST",
    path: "/prices/bulk",
    options: HandlerRouteOptions.prices.postBulk,
  },
  {
    method: "DELETE",
    path: "/prices/{sku}/{seller_id}",
    options: HandlerRouteOptions.prices.delete,
  },
  {
    method: "POST",
    path: "/promotions",
    options: HandlerRouteOptions.promotions.post,
  },
  {
    method: "DELETE",
    path: "/promotions",
    options: HandlerRouteOptions.promotions.delete,
  },
  {
    method: "PUT",
    path: "/coupons/{code}",
    options: HandlerRouteOptions.coupons.put,
  },
  {
    method: "POST",
    path: "/bundles",
    options: HandlerRouteOptions.bundles.post,
  },
  {
    method: "DELETE",
    path: "/bundles/{id}",
    options: HandlerRouteOptions.bundles.delete,
  },
];
