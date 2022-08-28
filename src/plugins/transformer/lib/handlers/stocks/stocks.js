import * as Utils from "../../services/utils";
import { isUndefined, isObject } from "underscore";
import ResponseValidation from "../../validations/response";
import StockValidation from "../../validations/stock";

module.exports = {
  post: {
    handler: async (request, h) => {
      const stockInventoryHttp = request.server.plugins.transformer.httpStockInventoryService;

      const productUpdates = {};
      let status = "success";
      let statusCode = 200;
      let data = {};
      try {
        const { website } = request.payload;
        const sellerId = parseInt(request.payload.seller);
        // eslint-disable-next-line @hapi/hapi/for-loop
        for (let i = 0; i < request.payload.products.length; i++) {
          const product = request.payload.products[i];
          const update = {
            sku: product.sku,
            status: Utils.getStockStatusByQty(parseInt(product.qty)),
            inventory: {},
          };
          let warehouseId = Utils.marketplaceDefaultWarehouseId;
          if (!isUndefined(product.warehouseId)) {
            warehouseId = parseInt(product.warehouseId);
          }

          update.inventory[warehouseId] = parseInt(product.qty);
          let { sku } = product;
          // unsupported - resealed configurable product
          if (!isUndefined(product.resealed_code)) {
            sku += `-${product.resealed_code}`; // add series
            update.parent_sku = update.sku;
            update.resealed_code = product.resealed_code;
            delete update.sku;
          } else if (!isUndefined(product.configurable)) {
            sku += `-${product.configurable.attribute_code}-${product.configurable.value}`;
            update.configurable = product.configurable;
            update.parent_sku = update.sku;
            delete update.sku;
          }

          productUpdates[sku] = {};
          productUpdates[sku][sellerId] = update;
        }

        const response = await Utils.stocksHttp.saveStocks(stockInventoryHttp[website], productUpdates);
        if (response.ok === false) {
          throw response.data;
        }

        if (response.status === 207) {
          status = "multi-status";
          statusCode = response.status;
          // eslint-disable-next-line prefer-destructuring
          data = response.data;
        }

        return h
          .response({
            status,
            message: `Performed ${Object.keys(productUpdates).length} updates | Status: ${response.status} | Took: ${
              response.duration / 1000
            } sec`,
            data,
          })
          .code(statusCode);
      } catch (err) {
        return h
          .response({
            status: "error",
            message: `Error occurred: ${isObject(err) ? JSON.stringify(err) : err.toString()}`,
          })
          .code(400);
      }
    },
    // auth: 'im-auth',
    // plugins: {
    //     'hapi-internal-bridge': {
    //         auth: {
    //             role: 'ROLE_TRANSFORMER',
    //             permission: 'ACCESS'
    //         }
    //     }
    // },
    validate: StockValidation.bulkStocksRequest,
    response: ResponseValidation,
    description: "POST stock update by seller",
    notes: "Forwards stock inventory update to Stock Inventory API",
    tags: ["api"],
  },
};
