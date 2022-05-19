class ArbitrageTracker {
  constructor(){
    this.wazirx = new (require("./Wazirx"))(process.env.WAZIRX_ACCESS_KEY, process.env.WAZIRX_SECRET_KEY, process.env.WAZIRX_AUTH_KEY);
    this.binance = new (require("./Binance"))();
  }

  mainQuote = "usdt";
  binanceQuotePrices = {};
  wazirxQuotePrices = {};
  combinedPricesData = {};
  arbitrageData = {};
  threshold = 1;
  showOnlyTransferrable = true;

  async setPriceData(){
    let binanceTickers, wazirxTickers;
    try {
      binanceTickers = await this.binance.getMappedTickers();
      wazirxTickers = await this.wazirx.getMappedTickers();
    } catch (error) {
      console.error("Error at getting tickers", error);
    }
    try {
      this.binanceQuotePrices = await this.binance.getQuotePrices(this.mainQuote, binanceTickers);
      this.wazirxQuotePrices = await this.wazirx.getQuotePrices(this.mainQuote, wazirxTickers);
    } catch (error) {
      console.log("Error at setting tickers WRT main quote", error);
    }
    for(let coin of Object.keys(this.combinedPricesData["binance"])){
      for(let quote of Object.keys(this.combinedPricesData["binance"][coin])){
        this.combinedPricesData["binance"][coin][quote].buy = this.binanceQuotePrices[quote].buy * binanceTickers[coin + quote].buy;
        this.combinedPricesData["binance"][coin][quote].sell = this.binanceQuotePrices[quote].sell * binanceTickers[coin + quote].sell;
      }
    }
    for(let coin of Object.keys(this.combinedPricesData["wazirx"])){
      for(let quote of Object.keys(this.combinedPricesData["wazirx"][coin])){
        this.combinedPricesData["wazirx"][coin][quote].buy = this.wazirxQuotePrices[quote].buy * wazirxTickers[coin + quote].buy;
        this.combinedPricesData["wazirx"][coin][quote].sell = this.wazirxQuotePrices[quote].sell * wazirxTickers[coin + quote].sell;
      }
    }
  }

  modelCombinedPricesData(){
    this.combinedPricesData["binance"] = {};
    this.combinedPricesData["wazirx"] = {};
    for(let coin of Object.keys(this.wazirx.info)){
      if(this.binance.info[coin]){
        for(let quote of this.binance.info[coin].quotes){
          if(coin === "usdt") continue;
          if(!this.combinedPricesData["binance"][coin]){
            this.combinedPricesData["binance"][coin] = {};
          }
          this.combinedPricesData["binance"][coin][quote] = {buy: 0, sell: 0};
        }
        for(let quote of this.wazirx.info[coin].quotes){
          if(coin === "usdt") continue;
          if(!this.combinedPricesData["wazirx"][coin]){
            this.combinedPricesData["wazirx"][coin] = {};
          }
          this.combinedPricesData["wazirx"][coin][quote] = {buy: 0, sell: 0};
        }
      }
    }
  }

  async updateCombinedPricesData(){
    await this.setPriceData();
    await this.setArbitrageData();
  }

  async setArbitrageData(){
    this.arbitrageData = {wazirxToBinance: [], binanceToWazirx: []};
    for(let coin of Object.keys(this.combinedPricesData["wazirx"])){
      for(let wazirxQuote of Object.keys(this.combinedPricesData["wazirx"][coin])){
        for(let binanceQuote of Object.keys(this.combinedPricesData["binance"][coin])){
          let wazirxCoinPriceData = this.combinedPricesData["wazirx"][coin][wazirxQuote];
          let binanceCoinPriceData = this.combinedPricesData["binance"][coin][binanceQuote];
          if(wazirxCoinPriceData.buy < binanceCoinPriceData.sell){
            let profitPercentage = 100 * (binanceCoinPriceData.sell - wazirxCoinPriceData.buy) / wazirxCoinPriceData.buy;
            if(profitPercentage > this.threshold && wazirxCoinPriceData.buy !== 0 && binanceCoinPriceData.sell !== 0){
              this.arbitrageData["wazirxToBinance"].push({
                coin,
                from: "wazirx",
                to: "binance",
                fromQuote: wazirxQuote,
                toQuote: binanceQuote,
                buyPrice: wazirxCoinPriceData.buy,
                sellPrice: binanceCoinPriceData.sell,
                profitPercentage,
                transferrable: this.wazirx.info[coin].transferrable
              })
            }
          }
          if(binanceCoinPriceData.buy < wazirxCoinPriceData.sell){
            let profitPercentage = 100 * (wazirxCoinPriceData.sell - binanceCoinPriceData.buy) / binanceCoinPriceData.buy;
            if(profitPercentage > this.threshold && wazirxCoinPriceData.buy !== 0 && binanceCoinPriceData.sell !== 0){
              this.arbitrageData["binanceToWazirx"].push({
                coin,
                from: "binance",
                to: "wazirx",
                fromQuote: binanceQuote,
                toQuote: wazirxQuote,
                buyPrice: binanceCoinPriceData.buy,
                sellPrice: wazirxCoinPriceData.sell,
                profitPercentage,
                transferrable: this.wazirx.info[coin].transferrable
              })
            }
          }
        }
      }
    }
    if(this.showOnlyTransferrable){
      this.arbitrageData["wazirxToBinance"] = this.arbitrageData["wazirxToBinance"].filter(data => data.transferrable);
      this.arbitrageData["binanceToWazirx"] = this.arbitrageData["binanceToWazirx"].filter(data => data.transferrable);
    }
    this.arbitrageData["wazirxToBinance"].sort((a, b) => b.profitPercentage - a.profitPercentage);
    this.arbitrageData["binanceToWazirx"].sort((a, b) => b.profitPercentage - a.profitPercentage);
  }
}

module.exports = ArbitrageTracker;