/**
 * ============================================================
 *  RESOLVER MAP — INDEX
 * ============================================================
 *  The resolver map must match the SHAPE of your schema exactly.
 *  We split resolvers into separate files for clarity and merge them here.
 *
 *  Apollo Server accepts: { Query: {...}, Mutation: {...}, TypeName: {...} }
 *  Spread operator merges all resolver objects into one flat map.
 * ============================================================
 */

const { queryResolvers } = require("./queries");
const { mutationResolvers } = require("./mutations");
const { subscriptionResolvers } = require("./subscriptions");

/**
 * Custom scalar: DateTime
 * We handle it as a passthrough (ISO string) — the serialize/parseValue
 * functions just return the value as-is since we store ISO strings.
 * In production you'd use a library like graphql-scalars for proper validation.
 */
const dateTimeScalar = {
  DateTime: {
    serialize: (value) => value, // DB → client: return as-is
    parseValue: (value) => value, // client → server: return as-is
    parseLiteral: (ast) => ast.value, // inline literal in query
  },
};

const resolvers = {
  ...dateTimeScalar,
  ...queryResolvers,
  ...mutationResolvers,
  ...subscriptionResolvers,
};

module.exports = { resolvers };
