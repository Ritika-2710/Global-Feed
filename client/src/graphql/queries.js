import { gql } from "@apollo/client";

export const GET_POSTS = gql`
  query GetPosts {
    posts {
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

export const GET_POST = gql`
  query GetPost($id: ID!) {
    post(id: $id) {
      id
      title
      body
      createdAt
      author {
        id
        username
      }
      comments {
        id
        body
        createdAt
        author {
          id
          username
        }
      }
    }
  }
`;
