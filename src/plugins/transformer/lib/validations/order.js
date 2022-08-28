import Joi from "@hapi/joi";

/**
 * Address schema
 */
const addressSchema = {
  city: Joi.string().required().label("City"),
  clientGroupId: Joi.string().required("Client group Id"),
  countryId: Joi.string().required().label("Country Id"),
  countryRegionId: Joi.string().required().label("Country region Id"),
  name: Joi.optional()
    .allow("", null)
    .when("hasCompany", {
      is: false,
      then: Joi.string().required(),
    })
    .label("Customer name"),
  company: Joi.optional()
    .allow("", null)
    .when("hasName", {
      is: false,
      then: Joi.string().required(),
    })
    .label("Company name"),
  regionId: Joi.string().required().label("Region Id"),
  telephone: Joi.string().required().min(10).max(15).label("Telephone number"),
};

/**
 * Customer schema
 */
const customerSchema = {
  email: Joi.string().email().optional().allow("", null).label("Customer email"),
  telephone: Joi.string().min(10).max(15).optional().allow("", null).label("Telephone number"),
  id: Joi.number().optional().allow("", null).label("Customer id"),
  fiscalCode: Joi.string().optional().allow("", null).label("Fiscal code / Person ID number"),
};

/**
 * Item schema
 */
const itemSchema = {
  confirmationItemId: Joi.number().required().label("Confirmation Item Id"),
  inventoryLocationId: Joi.number().required().label("Inventory location id"),
  qty: Joi.number().required().label("Confirmed qty"),
  resealedCode: Joi.any().optional().allow("", null).label("Resealed series"),
  sku: Joi.string().required().label("Product SKU"),
};

/**
 * Order schema
 */
const orderSchema = {
  seller: Joi.number().required().label("Seller id from MKP platform"),
  order: Joi.object()
    .required()
    .keys({
      incrementId: Joi.string().required().label("Increment ID"),
      billingAddress: Joi.object(addressSchema).required().label("Billing address info"),
      shippingAddress: Joi.object(addressSchema).optional().allow({}, null).label("Billing address info"),
      //customer: Joi.object(customerSchema).optional().label('Customer info'),
      originId: Joi.string().required().label("Order origin id"),
      items: Joi.array().items(itemSchema).required().label("Order items"),
    })
    .label("Order object"),
};

module.exports = {
  order: orderSchema,
  address: addressSchema,
  item: itemSchema,
  customer: customerSchema,
  orderRequest: {
    payload: Joi.object(orderSchema),
    options: {
      allowUnknown: true,
    },
  },
  bulkOrdersRequest: {
    payload: Joi.array().items(orderSchema).required().label("Orders array containing info"),
    options: {
      allowUnknown: true,
    },
  },
};
