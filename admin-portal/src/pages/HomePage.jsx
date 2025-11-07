import { useAuth } from "../hooks/useAuth";
import { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";

export default function HomePage() {
  const { user, logout } = useAuth();
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState({ type: "", words: "", message: "" });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);

  // Fetch all rules
  const fetchRules = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/violation-rules");
      setRules(res.data);
    } catch (err) {
      console.error("Failed to fetch rules:", err);
      setError("Failed to load rules. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, words: form.words.split(",").map((w) => w.trim()) };

    try {
      setLoading(true);
      if (editingId) {
        await axiosInstance.put(`/violation-rules/${editingId}`, payload);
      } else {
        await axiosInstance.post("/violation-rules", payload);
      }

      await fetchRules();
      setForm({ type: "", words: "", message: "" });
      setEditingId(null);
      setShowModal(false);
    } catch (err) {
      console.error("Error saving rule:", err);
      setError("Failed to save rule. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (rule) => {
    setEditingId(rule._id);
    setForm({
      type: rule.type,
      words: rule.words.join(", "),
      message: rule.message,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this rule?")) return;

    try {
      setLoading(true);
      await axiosInstance.delete(`/violation-rules/${id}`);
      await fetchRules();
    } catch (err) {
      console.error("Error deleting rule:", err);
      setError("Failed to delete rule.");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm({ type: "", words: "", message: "" });
  };

  if (!user) return <div className="text-center mt-10">Loading user...</div>;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="flex justify-between items-center px-8 py-4 shadow-md bg-white">
        <h1 className="text-xl font-semibold text-gray-800">Welcome, {user.name}</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={logout}
            className="bg-red-500 hover:bg-red-600 text-white font-medium px-4 py-2 rounded-md transition"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="p-8 flex flex-col gap-8">
        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-md">{error}</div>
        )}
        <div className="">

          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md transition"
          >
            Create Rule
        </button>

        </div>

        {/* Rules Table */}
        <div className="bg-white p-6 rounded-xl shadow-md overflow-x-auto">
          <h2 className="text-lg font-semibold mb-4">Existing Rules</h2>
          {loading ? (
            <div className="text-center text-gray-600 py-4">Loading...</div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="p-2 border">Type</th>
                  <th className="p-2 border">Words</th>
                  <th className="p-2 border">Message</th>
                  <th className="p-2 border text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule._id} className="hover:bg-gray-50">
                    <td className="p-2 border">{rule.type}</td>
                    <td className="p-2 border">{rule.words.join(", ")}</td>
                    <td className="p-2 border">{rule.message}</td>
                    <td className="p-2 border text-center">
                      <button
                        onClick={() => handleEdit(rule)}
                        className="bg-yellow-500 text-white px-3 py-1 rounded mr-2 hover:bg-yellow-600"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(rule._id)}
                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {rules.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center py-4 text-gray-500">
                      No rules found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-lg font-semibold mb-4">
              {editingId ? "Edit Rule" : "Create New Rule"}
            </h2>

            <form onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Type (e.g., offensive_language)"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full p-2 border rounded mb-3"
                required
              />
              <input
                type="text"
                placeholder="Words (comma separated)"
                value={form.words}
                onChange={(e) => setForm({ ...form, words: e.target.value })}
                className="w-full p-2 border rounded mb-3"
                required
              />
              <input
                type="text"
                placeholder="Message"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full p-2 border rounded mb-3"
                required
              />

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`${
                    editingId ? "bg-yellow-600" : "bg-blue-600"
                  } text-white px-4 py-2 rounded hover:opacity-90 transition disabled:opacity-60`}
                >
                  {loading
                    ? "Saving..."
                    : editingId
                    ? "Update Rule"
                    : "Create Rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
