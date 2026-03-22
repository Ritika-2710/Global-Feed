import { gql } from "@apollo/client";

export const POST_CREATED = gql`
  subscription OnPostCreated {
    postCreated {
      id
      title
      body
      published
      createdAt
      author {
        id
        username
      }
      comments {
        id
      }
    }
  }
`;

export const COMMENT_ADDED = gql`
  subscription OnCommentAdded($postId: ID!) {
    commentAdded(postId: $postId) {
      id
      body
      createdAt
      author {
        id
        username
      }
    }
  }
`;
