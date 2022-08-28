import Hoek from "@hapi/hoek";
import Routes from "./routes/index";
import Commands from "./commands/index";
import Services from "./services/index";

/**
 * Default config
 * @type {{}}
 */
const internals = {
  defaults: {
    config: {
      services: {
        axFtp: {
          host: "127.0.0.1",
          username: "ftp",
          password: "ftp",
          secure: false,
          sslOptions: {},
        },
      },
    },
  },
};

/**
 * Log tag.
 */
const LogTag = "DataTransformerPlugin";

/**
 * Log message in a pretty way.
 * @param {string} type
 * @param {string} message
 */
const LogMessage = (type, message) => {
  console[type](type.toUpperCase(), [LogTag], message);
};

/**
 * Exported plugin.
 */
exports.plugin = {
  register: async (server, options) => {
    const settings = Hoek.applyToDefaults(internals.defaults.config, options);
    server.decorate("server", "globalSettings", settings);
    // based on context, push commands or routes
    if (global.context === "commands") {
      LogMessage("info", "Injecting commands");
      Commands.register(server);
    } else {
      LogMessage("info", "Injecting routes");
      Routes.collect(server);
    }

    // inject services
    LogMessage("info", "Injecting services");
    await Services.inject(server, settings.services);

    LogMessage("info", "Registered plugin");
  },
  pkg: require("../package.json"),
};
