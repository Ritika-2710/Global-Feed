/**
 * ============================================================
 *  QUERY RESOLVERS
 * ============================================================
 *  RESOLVER SIGNATURE: (parent, args, context, info)
 *
 *  parent  → The resolved value of the PARENT type.
 *             For root Query fields, parent is undefined/null.
 *             For nested fields (like User.posts), parent = the User object.
 *
 *  args    → Object of all arguments passed in the query.
 *             e.g. for user(id: "123"), args = { id: "123" }
 *
 *  context → The shared object built by your context function.
 *             Contains: currentUser, db, loaders
 *
 *  info    → AST metadata (field name, schema, path).
 *             You mostly won't need this unless doing advanced optimisations.
 * ============================================================
 */

const { GraphQLError } = require("graphql");

const queryResolvers = {
  Query: {
    /**
     * me — "Who am I?"
     * Returns the currently authenticated user or null.
     * Note: we DON'T throw if not authenticated — just return null.
     * The client checks if `me` is null to determine auth state.
     */
    me: (parent, args, context) => {
      // context.currentUser was set by the context function (decoded from JWT)
      return context.currentUser; // null if not logged in
    },

    /**
     * users — Get all users
     * Public: no authentication required.
     */
    users: (parent, args, context) => {
      return context.db.users.findAll();
    },

    /**
     * user(id: ID!) — Get a single user
     */
    user: (parent, args, context) => {
      const user = context.db.users.findById(args.id);

      if (!user) {
        /**
         * GraphQLError — the proper way to throw errors in GraphQL.
         * The `extensions` object lets you attach custom metadata.
         * The client reads error.extensions.code to handle errors properly.
         *
         * Common error codes (convention, not enforced by spec):
         *   UNAUTHENTICATED  — not logged in
         *   FORBIDDEN        — logged in but not allowed
         *   NOT_FOUND        — resource doesn't exist
         *   BAD_USER_INPUT   — invalid input data
         */
        throw new GraphQLError(`User with ID "${args.id}" not found`, {
          extensions: { code: "NOT_FOUND" },
        });
      }

      return user;
    },

    /**
     * posts — Get all published posts
     * Public: no authentication required.
     */
    posts: (parent, args, context) => {
      return context.db.posts.findAll({ published: true });
    },

    /**
     * post(id: ID!) — Get a single post
     */
    post: (parent, args, context) => {
      const post = context.db.posts.findById(args.id);

      if (!post) {
        throw new GraphQLError(`Post with ID "${args.id}" not found`, {
          extensions: { code: "NOT_FOUND" },
        });
      }

      return post;
    },

    /**
     * comments(postId: ID!) — Get all comments for a post
     */
    comments: (parent, args, context) => {
      return context.db.comments.findByPost(args.postId);
    },
  },

  // ── FIELD-LEVEL RESOLVERS ─────────────────────────────────
  // These run when GraphQL needs to resolve a specific field
  // on a non-root type.
  //
  // DEFAULT RESOLVER BEHAVIOUR:
  // If you omit a resolver, GraphQL uses: (parent) => parent[fieldName]
  // So for simple properties (id, title, body), you don't need resolvers.
  // You ONLY write field resolvers when the data needs transformation.

  User: {
    /**
     * User.posts — resolve all posts written by this user
     *
     * parent here is the User object from the store.
     * We use parent.id (the user's id) to filter posts.
     */
    posts: (parent, args, context) => {
      return context.db.posts.findByAuthor(parent.id);
    },
  },

  Post: {
    /**
     * Post.author — resolve the User who wrote this post
     *
     * parent is the Post object. parent.authorId is a foreign key.
     *
     * ⚡ KEY MOMENT: Instead of db.users.findById (direct lookup),
     * we use context.loaders.userLoader.load(id).
     *
     * DataLoader collects ALL authorId calls happening in the same
     * event-loop tick (e.g., from 10 posts) and fires ONE batch call.
     * Check your console for: "🔵 [DataLoader] Batching N user lookups"
     */
    author: (parent, args, context) => {
      return context.loaders.userLoader.load(parent.authorId);
    },

    /**
     * Post.comments — resolve all comments on this post
     */
    comments: (parent, args, context) => {
      return context.db.comments.findByPost(parent.id);
    },
  },

  Comment: {
    /**
     * Comment.author — DataLoader used here too
     * All comment authors in a query are batched together.
     */
    author: (parent, args, context) => {
      return context.loaders.userLoader.load(parent.authorId);
    },

    /**
     * Comment.post — resolve the post this comment belongs to
     */
    post: (parent, args, context) => {
      return context.db.posts.findById(parent.postId);
    },
  },
};

module.exports = { queryResolvers };
