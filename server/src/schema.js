/**
 * ============================================================
 *  GRAPHQL SCHEMA — SDL (Schema Definition Language)
 * ============================================================
 *  The schema is the CONTRACT between server and client.
 *  It defines:
 *    • What types exist
 *    • What fields each type has
 *    • What queries clients can make
 *    • What mutations clients can trigger
 *    • What subscriptions clients can listen to
 *
 *  Triple-quoted strings ("""...""") are SDL descriptions.
 *  They show up automatically in Apollo Sandbox / GraphiQL as docs.
 * ============================================================
 */

const { gql } = require("graphql-tag");

const typeDefs = gql`
  # ─────────────────────────────────────────────────────────────
  # SCALAR TYPES
  # GraphQL ships with: String, Int, Float, Boolean, ID
  # You can also define custom scalars (e.g. DateTime, JSON)
  # ─────────────────────────────────────────────────────────────

  """
  ISO 8601 date-time string, e.g. "2024-01-01T00:00:00.000Z"
  """
  scalar DateTime

  # ─────────────────────────────────────────────────────────────
  # OBJECT TYPES
  # These represent the entities in your domain.
  # ! means the field is non-null (required).
  # [Post!]! means a non-null list of non-null Posts.
  # ─────────────────────────────────────────────────────────────

  """
  A registered user of the platform.
  """
  type User {
    id: ID!
    username: String!
    email: String!
    "All posts written by this user."
    posts: [Post!]!
    createdAt: DateTime!
  }

  """
  A blog post created by a User.
  """
  type Post {
    id: ID!
    title: String!
    body: String!
    "The user who wrote this post."
    author: User!
    "All comments on this post."
    comments: [Comment!]!
    published: Boolean!
    createdAt: DateTime!
  }

  """
  A comment left by a User on a Post.
  """
  type Comment {
    id: ID!
    body: String!
    "The post this comment belongs to."
    post: Post!
    "The user who wrote this comment."
    author: User!
    createdAt: DateTime!
  }

  """
  Returned after a successful register or login.
  Contains the JWT token and the authenticated user.
  """
  type AuthPayload {
    "JWT token — store this in localStorage on the client."
    token: String!
    user: User!
  }

  # ─────────────────────────────────────────────────────────────
  # INPUT TYPES
  # Inputs are like special object types used only in arguments.
  # They keep your mutations clean and type-safe.
  # ─────────────────────────────────────────────────────────────

  """
  Fields required to register a new user.
  """
  input RegisterInput {
    username: String!
    email: String!
    password: String!
  }

  """
  Fields required to create a new post.
  """
  input CreatePostInput {
    title: String!
    body: String!
  }

  """
  Fields that can be updated on a post (all optional).
  """
  input UpdatePostInput {
    title: String
    body: String
    published: Boolean
  }

  """
  Fields required to create a comment.
  """
  input CreateCommentInput {
    postId: ID!
    body: String!
  }

  # ─────────────────────────────────────────────────────────────
  # ROOT TYPES: Query, Mutation, Subscription
  # These are the three "entry points" into your GraphQL API.
  # ─────────────────────────────────────────────────────────────

  """
  All available read operations.
  """
  type Query {
    "Get the currently authenticated user (requires JWT)."
    me: User

    "Get all users."
    users: [User!]!

    "Get a single user by ID."
    user(id: ID!): User

    "Get all published posts, newest first."
    posts: [Post!]!

    "Get a single post by ID."
    post(id: ID!): Post

    "Get all comments for a specific post."
    comments(postId: ID!): [Comment!]!
  }

  """
  All available write operations.
  """
  type Mutation {
    "Register a new user. Returns a JWT token."
    register(input: RegisterInput!): AuthPayload!

    "Log in with email and password. Returns a JWT token."
    login(email: String!, password: String!): AuthPayload!

    "Create a new post. Requires authentication."
    createPost(input: CreatePostInput!): Post!

    "Update your own post. Requires authentication."
    updatePost(id: ID!, input: UpdatePostInput!): Post!

    "Delete your own post. Requires authentication."
    deletePost(id: ID!): Post!

    "Add a comment to a post. Requires authentication."
    createComment(input: CreateCommentInput!): Comment!
  }

  """
  Real-time event streams via WebSocket.
  """
  type Subscription {
    "Fires whenever any user creates a new post."
    postCreated: Post!

    "Fires whenever a new comment is added to a specific post."
    commentAdded(postId: ID!): Comment!
  }
`;

module.exports = { typeDefs };
