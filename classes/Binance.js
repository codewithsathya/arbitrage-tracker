const axios = require("axios");

class Binance {
  mainUrl = "https://www.binance.com";
  altUrl = "https://api.binance.com";
  transferrableToWazirxUrl =
    "/bapi/asset/v1/public/asset-service/partner/supported-assets?clientId=aEd4v9Cd90";
  exchangeInfoPath = "/api/v3/exchangeInfo";
  tickersPath = "/api/v3/ticker/bookTicker";
  depthPath = "/api/v3/depth";
  getAllAsset = "/bapi/asset/v2/public/asset/asset/get-all-asset";

  mainQuote = "usdt";
  normalQuotes = new Set(["btc", "eth", "bnb", "xrp", "trx", "tusd", "usdc", "busd", "usdp", "eur", "gbp", "aud", "doge", "ust"]);
  invertedQuotes = new Set(["ngn", "rub", "try", "idrt", "uah", "bidr", "dai", "brl"]);
  ignoredQuotes = new Set(["vai"]);

  transferrableCoins = null;
  info = null;

  async getTickers() {
    const url = this.mainUrl + this.tickersPath;
    let tickers;
    try {
      const {data} = await axios.get(url);
      tickers = data;
    } catch (error) {
      console.error("Error at getting tickers in binance\n", error.message);
    }
    return tickers;
  }

  async getMappedTickers() {
    let tickers;
    try {
      tickers = await this.getTickers();
      let mappedTickers = {};
      for (let pairData of tickers) {
        mappedTickers[pairData["symbol"].toLowerCase()] = {
          buy: parseFloat(pairData["askPrice"]),
          sell: parseFloat(pairData["bidPrice"]),
        };
      }
      return mappedTickers;
    } catch (error) {
      console.error("Error at getting binance mapped tickers\n", error.message);
    }
  }

  async buildInfo() {
    console.time("transferrable");
    this.transferrableCoins = await this.getTransferrableCoins();
    console.timeEnd("transferrable");
    console.time("allCoins");
    let namesInfo = await this.getAllAssetDetails();
    console.timeEnd("allCoins");
    console.time("exchangeInfo");
    this.info = await this.getExchangeInfo();
    console.timeEnd("exchangeInfo");
    for (let base in this.info) {
      this.info[base].name = namesInfo[base].name;
      this.info[base].transferrable = this.transferrableCoins.has(base);
    }
  }

  async getAllAssetDetails() {
    const url = this.mainUrl + this.getAllAsset;
    const { data: allAsset } = await axios.get(url);
    let mappedData = {};
    for (let coin of allAsset.data) {
      mappedData[coin.assetCode.toLowerCase()] = {
        name: coin.assetName,
      };
    }
    return mappedData;
  }

  async updateInfo() {
    await this.buildInfo();
  }

  async getExchangeInfo() {
    const url = this.mainUrl + this.exchangeInfoPath;
    const { data: exchangeInfo } = await axios.get(url);
    return this.mapExchangeInfo(exchangeInfo);
  }

  mapExchangeInfo(exchangeInfo) {
    let mappedData = {};
    const filteredMarkets = exchangeInfo["symbols"].filter(
      (pairData) => pairData["status"] === "TRADING"
    );
    for (let pairData of filteredMarkets) {
      const base = pairData["baseAsset"].toLowerCase();
      const quote = pairData["quoteAsset"].toLowerCase();
      if (this.ignoredQuotes.has(base) || this.ignoredQuotes.has(quote))
        continue;
      if (!mappedData[base]) {
        mappedData[base] = {
          quotes: new Set(),
        };
      }
      mappedData[base].quotes.add(quote);
    }
    return mappedData;
  }

  async getTransferrableCoins() {
    const url = this.mainUrl + this.transferrableToWazirxUrl;
    const { data: transferrableCoins } = await axios.get(url);
    return this.mapTransferrableCoins(transferrableCoins);
  }

  mapTransferrableCoins(transferrableCoins) {
    let mappedData = new Set();
    for (let coin of transferrableCoins.data) {
      mappedData.add(coin.assetCode.toLowerCase());
    }
    return mappedData;
  }
}

module.exports = Binance;
