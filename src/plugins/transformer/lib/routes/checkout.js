//
// fetch hapi route options from ../handlers/oms/* files - handled this way to allow IDE goto handler definition.
// ['shippingTaxes','paymentTaxes', ...].forEach(routeKey => {
//     HandlerRouteOptions[routeKey] = require(`../handlers/oms/${routeKey}`).routeOptions;
// });
//
const HandlerRouteOptions = {
  shippingTaxes: require("../handlers/checkout/shippingTaxes"),
  paymentTaxes: require("../handlers/checkout/paymentTaxes")
};

module.exports = [
  {
    method: "POST",
    path: "/checkout/{website_code}/payment-tax/{seller_id}/tax",
    options: HandlerRouteOptions.paymentTaxes.post
  },
  {
    method: "GET",
    path: "/checkout/{website_code}/payment-tax/{seller_id}",
    options: HandlerRouteOptions.paymentTaxes.list
  },
  {
    method: "GET",
    path: "/checkout/{website_code}/payment-tax/{seller_id}/tax/{tax_id}",
    options: HandlerRouteOptions.paymentTaxes.read
  },
  {
    method: "PUT",
    path: "/checkout/{website_code}/payment-tax/{seller_id}/tax/{tax_id}",
    options: HandlerRouteOptions.paymentTaxes.update
  },
  {
    method: "POST",
    path: "/checkout/{website_code}/shipping-tax/{seller_id}/tax",
    options: HandlerRouteOptions.shippingTaxes.post
  },
  {
    method: "GET",
    path: "/checkout/{website_code}/shipping-tax/{seller_id}",
    options: HandlerRouteOptions.shippingTaxes.list
  },
  {
    method: "GET",
    path: "/checkout/{website_code}/shipping-tax/{seller_id}/tax/{tax_id}",
    options: HandlerRouteOptions.shippingTaxes.read
  },
  {
    method: "PUT",
    path: "/checkout/{website_code}/shipping-tax/{seller_id}/tax/{tax_id}",
    options: HandlerRouteOptions.shippingTaxes.update
  },
  {
    method: "DELETE",
    path: "/checkout/{website_code}/shipping-tax/{seller_id}/tax/{tax_id}",
    options: HandlerRouteOptions.shippingTaxes.delete
  }
];
