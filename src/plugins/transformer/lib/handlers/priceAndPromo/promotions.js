import * as Utils from "../../services/utils";
import { isUndefined, isArray } from "underscore";
import Boom from "@hapi/boom";
import ResponseValidation from "../../validations/response";
import PromotionValidation from "../../validations/promotions";

module.exports = {
  post: {
    handler: async (request, h) => {
      const httpService = request.server.plugins.transformer.httpPriceAndPromoService;

      const promotionUpdates = [];
      try {
        const { website } = request.payload;
        const sellerId = parseInt(request.payload.seller);
        // eslint-disable-next-line @hapi/hapi/for-loop
        for (let i = 0; i < request.payload.promotions.length; i++) {
          const promotion = request.payload.promotions[i];
          const update = {
            seller_id: sellerId,
            name: "Promotion imported via http call from transformer API",
            conditions: {
              filter: {
                sku: [promotion.sku],
              },
              operator: "OR",
            },
            active: true,
            discount_type: 2, //from mkp discount type is always fixed,
            discount_value: parseInt(promotion.base_price) - parseInt(promotion.final_price),
            start_date: promotion.discount_from_date,
            end_date: promotion.discount_from_date,
          };

          if (!isUndefined(promotion.id)) {
            update.id = promotion.id;
          }

          promotionUpdates.push(update);
        }

        const response = await Utils.priceAndPromoHttp.savePromotions(httpService[website], promotionUpdates);

        if (response.data.status === "error") {
          return {
            status: response.data.status,
            message: JSON.stringify(response.data.messages),
          };
        }

        return {
          status: "success",
          message: `Performed ${Object.keys(promotionUpdates).length} updates`,
        };
      } catch (err) {
        return h
          .response({
            status: "error",
            message: `Error occurred: ${err.toString()}`,
          })
          .code(500);
      }
    },
    validate: PromotionValidation.bulkPromotionRequest,
    response: ResponseValidation,
    description: "POST promotion update by seller",
    notes: "Forwards promotion update to Price&Promo API",
    tags: ["api"],
  },
  delete: {
    handler: async (request, h) => {
      const httpService = request.server.plugins.transformer.httpPriceAndPromoService;

      try {
        const { website } = request.payload;
        let { rule_id } = request.query;
        if (!isArray(rule_id)) {
          rule_id = [rule_id];
        }

        const response = await Utils.priceAndPromoHttp.deletePromotions(httpService[website], { rule_id });

        if (response.status === 400) {
          return Boom.badRequest(response.data.messages);
        } else if (response.status === 404) {
          return Boom.notFound(response.data.messages);
        } else if (response.status === 200) {
          return {
            status: "success",
            message: `Performed ${rule_id.length} updates`,
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
    validate: PromotionValidation.bulkPromotionDeleteRequest,
    response: ResponseValidation,
    description: "DELETE promotions",
    notes: "Forwards promotion delete to Price&Promo API",
    tags: ["api"],
  },
};
