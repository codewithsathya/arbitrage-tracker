const app = require("express")();
const routes = require("./routes");
const RedisConnection = require("./db/RedisConnection");
// const redisClient = new RedisConnection().redisClient;
const Binance = require("./classes/Binance");
const Wazirx = require("./classes/Wazirx");

const accessKey = process.env.WAZIRX_ACCESS_KEY;
const secretKey = process.env.WAZIRX_SECRET_KEY;
const authKey = process.env.WAZIRX_AUTH_KEY;

const wazirx = new Wazirx(accessKey, secretKey, authKey);
const binance = new Binance();

async function initialize() {
  console.time("wazirx");
  await wazirx.buildInfo();
  console.timeEnd("wazirx");
  console.time("binance");
  await binance.buildInfo();
  console.timeEnd("binance");
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
    // req.redisClient = redisClient;
    next();
  },
  routes
);

module.exports = app;
