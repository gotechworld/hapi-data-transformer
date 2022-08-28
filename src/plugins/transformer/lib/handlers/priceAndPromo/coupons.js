import * as Utils from "../../services/utils";
import Joi from "@hapi/joi";
import ResponseValidation from "../../validations/response";
import CouponValidation from "../../validations/coupons";

module.exports = {
  put: {
    handler: async (request, h) => {
      const requestObject = request.payload;
      const httpService = request.server.plugins.transformer.httpPriceAndPromoService[requestObject.website];

      try {
        delete requestObject.website;
        const response = await Utils.priceAndPromoHttp.updateCoupon(httpService, request.params.code, requestObject);

        if (response.data.status === "error") {
          return h
            .response({
              status: response.data.status,
              message: JSON.stringify(response.data.messages),
            })
            .code(response.status);
        }

        return h
          .response({
            status: "success",
            message: "Updated",
          })
          .code(200);
      } catch (err) {
        return h
          .response({
            status: "error",
            message: `Error occurred: ${err.toString()}`,
          })
          .code(500);
      }
    },
    validate: {
      params: Joi.object({
        code: Joi.string().required().min(5).label("Coupon code"),
      }),
      payload: CouponValidation.coupon,
      options: {
        allowUnknown: false,
      },
    },
    response: ResponseValidation,
    description: "PUT coupon update",
    notes: "Forwards coupon update to Price&Promo API",
    tags: ["api"],
  },
};
