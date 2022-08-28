import * as Utils from "../../services/utils";
import ResponseValidation from "../../validations/response";
import InvoiceValidation from "../../validations/invoices";

module.exports = {
  post: {
    handler: async (request, h) => {
      const httpService = request.server.plugins.transformer.httpOmsService;

      const invoiceUpdates = [];
      try {
        const sellerId = parseInt(request.payload.seller);

        // eslint-disable-next-line @hapi/hapi/for-loop
        for (let i = 0; i < request.payload.invoices.length; i++) {
          const invoice = request.payload.invoices[i];
          const update = {
            order_id: invoice.order_id,
            seller_id: sellerId,
            file_name: invoice.file_name,
            file_content: invoice.file_content,
          };

          invoiceUpdates.push(update);
        }

        const response = await Utils.oms.saveInvoices(httpService, invoiceUpdates);
        if (response.data.error) {
          return {
            code: response.status,
            message: response.data.error_message,
          };
        }

        return { code: 200, message: "success" };
      } catch (err) {
        return h
          .response({
            status: "error",
            message: `Error occurred: ${err.toString()}`,
          })
          .code(500);
      }
    },
    validate: InvoiceValidation.bulkInvoiceRequest,
    response: ResponseValidation,
    description: "POST invoice",
    notes: "Forwards invoice to OMS API",
    tags: ["api"],
  },
};
