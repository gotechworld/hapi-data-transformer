import Joi from "@hapi/joi";
import { altexWebsite, mgWebsite } from "../services/utils";

/**
 * Price schema
 */
const priceSchema = Joi.object({
  sku: Joi.string().required().label("Product SKU"),
  new_base_price: Joi.number().min(0).required().label("Base price"),
  green_tax: Joi.number().min(0).allow(null).optional().label("Green tax"),
  special_price: Joi.number().min(0).optional().label("Special price"),
}).label("Price info");

const priceSchemaV2 = Joi.object({
  sku: Joi.string().required().label("Product sku"),
  seller_id: Joi.number().optional().label("Seller ID"),
  base_price: Joi.number().min(0).required().label("Base price"),
  selling_price: Joi.number().min(0).required().label("Selling price"),
  discount_type: Joi.number().required().valid(0, 1, 2, 3), // none, fixed, percentage, repositioning
  green_tax: Joi.number().optional().allow(null).label("Green tax"),
  parent_sku: Joi.string().optional().label("Product parent sku"),
  resealed_reasons: Joi.number().optional().allow(null).label("Bitmask resealed reasons"),
  msrp_price: Joi.number().optional().allow(null).label("Manufacturer's Suggested Retail Price"),
}).label("Price info V2");

module.exports = {
  price: priceSchema,
  bulkPriceRequest: {
    payload: Joi.object({
      website: Joi.string().required().valid(altexWebsite, mgWebsite).label("Website Code"),
      seller: Joi.number().required().label("Seller id from MKP platform"),
      prices: Joi.array().required().items(priceSchema).label("List of prices"),
    }),
    options: {
      allowUnknown: false,
    },
  },
  bulkPriceRequestV2: {
    payload: Joi.object({
      website: Joi.string().required().valid(altexWebsite, mgWebsite).label("Website Code"),
      items: Joi.array().required().items(priceSchemaV2).label("List of prices"),
    }),
    options: {
      allowUnknown: false,
    },
  },
  deletePriceRequest: {
    payload: Joi.object({
      website: Joi.string().required().valid(altexWebsite, mgWebsite).label("Website Code"),
    }),
    params: Joi.object({
      sku: Joi.string().required().label("Product SKU"),
      seller_id: Joi.number().required().label("Seller ID"),
    }),
    options: {
      allowUnknown: false,
    },
  },
};
