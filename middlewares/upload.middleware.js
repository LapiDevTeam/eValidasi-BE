const Multer = require("multer");
const path = require("path");

const maxSize = 100 * 1024 * 1024;

const storagePublic = Multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "publicuploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const storagePublicPdf = Multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "publicuploads/pdf/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const multerPublic = Multer({
  storage: storagePublic,
  limits: { fileSize: maxSize },
});

const multerPublicPdf = Multer({
  storage: storagePublicPdf,
  limits: { fileSize: maxSize },
});

function checkFileSizePrivate(req, res, next) {
  const upload = multer.single("file");

  upload(req, res, function (err) {
    console.log("errcheckFileSizePrivate", err);
    if (err) {
      return res.status(500).send({
        message: "Upload failed. Check file size.",
      });
    }
    next();
  });
}

function checkFileSizePublic(req, res, next) {
  const upload = multerPublic.single("file");

  upload(req, res, function (err) {
    console.log("errcheckFileSize", err);
    if (err) {
      return res.status(500).send({
        message: "Upload failed. Check file size.",
      });
    }
    next();
  });
}

function checkFileSizePublicPdf(req, res, next) {
  const upload = multerPublicPdf.single("file");

  upload(req, res, function (err) {
    console.log("errcheckFileSize", err);
    if (err) {
      return res.status(500).send({
        message: "Upload failed. Check file size.",
      });
    }
    next();
  });
}

module.exports = {
  checkFileSizePrivate,
  checkFileSizePublic,
  checkFileSizePublicPdf,
};
