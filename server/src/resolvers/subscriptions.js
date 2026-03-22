/**
 * ============================================================
 *  SUBSCRIPTION RESOLVERS
 * ============================================================
 *  Subscriptions are real-time event streams over WebSocket.
 *  Unlike queries/mutations (HTTP), subscriptions stay open.
 *
 *  HOW IT WORKS:
 *  1. Client connects via WebSocket and sends a subscription operation.
 *  2. Server registers the client as a subscriber to a PubSub channel.
 *  3. When a mutation publishes an event to that channel,
 *     the server pushes the new data to all active subscribers.
 *  4. Client receives the update without polling.
 *
 *  SUBSCRIPTION RESOLVER SHAPE:
 *  Unlike query/mutation resolvers, subscription resolvers have TWO parts:
 *    { subscribe: fn, resolve: fn }
 *
 *    subscribe → Returns an async iterator (the event stream)
 *    resolve   → Transforms each event payload before sending to client
 *                (optional — defaults to returning the payload as-is)
 * ============================================================
 */

const { GraphQLError } = require("graphql");

const subscriptionResolvers = {
  Subscription: {
    /**
     * postCreated — fires whenever any user creates a new post
     *
     * subscribe: called when a client starts subscribing.
     *   Returns an asyncIterator — the live stream of events.
     *   pubsub.asyncIterator("POST_CREATED") listens on that channel.
     *
     * resolve: called for each event. Returns what the client receives.
     *   payload.postCreated is what mutations.js published.
     */
    postCreated: {
      subscribe: (parent, args, context) => {
        // No auth required — anyone can watch the public post feed
        console.log("🟢 Client subscribed to postCreated");
        return context.pubsub.asyncIterator(["POST_CREATED"]);
      },
      resolve: (payload) => {
        // payload = { postCreated: <post object> }
        // We return just the post object (matches the schema: postCreated: Post!)
        return payload.postCreated;
      },
    },

    /**
     * commentAdded(postId: ID!) — fires when a comment is added to a specific post
     *
     * This uses a PER-TOPIC channel: "COMMENT_ADDED_<postId>"
     * So clients only get events for the post they're watching,
     * not ALL comments across the system.
     */
    commentAdded: {
      subscribe: (parent, { postId }, context) => {
        console.log(`🟢 Client subscribed to commentAdded on post: ${postId}`);

        // Auth optional — keeping it public for demo simplicity
        // In production you might check if the post is private

        return context.pubsub.asyncIterator([`COMMENT_ADDED_${postId}`]);
      },
      resolve: (payload) => {
        return payload.commentAdded;
      },
    },
  },
};

module.exports = { subscriptionResolvers };
