/**
 * ============================================================
 *  IN-MEMORY DATA STORE
 * ============================================================
 *  In a real app, you'd replace these arrays with Prisma / MongoDB calls.
 *  Here we use plain JS arrays so you can focus on GraphQL concepts
 *  without any database setup.
 *
 *  Think of this file as your "fake database".
 * ============================================================
 */

const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs");

// ── Seed data ──────────────────────────────────────────────
// Pre-hashed password for "password123"
const SEED_PASSWORD = bcrypt.hashSync("password123", 10);

const users = [
  {
    id: "user-1",
    username: "alice",
    email: "alice@example.com",
    password: SEED_PASSWORD,
    createdAt: new Date("2024-01-01").toISOString(),
  },
  {
    id: "user-2",
    username: "bob",
    email: "bob@example.com",
    password: SEED_PASSWORD,
    createdAt: new Date("2024-01-02").toISOString(),
  },
];

const posts = [
  {
    id: "post-1",
    title: "Getting Started with GraphQL",
    body: "GraphQL is a query language for APIs and a runtime for executing those queries. Unlike REST, the client asks for exactly what it needs.",
    authorId: "user-1",
    published: true,
    createdAt: new Date("2024-01-10").toISOString(),
  },
  {
    id: "post-2",
    title: "Why Apollo Server is awesome",
    body: "Apollo Server 4 makes it incredibly easy to build a production-ready GraphQL API on top of any Node.js framework.",
    authorId: "user-2",
    published: true,
    createdAt: new Date("2024-01-15").toISOString(),
  },
];

const comments = [
  {
    id: "comment-1",
    body: "Great introduction! Really helped me understand the basics.",
    postId: "post-1",
    authorId: "user-2",
    createdAt: new Date("2024-01-11").toISOString(),
  },
  {
    id: "comment-2",
    body: "Totally agree — the DX with Apollo is fantastic.",
    postId: "post-2",
    authorId: "user-1",
    createdAt: new Date("2024-01-16").toISOString(),
  },
];

// ── CRUD helpers ───────────────────────────────────────────
// These functions simulate what a real DB client would do.

const db = {
  // ── Users ────────────────────────────────────────────────
  users: {
    findAll: () => users,

    findById: (id) => users.find((u) => u.id === id),

    findByEmail: (email) => users.find((u) => u.email === email),

    findManyByIds: (ids) => {
      /**
       * DATALOADER BATCH FUNCTION use-case:
       * DataLoader calls this with an *array* of IDs collected from
       * multiple resolvers in the same tick.
       * We return results in the SAME ORDER as the input ids.
       */
      return ids.map((id) => users.find((u) => u.id === id));
    },

    create: ({ username, email, password }) => {
      const user = {
        id: uuidv4(),
        username,
        email,
        password,
        createdAt: new Date().toISOString(),
      };
      users.push(user);
      return user;
    },
  },

  // ── Posts ─────────────────────────────────────────────────
  posts: {
    findAll: ({ published } = {}) => {
      if (published !== undefined) {
        return posts.filter((p) => p.published === published);
      }
      return posts;
    },

    findById: (id) => posts.find((p) => p.id === id),

    findByAuthor: (authorId) => posts.filter((p) => p.authorId === authorId),

    create: ({ title, body, authorId }) => {
      const post = {
        id: uuidv4(),
        title,
        body,
        authorId,
        published: true,
        createdAt: new Date().toISOString(),
      };
      posts.push(post);
      return post;
    },

    update: (id, updates) => {
      const idx = posts.findIndex((p) => p.id === id);
      if (idx === -1) return null;
      Object.assign(posts[idx], updates);
      return posts[idx];
    },

    delete: (id) => {
      const idx = posts.findIndex((p) => p.id === id);
      if (idx === -1) return null;
      const [deleted] = posts.splice(idx, 1);
      // Clean up orphaned comments too
      const orphanedIndexes = comments
        .map((c, i) => (c.postId === id ? i : -1))
        .filter((i) => i !== -1)
        .reverse();
      orphanedIndexes.forEach((i) => comments.splice(i, 1));
      return deleted;
    },
  },

  // ── Comments ──────────────────────────────────────────────
  comments: {
    findAll: () => comments,

    findByPost: (postId) => comments.filter((c) => c.postId === postId),

    findByAuthor: (authorId) =>
      comments.filter((c) => c.authorId === authorId),

    create: ({ body, postId, authorId }) => {
      const comment = {
        id: uuidv4(),
        body,
        postId,
        authorId,
        createdAt: new Date().toISOString(),
      };
      comments.push(comment);
      return comment;
    },
  },
};

module.exports = { db };
