const app = require("express")();
const routes = require("./routes");
const RedisConnection = require("./db/RedisConnection");
let redisClient = new RedisConnection().redisClient;

app.use(
  "/",
  (req, res, next) => {
    req.redisClient = redisClient;
    next();
  },
  routes
);
module.exports = app;
