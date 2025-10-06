import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, roles }) {
  const token = sessionStorage.getItem("token");
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");

  // ✅ Just check for token, not role
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // ✅ If roles are provided, check them safely
  if (roles && user.role && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
