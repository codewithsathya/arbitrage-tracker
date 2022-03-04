const http = require("../services/httpService");
const crypto = require("crypto");
const { contentType } = require("express/lib/response");
const { contentDisposition } = require("express/lib/utils");

class Link {
  constructor(path, method, contentType, isAuthenticated, queryData) {
    this.path = path;
    this.method = method;
    this.contentType = contentType;
    this.isAuthenticated = isAuthenticated;
    this.queryString = utils.buildQueryString(queryData);
  }
}

class Wazirx {
  baseUrl = "https://x.wazirx.com";
  links = {
    allCoinInfo: new Link("/api/v2/global_configs", "GET", null, false),
    networksInfo: new Link("/api/v3/networks", "GET", null, true),
    tickers: new Link("/api/v2/tickers", "GET", null, false),
    transferrableCoinsToBinance: new Link("/api/v2/thirdparty/asset_transfer/currencies", "GET", null, true)
  };

  info = {};

  constructor(accessKey, secretKey, authKey) {
    if (!accessKey || !secretKey || !authKey) {
      throw new Error("Missing accessKey, secretKey or authKey");
    }
    this.accessKey = accessKey;
    this.secretKey = secretKey;
    this.authKey = authKey;
  }

  buildInfo = async () => {
    const allCoinInfo = await this.sendRequest(this.links.allCoinInfo, {}, {});
    const tickers = await this.sendRequest(this.links.tickers, {}, {});
    let transferrableCoinsToBinance = await this.sendRequest(this.links.transferrableCoinsToBinance, {}, {thirdparty: "binance"});
    transferrableCoinsToBinance = transferrableCoinsToBinance.allowedCurrencies.map(coin => coin.code);
    transferrableCoinsToBinance = new Set(transferrableCoinsToBinance);
    for(let coin of allCoinInfo.currencies) {
      if(coin.category !== "crypto") continue;
      this.info[coin.type] = {
        name: coin.name,
        quotes: new Set(),
        logo: coin.icon.replace("<SIZE>", "84"),
        depositable: coin.disableDeposit === undefined ? true : false,
        withdrawable: coin.disableWithdrawal === undefined ? true : false,
        transferrable: transferrableCoinsToBinance.has(coin.type),
        withdrawFees: coin.withdrawFee,
      }
    }
    for(let pair of Object.values(tickers)) {
      this.info[pair.base_unit].quotes.add(pair.quote_unit);
    }
    for(let coin of Object.keys(this.info)) {
      if(this.info[coin].quotes.size === 0) {
        delete this.info[coin];
      }
    }
  };

  sendRequest = async (linkDetails, data, queryData) => {
    const url = this.baseUrl + linkDetails.path + "?" + utils.buildQueryString(queryData);
    const config = {
      method: linkDetails.method,
      url,
    };
    if (!linkDetails.isAuthenticated) {
      const response = await http(config);
      return response.data;
    }

    const tonce = Date.now();
    const signature = utils.getSignature(this.secretKey, this.getSignatureString(linkDetails, data, queryData, tonce, this.accessKey));
    config.headers = {
      "access-key": this.accessKey,
      signature,
      tonce,
      "content-type": linkDetails.contentType,
    };
    config.data = linkDetails.contentType === "application/x-www-form-urlencoded" ? new URLSearchParams(data) : data;

    let responseData;
    try {
      let response = await http(config);
      responseData = response.data;
    } catch (e) {
      responseData = e.response.data;
    }
    return responseData;
  };

  getSignatureString = (linkDetails, data, queryData, tonce, accessKey) => {
    let signatureString = `${linkDetails.method}|access-key=${accessKey}&tonce=${tonce}|${linkDetails.path}|${utils.buildQueryString(queryData)}`;
    if (data && contentType === "application/x-www-form-urlencoded") {
      signatureString += this.buildQueryString(data);
    }
    return signatureString;
  };
}

const utils = {
  getSignature: (secretKey, signatureString) => {
    return crypto
      .createHmac("sha256", secretKey)
      .update(signatureString)
      .digest("hex")
      .toString();
  },
  sortQueryString: (queryString) => {
    return queryString.split("&").sort().join("&");
  },
  buildQueryString: (obj) => {
    let queryString = "";
    for (let key in obj) {
      queryString += `${key}=${obj[key]}&`;
    }
    return utils.sortQueryString(queryString.slice(0, -1));
  },
};

module.exports = Wazirx;
