import { useQuery, useSubscription } from "@apollo/client/react";
import { GET_POSTS } from "../graphql/queries";
import { POST_CREATED } from "../graphql/subscriptions";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import CreatePostForm from "../components/CreatePostForm";

export default function Feed() {
  const { user } = useAuth();

  // ── 1. useQuery: Fetch initial data ──────────────────────
  // Runs on component mount. Automatically caches the result.
  const { loading, error, data } = useQuery(GET_POSTS);

  // ── 2. useSubscription: Listen for real-time updates ─────
  // This opens a WebSocket connection to the server.
  // When a POST_CREATED event arrives, we catch it and manually
  // write the new post into Apollo's local cache so UI updates instantly.
  useSubscription(POST_CREATED, {
    onData: ({ data: { data: subData }, client }) => {
      // The event payload (the newly created post)
      const newPost = subData.postCreated;

      // Check if we already have it in cache to avoid duplicates
      // (The user who created the post usually gets it added via mutation cache update already)
      const cached = client.readQuery({ query: GET_POSTS });
      const alreadyExists = cached?.posts.some((p) => p.id === newPost.id);

      if (!alreadyExists && cached) {
        console.log("🔵 Real-time update: Received new post!");
        // Write the fresh data directly into the local cache
        client.writeQuery({
          query: GET_POSTS,
          data: {
            posts: [newPost, ...cached.posts],
          },
        });
      }
    },
  });

  if (loading) return <div className="loader">Loading feed...</div>;
  if (error) return <div className="error-box">Error: {error.message}</div>;

  return (
    <div className="feed-container">
      <div className="feed-header">
        <h1>Global Feed</h1>
        <p className="subtitle">Real-time updates via GraphQL Subscriptions 🔥</p>
      </div>

      {/* Only logged in users can create posts */}
      {user ? (
        <CreatePostForm />
      ) : (
        <div className="info-box">
          <Link to="/login">Log in</Link> to create a post!
        </div>
      )}

      <div className="post-list">
        {data.posts.map((post) => (
          <div key={post.id} className="post-card">
            <Link to={`/post/${post.id}`} className="post-title-link">
              <h3>{post.title}</h3>
            </Link>
            <div className="post-meta">
              <span>By {post.author.username}</span> •{" "}
              <span>{new Date(post.createdAt).toLocaleDateString()}</span> •{" "}
              <span>{post.comments.length} comments</span>
            </div>
            <p className="post-preview">
              {/* Truncate long bodies */}
              {post.body.length > 120
                ? post.body.substring(0, 120) + "..."
                : post.body}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
