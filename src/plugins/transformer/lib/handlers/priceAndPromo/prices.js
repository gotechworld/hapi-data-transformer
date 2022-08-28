import * as Utils from "../../services/utils";
import Boom from "@hapi/boom";
import ResponseValidation from "../../validations/response";
import PriceValidation from "../../validations/prices";

module.exports = {
  postBulk: {
    handler: async (request, h) => {
      const httpService = request.server.plugins.transformer.httpPriceAndPromoService;

      try {
        const response = await Utils.priceAndPromoHttp.savePricesV2(
          httpService[request.payload.website],
          request.payload.items,
        );

        if (response.data.status === "error") {
          return h
            .response({
              status: response.data.status,
              message: response.data.messages,
            })
            .code(response.status);
        }

        return h
          .response({
            status: "success",
            message: response.data.messages,
          })
          .code(response.status);
      } catch (err) {
        return h
          .response({
            status: "error",
            message: `Error occurred: ${err.toString()}`,
          })
          .code(500);
      }
    },
    validate: PriceValidation.bulkPriceRequestV2,
    response: ResponseValidation,
    description: "POST price update by seller",
    notes: "Forwards price update to Price&Promo API",
    tags: ["api"],
  },
  delete: {
    handler: async (request, h) => {
      const httpService = request.server.plugins.transformer.httpPriceAndPromoService;

      try {
        const { website } = request.payload;
        const response = await Utils.priceAndPromoHttp.deletePrice(
          httpService[website],
          request.params.sku,
          request.params.seller_id,
        );

        if (response.status === 400) {
          return Boom.badRequest(response.data.messages);
        } else if (response.status === 404) {
          return Boom.notFound(response.data.messages);
        } else if (response.status === 200) {
          return {
            status: "success",
            message: "Performed 1 delete",
          };
        }
      } catch (err) {
        return h
          .response({
            status: "error",
            message: `Error occurred: ${err.toString()}`,
          })
          .code(500);
      }
    },
    validate: PriceValidation.deletePriceRequest,
    response: ResponseValidation,
    description: "DELETE price",
    notes: "Forwards price delete to Price&Promo API",
    tags: ["api"],
  },
};
