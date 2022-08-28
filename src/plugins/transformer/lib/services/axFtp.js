import { Client } from "basic-ftp";

/**
 * Connect to AX Ftp according to options.
 * @param {object} options
 */
exports.connect = async (options) => {
  const client = new Client(options.timeout);
  await client.access({
    host: options.host,
    port: options.port,
    user: options.user,
    password: options.password,
    secure: options.secure,
    secureOptions: options.secureOptions,
  });

  return client;
};
