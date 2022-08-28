import CsvToJson from "csvtojson";
import { existsSync } from "fs";
import { isUndefined, get, chunk } from "lodash";
import * as Utils from "../services/utils";
import { class as AbstractCommand } from "../components/command";

const CommandIdentifier = "ax_resealed_prices_import";

/**
 * resealedPrices CSV reader options.
 */
const resealedPrices = {
  headers: [
    "sku",
    "resealedCode",
    "specialPrice",
    "reason1",
    "reason2",
    "reason3",
    "reason4",
    "reason5",
    "reason6",
    "reason7",
    "reason8",
    "reason9",
    "reason10",
    "reason11",
  ],
  noheader: true,
  trim: true,
  delimiter: "|",
};

const reealedReasons = {
  reason1: 1, // 1 Ambalaj original deschis
  reason2: 2, // 2 Zgarieturi fine
  reason3: 4, // 4 Lipsa ambalaj
  reason4: 8, // 8 Prezinta zgarieturi pe suprafetele lucioase
  reason5: 16, // 16 Prezinta zgarieturi fine pe suprafetele lucioase
  reason6: 32, // 32 Ambalaj original usor deteriorat
  reason7: 64, // 64 Prezinta un pixel defect
  reason8: 128, // 128 Prezinta pana la 5 pixeli defecti
  reason9: 256, // 256 Prezinta urme de utilizare
  reason10: 512, // 512 Folie protectie ecran lipsa
  reason11: 1024, // 1024 Ambalaj original deteriorat
};

/**
 * Local website codes.
 */
const { localWebsites } = Utils;

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

    return new Promise(async (res, reject) => {
      if (!isUndefined(argv.help)) {
        res(PriceImportCommand.help());
        return;
      }

      if (isUndefined(priceAndPromoHttp)) {
        reject("HTTP service could not be loaded.");
        return;
      }

      if (!existsSync(argv.resealed_prices)) {
        reject(`Input file does not exist ${argv.resealed_prices}`);
        return;
      }

      const priceUpdates = {};
      const processPriceLine = (line) => {
        if (isUndefined(line.specialPrice)) {
          return;
        }

        line.specialPrice = line.specialPrice.replace(",", "");

        for (const website of localWebsites) {
          if (isUndefined(priceUpdates[website])) {
            priceUpdates[website] = {};
          }

          const sellerId = getSellerIdByWebsite(website);

          if (isUndefined(line.sku) || isUndefined(line.resealedCode)) {
            continue;
          }

          const resealedCode = line.sku + "-" + line.resealedCode.toUpperCase();

          priceUpdates[website][resealedCode] = get(priceUpdates, [website, line.sku], {});

          if (parseFloat(line.specialPrice) > 0) {
            //calculate resealed reason
            let resealedReason = 0;
            let reasonNumber = 1;
            while (reasonNumber <= 11) {
              if (line[`reason${reasonNumber}`] === "Yes") {
                resealedReason += reealedReasons[`reason${reasonNumber}`];
              }

              reasonNumber++;
            }

            priceUpdates[website][resealedCode][sellerId] = {
              special_price: parseFloat(line.specialPrice),
              parent_sku: line.sku,
            };

            if (resealedReason === 0) {
              resealedReason = null;
            }

            priceUpdates[website][resealedCode][sellerId].resealed_reasons = resealedReason;
          }
        }
      };

      //Process resealed prices
      if (!isUndefined(argv.resealed_prices) && existsSync(argv.resealed_prices)) {
        const resealedPricesCsvConverter = CsvToJson(resealedPrices);
        const resealedPricesCsvLines = await resealedPricesCsvConverter.fromFile(argv.resealed_prices);
        messages.push(
          `Have ${resealedPricesCsvLines.length} lines to parse form regular resealed prices file: ${argv.resealed_prices}`,
        );

        resealedPricesCsvLines.forEach((line) => {
          processPriceLine(line);
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
          promises.push(Utils.priceAndPromoHttp.saveResealedPrices(priceAndPromoHttp[website], batch));
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
        const archiveFilePath = Utils.archiveFile(argv.archive_dir, argv.resealed_prices);
        messages.push(`Archived ${argv.resealed_prices} under ${archiveFilePath}`);
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
      "--resealed_prices - regular resealed prices input file\n" +
      "--archive_dir - the archive dir if any\n"
    );
  }
}

exports.command = PriceImportCommand;

exports.name = CommandIdentifier;
