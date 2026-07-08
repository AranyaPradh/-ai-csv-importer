const express = require("express");
const cors = require("cors");
const importRoutes = require("./routes/importRoutes");
const errorMiddleware = require("./middlewares/errorMiddleware");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test Route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
  });
});

app.use("/api/imports", importRoutes);

app.use(errorMiddleware);

module.exports = app;
