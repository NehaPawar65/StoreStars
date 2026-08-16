import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import api, { errorMessage } from "../api.js";
import { PASSWORD_RE } from "../auth.jsx";
import { useToast } from "../toast.jsx";

export default function ResetPassword() {
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token"); // comes from ?token=... in the reset link

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const submit = async (e) => {
    e.preventDefault();

    if (!PASSWORD_RE.test(newPassword)) {
      return toast.error(
        "Password must be 8-16 characters and include one uppercase letter and one special character"
      );
    }
    if (newPassword !== confirmPassword) {
      return toast.error("New password and confirm password do not match");
    }

    try {
      const res = await api.post("/auth/reset-password", { token, newPassword });
      toast.success(res.data.message);
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  if (!token) {
    return (
      <div className="card auth-card">
        <h2>Reset Password</h2>
        <p className="error">This reset link is missing its token. Please request a new one.</p>
        <p className="muted">
          <Link to="/forgot-password">Request a new reset link</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="card auth-card">
      <h2>Reset Password</h2>
      <p className="muted">Choose a new password for your account.</p>

      <form onSubmit={submit}>
        <label>New Password</label>
        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />

        <label>Confirm New Password</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        <button className="btn" type="submit">
          Reset Password
        </button>
      </form>

      <p className="muted">
        <Link to="/login">Back to login</Link>
      </p>
    </div>
  );
}
