/**
 * Proxy routes to be used.
 * @type object
 */
const proxyRoutes = {
  v1: {
    paymentTaxes: {
      list: "/v1.0/payment-tax/{seller_id}",
      read: "/v1.0/payment-tax/{seller_id}/tax/{tax_id}",
      create: "/v1.0/payment-tax/{seller_id}/tax",
      update: "/v1.0/payment-tax/{seller_id}/tax/{tax_id}"
    },
    shippingTaxes: {
      list: "/v1.0/shipping-tax/{seller_id}",
      read: "/v1.0/shipping-tax/{seller_id}/tax/{tax_id}",
      create: "/v1.0/shipping-tax/{seller_id}/tax",
      update: "/v1.0/shipping-tax/{seller_id}/tax/{tax_id}",
      delete: "/v1.0/shipping-tax/{seller_id}/tax/{tax_id}"
    }
  }
};

module.exports = {
  listPaymentTaxes: (websiteHttpClient, params, query, headers, version = "v1") => {
    return websiteHttpClient[params.website_code].call(
      "get",
      `${proxyRoutes[version].paymentTaxes.list
        .replace("{seller_id}", `${encodeURIComponent(params.seller_id)}`)}`,
      { ...query },
      {},
      headers
    );
  },
  readPaymentTax: (websiteHttpClient, params, headers, version = "v1") => {
    return websiteHttpClient[params.website_code].call(
      "get",
      `${proxyRoutes[version].paymentTaxes.read
        .replace("{seller_id}", `${encodeURIComponent(params.seller_id)}`)
        .replace("{tax_id}", `${encodeURIComponent(params.tax_id)}`)}`,
      {},
      {},
      headers
    );
  },
  savePaymentTax: (websiteHttpClient, params, payload, headers, version = "v1") => {
    return websiteHttpClient[params.website_code].call(
      "post",
      `${proxyRoutes[version].paymentTaxes.create
        .replace("{seller_id}", `${encodeURIComponent(params.seller_id)}`)}`,
      payload,
      {},
      headers
    );
  },
  updatePaymentTax: (websiteHttpClient, params, payload, headers, version = "v1") => {
    return websiteHttpClient[params.website_code].call(
      "put",
      `${proxyRoutes[version].paymentTaxes.update
        .replace("{seller_id}", `${encodeURIComponent(params.seller_id)}`)
        .replace("{tax_id}", `${encodeURIComponent(params.tax_id)}`)}`,
      payload,
      {},
      headers
    );
  },
  listShippingTaxes: (websiteHttpClient, params, query, headers, version = "v1") => {
    return websiteHttpClient[params.website_code].call(
      "get",
      `${proxyRoutes[version].shippingTaxes.list
        .replace("{seller_id}", `${encodeURIComponent(params.seller_id)}`)}`,
      { ...query },
      {},
      headers
    );
  },
  readShippingTax: (websiteHttpClient, params, headers, version = "v1") => {
    return websiteHttpClient[params.website_code].call(
      "get",
      `${proxyRoutes[version].shippingTaxes.read
        .replace("{seller_id}", `${encodeURIComponent(params.seller_id)}`)
        .replace("{tax_id}", `${encodeURIComponent(params.tax_id)}`)}`,
      {},
      {},
      headers
    );
  },
  saveShippingTax: (websiteHttpClient, params, payload, headers, version = "v1") => {
    return websiteHttpClient[params.website_code].call(
      "post",
      `${proxyRoutes[version].shippingTaxes.create
        .replace("{seller_id}", `${encodeURIComponent(params.seller_id)}`)}`,
      payload,
      {},
      headers
    );
  },
  updateShippingTax: (websiteHttpClient, params, payload, headers, version = "v1") => {
    return websiteHttpClient[params.website_code].call(
      "put",
      `${proxyRoutes[version].shippingTaxes.update
        .replace("{seller_id}", `${encodeURIComponent(params.seller_id)}`)
        .replace("{tax_id}", `${encodeURIComponent(params.tax_id)}`)}`,
      payload,
      {},
      headers
    );
  },
  deleteShippingTax: (websiteHttpClient, params, headers, version = "v1") => {
    return websiteHttpClient[params.website_code].call(
      "delete",
      `${proxyRoutes[version].shippingTaxes.delete
        .replace("{seller_id}", `${encodeURIComponent(params.seller_id)}`)
        .replace("{tax_id}", `${encodeURIComponent(params.tax_id)}`)}`,
      {},
      {},
      headers
    );
  }
};
