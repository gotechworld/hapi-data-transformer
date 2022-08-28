import * as Utils from "../../services/utils";
import { isUndefined, union } from "underscore";
import Boom from "@hapi/boom";
import ResponseValidation from "../../validations/response";
import BundleValidation from "../../validations/bundles";

module.exports = {
  post: {
    handler: async (request, h) => {
      const httpService = request.server.plugins.transformer.httpPriceAndPromoService;

      try {
        const { website } = request.payload;
        const sellerId = Utils.getSellerIdByWebsiteCode(request.payload.website);
        const bundlesPayload = request.payload.bundles;

        const existingBundlesResponse = await Utils.priceAndPromoHttp.getBundles(httpService[website], {
          seller_id: sellerId,
        });
        if (existingBundlesResponse.status === 200) {
          let existingBundles = existingBundlesResponse.data.data.bundle_groups;

          let page = 1;
          while (page < existingBundlesResponse.data.data.metadata.total_pages) {
            page++;
            // eslint-disable-next-line no-shadow
            const existingBundlesResponse = await Utils.priceAndPromoHttp.getBundles(httpService[website], {
              seller_id: sellerId,
              page_no: page,
            });

            if (!isUndefined(existingBundlesResponse.data.data.bundle_groups)) {
              existingBundles = union(existingBundles, existingBundlesResponse.data.data.bundle_groups);
            }
          }

          for (const existingBundle of existingBundles) {
            let matched = false;
            for (const bundlePayload of bundlesPayload) {
              if (bundlePayload.id === existingBundle.external_bundle_id) {
                matched = true;
                break;
              }
            }

            if (!matched) {
              await Utils.priceAndPromoHttp.deleteBundle(httpService[website], existingBundle.external_bundle_id);
            }
          }
        }

        const response = await Utils.priceAndPromoHttp.saveBundles(httpService[website], bundlesPayload);
        if (response.data.status === "error") {
          return h
            .response({
              status: response.data.status,
              message: JSON.stringify(response.data.messages),
            })
            .code(response.status);
        }

        return h
          .response({
            status: "success",
            message: `Performed ${Object.keys(bundlesPayload).length} updates`,
          })
          .code(200);
      } catch (err) {
        return h
          .response({
            status: "error",
            message: `Error occurred: ${err.toString()}`,
          })
          .code(500);
      }
    },
    validate: BundleValidation.bulkBundleRequest,
    response: ResponseValidation,
    description: "POST bundle update",
    notes: "Forwards bundle update to Price&Promo API",
    tags: ["api"],
  },
  delete: {
    handler: async (request, h) => {
      const httpService = request.server.plugins.transformer.httpPriceAndPromoService;

      try {
        const { website } = request.payload;
        const response = await Utils.priceAndPromoHttp.deleteBundle(httpService[website], request.params.id);

        if (response.status === 400) {
          return Boom.badRequest(response.data.messages);
        } else if (response.status === 404) {
          return Boom.notFound(response.data.messages);
        } else if (response.status === 200) {
          return {
            status: "success",
            message: "Performed 1 delete",
          };
        }
      } catch (err) {
        return h
          .response({
            status: "error",
            message: `Error occurred: ${err.toString()}`,
          })
          .code(500);
      }
    },
    validate: BundleValidation.deleteBundleRequest,
    response: ResponseValidation,
    description: "DELETE bundle",
    notes: "Forwards bundle delete to Price&Promo API",
    tags: ["api"],
  },
};
