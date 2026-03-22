/**
 * ============================================================
 *  CONTEXT FUNCTION
 * ============================================================
 *  The context function runs ONCE per request, before any resolver.
 *  Whatever it returns is available as the 3rd argument (context)
 *  in EVERY resolver in that request.
 *
 *  Typical things you put in context:
 *    • Authenticated user (decoded from JWT)
 *    • Database connection / Prisma client
 *    • DataLoader instances (must be per-request!)
 *    • Logger
 *
 *  KEY CONCEPT — Per-request isolation:
 *  Context is created fresh for each request. State never leaks
 *  between different users' requests.
 * ============================================================
 */

const jwt = require("jsonwebtoken");
const { db } = require("./data/store");
const { createLoaders } = require("./dataLoaders");

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-graphql-demo-key";

/**
 * Builds the context object for each GraphQL request.
 *
 * @param {object} req - The Express request object
 * @returns {object} context - Shared across all resolvers for this request
 */
async function buildContext({ req }) {
  // ── 1. Extract JWT from Authorization header ──────────────
  // Client sends: Authorization: Bearer <token>
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7) // Remove "Bearer " prefix
    : null;

  // ── 2. Decode the JWT (if present) ────────────────────────
  let currentUser = null;

  if (token) {
    try {
      // jwt.verify throws if the token is invalid or expired
      const decoded = jwt.verify(token, JWT_SECRET);

      // Look up the full user from our store
      currentUser = db.users.findById(decoded.userId);
    } catch (err) {
      // Token is invalid/expired — we DON'T throw here.
      // We just set currentUser to null.
      // Individual resolvers decide whether to require auth.
      console.log("⚠️  Invalid token:", err.message);
    }
  }

  // ── 3. Return the context object ──────────────────────────
  return {
    // The authenticated user (or null if not logged in)
    currentUser,

    // The in-memory "database"
    db,

    // Fresh DataLoader instances for this request
    // IMPORTANT: DataLoaders must be created per-request!
    loaders: createLoaders(),
  };
}

module.exports = { buildContext, JWT_SECRET };
