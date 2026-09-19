import { useEffect, useState } from "react";
import api from "../api/axios";
import "../pages/Admin.css";

export default function RightsMaster() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [savingId, setSavingId] = useState(null);

    const loadUsers = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await api.get("/rights/users");
            setUsers(res.data);
        } catch (err) {
            setError(err.response?.data?.message || "Couldn't load users.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const toggleCancel = async (user) => {
        setSavingId(user._id);
        try {
            const newVal = !user.Rights?.CanCncl;
            await api.put(`/rights/users/${user._id}`, { CanCncl: newVal });
            setUsers((prev) =>
                prev.map((u) => (u._id === user._id ? { ...u, Rights: { ...u.Rights, CanCncl: newVal } } : u))
            );
        } catch (err) {
            setError(err.response?.data?.message || "Couldn't update rights.");
        } finally {
            setSavingId(null);
        }
    };

    return (
        <div className="admin-page">
            <div className="admin-header">
                <div>
                    <span className="admin-eyebrow">Backstage</span>
                    <h1 className="admin-title">User rights</h1>
                </div>
            </div>

            {error && <div className="admin-alert">{error}</div>}
            {loading && <p className="admin-empty">Loading users…</p>}
            {!loading && users.length === 0 && <p className="admin-empty">No users found.</p>}

            {!loading && users.length > 0 && (
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Can cancel own booking</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((u) => (
                                <tr key={u._id}>
                                    <td>{u.name}</td>
                                    <td>{u.email}</td>
                                    <td>
                                        <button
                                            className={`status-badge status-${u.Rights?.CanCncl ? "confirmed" : "cancelled"}`}
                                            style={{ cursor: "pointer", border: "none" }}
                                            onClick={() => toggleCancel(u)}
                                            disabled={savingId === u._id}
                                        >
                                            {savingId === u._id ? "…" : u.Rights?.CanCncl ? "Enabled" : "Disabled"}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}