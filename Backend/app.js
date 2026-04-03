const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const dotenv = require("dotenv");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");

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

// Behind a proxy (Render/NGINX), trust the first hop so req.ip and rate limiting work correctly.
app.set("trust proxy", 1);

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

// Cookie helper for lightweight auth gate on HTML routes
function getCookie(req, name) {
  const raw = req.headers.cookie;
  if (!raw) return null;
  const match = raw
    .split(";")
    .map(c => c.trim())
    .find(c => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

// Default entry: force login page; homepage only when explicitly requested
app.get("/", (req, res) => res.redirect("/login.html"));

app.get("/index.html", (req, res, next) => next());

// Gate protected HTML pages (currently admin dashboard)
const PROTECTED_HTML = new Set(["/admin.html"]);
app.use((req, res, next) => {
  const pathLower = req.path.toLowerCase();
  if (!PROTECTED_HTML.has(pathLower)) return next();

  const token = getCookie(req, "auth_token");
  if (!token) return res.redirect("/login.html");

  try {
    jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (err) {
    return res.redirect("/login.html");
  }
});

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
