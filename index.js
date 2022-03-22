const app = require("express")();
const routes = require("./routes");
const { redisMiddleware, httpsRedirect } = require("./middlewares");
const { redisClient } = new (require("./db/RedisConnection"))();

const wazirx = new (require("./classes/Wazirx"))(process.env.WAZIRX_ACCESS_KEY, process.env.WAZIRX_SECRET_KEY, process.env.WAZIRX_AUTH_KEY);
const binance = new (require("./classes/Binance"))();
const arbitrageTracker = new (require("./classes/ArbitrageTracker"))(wazirx, binance);

app.enable("trust proxy");
app.use(httpsRedirect);
app.use("/", (req, res, next) => redisMiddleware(req, res, next, {redisClient, combinedPricesData: arbitrageTracker.combinedPricesData}), routes);

async function initialize() {
  await redisClient.json.set("data", ".", {combinedPricesData: "Initializing..."});
  await wazirx.buildInfo();
  await binance.buildInfo();
  await arbitrageTracker.setTickers();
  arbitrageTracker.modelCombinedPricesData();
  await redisClient.json.set("data", ".", { combinedPricesData: arbitrageTracker.combinedPricesData });
}

initialize();

module.exports = app;
