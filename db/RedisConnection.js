const redis = require("redis");
class RedisConnection {
  status = "not connected";
  constructor(
    host = process.env.REDIS_HOST,
    port = process.env.REDIS_PORT,
    password = process.env.REDIS_PASSWORD
  ) {
    if (process.env.NODE_ENV === "production") {
      this.redisClient = redis.createClient();
    } else {
      let url = `redis://${host}:${port}`;
      this.redisClient = redis.createClient({ url, password });
    }
    this.establishConnection();
  }

  async establishConnection() {
    await this.redisClient.connect();
    this.redisClient.on("connect", () => {
      console.log("Connected to redis");
      this.status = "connected";
    });
    this.redisClient.on("error", () =>
      console.error("Error in establishing connection to redis")
    );
  }
}

module.exports = RedisConnection;
