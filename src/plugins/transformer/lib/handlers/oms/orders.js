import Boom from "@hapi/boom";
import * as Utils from "../../services/utils";
import { isUndefined, isObject } from "underscore";
import ResponseValidation from "../../validations/response";
import OrderValidation from "../../validations/order";
import _ from "lodash";

module.exports = {
  post: {
    handler: async (request, h) => {
      const now = Math.floor(Date.now() / 1000) + 2 * 60 * 60; // ECOMAPI-807 - UTC to Bucharest
      const connectors = {
        ax: request.server.plugins.transformer.axFtpInstance,
        mkp: request.server.plugins.transformer.httpOrderExportMkpService,
      };
      const config = request.server.plugins.transformer.servicesConfiguration.orderExport;

      try {
        const sellerId = parseInt(request.payload.seller);
        const orderData = request.payload.order;
        // ECOMAPI-550
        if (isUndefined(orderData.customer)) {
          orderData.customer = {
            id: "",
          };
        }

        orderData.batch = now;
        orderData.fileName = `${now}-${orderData.incrementId}`;

        await Utils.orderExport.sendOrder(sellerId, orderData, config, connectors);

        return {
          status: "success",
          message: `Performed order export - ${orderData.fileName}.`,
        };
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
    validate: OrderValidation.orderRequest,
    response: ResponseValidation,
    description: "POST order export",
    notes: "Forwards order to the designated ERP",
    tags: ["api"],
  },
  postBulk: {
    handler: async (request, h) => {
      const now = Math.floor(Date.now() / 1000) + 2 * 60 * 60; // ECOMAPI-807 - UTC to Bucharest
      const connectors = {
        ax: request.server.plugins.transformer.axFtpInstance,
        mkp: request.server.plugins.transformer.httpOrderExportMkpService,
      };
      const config = request.server.plugins.transformer.servicesConfiguration.orderExport;
      let status = "success";
      let statusCode = 200;
      let errors = 0;

      const info = [];
      for (const order of request.payload) {
        const sellerId = parseInt(order.seller);
        const orderData = order.order;
        orderData.batch = now;
        orderData.fileName = `${now}-${orderData.incrementId}`;

        try {
          await Utils.orderExport.sendOrder(sellerId, orderData, config, connectors);
          info.push(`Exported ${orderData.incrementId}`);
        } catch (err) {
          errors++;
          info.push(`Error for ${orderData.incrementId} | ${isObject(err) ? JSON.stringify(err) : err.toString()}`);
        }
      }

      if (errors > 0) {
        if (errors === request.payload.length) {
          status = "error";
          statusCode = 400;
        } else {
          status = "multi-status";
          statusCode = 207;
        }
      }

      return h
        .response({
          status,
          message: "Processed request.",
          info,
        })
        .code(statusCode);
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
    validate: OrderValidation.bulkOrdersRequest,
    response: ResponseValidation,
    description: "POST bulk order export",
    notes: "Forwards bulk orders to the designated ERP",
    tags: ["api"],
  },
  changeSuborderStatus: {
    handler: async (request, h) => {
      const omsApiHttp = request.server.plugins.transformer.httpOmsService;
      let responseObject = {};

      try {
        const suborderId = request.params.suborder_id;
        const { payload } = request;

        const suborderChangeStatusRequest = await Utils.oms.changeSuborderStatus(omsApiHttp, suborderId, payload);
        if (_.isNull(suborderChangeStatusRequest)) {
          return Boom.badRequest();
        } else if (suborderChangeStatusRequest.status === 400) {
          return Boom.badRequest(suborderChangeStatusRequest.data.messages);
        } else if (suborderChangeStatusRequest.status === 404) {
          return Boom.notFound(suborderChangeStatusRequest.data.messages);
        } else if (suborderChangeStatusRequest.status === 200) {
          responseObject = suborderChangeStatusRequest.data;
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
          role: "ROLE_OMS_SUBORDER",
          permission: "EDIT",
        },
      },
    },
    description: "PUT Chage suborder status",
    notes: "Chage suborder status",
    tags: ["api"],
  },
  updateOrderAddress: {
    handler: async (request, h) => {
      const omsApiHttp = request.server.plugins.transformer.httpOmsService;
      let responseObject = {};

      try {
        const orderAddressId = request.params.order_address_id;
        const { payload } = request;

        const orderAddressRequest = await Utils.oms.updateOrderAddress(omsApiHttp, orderAddressId, payload);
        if (_.isNull(orderAddressRequest)) {
          return Boom.badRequest();
        } else if (orderAddressRequest.status === 400) {
          return Boom.badRequest(orderAddressRequest.data.messages);
        } else if (orderAddressRequest.status === 404) {
          return Boom.notFound(orderAddressRequest.data.messages);
        } else if (orderAddressRequest.status === 200) {
          responseObject = orderAddressRequest.data;
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
          role: "ROLE_OMS_ORDER_ADDRESS",
          permission: "EDIT",
        },
      },
    },
    description: "PATCH Update order address",
    notes: "Update order address",
    tags: ["api"],
  },
};
