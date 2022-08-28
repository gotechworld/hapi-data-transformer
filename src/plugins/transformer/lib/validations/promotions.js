import Joi from "@hapi/joi";
import { altexWebsite, mgWebsite } from "../services/utils";

/**
 * Promotion schema
 */
const promotionSchema = Joi.object({
  id: Joi.number().optional().label("Promotion ID"),
  sku: Joi.string().required().label("Product SKU"),
  base_price: Joi.number().min(0).required().label("Base price"),
  final_price: Joi.number().min(0).optional().label("Final price"),
  discount_from_date: Joi.string().optional().label("Start date"),
  discount_to_date: Joi.string().optional().label("End date"),
}).label("Promotion info");

module.exports = {
  promotion: promotionSchema,
  bulkPromotionRequest: {
    payload: Joi.object({
      website: Joi.string().required().valid(altexWebsite, mgWebsite).label("Website Code"),
      seller: Joi.number().required().label("Seller id from MKP platform"),
      promotions: Joi.array().required().items(promotionSchema).label("List of promotions"),
    }),
    options: {
      allowUnknown: false,
    },
  },
  bulkPromotionDeleteRequest: {
    query: Joi.object({
      rule_id: Joi.alternatives().try(Joi.array().required().max(500), Joi.number()).required(),
    }),
    payload: Joi.object({
      website: Joi.string().required().valid(altexWebsite, mgWebsite).label("Website Code"),
    }),
    options: {
      allowUnknown: false,
    },
  },
};
