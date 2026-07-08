const errorMiddleware = (error, req, res, next) => {
  let statusCode = error.statusCode || error.status || 500;

  if (error.name === "MulterError" || error.message === "Only CSV files are allowed") {
    statusCode = 400;
  }

  console.error(error);

  res.status(statusCode).json({
    success: false,
    message: error.message || "Internal Server Error",
  });
};

module.exports = errorMiddleware;
