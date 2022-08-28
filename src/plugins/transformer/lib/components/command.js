class AbstractCommand {
  /**
   * Runner command.
   */
  execute() {
    return new Promise((res, reject) => {
      res("AbstractCommand::run");
    });
  }

  /**
   * Get usage help.
   * @returns {string}
   */
  static help() {
    return "AbstractCommand usage example";
  }
}

exports.class = AbstractCommand;
