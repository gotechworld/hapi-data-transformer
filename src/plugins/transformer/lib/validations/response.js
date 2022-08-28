import Joi from "@hapi/joi";

module.exports = {
  schema: Joi.object({
    status: Joi.string().required().valid("success", "error", "multi-status").label("Request status"),
    message: Joi.alternatives()
      .try(Joi.object(), Joi.string())
      .required()
      .label("Message after processing the request"),
    data: Joi.object().optional().label("Data returned sometimes by services"),
  }),
  options: {
    allowUnknown: true,
  },
};
