// backend/server.js

const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const cors = require("cors");
const path = require("path");

// Load environment variables from .env file.
dotenv.config({ path: path.join(__dirname, "../.env") });

// Connect to the database.
connectDB();

const app = express();

// --- Middleware ---
// IMPORTANT: express.json() should generally come AFTER express.raw() IF raw body is needed for *all* JSON routes.
// However, since we apply express.raw() *specifically* to the webhook route in airdropRoutes,
// express.json() can stay here for general API endpoints.
app.use(express.json());

// --- CORS Configuration ---
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

// --- Static File Serving (FIRST, after core middleware) ---
app.use(
  (req, res, next) => {
    console.log(
      `[Static File Middleware Attempt] Request for: ${req.originalUrl}`,
    );
    next();
  },
  express.static(path.join(__dirname, "..")),
);

// --- API Routes (After static, before specific HTML routes or catch-all) ---
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const userRoutes = require("./routes/userRoutes");
const airdropRoutes = require("./routes/airdropRoutes"); // Correct import

app.use(
  "/api/auth",
  (req, res, next) => {
    console.log(`[API Route Handler] Processing /api/auth${req.url}`);
    next();
  },
  authRoutes,
);
app.use(
  "/api/admin",
  (req, res, next) => {
    console.log(`[API Route Handler] Processing /api/admin${req.url}`);
    next();
  },
  adminRoutes,
);
app.use(
  "/api/users",
  (req, res, next) => {
    console.log(`[API Route Handler] Processing /api/users${req.url}`);
    next();
  },
  userRoutes,
);
app.use(
  "/api/airdrop",
  (req, res, next) => {
    // Mount airdrop routes
    console.log(`[API Route Handler] Processing /api/airdrop${req.url}`);
    next();
  },
  airdropRoutes,
);

// --- Specific HTML Routes (AFTER static, AFTER API, before catch-all) ---
app.get("/verify-email/:token", (req, res) => {
  console.log(
    `[Explicit HTML Route] Serving verify-email.html for: ${req.originalUrl}`,
  );
  res.sendFile(path.join(__dirname, "..", "verify-email.html"));
});

app.get("/reset-password/:token", (req, res) => {
  console.log(
    `[Explicit HTML Route] Serving reset-password.html for: ${req.originalUrl}`,
  );
  res.sendFile(path.join(__dirname, "..", "reset-password.html"));
});

// --- Catch-all Route for Client-Side Routing (LAST) ---
app.get("*", (req, res) => {
  console.warn(
    `[CATCH-ALL HIT - FALLBACK] Request for: ${req.originalUrl}. Serving index.html.`,
  );
  res.sendFile(path.join(__dirname, "..", "index.html"));
});

// Basic Error handling middleware
app.use((err, req, res, next) => {
  console.error("Global Error Handler:", err.stack);
  res.status(500).send("Something broke on the server!");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
