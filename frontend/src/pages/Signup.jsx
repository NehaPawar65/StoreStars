import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api, { errorMessage } from "../api.js";
import { validateForm } from "../auth.jsx";
import { useToast } from "../toast.jsx";

export default function Signup() {
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ name: "", email: "", address: "", password: "" });

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();

    const problem = validateForm(form);
    if (problem) return toast.error(problem);

    try {
      await api.post("/auth/signup", form);
      toast.success("Account created, please log in");
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="card auth-card">
      <h2>Create Account</h2>
      <form onSubmit={submit}>
        <label>Name</label>
        <input name="name" value={form.name} onChange={change} required />

        <label>Email</label>
        <input name="email" type="email" value={form.email} onChange={change} required />

        <label>Address</label>
        <textarea name="address" rows="3" value={form.address} onChange={change} required />

        <label>Password</label>
        <input name="password" type="password" value={form.password} onChange={change} required />

        <button className="btn" type="submit">
          Sign Up
        </button>
      </form>
      <p className="muted">
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
}
