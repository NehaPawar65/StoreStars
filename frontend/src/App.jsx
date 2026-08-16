import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Protected, Nav, getUser, homeFor } from "./auth.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import Admin from "./pages/Admin.jsx";
import User from "./pages/User.jsx";
import Owner from "./pages/Owner.jsx";
import ChangePassword from "./pages/ChangePassword.jsx";

export default function App() {
  const location = useLocation();
  const user = getUser();
  const publicPages = ["/login", "/signup", "/forgot-password", "/reset-password"];
  const showNav = user && !publicPages.includes(location.pathname);

  return (
    <>
      {showNav && <Nav />}
      <div className="container">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/admin"
            element={
              <Protected role="ADMIN">
                <Admin />
              </Protected>
            }
          />
          <Route
            path="/user"
            element={
              <Protected role="USER">
                <User />
              </Protected>
            }
          />
          <Route
            path="/owner"
            element={
              <Protected role="OWNER">
                <Owner />
              </Protected>
            }
          />
          <Route
            path="/change-password"
            element={
              <Protected>
                <ChangePassword />
              </Protected>
            }
          />
          <Route path="*" element={<Navigate to={user ? homeFor(user.role) : "/login"} replace />} />
        </Routes>
      </div>
    </>
  );
}
