import { useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../api.js";
import { useToast } from "../toast.jsx";

export default function ForgotPassword() {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/auth/forgot-password", { email });
      toast.success(res.data.message);
      setSent(true);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="card auth-card">
      <h2>Forgot Password</h2>
      <p className="muted">Enter your email and we will create a reset link for you.</p>

      <form onSubmit={submit}>
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <button className="btn" type="submit">
          Send Reset Link
        </button>
      </form>

      {sent && (
        <div className="note">
          <b>Where is the link?</b>
          <p>
            This project has no email service connected, so the reset link is printed in the
            <b> backend terminal</b> (the window running <code>npm start</code>). Copy the link
            from there and open it in your browser. It is valid for 15 minutes and works once.
          </p>
        </div>
      )}

      <p className="muted">
        <Link to="/login">Back to login</Link>
      </p>
    </div>
  );
}
