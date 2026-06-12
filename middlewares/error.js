const MyError = require("../helpers/errors");

const handleError = async (err, req, res, _next) => {
  console.log(err);

  if (err instanceof MyError) {
    return res.status(err.code).json(err);
  }

  if (err.statusCode) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  res.status(500).json({
    message: err.message || "Internal server error",
  });
};

module.exports = handleError;
