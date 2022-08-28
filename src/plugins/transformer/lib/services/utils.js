import { existsSync, renameSync, writeFileSync } from "fs";
import { sync } from "mkdirp";
import Moment from "moment";
import { basename } from "path";
import { isArray, isEmpty, isEqual, isObject, isUndefined } from "underscore";
import { promisify } from "util";
import * as Ejs from "ejs";
import * as xmlTemplate from "./templates/orderExport";
import { ConsoleLogger } from "../helpers/consoleLogger";

const exec = promisify(require("child_process").exec);

const logger = new ConsoleLogger();

const config = {
  sellers: {
    altex: 1,
    mediagalaxy: 2,
  },
};

const magentoRezOriginId = "MAGENTOREZ";

/**
 * Stock statuses.
 */
const stockStatuses = {
  IN_STOCK: 1,
  OUT_OF_STOCK: 0,
  IN_SUPPLIER_STOCK: 2,
  PREORDER: 3,
  EOL: 4,
};

/**
 * Available sellers.
 */
exports.sellers = config.sellers;

/**
 * Local website codes.
 */
exports.localWebsites = ["altex", "mediagalaxy"];

exports.altexWebsite = "altex";

exports.mgWebsite = "mediagalaxy";

/**
 * Marketplace warehouse id.
 */
exports.marketplaceDefaultWarehouseId = 1;

/**
 * Stock statuses.
 */
exports.stockStatuses = stockStatuses;

/**
 * Validate http response.
 * @param {object} response
 * @returns bool
 */
const validateHttpResponse = (response) => {
  return !isUndefined(response.data) && !isEmpty(response.data) && isObject(response.data);
};

/**
 * Get stock status by qty.
 * @param {number} qty
 */
exports.getStockStatusByQty = (qty) => {
  if (qty <= 0) {
    return stockStatuses.OUT_OF_STOCK;
  }

  return stockStatuses.IN_STOCK;
};

/**
 * Get seller id by website code considering the upper config.
 * @param {string} websiteCode
 */
exports.getSellerIdByWebsiteCode = (websiteCode) => {
  let sellerId = 0;

  if (!isUndefined(config.sellers[websiteCode])) {
    sellerId = config.sellers[websiteCode];
  }

  return sellerId;
};

/**
 * Get website code by seller id considering the upper config.
 * @param {integer} sellerId
 */
exports.getWebsiteCodeBySellerId = (sellerId) => {
  for (const websiteCode in config.sellers) {
    if (isEqual(config.sellers[websiteCode], sellerId)) {
      return websiteCode;
    }
  }

  return false;
};

/**
 * Split array into batches. (array to array of arrays)
 */
exports.chunkArray = (myArray, chunkSize = 1) => {
  const arrayLength = myArray.length;
  const batches = [];
  for (let i = 0; i < arrayLength; i += chunkSize) {
    batches.push(myArray.slice(i, i + chunkSize));
  }

  return batches;
};

/**
 * Check if seller is local.
 * @param {number} sellerId
 */
const isLocalSeller = function (sellerId) {
  let status = false;
  for (const websiteCode of Object.keys(config.sellers)) {
    if (config.sellers[websiteCode] === sellerId) {
      status = true;
      break;
    }
  }

  return status;
};

exports.isLocalSeller = isLocalSeller;

/**
 * Stock Inventory API decorator.
 */
exports.stocksHttp = {
  /**
   * Get excluded skus.,
   */
  getExcludedProducts: async (websiteHttpClient, params) => {
    const products = [];
    const response = await websiteHttpClient.call("get", "/api/v1.0/excludedskus", params);

    if (!validateHttpResponse(response)) {
      console.error("GET excludedskus response is invalid");
      return products;
    }

    if (!isUndefined(response.data.data.excluded_skus)) {
      for (const bucket of ["preorder", "virtual"]) {
        if (
          isUndefined(response.data.data.excluded_skus[bucket]) ||
          isEmpty(response.data.data.excluded_skus[bucket]) ||
          !isArray(response.data.data.excluded_skus[bucket])
        ) {
          continue;
        }

        for (const sku of response.data.data.excluded_skus[bucket]) {
          products.push(sku);
        }
      }
    }

    return products;
  },
  /**
   * Get products by params.
   */
  getProducts: async (websiteHttpClient, params) => {
    const products = [];

    let currentPage = 1;
    params.items_per_page = 1000;
    let response = await websiteHttpClient.call("get", "/api/v1.0/stocks", params);

    if (!validateHttpResponse(response)) {
      console.error("GET products stock response is invalid");
      return products;
    }

    Object.keys(response.data.data.stocks).forEach((sku) => {
      products.push(sku);
    });

    if (response.data.data.metadata.total_pages > 1) {
      let totalPages = response.data.data.metadata.total_pages - 1;
      do {
        params.page_no = ++currentPage;
        totalPages--;
        response = await websiteHttpClient.call("get", "/api/v1.0/stocks", params);
        Object.keys(response.data.data.stocks).forEach((sku) => {
          products.push(sku);
        });
      } while (totalPages > 0);
    }

    return products;
  },
  /**
   * Get warehouse info.
   */
  getWarehouseInfo: async (websiteHttpClient, params) => {
    const info = {
      cart: [],
      store_availability: [],
      has_display: [],
    };

    /**
     * Parse response.
     * @param {*} items
     */
    const parseResponse = (items) => {
      items.forEach((warehouse) => {
        if (warehouse.sync_cart_enabled === 1) {
          info.cart.push(warehouse.id);
        }

        if (warehouse.store_availability_enabled === 1) {
          info.store_availability.push(warehouse.id);
        }

        if (warehouse.has_display_products === 1) {
          info.has_display.push(warehouse.id);
        }
      });
    };

    params.items_per_page = 1000;

    let currentPage = 1;
    let response = await websiteHttpClient.call("get", "/api/v1.0/warehouses", params);

    if (!validateHttpResponse(response)) {
      console.error("GET warehouses response is invalid!");
      return info;
    }

    parseResponse(response.data.data.warehouses);

    if (response.data.data.metadata.total_pages > 1) {
      let totalPages = response.data.data.metadata.total_pages - 1;
      do {
        params.page_no = ++currentPage;
        totalPages--;
        response = await websiteHttpClient.call("get", "/api/v1.0/warehouses", params);
        parseResponse(response.data.data.warehouses);
      } while (totalPages > 0);
    }

    return info;
  },
  /**
   * Save stocks through a PUT request.
   */
  saveStocks: (websiteHttpClient, stockValues) => {
    return websiteHttpClient.call("put", "/api/v1.0/stocks", stockValues);
  },
};

/**
 * Clean object by removing recursively null members from each level.
 * @param {object} target
 */
const cleanObject = function (target) {
  Object.keys(target).map((key) => {
    if (target[key] instanceof Object) {
      if (!Object.keys(target[key]).length && typeof target[key].getMonth !== "function") {
        delete target[key];
      } else {
        cleanObject(target[key]);
      }
    } else if (target[key] === null) {
      delete target[key];
    }
  });
  return target;
};

exports.cleanObject = cleanObject;

/**
 * Transform salesOrder object to xml according to the transformation template.
 * @param {object} salesOrder
 */
const toXml = function (salesOrder) {
  return Ejs.render(xmlTemplate.template, { salesOrder }, { rmWhitespace: true }).replace(/(\r\n|\n|\r)/gm, "");
};

/**
 * Workflow:
 * - transform order object to match xslt
 * - save file locally
 * - upload file to FTP
 * - archive order export file
 *
 * @param {object} order
 * @param {object} config
 * @param {basic-ftp.client} connector
 */
// eslint-disable-next-line no-shadow,require-await
const sendOrderToAx = async function (order, config, connector) {
  // apply some object transformations to match js template
  order.addresses = {
    billing: order.billingAddress,
    shipping: order.shippingAddress,
  };
  delete order.billingAddress;
  delete order.shippingAddress;

  // wrap it so it can match the xslt
  const salesOrder = cleanObject(order);

  let fileDirectory = "";
  if (order.originId === magentoRezOriginId) {
    fileDirectory = `${config.magentoRezDir}/`;
  }

  return new Promise(async (res, reject) => {
    try {
      // transform& write file locally in /tmp/
      const transformedXml = toXml(salesOrder);
      const savePath = `/tmp/${order.fileName}.xml`;
      writeFileSync(savePath, transformedXml);

      // upload to FTP
      if (config.uploadFiles === true) {
        await exec(
          `curl -T ${savePath} -m ${config.curlMaxTime} ${config.ftpPath}/${fileDirectory}${order.fileName}.xml --user ${config.ftp.user}:${config.ftp.password}`,
          { shell: true },
        );
      } else {
        console.info("AX FTP is disabled");
      }

      // archive xml
      if (!isUndefined(config.archiveDir)) {
        archiveFile(config.archiveDir, savePath);
      }

      res(true);
    } catch (err) {
      console.log(err);
      reject("Could not send order to AX");
    }
  });
};

/**
 * Workflow:
 * - send via HTTP the order to MKP
 * @param {object} order
 * @param {object} config
 * @param {HttpService} connector
 */
// eslint-disable-next-line no-shadow,require-await
const sendOrderToMkp = async function (order, config, connector) {
  const LogTag = "SendOrderToMkp";

  return new Promise(async (res, reject) => {
    try {
      logger.info(LogTag, JSON.stringify(order));

      const response = await connector.call("post", config.endpoint, order);
      if (response.ok === false) {
        logger.error(LogTag, JSON.stringify(response.data));

        reject(response.data);
      } else {
        res();
      }
    } catch (err) {
      logger.error(LogTag, err);
      reject("Could not send order to MKP");
    }
  });
};

/**
 * Order export utils.
 */
exports.orderExport = {
  // eslint-disable-next-line no-shadow
  sendOrder: (sellerId, order, config, connectors) => {
    if (isLocalSeller(sellerId)) {
      return sendOrderToAx(order, config.ax, connectors.ax);
    }

    return sendOrderToMkp(order, config.mkp, connectors.mkp);
  },
};

/**
 * Util for archiving a file - copy from archiveFile under a sub directory tree for baseArchiveDir.
 * @param {string} baseArchiveDir
 * @param {string} archiveFile
 */
// eslint-disable-next-line no-shadow
const archiveFile = function (baseArchiveDir, archiveFile) {
  const targetDir = `${baseArchiveDir}/${Moment().format("YYYY/MM/DD")}/`.replace("//", "/");
  if (!existsSync(targetDir)) {
    sync(targetDir);
  }

  const targetFile = `${basename(archiveFile)}-${new Date().getTime()}`;
  renameSync(archiveFile, `${targetDir}${targetFile}`);

  return archiveFile;
};

exports.archiveFile = archiveFile;

exports.priceAndPromoHttp = {
  /**
   * Save prices through a POST request.
   */
  savePrices: (websiteHttpClient, priceValues) => {
    return websiteHttpClient.call("post", "/v1/prices/bulk", priceValues);
  },
  /**
   * Save prices through a POST request.
   */
  savePricesV2: (websiteHttpClient, priceValues) => {
    return websiteHttpClient.call("post", "/v2/prices/bulk", priceValues);
  },
  /**
   * Delete price through a DELETE request.
   */
  deletePrice: (websiteHttpClient, sku, sellerId) => {
    return websiteHttpClient.call("delete", `/v1/prices/${sku}/${sellerId}`);
  },
  /**
   * Save resealed prices through a POST request.
   */
  saveResealedPrices: (websiteHttpClient, priceValues) => {
    return websiteHttpClient.call("post", "/v1/resealed/bulk", priceValues);
  },
  /**
   * Get promotions through a GET request.
   */
  getPromotions: (websiteHttpClient, params) => {
    return websiteHttpClient.call("get", "/v1/catalogrules", params);
  },
  /**
   * Get promotions through a Delete request.
   */
  deletePromotions: (websiteHttpClient, params) => {
    return websiteHttpClient.call("delete", "/v1/catalogrules/bulk", params);
  },
  /**
   * Save promotions through a POST request.
   */
  savePromotions: (websiteHttpClient, promotionValues) => {
    return websiteHttpClient.call("post", "/v1/catalogrules/bulk", promotionValues);
  },
  /**
   * Update coupon through a Put request.
   */
  updateCoupon: (websiteHttpClient, couponCode, couponValue) => {
    return websiteHttpClient.call("put", `/v1/coupons/${couponCode}`, couponValue);
  },
  /**
   * Save bundles through a POST request.
   */
  saveBundles: (websiteHttpClient, bundlesValues) => {
    return websiteHttpClient.call("post", "/v1/bundles", bundlesValues);
  },
  /**
   * Get bundles through a GET request.
   */
  getBundles: (websiteHttpClient, params) => {
    return websiteHttpClient.call("get", "/v1/bundles", params);
  },
  /**
   * Delete bundle through a DELETE request.
   */
  deleteBundle: (websiteHttpClient, id) => {
    return websiteHttpClient.call("delete", `/v1/bundles/${id}`);
  },
};

exports.oms = {
  /**
   * Save invoices through a POST request.
   */
  saveInvoices: (websiteHttpClient, invoiceValue) => {
    return websiteHttpClient.call("post", "/v1.0/invoice", invoiceValue);
  },

  /**
   * Change suborder status.
   */
  changeSuborderStatus: (httpClient, suborderId, params) => {
    return httpClient.call(
      "put",
      "/v1.0/suborders/{suborderId}/status".replace(
        "{suborderId}",
        suborderId,
      ),
      params,
    );
  },

  /**
   * Update order address.
   */
  updateOrderAddress: (httpClient, orderAddressId, params) => {
    return httpClient.call(
      "patch",
      "/v1.0/order-addresses/{orderAddressId}".replace(
        "{orderAddressId}",
        orderAddressId,
      ),
      params,
    );
  },
};

exports.catalogApiHttp = {
  /**
   * Get products by filters / fields.
   */
  getProducts: (httpClient, filters = {}, fields = []) => {
    const urlParams = [];
    Object.keys(filters).forEach((field) => {
      urlParams.push(`filter=${field}:${filters[field]}`);
    });
    fields.forEach((item) => {
      urlParams.push(`fields=${item}`);
    });

    return httpClient.call("get", "/rest/products/getBulk/?" + urlParams.join("&"));
  },

  /**
   * Update products bulk.
   */
  updateProductsBulk: (httpClient, updateList) => {
    return httpClient.call("put", "/rest/products/bulk", { data: updateList });
  },
};
