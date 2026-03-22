/**
 * ============================================================
 *  SERVER ENTRY POINT
 * ============================================================
 *  This file wires everything together:
 *    1. Express HTTP server
 *    2. Apollo Server (GraphQL over HTTP)
 *    3. graphql-ws (GraphQL over WebSocket for subscriptions)
 *    4. PubSub (in-memory event bus for subscription events)
 *
 *  KEY CONCEPT — Two transports, one schema:
 *    • HTTP  → handles Query and Mutation operations
 *    • WS    → handles Subscription operations
 *  Both use the exact same schema and resolvers.
 * ============================================================
 */

const express = require("express");
const cors = require("cors");
const http = require("http");
const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@apollo/server/express4");
const { makeExecutableSchema } = require("@graphql-tools/schema");
const { WebSocketServer } = require("ws");
const { useServer } = require("graphql-ws/use/ws");
const { PubSub } = require("graphql-subscriptions");

const { typeDefs } = require("./schema");
const { resolvers } = require("./resolvers");
const { buildContext } = require("./context");

// ── PubSub ────────────────────────────────────────────────
// PubSub is an in-memory event bus.
// In production with multiple server instances, replace this with
// Redis PubSub (graphql-redis-subscriptions) so events propagate
// across all instances.
const pubsub = new PubSub();

// ── Build executable schema ────────────────────────────────
// makeExecutableSchema combines typeDefs + resolvers into a
// fully executable schema object. Apollo Server needs this
// when you're using both HTTP and WebSocket transports.
const schema = makeExecutableSchema({ typeDefs, resolvers });

async function startServer() {
  // ── 1. Create Express app ──────────────────────────────
  const app = express();

  // ── 2. Create HTTP server (wraps Express) ──────────────
  // We need the raw http.Server to attach the WebSocket server
  const httpServer = http.createServer(app);

  // ── 3. Create WebSocket Server for subscriptions ───────
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: "/graphql", // Same path as HTTP — clients use ws://localhost:4000/graphql
  });

  // ── 4. Set up graphql-ws ───────────────────────────────
  // graphql-ws is the modern WebSocket protocol for GraphQL subscriptions.
  // It replaces the older subscriptions-transport-ws protocol.
  const serverCleanup = useServer(
    {
      schema,
      // Context for WebSocket connections
      // Note: req doesn't exist for WS. We get connectionParams instead.
      context: async (ctx) => {
        const token = ctx.connectionParams?.authorization || "";
        const { db } = require("./data/store");
        const { createLoaders } = require("./dataLoaders");
        const jwt = require("jsonwebtoken");
        const { JWT_SECRET } = require("./context");

        let currentUser = null;
        if (token) {
          try {
            const decoded = jwt.verify(token, JWT_SECRET);
            currentUser = db.users.findById(decoded.userId);
          } catch (_) { }
        }

        return {
          currentUser,
          db,
          pubsub,
          loaders: createLoaders(),
        };
      },
    },
    wsServer
  );

  // ── 5. Create Apollo Server ────────────────────────────
  const server = new ApolloServer({
    schema,
    // Plugins let you hook into Apollo's request lifecycle
    plugins: [
      // Graceful shutdown: drain WebSocket connections before closing
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
    // formatError runs before errors are sent to the client
    // Use this in PRODUCTION to strip stack traces:
    // formatError: (formattedError) => {
    //   if (formattedError.extensions?.code === 'INTERNAL_SERVER_ERROR') {
    //     return { message: 'Something went wrong.' };
    //   }
    //   return formattedError;
    // },
  });

  // ── 6. Start Apollo Server ────────────────────────────
  await server.start();

  // ── 7. Apply middleware ───────────────────────────────
  app.use(
    "/graphql",
    cors({
      // In production, replace with your actual frontend URL:
      // origin: "https://yourapp.com"
      origin: ["http://localhost:5173", "https://studio.apollographql.com"],
      credentials: true,
    }),
    express.json(),
    expressMiddleware(server, {
      /**
       * context: called for every HTTP request.
       * Injects pubsub into the context so mutations can publish events.
       */
      context: async ({ req }) => {
        const ctx = await buildContext({ req });
        return { ...ctx, pubsub };
      },
    })
  );

  // ── Root route endpoint ─────────────────────────────
  app.get("/", (req, res) => res.send("GraphQL API Server is running!"));

  // ── 8. Health check endpoint ──────────────────────────
  // Apollo Server automatically exposes:
  //   GET /.well-known/apollo/server-health → { status: "pass" }
  // But we add a custom one too:
  app.get("/health", (req, res) => res.json({ status: "ok" }));

  // ── 9. Start listening ────────────────────────────────
  const PORT = process.env.PORT || 4000;

  await new Promise((resolve) => httpServer.listen({ port: PORT }, resolve));

  console.log(`
╔══════════════════════════════════════════════════╗
║         🚀 GraphQL Server Running!               ║
╠══════════════════════════════════════════════════╣
║  HTTP  → http://localhost:${PORT}/graphql          ║
║  WS    → ws://localhost:${PORT}/graphql             ║
║  Open Apollo Sandbox to explore your API!        ║
╚══════════════════════════════════════════════════╝
  `);

  console.log(
    "💡 Tip: Visit https://studio.apollographql.com/sandbox/explorer"
  );
  console.log(`   Set endpoint to: http://localhost:${PORT}/graphql\n`);
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
