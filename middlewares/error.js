const MyError = require("../helpers/errors");

const isDev = process.env.NODE_ENV !== 'production';

const handleError = async (err, req, res, _next) => {
  // Always log full error details to server console.
  console.error('[ERROR]', err);
  if (err.stack) {
    console.error('[STACK]', err.stack);
  }

  if (err instanceof MyError) {
    return res.status(err.code).json({
      ...err,
      ...(isDev ? { stack: err.stack } : {}),
    });
  }

  if (err.statusCode) {
    return res.status(err.statusCode).json({
      message: err.message,
      ...(isDev ? { stack: err.stack } : {}),
    });
  }

  res.status(500).json({
    message: err.message || "Internal server error",
    ...(isDev ? { stack: err.stack } : {}),
  });
};

module.exports = handleError;
