import Joi from "@hapi/joi";
import { altexWebsite, mgWebsite } from "../services/utils";

/**
 * Price schema
 */
const couponSchema = Joi.object({
  website: Joi.string().required().valid(altexWebsite, mgWebsite),
  rule_id: Joi.number().required().label("Rule ID"),
  times_used: Joi.number().optional().label("Times used"),
  discount_value: Joi.number().optional().label("Discount value"),
  omnichannel: Joi.number().optional().valid(1, 2).label("Omnichannel"),
  start_date: Joi.string().optional().label("Start date"),
  end_date: Joi.string().optional().label("End date"),
  email: Joi.string().optional().label("Email"),
}).label("Coupon info");

module.exports = {
  coupon: couponSchema,
};
