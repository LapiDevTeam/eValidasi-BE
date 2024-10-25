const Multer = require("multer-md5");

const maxSize = 100 * 1024 * 1024;
// const multer = Multer({
//   dest: "privateuploads/",
//   limits: { fileSize: maxSize },
// });
const multerPublic = Multer({
  dest: "publicuploads/",
  limits: { fileSize: maxSize },
});
const multerPublicPdf = Multer({
  dest: "publicuploads/pdf/",
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
