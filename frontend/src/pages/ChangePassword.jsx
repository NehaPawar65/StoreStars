import { useState } from "react";
import api, { errorMessage } from "../api.js";
import { PASSWORD_RE } from "../auth.jsx";
import { useToast } from "../toast.jsx";

export default function ChangePassword() {
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();

    if (!PASSWORD_RE.test(form.newPassword)) {
      return toast.error(
        "New password must be 8-16 characters and include one uppercase letter and one special character"
      );
    }
    if (form.newPassword !== form.confirmPassword) {
      return toast.error("New password and confirm password do not match");
    }

    try {
      const res = await api.put("/auth/password", {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      toast.success(res.data.message);
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="card auth-card">
      <h2>Change Password</h2>
      <form onSubmit={submit}>
        <label>Current Password</label>
        <input name="currentPassword" type="password" value={form.currentPassword} onChange={change} required />

        <label>New Password</label>
        <input name="newPassword" type="password" value={form.newPassword} onChange={change} required />

        <label>Confirm New Password</label>
        <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={change} required />

        <button className="btn" type="submit">
          Update Password
        </button>
      </form>
    </div>
  );
}
