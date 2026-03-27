const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const dotenv = require("dotenv");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

dotenv.config();
const db = require("./db");

const equipmentRoutes = require("./routes/equipment");
const authRoutes = require("./routes/auth");
const reservationRoutes = require("./routes/reservations");
const adminRoutes = require("./routes/admin");
const { notFound, errorHandler } = require("./middleware/error");

const REQUIRED_ENV = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME", "JWT_SECRET"];
const missing = REQUIRED_ENV.filter(key => !process.env[key]);
if (missing.length > 0) {
  console.error("Missing required env vars:", missing.join(", "));
  process.exit(1);
}

const app = express();

// Disable Helmet's default CSP to allow inline scripts used by the frontend pages.
app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : "*"
  })
);
app.use(express.json());
app.use(morgan("dev"));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false
});

app.use("/api/auth", authLimiter);

// Default entry: show the public homepage; login is available at /login.html
app.get("/", (req, res) => res.redirect("/index.html"));

// Allow direct access to homepage when explicitly requested
app.get("/index.html", (req, res, next) => next());

app.use(express.static(path.join(__dirname, "public")));
// Serve Bootstrap assets locally to avoid external CDN dependency
app.use(
  "/bootstrap",
  express.static(path.join(__dirname, "node_modules", "bootstrap", "dist"))
);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/ready", (req, res) => {
  db.query("SELECT 1 AS ok", (err) => {
    if (err) return res.status(503).json({ status: "not_ready" });
    return res.json({ status: "ready" });
  });
});

app.use("/api", equipmentRoutes);
app.use("/api", authRoutes);
app.use("/api", reservationRoutes);
app.use("/api", adminRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = Number(process.env.PORT || 5000);
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
