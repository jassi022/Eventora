import { useEffect, useState } from "react";
import api from "../api/axios";
import "./Admin.css";

const STATUS_OPTIONS = [
    { value: "confirmed", label: "Confirm" },
    { value: "pending", label: "Pending" },
    { value: "rejected", label: "Reject" },
];

export default function AdminBookings() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [updatingId, setUpdatingId] = useState(null);

    const loadBookings = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await api.get("/bookings");
            setBookings(res.data);
        } catch (err) {
            setError(err.response?.data?.message || "Couldn't load bookings.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadBookings(); }, []);

    const changeStatus = async (id, status) => {
        setUpdatingId(id);
        setError("");
        try {
            const res = await api.put(`/bookings/${id}/status`, { status });
            setBookings((prev) => prev.map((b) => (b._id === id ? res.data.booking : b)));
        } catch (err) {
            setError(err.response?.data?.message || "Couldn't update booking.");
        } finally {
            setUpdatingId(null);
        }
    };

    return (
        <div className="admin-page">
            <div className="admin-header">
                <div>
                    <span className="admin-eyebrow">Backstage</span>
                    <h1 className="admin-title">Manage bookings</h1>
                </div>
            </div>

            {error && <div className="admin-alert">{error}</div>}
            {loading && <p className="admin-empty">Loading bookings…</p>}
            {!loading && bookings.length === 0 && !error && <p className="admin-empty">No bookings yet.</p>}

            {!loading && bookings.length > 0 && (
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr><th>Event</th><th>User</th><th>Amount</th><th>Status</th></tr>
                        </thead>
                        <tbody>
                            {bookings.map((b) => (
                                <tr key={b._id}>
                                    <td>{b.eventId?.title || "—"}</td>
                                    <td>{b.user?.name || b.user?.email || "—"}</td>
                                    <td>₹{b.amount}</td>
                                    <td>
                                        <select
                                            value={b.status}
                                            disabled={updatingId === b._id}
                                            onChange={(e) => changeStatus(b._id, e.target.value)}
                                        >
                                            {STATUS_OPTIONS.map((opt) => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
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