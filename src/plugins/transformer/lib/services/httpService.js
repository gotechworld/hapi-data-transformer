import { create } from "apisauce";
import { Agent as HttpAgent } from "http";
import { Agent as HttpsAgent } from "https";

// Bootstrap clients
class HttpService {
  /**
   * Constructor.
   * @param settings
   * @param credentials
   */
  constructor(settings, credentials) {
    // persist config on instance
    this.settings = settings;
    this.credentials = credentials;

    // http agents
    this._httpAgent = new HttpAgent({ keepAlive: false });
    this._httpsAgent = new HttpsAgent({ keepAlive: false });
  }

  /**
   * Http agent
   * @returns {http.Agent|agent.Agent}
   */
  get httpAgent() {
    return this._httpAgent;
  }

  /**
   * Https agent
   * @returns {https.Agent|Agent}
   */
  get httpsAgent() {
    return this._httpsAgent;
  }

  /**
   * Api Sauce client
   * @returns {ApisauceInstance | *}
   */
  get client() {
    return this.httpClient;
  }

  /**
   * Proxy call to client instance.
   * @param method
   * @param endpoint
   * @param data
   * @param axiosConfig
   * @returns {Promise.<*>}
   */
  async call(method, endpoint = "/", data = {}, axiosConfig = {}, additionalHeaders = {}) {
    const defaultHeaders = {
      "X-Service-Name": this.credentials.name,
      "X-Service-Key": this.credentials.key,
      "User-Agent": "data-transformer-http/1.0.0",
    };
    const httpClient = await create({
      baseURL: this.settings.baseUrl,
      headers: {
        ...defaultHeaders,
        ...additionalHeaders
      },
      httpAgent: this.httpAgent,
      httpsAgent: this.httpsAgent,
      timeout: 15000,
    });
    return httpClient[method](endpoint, data, axiosConfig);
  }
}

module.exports = HttpService;
