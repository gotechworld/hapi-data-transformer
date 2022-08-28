import Boom from "@hapi/boom";
import Confidence from "confidence";
import { compose } from "@hapi/glue";

/**
 * Start an app (server) based on its manifest.
 * @param manifest
 * @param options
 * @returns {Promise.<void>}
 */
const startApp = async (manifest, options) => {
  const server = await compose(manifest, options);
  await server.start();
  server.log(["info"], "Server started at: " + server.info.uri);
};

// load manifest file
const manifest = new Confidence.Store(require("./config/manifest.json")).get("/", {
  env: process.env.NODE_ENV,
  admin: process.env.ADMIN,
});

// hack for CatboxRedis cache driver
const CatboxRedis = require("@hapi/catbox-redis");

for (const key in manifest.server.cache) {
  manifest.server.cache[key].provider.constructor = CatboxRedis;
}

// add better traceability
manifest.server.routes = {
  validate: {
    failAction: (request, h, err) => {
      if (process.env.NODE_ENV === "production") {
        console.error("ValidationError:", err.message);
        throw Boom.badRequest("Invalid request payload input");
      } else {
        console.error(err);
        throw err;
      }
    },
  },
};

// start app
const options = { relativeTo: __dirname };
startApp(manifest, options);

process
  .on("unhandledRejection", (reason, p) => {
    console.error(reason, "Unhandled Rejection at Promise", p);
  })
  .on("uncaughtException", (err) => {
    console.error(err, "Uncaught Exception thrown");
    process.exit(1);
  });
