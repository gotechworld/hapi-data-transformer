import { connect } from "./axFtp";
import HttpService from "./httpService";

const LogTag = "ServicesInjector";

/**
 * Log message.
 * @param {string} type Console method
 * @param {string} message
 */
const LogMessage = (type, message) => {
  console[type](type.toUpperCase(), [LogTag], message);
};

/**
 * Decorate server object with needed services.
 * @param {object} server
 * @param {object} options
 */
exports.inject = async (server, options) => {
  server.expose("servicesConfiguration", options);

  try {
    server.expose("axFtpInstance", await connect(options.axFtp));
    LogMessage("debug", "Exposed axFtpInstance");
  } catch (err) {
    LogMessage("error", `Error on axFtpInstance | ${JSON.stringify(err)}`);
  }

  try {
    server.expose("httpStockInventoryService", {
      altex: new HttpService(options.stockInventoryApi.altex, options.credentials),
      mediagalaxy: new HttpService(options.stockInventoryApi.mediagalaxy, options.credentials),
    });
  } catch (err) {
    LogMessage("error", `Error on httpStocksService | ${JSON.stringify(err)}`);
  }

  try {
    server.expose("httpPriceAndPromoService", {
      altex: new HttpService(options.priceAndPromoApi.altex, options.credentials),
      mediagalaxy: new HttpService(options.priceAndPromoApi.mediagalaxy, options.credentials),
    });
  } catch (err) {
    LogMessage("error", `Error on httpPriceAndPromoService | ${JSON.stringify(err)}`);
  }

  try {
    server.expose("httpOmsService", new HttpService(options.omsApi, options.credentials));
  } catch (err) {
    LogMessage("error", `Error on httpOmsService | ${JSON.stringify(err)}`);
  }

  try {
    server.expose("httpOrderExportMkpService", new HttpService(options.orderExport.mkp, options.credentials));
  } catch (err) {
    LogMessage("error", `Error on httpOrderExportMkpService | ${JSON.stringify(err)}`);
  }

  try {
    server.expose("httpCatalogApiService", {
      altex: new HttpService(options.catalogApi.altex, options.credentials),
      mediagalaxy: new HttpService(options.catalogApi.mediagalaxy, options.credentials),
    });
  } catch (err) {
    LogMessage("error", `Error on httpCatalogApiService | ${JSON.stringify(err)}`);
  }

  try {
    server.expose("httpCheckoutService", {
      altex: new HttpService(options.checkoutApi.altex, options.credentials),
      mediagalaxy: new HttpService(options.checkoutApi.mediagalaxy, options.credentials),
    });
  } catch (err) {
    LogMessage("error", `Error on httpCheckoutService | ${JSON.stringify(err)}`);
  }
};
