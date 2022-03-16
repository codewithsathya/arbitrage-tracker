const Binance = require("./Binance");
const Wazirx = require("./Wazirx");
const binance = new Binance();
const wazirx = new Wazirx();
class ArbitrageTracker {
  binanceTickers = null;
  wazirxTickers = null;

  commonTickersData = null;

  async setTickers() {
    try {
      this.binanceTickers = await binance.getMappedTickers();
      this.wazirxTickers = await wazirx.getMappedTickers();
    } catch (error) {
      console.error("Error at getting tickers", error);
    }
  }

  async updateTickers(){
    this.setTickers();
  }

  
}

module.exports = ArbitrageTracker;
