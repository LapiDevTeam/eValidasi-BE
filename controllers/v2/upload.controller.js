const multerv2 = require("multer-md5");
const path = require("path");
const fs = require('fs');
const maxSize = 5 * 1024 * 1024;

function checkFileSizePublicV2(req, res, next) {

  const multerPublic = multerv2({
    dest: path.join("C:", "publicuploads", req.query.programName),
    limits: { fileSize: maxSize },
  });

  const upload = multerPublic.single("file");

  upload(req, res, function (err) {
    if (err) {
      console.log({err});
      return res.status(500).send({
        message: "file max 5mb.",
      });
    }
    next();
  });
}

async function uploadPublicV2(req, res, next) {
  try {
    if (!req.file) {
      return next();
    } else {
      const ext = path.extname(req.file.originalname); // Get file extension
      const oldFn = req.file.path; // Temporary file path
      const fn = req.file.filename + ext; // New file name using md5 hash
      const newFn = path.join(req.file.destination, fn); // Absolute path of the new file
      req.file.newFn = newFn;

      // Rename the file to the new path
      await fs.promises.rename(oldFn, newFn);

      let protocol = req.protocol;
      let host = req.get("host");
      let url = `${protocol}://${host}`;

      const resp = {
        error: false,
        msg: "File berhasil diunggah",
        fileName: fn, // Return the actual file path on the server
      };

      console.log({resp});
      req.body.path = newFn
      return next();
    }


  } catch (error) {
    console.log({error});
    next(error)
  }
}

async function getFileV2(req, res, next) {

  try {
    const { filename = '', programName = 'CatatanTrial', diskPath = 'D:' } = req.query;
    if (!filename || filename === '') throw new Error('File name is required');
    console.log({filename, diskPath, programName});
    const filePath = path.join(
      diskPath,
      `publicuploads/${programName}`,
       filename
    );

    console.log('MASUKASASAS');
    return res.sendFile(filePath);
  } catch (error) {
    console.log({error});
    next(error);
  }
}

module.exports = { checkFileSizePublicV2, uploadPublicV2, getFileV2 };
