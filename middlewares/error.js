const MyError = require("../helpers/errors");

const handleError = async (err, req, res, _next) => {
  if (err instanceof MyError) {
    return res.status(err.code).json(err);
  }
  console.log(err, "<< ERR");

  let statusCode = 500;
  let message = "Internal server error";

  res.status(statusCode).json({
    message,
  });
};

module.exports = handleError;
