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
  minProfitPercentage = 0.8;
  showOnlyTransferrable = true;
  depthDataNeededFor = {wazirxToBinance: new Set(), binanceToWazirx: new Set()};


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
    await this.setProfitAmountData();
  }

  async setProfitAmountData(){
    for(let arbitrageTrade of this.arbitrageData["wazirxToBinance"]){
      this.depthDataNeededFor["wazirxToBinance"].add(`${arbitrageTrade.coin}_${arbitrageTrade.fromQuote}`);
    }
    for(let arbitrageTrade of this.arbitrageData["binanceToWazirx"]){
      this.depthDataNeededFor["binanceToWazirx"].add(`${arbitrageTrade.coin}_${arbitrageTrade.toQuote}`);
    }
    let wazirxToBinanceDepthData = await this.collectDepthData(Array.from(this.depthDataNeededFor["wazirxToBinance"]));
    let binanceToWazirxDepthData = await this.collectDepthData(Array.from(this.depthDataNeededFor["binanceToWazirx"]));

    for(let arbitrageTradeIndex in this.arbitrageData["wazirxToBinance"]){
      let arbitrageTrade = this.arbitrageData["wazirxToBinance"][arbitrageTradeIndex];
      let depthData = wazirxToBinanceDepthData[`${arbitrageTrade.coin}_${arbitrageTrade.fromQuote}`];
      let buyPrice = parseFloat(depthData.asks[0][0]);
      let sellPrice = arbitrageTrade.sellPrice;
      let newProfitPercentage = 100 * (sellPrice - buyPrice) / buyPrice;
      this.arbitrageData["wazirxToBinance"][arbitrageTradeIndex].buyPrice = buyPrice;
      this.arbitrageData["wazirxToBinance"][arbitrageTradeIndex].profitPercentage = newProfitPercentage;
      if(newProfitPercentage < this.threshold){
        this.arbitrageData["wazirxToBinance"][arbitrageTradeIndex] = null;
        continue;
      }
      let profitAmount = 0;
      let totalVolume = 0;
      let totalAmountNeeded = 0;
      for(let depthDataIndex in depthData.asks){
        let depthBuyPrice = parseFloat(depthData.asks[depthDataIndex][0]);
        let volume = parseFloat(depthData.asks[depthDataIndex][1]);
        let depthProfitPercentage = 100 * (sellPrice - depthBuyPrice) / depthBuyPrice;
        if(depthProfitPercentage < this.minProfitPercentage){
          break;
        }
        totalVolume += volume;
        profitAmount += volume * (sellPrice - depthBuyPrice);
        totalAmountNeeded += volume * depthBuyPrice;
      }
      this.arbitrageData["wazirxToBinance"][arbitrageTradeIndex].profitAmount = profitAmount;
      this.arbitrageData["wazirxToBinance"][arbitrageTradeIndex].totalVolume = totalVolume;
      this.arbitrageData["wazirxToBinance"][arbitrageTradeIndex].totalAmountNeeded = totalAmountNeeded;
    }

    for(let arbitrageTradeIndex in this.arbitrageData["binanceToWazirx"]){
      let arbitrageTrade = this.arbitrageData["binanceToWazirx"][arbitrageTradeIndex];
      let depthData = binanceToWazirxDepthData[`${arbitrageTrade.coin}_${arbitrageTrade.toQuote}`];
      let buyPrice = arbitrageTrade.buyPrice;
      let sellPrice = parseFloat(depthData.bids[0][0]);
      let newProfitPercentage = 100 * (sellPrice - buyPrice) / buyPrice;
      this.arbitrageData["binanceToWazirx"][arbitrageTradeIndex].sellPrice = sellPrice;
      this.arbitrageData["binanceToWazirx"][arbitrageTradeIndex].profitPercentage = newProfitPercentage;
      if(newProfitPercentage < this.threshold){
        this.arbitrageData["binanceToWazirx"][arbitrageTradeIndex] = null;
        continue;
      }
      let profitAmount = 0;
      let totalVolume = 0;
      let totalAmountNeeded = 0;
      for(let depthDataIndex in depthData.bids){
        let depthSellPrice = parseFloat(depthData.bids[depthDataIndex][0]);
        let volume = parseFloat(depthData.bids[depthDataIndex][1]);
        let depthProfitPercentage = 100 * (depthSellPrice - buyPrice) / buyPrice;
        if(depthProfitPercentage < this.minProfitPercentage){
          break;
        }
        totalVolume += volume;
        profitAmount += volume * (depthSellPrice - buyPrice);
        totalAmountNeeded += volume * buyPrice;
      }
      this.arbitrageData["binanceToWazirx"][arbitrageTradeIndex].profitAmount = profitAmount;
      this.arbitrageData["binanceToWazirx"][arbitrageTradeIndex].totalVolume = totalVolume;
      this.arbitrageData["binanceToWazirx"][arbitrageTradeIndex].totalAmountNeeded = totalAmountNeeded;
    }
  }

  async collectDepthData(coinPairs){
    let symbols = coinPairs.map(coinPair => {
      let [coin, quote] = coinPair.split("_");
      return `${coin}${quote}`;
    });
    let data = symbols.map(symbol => this.wazirx.getDepth(symbol));
    let depthData = await Promise.all(data);
    let depthDataMap = {};
    for(let i = 0; i < coinPairs.length; i++){
      depthDataMap[coinPairs[i]] = depthData[i]; 
    }
    for(let coinPair of coinPairs){
      let [coin, quote] = coinPair.split("_");
      for(let orderIndex in depthDataMap[coinPair]["asks"]){
        let convertedPrice = parseFloat(depthDataMap[coinPair]["asks"][orderIndex][0]) * this.wazirxQuotePrices[quote].buy;
        depthDataMap[coinPair]["asks"][orderIndex][0] = convertedPrice;
      }
      for(let orderIndex in depthDataMap[coinPair]["bids"]){
        let convertedPrice = parseFloat(depthDataMap[coinPair]["bids"][orderIndex][0]) * this.wazirxQuotePrices[quote].buy;
        depthDataMap[coinPair]["bids"][orderIndex][0] = convertedPrice;
      }
    }
    return depthDataMap;
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