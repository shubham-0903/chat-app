import { useAuth } from "../hooks/useAuth";


export default function HomePage() {
  const { user, logout } = useAuth();

  if (!user) return <div className="text-center mt-10">Loading...</div>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-3xl font-bold mb-4">Welcome, {user.name} 👋</h1>
      <button
        onClick={logout}
        className="bg-red-500 text-white px-4 py-2 rounded-md"
      >
        Logout
      </button>
    </div>
  );
}
