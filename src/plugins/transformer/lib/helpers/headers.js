import _ from "lodash";

const headerNames = {
  customerIp: "X-GW-User-Ip"
};

module.exports = {
  /**
     * getCheckoutHeaders
     *
     * @param request
     * @param keepBoth
     *
     * @returns {*}
     */
  getCheckoutHeaders(request) {
    const headers = this.getCustomerIpHeader(request);

    return headers;
  },
  /**
     * getCustomerIpHeader
     *
     * @param request
     *
     * @returns {*}
     */
  getCustomerIpHeader(request) {

    let ip = request.headers["x-real-ip"];

    if (_.isUndefined(ip) || _.isNull(ip)) {
      ip = request.info.remoteAddress;
    }

    const headers = {};
    headers[headerNames.customerIp] = ip;
    return headers;
  }
};
