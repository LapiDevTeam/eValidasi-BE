require("dotenv").config();
const cors = require("cors");
const express = require("express");
const cron = require("node-cron");
const handleError = require("./middlewares/error");
const routers = require("./routers");
const app = express();
const multer = require("multer");
const path = require("path");
const { Kemasan } = require("./models");
const port = process.env.PORT || 3001;

cron.schedule("* * * * *", async () => {
  console.log("xixixixi per menit");
});

app.use(express.static("public"));
app.use(cors());

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, "./public");
//   },
//   filename: (req, file, cb) => {
//     console.log(file);
//     cb(null, Date.now() + path.extname(file.originalname));
//   },
// });

// const upload = multer({ storage: storage });

// app.post("/upload", upload.single("file"), async (req, res) => {
//   try {
//     const { file } = req;
//     const imageUrl = `/${file.filename}`;
//     console.log(imageUrl, "<< imageurl");

//     // Insert into PostgreSQL database using Sequelize
//     const post = await Kemasan.create({
//       gambar: "http://localhost:3001" + imageUrl,
//     });

//     res.status(201).json({
//       message: "File uploaded successfully and saved to the database.",
//       post: post.toJSON(),
//     });
//   } catch (error) {
//     console.error("Error during database insertion:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());
app.use(routers);
app.use(handleError);

app.listen(port, () => {
  console.log(`LAPI eFormulation Record app listening on port ${port}`);
});
