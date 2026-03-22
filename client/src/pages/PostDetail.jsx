import { useParams, Link } from "react-router-dom";
import { useQuery, useSubscription } from "@apollo/client/react";
import { GET_POST } from "../graphql/queries";
import { COMMENT_ADDED } from "../graphql/subscriptions";
import { useAuth } from "../context/AuthContext";
import CommentForm from "../components/CommentForm";

export default function PostDetail() {
  const { id } = useParams();
  const { user } = useAuth();

  // ── 1. Fetch Post Data ──────────────────────────────────
  const { loading, error, data, subscribeToMore } = useQuery(GET_POST, {
    variables: { id },
  });

  // ── 2. Listen for Real-Time Comments (alternative pattern) ─
  // We can use the useSubscription hook OR the subscribeToMore function
  // provided by useQuery. Here, we use useSubscription for parity with Feed.
  useSubscription(COMMENT_ADDED, {
    variables: { postId: id }, // Pass variables to subscription
    onData: ({ data: { data: subData }, client }) => {
      const newComment = subData.commentAdded;
      
      const cached = client.readQuery({
        query: GET_POST,
        variables: { id },
      });

      // Avoid duplicates
      const exists = cached?.post?.comments?.some((c) => c.id === newComment.id);

      if (!exists && cached) {
        client.writeQuery({
          query: GET_POST,
          variables: { id },
          data: {
            post: {
              ...cached.post,
              // Append to the end of the comments array
              comments: [...cached.post.comments, newComment],
            },
          },
        });
      }
    },
  });

  if (loading) return <div className="loader">Loading post...</div>;
  if (error) return <div className="error-box">Error: {error.message}</div>;
  if (!data?.post) return <div className="error-box">Post not found.</div>;

  const { post } = data;

  return (
    <div className="post-detail-container">
      <Link to="/" className="back-link">
        &larr; Back to Feed
      </Link>
      
      <article className="full-post">
        <h1>{post.title}</h1>
        <div className="post-meta">
          <span>By {post.author.username}</span> •{" "}
          <span>{new Date(post.createdAt).toLocaleDateString()}</span>
        </div>
        <div className="post-body">{post.body}</div>
      </article>

      <section className="comments-section">
        <h3>Comments ({post.comments.length})</h3>

        {user ? (
          <CommentForm postId={id} />
        ) : (
          <div className="info-box block">
            <Link to="/login">Log in</Link> to join the discussion.
          </div>
        )}

        <div className="comment-list">
          {post.comments.map((comment) => (
            <div key={comment.id} className="comment">
              <div className="comment-header">
                <strong>{comment.author.username}</strong>
                <span className="comment-date">
                  {new Date(comment.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="comment-body">{comment.body}</div>
            </div>
          ))}
          {post.comments.length === 0 && (
            <p className="no-comments">No comments yet. Be the first!</p>
          )}
        </div>
      </section>
    </div>
  );
}
