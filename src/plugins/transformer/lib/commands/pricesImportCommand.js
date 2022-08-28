import CsvToJson from "csvtojson";
import { existsSync } from "fs";
import { isUndefined, isNaN, get, set, chunk, has } from "lodash";
import * as Utils from "../services/utils";
import { class as AbstractCommand } from "../components/command";

const CommandIdentifier = "ax_prices_import";

/**
 * prices CSV reader options.
 */
const pricesCsvReadOptions = {
  headers: ["sku", "base_price", "vat", "green_tax_1", "green_tax_2"],
  noheader: true,
  trim: true,
  delimiter: "|",
};

/**
 * offlinePrices CSV reader options.
 */
const offlinePrices = {
  headers: ["sku", "offlineBasePrice", "offlineDiscountedPrice"],
  noheader: true,
  trim: true,
  delimiter: "|",
};

/**
 * Get seller id by website code.
 * @param {string} sellerName
 */
const getSellerIdByWebsite = Utils.getSellerIdByWebsiteCode;

/**
 * Batch limit for requests - i.e split products into batches with maximum this amount of items.
 */
const batchLimit = !isUndefined(process.env.batchLimit) ? process.env.batchLimit : 600;

const processResponseBatch = 5;

class PriceImportCommand extends AbstractCommand {
  /**
   * Runner command.
   */
  execute() {
    // eslint-disable-next-line prefer-rest-params
    const { argv } = arguments["0"];
    const priceAndPromoHttp = this.plugins.transformer.httpPriceAndPromoService;
    const messages = [];
    const { localWebsites } = this.globalSettings;

    return new Promise(async (res, reject) => {
      if (!isUndefined(argv.help)) {
        res(PriceImportCommand.help());
        return;
      }

      if (isUndefined(priceAndPromoHttp)) {
        reject("HTTP service could not be loaded.");
        return;
      }

      if (!existsSync(argv.prices_file)) {
        reject(`Input file does not exist ${argv.prices_file}`);
        return;
      }

      const priceUpdates = {};
      const processPriceLine = (line) => {
        if (isUndefined(line.base_price)) {
          return;
        }

        line.base_price = line.base_price.replace(",", "");
        line.green_tax_1 = line.green_tax_1.replace(",", "");
        line.green_tax_2 = line.green_tax_2.replace(",", "");

        for (const website of localWebsites) {
          if (isUndefined(priceUpdates[website])) {
            priceUpdates[website] = {};
          }

          const sellerId = getSellerIdByWebsite(website);
          priceUpdates[website][line.sku] = get(priceUpdates, [website, line.sku], {});
          if (parseFloat(line.base_price) > 0) {
            set(priceUpdates, [website, line.sku, sellerId], { new_base_price: parseFloat(line.base_price) });
          }

          //green tax logic
          const green_tax_1 = parseFloat(get(line, "green_tax_1", 0));
          const green_tax_2 = parseFloat(get(line, "green_tax_2", 0));
          let green_tax = 0;
          if (!isNaN(green_tax_1)) {
            green_tax += green_tax_1;
          }

          if (!isNaN(green_tax_2)) {
            green_tax += green_tax_2;
          }

          green_tax = green_tax === 0 ? null : green_tax;
          set(priceUpdates, [website, line.sku, sellerId, "green_tax"], green_tax);
        }
      };

      const processOfflinePricesLine = (line) => {
        localWebsites.forEach((website) => {
          const sellerId = getSellerIdByWebsite(website);

          if (has(priceUpdates, [website, line.sku, sellerId])) {
            if (!isUndefined(line.offlineBasePrice)) {
              line.offlineBasePrice = line.offlineBasePrice.replace(",", "");
              priceUpdates[website][line.sku][sellerId].offline_base_price = parseFloat(line.offlineBasePrice);
            }

            if (!isUndefined(line.offlineDiscountedPrice)) {
              line.offlineDiscountedPrice = line.offlineDiscountedPrice.replace(",", "");
              priceUpdates[website][line.sku][sellerId].offline_selling_price = parseFloat(line.offlineDiscountedPrice);
            }
          } else {
            messages.push(`There is an offline price for sku: ${line.sku} that can't be found in ${argv.prices_file}`);
          }
        });
      };

      //Process Prices
      const pricesCsvConverter = CsvToJson(pricesCsvReadOptions);
      const pricesCsvLines = await pricesCsvConverter.fromFile(argv.prices_file);
      messages.push(`Have ${pricesCsvLines.length} lines to parse from regular prices file: ${argv.prices_file}`);

      pricesCsvLines.forEach((line) => {
        processPriceLine(line);
      });

      //Process offline prices
      if (!isUndefined(argv.offline_prices) && existsSync(argv.offline_prices)) {
        const offlinePricesCsvConverter = CsvToJson(offlinePrices);
        const offlinePricesCsvLines = await offlinePricesCsvConverter.fromFile(argv.offline_prices);
        messages.push(
          `Have ${offlinePricesCsvLines.length} lines to parse form regular offline prices file: ${argv.offline_prices}`,
        );

        offlinePricesCsvLines.forEach((line) => {
          processOfflinePricesLine(line);
        });
      }

      //split into batches
      const requests = {};
      const updatesCount = {};
      localWebsites.forEach((website) => {
        updatesCount[website] = Object.keys(priceUpdates[website]).length;
      });

      localWebsites.forEach((website) => {
        requests[website] = [];
        let batch = {};
        Object.keys(priceUpdates[website]).forEach((sku, i) => {
          batch[sku] = priceUpdates[website][sku];
          if (Object.keys(batch).length === batchLimit || i + 1 === updatesCount[website]) {
            requests[website].push(batch);
            batch = {};
          }
        });

        messages.push(`Splitted for website ${website} into ${requests[website].length} batches of requests`);
      });

      //make a request call for each batch
      for (const website of localWebsites) {
        const promises = [];
        for (const batch of requests[website]) {
          promises.push(Utils.priceAndPromoHttp.savePrices(priceAndPromoHttp[website], batch));
        }

        for (const batch of chunk(promises, processResponseBatch)) {
          const responses = await Promise.all(batch);
          for (const response of responses) {
            if (response.ok === false && !isUndefined(response.data) && response.data !== null) {
              if (!isUndefined(response.data.messages)) {
                messages.push(`Error for website ${website} - ${JSON.stringify(response.data.messages)}`);
              } else {
                messages.push(`Error for website ${website}`);
              }
            }
          }
        }
      }

      // archive files locally
      if (!isUndefined(argv.archive_dir)) {
        let archiveFilePath = Utils.archiveFile(argv.archive_dir, argv.prices_file);
        messages.push(`Archived ${argv.prices_file} under ${archiveFilePath}`);
        if (!isUndefined(argv.offline_prices)) {
          archiveFilePath = Utils.archiveFile(argv.archive_dir, argv.offline_prices);
          messages.push(`Archived ${argv.offline_prices} under ${archiveFilePath}`);
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
      "--prices_file - regular prices input file\n" +
      "--offline_prices - regular offline prices input file\n" +
      "--archive_dir - the archive dir if any\n"
    );
  }
}

exports.command = PriceImportCommand;

exports.name = CommandIdentifier;
