class ArbitrageTracker {
  constructor(wazirx, binance){
    this.wazirx = wazirx;
    this.binance = binance;
  }

  binanceTickers = null;
  wazirxTickers = null;

  combinedPricesData = {};

  async setTickers() {
    try {
      this.binanceTickers = await this.binance.getMappedTickers();
      this.wazirxTickers = await this.wazirx.getMappedTickers();
    } catch (error) {
      console.error("Error at getting tickers", error);
    }
  }

  async updateTickers(){
    this.setTickers();
  }

  modelCombinedPricesData(){
    for(let key of Object.keys(this.wazirx.info)){
      if(this.binance.info[key]){
        this.combinedPricesData[key] = {
          binance: {},
          wazirx: {}
        };
        for(let quote of this.binance.info[key].quotes){
          this.combinedPricesData[key]["binance"][quote] = {buy: 0, sell: 0};
        }
        for(let quote of this.wazirx.info[key].quotes){
          this.combinedPricesData[key]["wazirx"][quote] = {buy: 0, sell: 0};
        }
      }
    }
  }
}

module.exports = ArbitrageTracker;
