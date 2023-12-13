require("dotenv").config();

const express = require("express");
const handleError = require("./middlewares/error");
const routers = require("./routers");
const app = express();
const port = process.env.PORT || 3001;
const cors = require("cors");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());
app.use(routers);
app.use(handleError);

app.listen(port, () => {
  console.log(`LAPI eFormulation Record app listening on port ${port}`);
});
