const LEVELS = {
  debug: 0,
  info: 1,
  error: 2,
  critical: 3,
};

export class ConsoleLogger {

  /**
     * ConsoleLogger  constructor.
     * @param logLevel
     */
  constructor(logLevel = "info") {
    this.level = LEVELS[logLevel] || LEVELS.debug;
  }

  /**
     * Logs into console, therefore into docker logs
     *
     * @param tag string
     * @param message string|object
     */
  info(tag, message) {
    if (this.level <= LEVELS.info) {
      console.log(`{"level": "info", "tag": "${tag}", "message": "${message}"}`)
    }
  }

  /**
     * Logs into console, therefore into docker logs
     *
     * @param tag string
     * @param message string|object
     */
  error(tag, message) {
    if (this.level <= LEVELS.error) {
      console.log(`{"level": "error", "tag": ${tag}, "message": "${message}"}`)
    }
  }


}
