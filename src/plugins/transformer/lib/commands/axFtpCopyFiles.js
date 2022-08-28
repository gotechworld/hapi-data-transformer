import { isUndefined, isNull } from "underscore";
import { createWriteStream } from "fs";
import { class as AbstractCommand } from "../components/command";

const CommandIdentifier = "copy_ax_files";

class AxFtpCopyFilesCommand extends AbstractCommand {
  /**
   * Runner command.
   */
  execute() {
    // eslint-disable-next-line prefer-rest-params
    const { argv } = arguments["0"];
    const ftpAxService = this.plugins.transformer.axFtpInstance;

    return new Promise(async (res, reject) => {
      if (!isUndefined(argv.help)) {
        res(AxFtpCopyFilesCommand.help());
        return;
      }

      if (!ftpAxService || isUndefined(ftpAxService) || isNull(ftpAxService)) {
        reject("FTP service could not be resolved");
        return;
      }

      if (isUndefined(argv.input_file) || isUndefined(argv.output_file)) {
        reject("Invalid parameters to command");
        return;
      }

      try {
        const downloadStream = createWriteStream(argv.output_file);
        await ftpAxService.download(downloadStream, argv.input_file);
        downloadStream.end();
        res(`Wrote data from FTP | Input file: ${argv.input_file} | Output file: ${argv.output_file}`);
      } catch (err) {
        reject(err);
      }
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
      "--input_file - input file on FTP server\n" +
      "--output_file - save file on server\n"
    );
  }
}

exports.command = AxFtpCopyFilesCommand;

exports.name = CommandIdentifier;
