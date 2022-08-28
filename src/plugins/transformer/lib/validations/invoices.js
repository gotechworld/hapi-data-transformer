import Joi from "@hapi/joi";

/**
 * Invoice schema
 */
const invoiceSchema = Joi.object({
  order_id: Joi.number().required().label("Order ID"),
  file_name: Joi.string().required().label("File name"),
  file_content: Joi.string().base64().required().label("File content"),
}).label("Invoice info");

module.exports = {
  invoice: invoiceSchema,
  bulkInvoiceRequest: {
    payload: Joi.object({
      seller: Joi.number().required().label("Seller id from MKP platform"),
      invoices: Joi.array().required().items(invoiceSchema).label("List of invoices"),
    }),
    options: {
      allowUnknown: false,
    },
  },
};
