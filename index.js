const app = require("express")();
const routes = require("./routes");
const { redisMiddleware, httpsRedirect } = require("./middlewares");
const { redisClient } = new (require("./db/RedisConnection"))();
const ArbitrageTracker = require("./classes/ArbitrageTracker");
const arbitrageTracker = new ArbitrageTracker();

app.enable("trust proxy");
app.use(httpsRedirect);
app.use("/", (req, res, next) => redisMiddleware(req, res, next, {redisClient, combinedPricesData: arbitrageTracker.combinedPricesData}), routes);

async function initialize() {
  await redisClient.json.set("data", ".", {combinedPricesData: "Initializing..."});
  await arbitrageTracker.wazirx.buildInfo();
  await arbitrageTracker.binance.buildInfo();
  arbitrageTracker.modelCombinedPricesData();
  await redisClient.json.set("data", ".", { combinedPricesData: arbitrageTracker.combinedPricesData, binance: arbitrageTracker.binance, wazirx: arbitrageTracker.wazirx});
}

async function update(){
  await arbitrageTracker.updateCombinedPricesData();
  await redisClient.json.set("data", ".", { combinedPricesData: arbitrageTracker.combinedPricesData, binance: arbitrageTracker.binance, wazirx: arbitrageTracker.wazirx, arbitrageData: arbitrageTracker.arbitrageData });
  console.log("Updated");
}

async function start(){
  await initialize();
  console.log("Arbitrage Tracker started");
  await update();
  setInterval(update, 5000);
}

start();

//debug
// app.get("/transferrableCoins", (req, res) => res.send(arbitrageTracker.binance));
// app.get("/binanceTickers", (req, res) => res.send(arbitrageTracker.combinedPricesData));
// app.get("/wazirxTickers", (req, res) => res.send(arbitrageTracker.combinedPricesData));
app.get("/arbitrageData", (req, res) => res.send(arbitrageTracker.arbitrageData));


module.exports = app;
