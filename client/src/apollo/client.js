import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  split,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { createClient } from "graphql-ws";
import { getMainDefinition } from "@apollo/client/utilities";

// ── 1. HTTP Link (Queries & Mutations) ───────────────────
// Connects to the Express backend.
const httpLink = new HttpLink({
  uri: "http://localhost:4000/graphql",
});

// ── 2. Auth Link ─────────────────────────────────────────
// Middleware that attaches the JWT token from localStorage
// to every HTTP request.
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem("token");
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    },
  };
});

// ── 3. WebSocket Link (Subscriptions) ────────────────────
// Connects to the graphql-ws server.
const wsLink = new GraphQLWsLink(
  createClient({
    url: "ws://localhost:4000/graphql",
    // Pass token for WS connection params (similar to HTTP headers)
    connectionParams: () => {
      const token = localStorage.getItem("token");
      return {
        authorization: token ? `Bearer ${token}` : "",
      };
    },
  })
);

// ── 4. Split Link ────────────────────────────────────────
// The split link routes the request to either WS or HTTP.
// If the operation is a subscription -> use wsLink
// Otherwise (query, mutation) -> use authLink.concat(httpLink)
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === "OperationDefinition" &&
      definition.operation === "subscription"
    );
  },
  wsLink,
  authLink.concat(httpLink) // HTTP requests get the auth headers
);

// ── 5. Create Apollo Client ──────────────────────────────
export const client = new ApolloClient({
  link: splitLink,
  // InMemoryCache normalizes data by ID and __typename.
  // It's the brain of Apollo Client.
  cache: new InMemoryCache({
    // Customization for cache policies can go here
    typePolicies: {
      Query: {
        fields: {
          // E.g., merge logic for pagination
        },
      },
    },
  }),
});
