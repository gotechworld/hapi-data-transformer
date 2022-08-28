import Joi from "@hapi/joi";
import { altexWebsite, mgWebsite } from "../services/utils";

/**
 * Item schema
 */
const itemSchema = Joi.object({
  sku: Joi.string().required().label("Product SKU"),
  discount_value: Joi.number().required().label("Discount value"),
  discount_type: Joi.number().required().label("Discount type"),
  position: Joi.string().required().label("Position in bundle"),
  quantity: Joi.number().required().label("Quantity"),
}).label("Item info");

/**
 * Bundle schema
 */
const bundleSchema = Joi.object({
  id: Joi.string().required().label("Bundle external ID"),
  seller_id: Joi.number().required().label("Seller of the bundle"),
  items: Joi.array().required().items(itemSchema).label("List of items"),
}).label("Bundle info");

module.exports = {
  bundle: bundleSchema,
  bulkBundleRequest: {
    payload: Joi.object({
      website: Joi.string().required().valid(altexWebsite, mgWebsite).label("Website Code"),
      bundles: Joi.array().required().items(bundleSchema),
    }),
    options: {
      allowUnknown: false,
    },
  },
  deleteBundleRequest: {
    payload: Joi.object({
      website: Joi.string().required().valid(altexWebsite, mgWebsite).label("Website Code"),
    }),
    params: Joi.object({
      id: Joi.string().required().label("Bundle external ID"),
    }),
    options: {
      allowUnknown: false,
    },
  },
};
