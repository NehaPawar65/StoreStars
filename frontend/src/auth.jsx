import { Navigate, Link, useNavigate } from "react-router-dom";

export function saveAuth(token, user) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}

export function getToken() {
  return localStorage.getItem("token");
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

// Single definition of where each role belongs, used after login, by the navbar,
// by Protected and by the catch-all route.
export function homeFor(role) {
  if (role === "ADMIN") return "/admin";
  if (role === "OWNER") return "/owner";
  if (role === "USER") return "/user";
  return "/login";
}

// Wrong role sends the user to their own dashboard. This is only for the UI -
// the backend checks the role again on every request.
export function Protected({ role, children }) {
  const token = getToken();
  const user = getUser();
  if (!token || !user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={homeFor(user.role)} replace />;
  return children;
}

export const PASSWORD_RE = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,16}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Each field is only checked when supplied, so pages can validate just what they use.
export function validateForm({ name, email, address, password }) {
  if (name !== undefined && (!name.trim() || name.trim().length > 60))
    return "Name is required and must be at most 60 characters";
  if (email !== undefined && !EMAIL_RE.test(email.trim())) return "Please enter a valid email address";
  if (address !== undefined && (!address.trim() || address.length > 400))
    return "Address is required and must be at most 400 characters";
  if (password !== undefined && !PASSWORD_RE.test(password))
    return "Password must be 8-16 characters and include one uppercase letter and one special character";
  return "";
}

export function Nav() {
  const navigate = useNavigate();
  const user = getUser();
  if (!user) return null;

  const doLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="nav">
      <span className="brand">StoreStars</span>
      <div className="nav-links">
        <Link to={homeFor(user.role)}>Dashboard</Link>
        <Link to="/change-password">Change Password</Link>
        <span className="nav-user">
          {user.name} ({user.role})
        </span>
        <button className="btn small" onClick={doLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
}
