import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { CREATE_COMMENT } from "../graphql/mutations";
import { GET_POST } from "../graphql/queries";
import { useAuth } from "../context/AuthContext";

export default function CommentForm({ postId }) {
  const [body, setBody] = useState("");
  const { user } = useAuth();

  // ── Optimistic Response ────────────────────────────────
  // Makes the UI feel instantly responsive. We guess what the
  // server will reply with, and Apollo updates the UI BEFORE
  // the network request finishes.
  
  const [createComment, { loading }] = useMutation(CREATE_COMMENT, {
    // 1. We manually tell Apollo how to shape the response
    optimisticResponse: {
      createComment: {
        __typename: "Comment",
        id: "temp-" + Date.now(), // Fake ID
        body,
        createdAt: new Date().toISOString(),
        author: {
          __typename: "User",
          id: user.id || "temp-user-id",
          username: user.username,
        },
      },
    },

    // 2. We update the cache using the provided data (which will
    // first be the optimistic data, then the real data).
    update(cache, { data: { createComment } }) {
      // Read the current post query from the cache
      const cached = cache.readQuery({
        query: GET_POST,
        variables: { id: postId },
      });

      if (cached && cached.post) {
        // Prevent dupes if WebSocket already delivered it
        const exists = cached.post.comments.some(
          (c) => c.id === createComment.id
        );

        if (!exists) {
          cache.writeQuery({
            query: GET_POST,
            variables: { id: postId },
            data: {
              post: {
                ...cached.post,
                comments: [...cached.post.comments, createComment],
              },
            },
          });
        }
      }
    },

    onCompleted: () => setBody(""),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    
    createComment({
      variables: {
        input: { postId, body },
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="comment-form">
      <input
        type="text"
        placeholder="Write a comment..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
      />
      <button type="submit" disabled={loading || !body.trim()} className="btn-primary">
        Post
      </button>
    </form>
  );
}
