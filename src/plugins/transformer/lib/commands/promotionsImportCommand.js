import CsvToJson from "csvtojson";
import { existsSync } from "fs";
import { isUndefined, union, chunk, isNull } from "underscore";
import * as Utils from "../services/utils";
import { class as AbstractCommand } from "../components/command";

const CommandIdentifier = "ax_promotions_import";

/**
 * promotions CSV reader options.
 */
const promotionsCsvReadOptions = {
  headers: ["websiteId", "promoId", "startDate", "endDate", "promoType", "amount", "sku"],
  noheader: true,
  trim: true,
  delimiter: "|",
};

const { sellers } = Utils;

const sellerMapping = {
  800: "1",
  801: "2",
};

/**
 * Get websiteBySellerId.
 * @param {string} sellerName
 */
const getWebsiteBySellerId = Utils.getWebsiteCodeBySellerId;

/**
 * Batch limit for requests - i.e split promotions into batches with maximum this amount of items.
 */
const batchLimit = !isUndefined(process.env.batchLimit) ? process.env.batchLimit : 600;

/**
 * Batch limit for delete request requests
 */
const batchLimitToDelete = !isUndefined(process.env.batchLimitToDelete) ? process.env.batchLimitToDelete : 300;

const processResponseBatch = 5;

class PromotionsImportCommand extends AbstractCommand {
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
        res(PromotionsImportCommand.help());
        return;
      }

      if (isUndefined(priceAndPromoHttp)) {
        reject("HTTP service could not be loaded.");
        return;
      }

      if (!existsSync(argv.promotions_file)) {
        reject(`Input file does not exist ${argv.promotions_file}`);
        return;
      }

      //Process Promotions
      const promotionsCsvConverter = CsvToJson(promotionsCsvReadOptions);
      const promotionsCsvLines = await promotionsCsvConverter.fromFile(argv.promotions_file);
      messages.push(
        `Have ${promotionsCsvLines.length} lines to parse form regular promotions file: ${argv.promotions_file}`,
      );

      const promotionUpdates = {};

      const processPromotionLine = (line) => {
        if (isUndefined(line.websiteId)) {
          //empty line
          return;
        }

        const sellerId = sellerMapping[line.websiteId];
        if (isUndefined(promotionUpdates[sellerId])) {
          promotionUpdates[sellerId] = {};
        }

        const specialKey =
          line.promoId + line.startDate.split("/").join("-") + line.endDate.split("/").join("-") + "_" + line.promoType;

        if (!isUndefined(promotionUpdates[sellerId][specialKey])) {
          promotionUpdates[sellerId][specialKey].conditions.filter.sku.push(line.sku);
        } else {
          promotionUpdates[sellerId][specialKey] = {
            seller_id: sellerId,
            name: "Promotion imported via transformer API",
            conditions: {
              filter: {
                sku: [line.sku],
              },
              operator: "OR",
            },
            active: true,
            discount_type: line.promoType,
            discount_value: parseFloat(line.amount.replace(",", "")),
            start_date: line.startDate.split("/").join("-"),
            end_date: line.endDate.split("/").join("-"),
            priority: parseInt(line.promoType) + 1,
            external_id: line.promoId,
          };
        }
      };

      promotionsCsvLines.forEach((line) => {
        processPromotionLine(line);
      });

      //process existing promotions
      const promotionsToDelete = {
        [sellers.altex]: [],
        [sellers.mediagalaxy]: [],
      };
      for (const sellerId of Object.keys(promotionUpdates)) {
        const website = getWebsiteBySellerId(parseInt(sellerId));

        if (isUndefined(website)) {
          break;
        }

        const existingPromotionsBulk = await Utils.priceAndPromoHttp.getPromotions(priceAndPromoHttp[website], {
          seller_id: sellerId,
        });

        if (
          !isNull(existingPromotionsBulk.data) &&
          !isUndefined(existingPromotionsBulk.data.data) &&
          !isUndefined(existingPromotionsBulk.data.data.catalog_rules)
        ) {
          let existingPromotions = existingPromotionsBulk.data.data.catalog_rules;

          //get all existing promotions
          let page = 1;
          while (page < existingPromotionsBulk.data.data.metadata.total_pages) {
            page++;
            const promotionsBatch = await Utils.priceAndPromoHttp.getPromotions(priceAndPromoHttp[website], {
              seller_id: sellerId,
              page_no: page,
            });

            if (!isUndefined(promotionsBatch.data.data.catalog_rules)) {
              existingPromotions = union(existingPromotions, promotionsBatch.data.data.catalog_rules);
            }
          }

          for (const existingPromotion of existingPromotions) {
            if (!isUndefined(existingPromotion.external_id)) {
              //promotion from import

              const specialKey =
                existingPromotion.external_id +
                existingPromotion.start_date +
                existingPromotion.end_date +
                "_" +
                existingPromotion.discount_type;
              if (!isUndefined(promotionUpdates[sellerId][specialKey])) {
                //update
                promotionUpdates[sellerId][specialKey].id = existingPromotion.id;
              } else {
                //delete
                promotionsToDelete[sellerId].push(existingPromotion.id);
              }
            }
          }
        }
      }

      //delete outdated promotions
      const deletesCount = {};
      for (const websiteCode of Object.keys(sellers)) {
        deletesCount[sellers[websiteCode]] = Object.keys(promotionsToDelete[sellers[websiteCode]]).length;
      }

      for (const sellerId of Object.keys(promotionsToDelete)) {
        const promotionsPerSeller = promotionsToDelete[sellerId];

        let i = 0;
        let batch = [];
        for (const externalId of promotionsPerSeller) {
          batch.push(externalId);

          if (batch.length === batchLimitToDelete || i + 1 === deletesCount[sellerId]) {
            const website = getWebsiteBySellerId(parseInt(sellerId));
            const response = await Utils.priceAndPromoHttp.deletePromotions(priceAndPromoHttp[website], {
              rule_id: batch,
            });
            if (response.status !== 200) {
              messages.push(`Cannot delete ${batch.length} promotions for website ${website}`);
              return;
            }

            messages.push(`Deleted ${batch.length} promotions(outdated) for website ${website}`);
            batch = [];
          }

          i++;
        }
      }

      //split into batches
      const requests = {};
      const updatesCount = {};
      for (const websiteCode of Object.keys(sellers)) {
        updatesCount[sellers[websiteCode]] = Object.keys(promotionUpdates[sellers[websiteCode]]).length;

        if (updatesCount[sellers[websiteCode]] > 0) {
          requests[sellers[websiteCode]] = [];
        }
      }

      for (const sellerId of Object.keys(promotionUpdates)) {
        const promotionsPerSeller = promotionUpdates[sellerId];

        let i = 0;
        let batch = [];
        for (const externalId in promotionsPerSeller) {
          batch.push(promotionsPerSeller[externalId]);

          if (batch.length === batchLimit || i + 1 === updatesCount[sellerId]) {
            messages.push(
              `A batch of ${batch.length} rules was created for website ${getWebsiteBySellerId(parseInt(sellerId))}`,
            );
            requests[sellerId].push(batch);
            batch = [];
          }

          i++;
        }
      }

      //make a request call for each batch
      for (const sellerId of Object.keys(requests)) {
        const promises = [];
        const website = getWebsiteBySellerId(parseInt(sellerId));
        for (const batch of requests[sellerId]) {
          promises.push(Utils.priceAndPromoHttp.savePromotions(priceAndPromoHttp[website], batch));
        }

        for (const batch of chunk(promises, processResponseBatch)) {
          const responses = await Promise.all(batch);
          for (const response of responses) {
            if (response.status !== 200 && !isUndefined(response.data) && response.data !== null) {
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
        const archiveFilePath = Utils.archiveFile(argv.archive_dir, argv.promotions_file);
        messages.push(`Archived ${argv.promotions_file} under ${archiveFilePath}`);
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
      "--promotions_file - regular promotions input file\n" +
      "--archive_dir - the archive dir if any\n"
    );
  }
}

exports.command = PromotionsImportCommand;

exports.name = CommandIdentifier;
