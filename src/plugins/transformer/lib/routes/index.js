import oms from "./oms";
import checkout from "./checkout";
import stocks from "./stocks";
import priceAndPromo from "./priceAndPromo";

/**
 * Collect routes and inject them into server.
 * @param {*} server
 */
exports.collect = (server) => {
  const routes = [
    ...oms,
    ...checkout,
    ...stocks,
    ...priceAndPromo,
  ];

  server.route(routes);
};
