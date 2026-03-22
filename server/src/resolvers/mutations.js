/**
 * ============================================================
 *  MUTATION RESOLVERS
 * ============================================================
 *  Mutations are write operations: create, update, delete.
 *  They CAN return data (commonly they return the modified object).
 *
 *  AUTH PATTERN:
 *  Protected mutations throw GraphQLError with code UNAUTHENTICATED
 *  if context.currentUser is null. The client catches this and
 *  redirects to login.
 * ============================================================
 */

const { GraphQLError } = require("graphql");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../context");

/**
 * Helper: throws UNAUTHENTICATED error if user is not logged in.
 * Reuse this in any protected resolver.
 */
function requireAuth(context) {
  if (!context.currentUser) {
    throw new GraphQLError("You must be logged in to perform this action.", {
      extensions: {
        code: "UNAUTHENTICATED",
        // The client can check error.extensions.code === "UNAUTHENTICATED"
        // and redirect to the login page automatically.
      },
    });
  }
}

const mutationResolvers = {
  Mutation: {
    /**
     * register — Create a new user account
     *
     * Input validation pattern:
     *   1. Check for duplicates
     *   2. Hash the password (never store plaintext!)
     *   3. Create the user
     *   4. Sign a JWT
     *   5. Return AuthPayload { token, user }
     */
    register: async (parent, { input }, context) => {
      const { username, email, password } = input;

      // ── Validate uniqueness ───────────────────────────────
      const existing = context.db.users.findByEmail(email);
      if (existing) {
        throw new GraphQLError("An account with this email already exists.", {
          extensions: {
            code: "BAD_USER_INPUT",
            field: "email", // Tell the client WHICH field is bad
          },
        });
      }

      if (password.length < 6) {
        throw new GraphQLError("Password must be at least 6 characters.", {
          extensions: { code: "BAD_USER_INPUT", field: "password" },
        });
      }

      // ── Hash password ─────────────────────────────────────
      // bcrypt adds a random salt and hashes. NEVER store plaintext passwords.
      const hashedPassword = await bcrypt.hash(password, 10);

      // ── Create user ───────────────────────────────────────
      const user = context.db.users.create({
        username,
        email,
        password: hashedPassword,
      });

      // ── Sign JWT ──────────────────────────────────────────
      // jwt.sign({ payload }, secret, { options })
      // We embed the userId in the token so the context function
      // can look up the user on subsequent requests.
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
        expiresIn: "7d", // Token expires in 7 days
      });

      return { token, user };
    },

    /**
     * login — Authenticate with email + password
     */
    login: async (parent, { email, password }, context) => {
      // ── Find user ─────────────────────────────────────────
      const user = context.db.users.findByEmail(email);

      // SECURITY: Use the same generic error message for both:
      // "email not found" and "wrong password"
      // This prevents user enumeration attacks.
      if (!user) {
        throw new GraphQLError("Invalid email or password.", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      // ── Compare password ──────────────────────────────────
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        throw new GraphQLError("Invalid email or password.", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      // ── Sign and return JWT ───────────────────────────────
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
        expiresIn: "7d",
      });

      return { token, user };
    },

    /**
     * createPost — Create a new post (auth required)
     *
     * After creating the post, we publish a "postCreated" event
     * to the PubSub system so active subscriptions get notified.
     */
    createPost: (parent, { input }, context, info) => {
      // Guard: must be logged in
      requireAuth(context);

      const { title, body } = input;

      // ── Validate input ─────────────────────────────────────
      if (!title.trim()) {
        throw new GraphQLError("Post title cannot be empty.", {
          extensions: { code: "BAD_USER_INPUT", field: "title" },
        });
      }

      // ── Create post in store ───────────────────────────────
      const post = context.db.posts.create({
        title: title.trim(),
        body: body.trim(),
        authorId: context.currentUser.id, // Set from the verified JWT user
      });

      // ── Publish to subscribers ─────────────────────────────
      // The pubsub object is injected via context (set up in index.js)
      // Any client subscribed to `postCreated` will receive this post.
      context.pubsub.publish("POST_CREATED", { postCreated: post });

      console.log(`✅ Post created by ${context.currentUser.username}: "${post.title}"`);

      return post;
    },

    /**
     * updatePost — Update your own post
     */
    updatePost: (parent, { id, input }, context) => {
      requireAuth(context);

      const post = context.db.posts.findById(id);

      if (!post) {
        throw new GraphQLError(`Post with ID "${id}" not found.`, {
          extensions: { code: "NOT_FOUND" },
        });
      }

      // ── Authorization check ────────────────────────────────
      // Authentication: are you logged in? ✓ (requireAuth above)
      // Authorization:  are you the OWNER? ← check this separately
      if (post.authorId !== context.currentUser.id) {
        throw new GraphQLError("You can only edit your own posts.", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      // Only update fields that were actually provided
      const updates = {};
      if (input.title !== undefined) updates.title = input.title.trim();
      if (input.body !== undefined) updates.body = input.body.trim();
      if (input.published !== undefined) updates.published = input.published;

      return context.db.posts.update(id, updates);
    },

    /**
     * deletePost — Delete your own post
     */
    deletePost: (parent, { id }, context) => {
      requireAuth(context);

      const post = context.db.posts.findById(id);

      if (!post) {
        throw new GraphQLError(`Post with ID "${id}" not found.`, {
          extensions: { code: "NOT_FOUND" },
        });
      }

      if (post.authorId !== context.currentUser.id) {
        throw new GraphQLError("You can only delete your own posts.", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      // Deletes the post AND its orphaned comments (see store.js)
      return context.db.posts.delete(id);
    },

    /**
     * createComment — Add a comment to a post (auth required)
     */
    createComment: (parent, { input }, context) => {
      requireAuth(context);

      const { postId, body } = input;

      // Verify the post exists
      const post = context.db.posts.findById(postId);
      if (!post) {
        throw new GraphQLError(`Post with ID "${postId}" not found.`, {
          extensions: { code: "NOT_FOUND" },
        });
      }

      if (!body.trim()) {
        throw new GraphQLError("Comment body cannot be empty.", {
          extensions: { code: "BAD_USER_INPUT", field: "body" },
        });
      }

      const comment = context.db.comments.create({
        body: body.trim(),
        postId,
        authorId: context.currentUser.id,
      });

      // Publish to subscribers watching this specific post
      // The subscription filter (in subscriptions.js) ensures only
      // clients subscribed to THIS postId receive the event.
      context.pubsub.publish(`COMMENT_ADDED_${postId}`, {
        commentAdded: comment,
      });

      return comment;
    },
  },
};

module.exports = { mutationResolvers };
