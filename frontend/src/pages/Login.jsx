import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api, { errorMessage } from "../api.js";
import { saveAuth, homeFor } from "../auth.jsx";
import { useToast } from "../toast.jsx";

export default function Login() {
  const navigate = useNavigate();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/auth/login", { email, password });
      const { token, user } = res.data.data;
      saveAuth(token, user);
      toast.success(`Welcome back, ${user.name}`);
      navigate(homeFor(user.role), { replace: true });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="card auth-card">
      <h2>Login</h2>
      <form onSubmit={submit}>
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

        <button className="btn" type="submit">
          Login
        </button>
      </form>

      <p className="muted">
        <Link to="/forgot-password">Forgot password?</Link>
      </p>
      <p className="muted">
        New here? <Link to="/signup">Create Account</Link>
      </p>
    </div>
  );
}
