import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return <div className="text-center mt-10">Loading...</div>;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="flex justify-between items-center px-8 py-4 shadow-md bg-white">
        <h1 className="text-xl font-semibold text-gray-800">
          👋 Welcome, {user.name}
        </h1>
        <button
          onClick={logout}
          className="bg-red-500 hover:bg-red-600 text-white font-medium px-4 py-2 rounded-md transition"
        >
          Logout
        </button>
      </header>

      {/* Main content */}
      <main className="flex flex-1 flex-col justify-center items-center">
        <button
          onClick={() => navigate("/chat")}
          className="bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold px-6 py-3 rounded-lg shadow-md transition"
        >
          Start Chatting 💬
        </button>
      </main>
    </div>
  );
}
