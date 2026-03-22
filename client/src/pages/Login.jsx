import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { useNavigate, Link } from "react-router-dom";
import { LOGIN_USER } from "../graphql/mutations";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  // useMutation returns:
  // 1. The trigger function (loginMutation)
  // 2. An object with { data, loading, error }
  const [loginMutation, { loading, error }] = useMutation(LOGIN_USER, {
    onCompleted: (data) => {
      // ── Successful login ──────────────────────────────────
      // data.login contains the AuthPayload { token, user }
      // We pass this to our AuthContext
      login(data.login.token, data.login.user);
      navigate("/");
    },
    onError: (err) => {
      // Apollo Client automatically catches GraphQL errors
      console.error("Login failed:", err);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Execute the mutation with input variables
    loginMutation({ variables: { email, password } });
  };

  return (
    <div className="auth-container">
      <h2>Log in to your account</h2>
      
      {/* 
        Error Display: 
        We read error.message (from the GraphQLError thrown on the server) 
      */}
      {error && <div className="error-box">{error.message}</div>}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary full-width">
          {loading ? "Logging in..." : "Log In"}
        </button>
      </form>

      <p className="auth-switch">
        Don't have an account? <Link to="/register">Register here</Link>
      </p>
    </div>
  );
}
