const express = require("express");
const router = express.Router();

router.get("/", async (req, res) => {
	const {redisClient} = req.app;
	const key = "data";
	let data = await redisClient.json.get(key, {
		path: ".combinedPricesData"
	});
	res.send(data);
});

router.get("/count", async (req, res) => {
	console.log(req);
	const { redisClient } = req.app;
	let count = await redisClient.get("count")
	if(count == null){
		await redisClient.set("count", 1);
	}else{
		await redisClient.set("count", parseInt(count) + 1);
	}
	console.time("get request");
	let value = await redisClient.get("count");
	console.timeEnd("get request");
	res.send(value);
})

module.exports = router;
