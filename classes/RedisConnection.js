class RedisConnection {
  constructor(
    host = process.env.HOST,
    port = process.env.PORT,
    password = process.env.PASSWORD
  ) {
    this.redisClient = require("redis").createClient({ host, port, password });
    this.establishConnection();
  }

  establishConnection() {
    this.redisClient.connect();
    this.redisClient.on("connect", () => console.log("Connected to redis"));
    this.redisClient.on("error", () => console.error("Error in establishing connection to redis"));
  }
}

module.exports = RedisConnection;
