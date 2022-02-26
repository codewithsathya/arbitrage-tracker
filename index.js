const app = require("express")();
const routes = require("./routes");
const RedisConnection = require("./classes/RedisConnection");
const redisClient = new RedisConnection().redisClient;

app.use(
  "/",
  (req, res, next) => {
    req.redisClient = redisClient;
    next();
  },
  routes
);
module.exports = app;
