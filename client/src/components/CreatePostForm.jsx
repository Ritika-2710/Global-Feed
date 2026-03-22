import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { CREATE_POST } from "../graphql/mutations";
import { GET_POSTS } from "../graphql/queries";

export default function CreatePostForm() {
  const [title, setTitle] = useState("");
  console.log("title called !!")
  const [body, setBody] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  // ── Cache Update on Mutation ────────────────────────────
  // When we create a post, we don't want to make an extra
  // network request to fetch the new list.
  // Instead, we manually write the returned post into Apollo's cache.
  const [createPost, { loading, error }] = useMutation(CREATE_POST, {
    update(cache, { data: { createPost } }) {
      try {
        // 1. Read the existing posts from the cache
        const existingPosts = cache.readQuery({ query: GET_POSTS });

        // 2. If the cache exists, write the new array back
        if (existingPosts && existingPosts.posts) {
          cache.writeQuery({
            query: GET_POSTS,
            data: {
              // Add the new post to the top of the list
              posts: [createPost, ...existingPosts.posts],
            },
          });
        }
      } catch (e) {
        // readQuery throws if cache is empty, which is fine!
        console.warn("Cache empty, skipping update");
      }
    },
    onCompleted: () => {
      // Clear form on success
      setTitle("");
      setBody("");
      setIsExpanded(false);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createPost({
      variables: {
        input: { title, body },
      },
    });
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="btn-primary create-post-fab"
      >
        + Write a Post
      </button>
    );
  }

  return (
    <div className="create-post-container">
      <h3>Create a new post</h3>
      {error && <div className="error-box">{error.message}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div className="form-group">
          <textarea
            placeholder="What's on your mind?"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            rows={4}
          />
        </div>
        <div className="form-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setIsExpanded(false)}
          >
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Publishing..." : "Publish Post"}
          </button>
        </div>
      </form>
    </div>
  );
}
