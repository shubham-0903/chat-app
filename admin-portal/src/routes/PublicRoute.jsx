import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  // if user is already logged in, redirect to home
  if (user) return <Navigate to="/" />;

  return children;
}
