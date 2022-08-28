import Joi from "@hapi/joi";
import { altexWebsite, mgWebsite } from "../services/utils";

/**
 * Product schema
 */
const productSchema = Joi.object({
  sku: Joi.string().required().label("Product SKU"),
  qty: Joi.number().required().label("Available qty"),
  warehouseId: Joi.number().optional().label("Warehouse id - defaults to 1"),
  resealed_code: Joi.string().optional().label("Resealed code"),
  parent_sku: Joi.string().optional().label("Parent SKU - configurable products"),
  configurable: Joi.object()
    .optional()
    .keys({
      attribute_code: Joi.string().required().label("Configurable attribute code"),
      value: Joi.number().required().label("Configurable attribute code value"),
    })
    .label("Configurable product configuration"),
}).label("Product info");

module.exports = {
  product: productSchema,
  bulkStocksRequest: {
    payload: Joi.object({
      website: Joi.string().required().valid(altexWebsite, mgWebsite).label("Website Code"),
      seller: Joi.number().required().label("Seller id from MKP platform"),
      products: Joi.array().required().items(productSchema).label("List of products"),
    }),
    options: {
      allowUnknown: false,
    },
  },
};
