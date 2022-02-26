const app = require("express")();
const routes = require("./routes");
require("dotenv").config();


app.use("/", routes);
module.exports = app;