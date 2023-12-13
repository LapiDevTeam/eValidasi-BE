class MyError extends Error {
  constructor(code, message, cause) {
    super(message, {
      cause,
    });

    this.code = code;
  }

  toJSON() {
    return {
      message: this.message,
    };
  }
}

module.exports = MyError;
