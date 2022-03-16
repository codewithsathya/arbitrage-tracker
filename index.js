const app = require("express")();
const routes = require("./routes");
const RedisConnection = require("./db/RedisConnection");
const redisClient = new RedisConnection().redisClient;
const Binance = require("./classes/Binance");
const Wazirx = require("./classes/Wazirx");
const ArbitrageTracker = require("./classes/ArbitrageTracker");

const accessKey = process.env.WAZIRX_ACCESS_KEY;
const secretKey = process.env.WAZIRX_SECRET_KEY;
const authKey = process.env.WAZIRX_AUTH_KEY;

const wazirx = new Wazirx(accessKey, secretKey, authKey);
const binance = new Binance();
const arbitrageTracker = new ArbitrageTracker(wazirx, binance);

async function initialize() {
  await wazirx.buildInfo();
  await binance.buildInfo();
  await arbitrageTracker.setTickers();
  arbitrageTracker.modelCombinedPricesData();
  console.log(arbitrageTracker.combinedPricesData);
  // console.log(binance.info.btc);
  // console.log(wazirx.info.btc);
}

initialize();

app.enable("trust proxy");

app.use(function (request, response, next) {
  if (!request.secure) {
    return response.redirect("https://" + request.headers.host + request.url);
  }
  next();
});

app.use(
  "/",
  (req, res, next) => {
    req.redisClient = redisClient;
    next();
  },
  routes
);

module.exports = app;
