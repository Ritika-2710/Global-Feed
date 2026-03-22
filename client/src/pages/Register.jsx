import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { useNavigate, Link } from "react-router-dom";
import { REGISTER_USER } from "../graphql/mutations";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const navigate = useNavigate();
  const { login } = useAuth();

  const [registerMutation, { loading, error }] = useMutation(REGISTER_USER, {
    onCompleted: (data) => {
      login(data.register.token, data.register.user);
      navigate("/");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // For register, we used an "Input Type" in our schema called RegisterInput
    // So we pass the entire form object as $input
    registerMutation({ variables: { input: form } });
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  return (
    <div className="auth-container">
      <h2>Create an account</h2>

      {/* Showcase input validation errors (mapped from BAD_USER_INPUT) */}
      {error && (
        <div className="error-box">
          {error.message}
          {/* We can even read custom extensions added on the server! */}
          {error.graphQLErrors[0]?.extensions?.field && (
            <small style={{ display: "block", marginTop: "4px" }}>
              Field error: {error.graphQLErrors[0].extensions.field}
            </small>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label>Username</label>
          <input
            name="username"
            value={form.username}
            onChange={handleChange}
            required
            autoCapitalize="off"
            autoCorrect="off"
          />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
            minLength={6}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary full-width"
        >
          {loading ? "Creating account..." : "Register"}
        </button>
      </form>

      <p className="auth-switch">
        Already have an account? <Link to="/login">Log in here</Link>
      </p>
    </div>
  );
}
