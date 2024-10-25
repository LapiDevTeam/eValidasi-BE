const poppler = require("pdf-poppler");
const Tesseract = require("tesseract.js");
const fs = require("fs");
const fsp = require("fs").promises;
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const path = require("path");
const staticPath = "../publicuploads/pdf";
let imagePaths = [];
// const aaa = require ("../publicuploads")

const deleteImages = async (imagePaths) => {
  try {
    const deletePromises = imagePaths.map((imagePath) => fsp.unlink(imagePath));
    await Promise.all(deletePromises);
    console.log("All images deleted successfully.");
  } catch (error) {
    console.error("Error deleting images:", error);
  }
};

const getImagePaths = async (directoryPath) => {
  try {
    const files = await fsp.readdir(directoryPath);
    const imageFiles = files.filter((file) => file.endsWith(".jpg"));
    const imagePaths = imageFiles.map((file) => path.join(directoryPath, file));
    return imagePaths;
  } catch (error) {
    console.error("Error reading directory:", error);
    return [];
  }
};

const pdfToImages = async (pdfPath, outputDir) => {
  try {
    const opts = {
      format: "jpeg",
      out_dir: outputDir,
      out_prefix: "page",
      page: null,
    };
    await poppler.convert(pdfPath, opts);
    console.log("PDF converted to images");
    return true;
  } catch (error) {
    console.log({ error, msg: "@pdfToImagesHelper" });
    return false;
  }
};

const ocrOnImage = async (imagePath) => {
  const {
    data: { text },
  } = await Tesseract.recognize(imagePath, "eng", {
    logger: (m) => console.log(m),
  });
  return text;
};

const ocrOnMultipleImages = async (imagePaths) => {
  try {
    const ocrPromises = imagePaths.map((imagePath) => {
      return Tesseract.recognize(imagePath, "eng", {
        logger: (m) => console.log(m),
      }).then(({ data: { text } }) => ({ imagePath, text }));
    });

    const results = await Promise.all(ocrPromises);
    const pagesWithQWERTY = results
      .map((result, index) => ({ pageNumber: index + 1, text: result.text }))
      .filter((result) => result.text.includes("PETUNJUK KERJA"))
      .map((result) => result.pageNumber);

    results.forEach((result, index) => {
      console.log(
        `Recognized text from ${result.imagePath} (Page ${index + 1}):`
      );
      console.log(result.text);
    });

    if (pagesWithQWERTY?.length > 0) {
      console.log(
        `"PETUNJUK KERJA" found on page(s): ${pagesWithQWERTY.join(", ")}`
      );
    } else {
      console.log('No pages contain the string "PETUNJUK KERJA".');
    }
    console.log(imagePaths);
    return pagesWithQWERTY;
  } catch (error) {
    console.error("Error during OCR:", error);
  }
};

const ocrOnMultipleImagesV2 = async (imagePaths, region) => {
  try {
    const { x, y, width, height } = region;
    const ocrPromises = imagePaths.map((imagePath) => {
      return Tesseract.recognize(imagePath, "eng", {
        // logger: (m) => console.log(m),
        tessedit_pageseg_mode: "7", // PSM value 7 for single line of text
        rectangle: { left: x, top: y, width: width, height: height },
      }).then(({ data: { text } }) => ({ imagePath, text }));
    });

    const results = await Promise.all(ocrPromises);
    const pagesWithQWERTY = results
      .map((result, index) => ({ pageNumber: index + 1, text: result.text }))
      .filter((result) => !result.text.includes("PROSEDUR"))
      .map((result) => result.pageNumber);

    results.forEach((result, index) => {
      console.log(
        `Not Recognized text from ${result.imagePath} (Page ${index + 1}):`
      );
      // console.log(result.text);
    });

    if (pagesWithQWERTY?.length > 0) {
      console.log(
        `"Landscape" found on page(s): ${pagesWithQWERTY.join(", ")}`
      );
    } else {
      console.log('No Landscape pages found".');
    }

    // console.log(imagePaths);
    return pagesWithQWERTY;
  } catch (error) {
    console.error("Error during OCR:", error);
  }
};
// 8 9 10 17

async function createExamplePDF(outputPath) {
  try {
    const pdfDoc = await PDFDocument.create();
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const totalPages = Math.floor(Math.random() * 5) + 3;

    for (let i = 0; i < totalPages; i++) {
      const page = pdfDoc.addPage([600, 800]);
      const { width, height } = page.getSize();
      const randomText = `Random text on page ${
        i + 1
      }. Lorem ipsum dolor sit amet, consectetur adipiscing elit.`;
      page.drawText(randomText, {
        x: 50,
        y: height - 100,
        size: 14,
        font: timesRomanFont,
        color: rgb(0, 0, 0),
      });

      if (i === 1) {
        page.drawText("This is a distinct page containing the word QWERTY.", {
          x: 50,
          y: height - 150,
          size: 16,
          font: timesRomanFont,
          color: rgb(0, 0, 0),
        });
      }
    }

    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, pdfBytes);
    console.log(`PDF created successfully at ${outputPath}`);
  } catch (error) {
    console.error("Error creating PDF:", error);
  }
}

async function generateAndReadTest(filepdf) {
  console.log("GENERATING IMAGE FILE");
  const resp = await pdfToImages(`${staticPath}/${filepdf}`, `${staticPath}`);
  if (!resp) {
    console.log("masuk sini");
  } else {
    console.log({ resp });
  }
  console.log("GETTING IMAGES FROM PATH");
  let status = null;
  imagePaths = await getImagePaths(staticPath);

  const region = {
    x: 15,
    y: 230,
    width: 500,
    height: 500,
  };

  console.log(imagePaths, "OCR STARTED");
  try {
    const resultOCR = await ocrOnMultipleImages(imagePaths, region);
    console.log("OCR SUCCESSFUL");
    status = true;
    return resultOCR; // Return the resultOCR here
  } catch (err) {
    console.log("OCR ERROR", err);
    status = false;
    return null; // Return null or handle error
  } finally {
    console.log("END OF FUNCT, NOW DELETE.");
    deleteImages(imagePaths);
  }
}

// debug the helpers
// async function run() {
//   try {
//     const coba = await generateAndReadTest('example1.pdf');
//     console.log({ coba });
//   } catch (err) {
//     console.error('Error:', err);
//   }
// }

// run();

module.exports = {
  generateAndReadTest,
  createExamplePDF,
};
