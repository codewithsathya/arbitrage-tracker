const Binance = require("./Binance");
const Wazirx = require("./Wazirx");
const binance = new Binance();
const wazirx = new Wazirx();
class ArbitrageTracker {
  binanceTickers = null;
  wazirxTickers = null;

  async setTickers() {
    try {
      this.binanceTickers = await binance.getMappedTickers();
      this.wazirxTickers = await wazirx.getMappedTickers();
      console.log(this.binanceTickers, this.wazirxTickers);
    } catch (error) {
      console.error("Error at getting tickers", error);
    }
  }
}

module.exports = ArbitrageTracker;
