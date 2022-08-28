import Joi from "@hapi/joi";
import Minimist from "minimist";
import Confidence from "confidence";
import { compose } from "@hapi/glue";
import Net from "net";
import { isUndefined } from "underscore";

/**
 * Entrypoint function is used in order to mock a server instance.
 * There is a global variable named `context` which is reused by the transformer registered plugin. When the context
 * is registered as console, in the plugin register method, commands defined under 'commands' folder are also registered
 * as server methods. (https://hapijs.com/tutorials/server-methods)
 *
 * Calling a command:
 * - create a new testCommand js file extending components/command.js (exports.name = 'my_test_command')
 * - call it with: node commands.js --command my_text_command
 */
const entrypoint = async () => {
  // this way we know exactly if commands should be registered under the server instance or not
  global.context = "commands";

  /**
   * Check if port is available.
   * @param {number} port
   */
  const isPortAvailable = (port) => {
    return new Promise((resolve) => {
      // if port is not a number or is not an integet or is out of range block
      if (isNaN(port) || port !== parseInt(port) || port < 0 || port > 65536) {
        throw "Invalid input. Port must be an Integer number between 0 and 65536";
      }

      // do the test
      port = parseInt(port);
      const tester = Net.createServer()
        // catch errors, and resolve false
        // eslint-disable-next-line handle-callback-err
        .once("error", (err) => {
          resolve(false);
        })
        // return true if succeeded
        .once("listening", () => tester.once("close", () => resolve(true)).close())
        .listen(port);
    });
  };

  /**
   * Get random port for running a HTTP server for the current command.
   * @param {number} min
   * @param {number} max
   */
  const randomPort = async (min, max) => {
    let port = -1;
    let found = false;
    do {
      if (max === null) {
        max = min;
        min = 0;
      }

      port = min + Math.floor(Math.random() * (max - min + 1));
      found = await isPortAvailable(port);
    } while (!found);

    return port;
  };

  /**
   * Schema object for validating argv.
   */
  const schema = Joi.object()
    .keys({
      command: Joi.string().max(30).required(),
    })
    .options({ stripUnknown: true });
  const argv = Minimist(process.argv.slice(2));
  schema.validate(argv);

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

  manifest.server.port = await randomPort(10000, 65536);
  const options = { relativeTo: __dirname };
  const server = await compose(manifest, options);
  await server.start();

  server.log(["info"], "Server mock for commands started at: " + server.info.uri);

  try {
    if (isUndefined(server.methods[argv.command])) {
      throw `Server method not found: ${argv.command}`;
    }

    // binding 'server' as root scope for the server method
    const output = await server.methods[argv.command].bind(server)({ argv });
    server.log(["info"], `Executed command ${argv.command}`);
    server.log(["info"], JSON.stringify(output, null, 4));
    process.exit(0);
  } catch (e) {
    server.log(["error"], e);
    process.exit(1);
  }
};

entrypoint();

// global listeners for process
process
  .on("unhandledRejection", (reason, p) => {
    console.error(reason, "Unhandled Rejection at Promise", p);
    process.exit(1);
  })
  .on("uncaughtException", (err) => {
    console.error(err, "Uncaught Exception thrown");
    process.exit(1);
  });
