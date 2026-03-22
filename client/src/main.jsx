import React from 'react'
import ReactDOM from 'react-dom/client'
import { ApolloProvider } from '@apollo/client/react'
import { BrowserRouter } from 'react-router-dom'
import { client } from './apollo/client'
import { AuthProvider } from './context/AuthContext'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* ── ApolloProvider ──────────────────────────────────────
      * This makes the Apollo Client instance available to all
      * React components below it via the useQuery/useMutation hooks.
      */}
    <ApolloProvider client={client}>
      {/* ── AuthProvider ───────────────────────────────────────
        * Custom context for reading/writing the JWT token
        */}
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </ApolloProvider>
  </React.StrictMode>,
)
