import { isUndefined } from "underscore";
import * as Utils from "../services/utils";
import CsvToJson from "csvtojson";
import { class as AbstractCommand } from "../components/command";

const CommandIdentifier = "best_buy_import";
const BEST_BUY_CACHE_KEY = "best_buy_table";

const csvReadOptions = {
  headers: ["sku", "bestBuy"],
  noheader: true,
  trim: true,
  delimiter: "|",
};

const redis = require("redis");


/**
 * Get websiteBySellerId.
 * @param {string} sellerName
 */
const getWebsiteBySellerId = Utils.getWebsiteCodeBySellerId;

/**
 * Batch limit for update requests.
 */
const batchLimit = !isUndefined(process.env.batchLimit) ? process.env.batchLimit : 100;

//
//  php download_ftp_file.php "src/config/manifest.json" "/EXP_BESTBUY/export_ATX.txt" "best_buy_altex.csv"
//  php download_ftp_file.php "src/config/manifest.json" "/EXP_BESTBUY/export_MG.txt" "best_buy_mg.csv"
//  nodemon --exec babel-node $NODE_DEBUG_OPTION src/command.js --command best_buy_import --input_file_altex best_buy_altex.csv  --input_file_mediagalaxy best_buy_mg.csv
class ImportBestBuyCommand extends AbstractCommand {
  /**
   * Runner command.
   */
  execute() {
    //create a redis client
    const client = redis.createClient(this.globalSettings.cache);
    client.on("error", function(error) {
      console.error(error);
    });

    // eslint-disable-next-line prefer-rest-params
    const { argv } = arguments["0"];
    const catalogApiHttp = this.plugins.transformer.httpCatalogApiService;
    const messages = [];

    return new Promise(async (res, reject) => {
      if (!isUndefined(argv.help)) {
        res(ImportBestBuyCommand.help());
        return;
      }

      if (isUndefined(catalogApiHttp)) {
        reject("HTTP service could not be loaded.");
        return;
      }

      for (const sellerId of [1, 2]) {
        const csvConverter = CsvToJson(csvReadOptions);
        const website = getWebsiteBySellerId(parseInt(sellerId));
        if (isUndefined(website)) {
          console.error("Could not get website configuration!");
          continue;
        }

        if (isUndefined(argv[`input_file_${website}`])) {
          console.error(`ERROR - File not sent as parameter for website ${website}`);
          continue;
        }

        const productsListRequest = await Utils.catalogApiHttp.getProducts(catalogApiHttp[website], { status: 1 }, [
          "id",
          "sku",
          "best_buy",
        ]);
        if (!productsListRequest.ok) {
          messages.push(`Error when reading productListRequest from website ${website}`);
          continue;
        }

        const productsListData = productsListRequest.data;
        messages.push(`Got ${productsListData.length} products`);

        const skuIdList = {};
        const bestBuyValue = {};
        productsListData.forEach((item) => {
          skuIdList[item.sku] = item.id;
          bestBuyValue[item.sku] = item.best_buy;
        });

        const updates = [];

        const bestBuyLines = await csvConverter.fromFile(argv[`input_file_${website}`]);
        bestBuyLines.forEach((line) => {
          if (isUndefined(skuIdList[line.sku])) {
            // messages.push(`[!] Cannot find sku ${line.sku}`);
            return;
          }

          updates.push({
            id: parseInt(skuIdList[line.sku]),
            best_buy: parseInt(line.bestBuy),
          });

          // set value to redis so it can be used later by Go-indexer
          client.hmset(BEST_BUY_CACHE_KEY + "_" + website, parseInt(skuIdList[line.sku]), parseInt(line.bestBuy));

          delete skuIdList[line.sku];
        });
        const updatesFromFile = updates.length;
        messages.push(`[!] Matched ${updatesFromFile} products from file`);

        // Reset values for the other items
        Object.keys(skuIdList).forEach((sku) => {
          if (bestBuyValue[sku] !== 0) {
            updates.push({
              id: parseInt(skuIdList[sku]),
              best_buy: 0,
            });
          }
        });
        messages.push(`[!] Resetting best buy values for ${updates.length - updatesFromFile} products`);
        messages.push(`[!] Updates to execute: ${updates.length} products`);

        const batches = Utils.chunkArray(updates, batchLimit);
        messages.push(`[!] Splitted into ${batches.length} batches`);
        for (const batch of batches) {
          try {
            const response = await Utils.catalogApiHttp.updateProductsBulk(catalogApiHttp[website], batch);
            if (!response.ok) {
              messages.push(`[!!!] Batch update failed! ${JSON.stringify(response.data)}`);
            }
          } catch (err) {
            messages.push(`[!!!] Batch update failed! ${JSON.stringify(err)}`);
          }
        }
      }

      res(messages);
    });
  }

  /**
   * Return help message.
   */
  static help() {
    return CommandIdentifier.toUpperCase() + "\n" + "Import values for best buy.";
  }
}

exports.command = ImportBestBuyCommand;

exports.name = CommandIdentifier;
