import requireDir from "require-dir";

const LogTag = "CommandRegistry";

/**
 * Log message.
 * @param {string} type Console method
 * @param {string} message
 */
const LogMessage = (type, message) => {
  console[type](type.toUpperCase(), [LogTag], message);
};

/**
 * Register commands as server methods.
 * @param {object} server
 */
exports.register = (server) => {
  const commands = requireDir("./");
  Object.keys(commands).forEach((commandId) => {
    try {
      const commandDef = commands[commandId];
      const instance = new commandDef.command();
      server.method(commandDef.name, instance.execute);
      LogMessage("info", `Registered command: ${commandDef.name}`);
    } catch (e) {
      LogMessage("error", e);
    }
  });
};
