import CsvToJson from "csvtojson";
import { existsSync } from "fs";
import { isUndefined, difference, chunk } from "underscore";
import * as Utils from "../services/utils";
import { class as AbstractCommand } from "../components/command";

const CommandIdentifier = "ax_stocks_import";

/**
 * CSV reader options.
 */
const csvReadOptions = {
  headers: ["sku", "warehouseId", "qty"],
  noheader: true,
  trim: true,
  delimiter: "|",
};

/**
 * CSV reader options for resealed stock inventory file.
 */
const csvResealedReadOptions = {
  headers: ["sku", "resealed_code", "warehouseId", "qty"],
  noheader: true,
  trim: true,
  delimiter: "|",
};

/**
 * Stock status labels.
 */
const stockStatus = Utils.stockStatuses;

/**
 * Get seller id by website code.
 * @param {string} sellerName
 */
const getSellerIdByWebsite = Utils.getSellerIdByWebsiteCode;

/**
 * Batch limit for requests - i.e split products into batches with maximum this amount of items.
 */
const batchLimit = !isUndefined(process.env.batchLimit) ? process.env.batchLimit : 1000;

class StockImportCommand extends AbstractCommand {
  /**
   * Runner command.
   */
  execute() {
    // eslint-disable-next-line prefer-rest-params
    const { argv } = arguments["0"];
    const stockInventoryHttp = this.plugins.transformer.httpStockInventoryService;
    const { localWebsites } = this.globalSettings;

    const messages = [];

    return new Promise(async (res, reject) => {
      if (!isUndefined(argv.help)) {
        res(StockImportCommand.help());
        return;
      }

      if (isUndefined(stockInventoryHttp)) {
        reject("HTTP service could not be loaded.");
        return;
      }

      if (!existsSync(argv.input_file)) {
        reject(`Input file does not exist ${argv.input_file}`);
        return;
      }

      let csvConverter = CsvToJson(csvReadOptions);
      let csvLines = await csvConverter.fromFile(argv.input_file);
      messages.push(`Have ${csvLines.length} lines to parse form regular stock file: ${argv.input_file}`);

      // keep track of stock cart / local statuses and discrete values on inventories
      const warehouseInfo = {};
      const currentlyInStockProducts = {};
      const excludedProducts = {};
      const inStockProducts = {};
      const inStoreProducts = {};
      const productUpdates = {};

      for (const website of localWebsites) {
        warehouseInfo[website] = await Utils.stocksHttp.getWarehouseInfo(stockInventoryHttp[website], { status: 1 });
        currentlyInStockProducts[website] = await Utils.stocksHttp.getProducts(stockInventoryHttp[website], {
          status: [1, 2],
          seller: [getSellerIdByWebsite(website)],
          info: 17,
          status_or_available_in_store: 1,
        });
        excludedProducts[website] = await Utils.stocksHttp.getExcludedProducts(stockInventoryHttp[website], {
          seller: [getSellerIdByWebsite(website)],
        });
        inStockProducts[website] = [];
        inStoreProducts[website] = [];
        productUpdates[website] = {};
      }

      /**
       * Process CSV line,.
       * @param {object} line
       * @param {number} stockStatus
       */
      // eslint-disable-next-line no-shadow
      const processLine = (line, stockStatus) => {
        const cartStockBuckets = [];
        const warehouseId = parseInt(line.warehouseId);
        let qty = parseInt(line.qty);
        let { sku } = line;

        // append data for resealed products
        if (!isUndefined(line.resealed_code)) {
          sku += `-${line.resealed_code}`; // add series
          line.parent_sku = line.sku;
          delete line.sku;
        }

        for (const website of localWebsites) {
          // check in which buckets we should put this product update
          if (!isUndefined(warehouseInfo[website])) {
            if (!isUndefined(line.resealed_code)) {
              inStockProducts[website].push(sku);
              cartStockBuckets.push(website);
            } else if (
              warehouseInfo[website].cart.includes(warehouseId) ||
              warehouseInfo[website].store_availability.includes(warehouseId)
            ) {
              inStockProducts[website].push(sku);
              cartStockBuckets.push(website);
            }
          }
        }

        // for warehouses synced with both websites, we should split the qty
        let extraAltexStock = false;
        if (
          !isUndefined(warehouseInfo.altex) &&
          !isUndefined(warehouseInfo.mediagalaxy) &&
          warehouseInfo.altex.cart.includes(warehouseId) &&
          warehouseInfo.mediagalaxy.cart.includes(warehouseId)
        ) {
          if (qty % 2 === 1) {
            extraAltexStock = true;
          }

          qty = Math.floor(qty / 2);
        }

        cartStockBuckets.forEach((website) => {
          if (excludedProducts[website].includes(sku)) {
            return;
          }

          const sellerId = getSellerIdByWebsite(website);
          if (isUndefined(productUpdates[website][sku])) {
            productUpdates[website][sku] = {};
          }

          if (isUndefined(productUpdates[website][sku][sellerId])) {
            productUpdates[website][sku][sellerId] = {
              status: stockStatus,
              inventory: {},
            };
            for (const field of ["parent_sku", "resealed_code"]) {
              if (!isUndefined(line[field])) {
                productUpdates[website][sku][sellerId][field] = line[field];
              }
            }
          }

          // push the current warehouse in the inventory object
          productUpdates[website][sku][sellerId].inventory[warehouseId] = qty;
          if (website === "altex" && extraAltexStock) {
            productUpdates[website][sku][sellerId].inventory[warehouseId]++;
          }
        });
      };

      // regular stock inventory
      if (csvLines.length < 10000) {
        // check file validity
        console.error("File seems invalid - it has under 10k lines");
        process.exit(1);
      }

      csvLines.forEach((line) => {
        processLine(line, stockStatus.IN_STOCK);
      });

      // supplier stock
      if (!isUndefined(argv.suppliers_input_file)) {
        try {
          csvConverter = CsvToJson(csvReadOptions);
          csvLines = await csvConverter.fromFile(argv.suppliers_input_file);
          messages.push(
            `Have ${csvLines.length} lines to parse from suppliers stock file: ${argv.suppliers_input_file}`,
          );
          for (const line of csvLines) {
            processLine(line, stockStatus.IN_SUPPLIER_STOCK);
          }
        } catch (err) {
          messages.push(`ERROR parsing suppliers file: ${err}`);
        }
      }

      // resealed products stock
      if (!isUndefined(argv.resealed_input_file)) {
        try {
          csvConverter = CsvToJson(csvResealedReadOptions);
          csvLines = await csvConverter.fromFile(argv.resealed_input_file);
          messages.push(`Have ${csvLines.length} lines to parse from resealed stock file: ${argv.input_file}`);
          for (const line of csvLines) {
            processLine(line, stockStatus.IN_STOCK);
          }
        } catch (err) {
          messages.push(`ERROR parsing suppliers file: ${err}`);
        }
      }

      // append out of stock
      localWebsites.forEach((website) => {
        const sellerId = getSellerIdByWebsite(website);
        const outOfStockProducts = difference(
          currentlyInStockProducts[website],
          inStockProducts[website],
          excludedProducts[website],
        );
        for (const oosSku of outOfStockProducts) {
          if (isUndefined(productUpdates[website][oosSku])) {
            productUpdates[website][oosSku] = {};
          }

          if (isUndefined(productUpdates[website][oosSku][sellerId])) {
            productUpdates[website][oosSku][sellerId] = {
              status: stockStatus.OUT_OF_STOCK,
              inventory: {},
            };
          }
        }
      });

      // batch split - 1k / batch
      const requests = {};
      const updatesCount = {};
      localWebsites.forEach((website) => {
        updatesCount[website] = Object.keys(productUpdates[website]).length;
      });

      localWebsites.forEach((website) => {
        requests[website] = [];
        let batch = {};
        Object.keys(productUpdates[website]).forEach((sku, i) => {
          batch[sku] = productUpdates[website][sku];
          if (Object.keys(batch).length === batchLimit || i + 1 === updatesCount[website]) {
            requests[website].push(batch);
            batch = {};
          }
        });

        messages.push(`Splitted for website ${website} into ${requests[website].length} batches of requests`);
      });

      // dispatch requests to each website's stock inventory API instance
      for (const website of localWebsites) {
        const promises = [];
        for (const batch of requests[website]) {
          promises.push(Utils.stocksHttp.saveStocks(stockInventoryHttp[website], batch));
        }

        for (const batch of chunk(promises, 5)) {
          const responses = await Promise.all(batch);
          for (const response of responses) {
            if (response.ok === false) {
              messages.push(`Error for website ${website} - ${JSON.stringify(response.data)} - ${response.status}`);
            }
          }
        }
      }

      // archive files locally
      if (!isUndefined(argv.archive_dir)) {
        let archiveFilePath = Utils.archiveFile(argv.archive_dir, argv.input_file);
        messages.push(`Archived ${argv.input_file} under ${archiveFilePath}`);
        if (!isUndefined(argv.suppliers_input_file)) {
          archiveFilePath = Utils.archiveFile(argv.archive_dir, argv.suppliers_input_file);
          messages.push(`Archived ${argv.suppliers_input_file} under ${archiveFilePath}`);
        }

        if (!isUndefined(argv.resealed_input_file)) {
          archiveFilePath = Utils.archiveFile(argv.archive_dir, argv.resealed_input_file);
          messages.push(`Archived ${argv.resealed_input_file} under ${archiveFilePath}`);
        }
      }

      res(messages);
    });
  }

  /**
   * Return help message.
   */
  static help() {
    return (
      CommandIdentifier.toUpperCase() +
      "\n" +
      "Usage parameters: \n\n" +
      "----------------------------\n" +
      "--input_file - regular stocks input file\n" +
      "--resealed_input_file - resealed stocks input file\n" +
      "--suppliers_input_file - suppliers input file path\n" +
      "--archive_dir - the archive dir if any\n"
    );
  }
}

exports.command = StockImportCommand;

exports.name = CommandIdentifier;
