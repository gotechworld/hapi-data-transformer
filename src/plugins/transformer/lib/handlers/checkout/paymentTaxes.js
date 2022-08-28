import Boom from "@hapi/boom";
import Joi from "@hapi/joi";
import CheckoutService from "../../services/checkout";
import * as Utils from "../../services/utils";
import HeadersHelper from "../../helpers/headers";

import _ from "lodash";

module.exports = {
  post: {
    handler: async (request, h) => {
      const checkoutApiHttp = request.server.plugins.transformer.httpCheckoutService;
      const { params, payload } = request;
      const headers = HeadersHelper.getCheckoutHeaders(request);
      let responseObject = {};

      try {
        const requestResponse = await CheckoutService.savePaymentTax(checkoutApiHttp, params, payload, headers);
        if (_.isNull(requestResponse)) {
          return Boom.badRequest();
        } else if (requestResponse.status === 400) {
          return Boom.badRequest(requestResponse.data.messages);
        } else if (requestResponse.status === 404) {
          return Boom.notFound(requestResponse.data.messages);
        } else if (requestResponse.status === 409) {
          return Boom.conflict(requestResponse.data.messages);
        } else if (requestResponse.status === 200) {
          responseObject = requestResponse.data;
        } else {
          return Boom.internal();
        }

        return responseObject;

      } catch (err) {
        return Boom.internal();
      }
    },
    auth: "im-auth",
    plugins: {
      "hapi-internal-bridge": {
        auth: {
          role: "ROLE_SHIPPING_TAX_MKTP",
          permission: "ADD"
        }
      }
    },
    validate: {
      params: Joi.object({
        website_code: Joi.string().required().valid(Utils.altexWebsite).label("Website code"),
        seller_id: Joi.number().required().label("Seller ID")
      }),
      options: {
        allowUnknown: false
      }
    },
    description: "POST Create Payment Tax",
    notes: "Create Payment Tax",
    tags: ["api"]
  },
  list: {
    handler: async (request, h) => {
      const checkoutApiHttp = request.server.plugins.transformer.httpCheckoutService;
      const { params, query } = request;
      const headers = HeadersHelper.getCheckoutHeaders(request);
      let responseObject = {};

      try {
        const requestResponse = await CheckoutService.listPaymentTaxes(checkoutApiHttp, params, query, headers);
        if (_.isNull(requestResponse)) {
          return Boom.badRequest();
        } else if (requestResponse.status === 400) {
          return Boom.badRequest(requestResponse.data.messages);
        } else if (requestResponse.status === 404) {
          return Boom.notFound(requestResponse.data.messages);
        } else if (requestResponse.status === 200) {
          responseObject = requestResponse.data;
        } else {
          return Boom.internal();
        }

        return responseObject;

      } catch (err) {
        return Boom.internal();
      }
    },
    auth: "im-auth",
    plugins: {
      "hapi-internal-bridge": {
        auth: {
          role: "ROLE_SHIPPING_TAX_MKTP",
          permission: "LIST"
        }
      }
    },
    validate: {
      params: Joi.object({
        website_code: Joi.string().required().valid(Utils.altexWebsite).label("Website code"),
        seller_id: Joi.number().required().label("Seller ID")
      }),
      options: {
        allowUnknown: false
      }
    },
    description: "GET List Payment Taxes",
    notes: "List Payment Taxes",
    tags: ["api"]
  },
  read: {
    handler: async (request, h) => {
      const checkoutApiHttp = request.server.plugins.transformer.httpCheckoutService;
      const { params } = request;
      const headers = HeadersHelper.getCheckoutHeaders(request);
      let responseObject = {};

      try {
        const requestResponse = await CheckoutService.readPaymentTax(checkoutApiHttp, params, headers);
        if (_.isNull(requestResponse)) {
          return Boom.badRequest();
        } else if (requestResponse.status === 400) {
          return Boom.badRequest(requestResponse.data.messages);
        } else if (requestResponse.status === 404) {
          return Boom.notFound(requestResponse.data.messages);
        } else if (requestResponse.status === 200) {
          responseObject = requestResponse.data;
        } else {
          return Boom.internal();
        }

        return responseObject;

      } catch (err) {
        return Boom.internal();
      }
    },
    auth: "im-auth",
    plugins: {
      "hapi-internal-bridge": {
        auth: {
          role: "ROLE_SHIPPING_TAX_MKTP",
          permission: "GET"
        }
      }
    },
    validate: {
      params: Joi.object({
        website_code: Joi.string().required().valid(Utils.altexWebsite).label("Website code"),
        seller_id: Joi.number().required().label("Seller ID"),
        tax_id: Joi.number().required().label("Tax ID")
      }),
      options: {
        allowUnknown: false
      }
    },
    description: "GET Read Payment Tax",
    notes: "Read Payment Tax",
    tags: ["api"]
  },
  update: {
    handler: async (request, h) => {
      const checkoutApiHttp = request.server.plugins.transformer.httpCheckoutService;
      const { params, payload } = request;
      const headers = HeadersHelper.getCheckoutHeaders(request);
      let responseObject = {};

      try {
        const requestResponse = await CheckoutService.updatePaymentTax(checkoutApiHttp, params, payload, headers);
        if (_.isNull(requestResponse)) {
          return Boom.badRequest();
        } else if (requestResponse.status === 400) {
          return Boom.badRequest(requestResponse.data.messages);
        } else if (requestResponse.status === 404) {
          return Boom.notFound(requestResponse.data.messages);
        } else if (requestResponse.status === 200) {
          responseObject = requestResponse.data;
        } else {
          return Boom.internal();
        }

        return responseObject;

      } catch (err) {
        return Boom.internal();
      }
    },
    auth: "im-auth",
    plugins: {
      "hapi-internal-bridge": {
        auth: {
          role: "ROLE_SHIPPING_TAX_MKTP",
          permission: "EDIT"
        }
      }
    },
    validate: {
      params: Joi.object({
        website_code: Joi.string().required().valid(Utils.altexWebsite).label("Website code"),
        seller_id: Joi.number().required().label("Seller ID"),
        tax_id: Joi.number().required().label("Tax ID")
      }),
      options: {
        allowUnknown: false
      }
    },
    description: "GET Update Payment Tax",
    notes: "Update Payment Tax",
    tags: ["api"]
  }
};
