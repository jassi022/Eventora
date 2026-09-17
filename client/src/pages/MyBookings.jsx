import { useEffect, useState } from "react";
import api from "../api/axios";
import "./MyBookings.css";

const STATUS_LABEL = {
    pending: "Pending",
    confirmed: "Confirmed",
    cancelled: "Cancelled",
};

export default function MyBookings() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [actingId, setActingId] = useState(null);

    // ⚠️ Adjust this to however you actually read the logged-in user in this app
    const currentUser = JSON.parse(localStorage.getItem("user") || "null");
    const isAdmin = currentUser?.role === "admin";

    const loadBookings = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await api.get(isAdmin ? "/bookings" : "/bookings/my");
            setBookings(res.data);
        } catch (err) {
            setError(err.response?.data?.message || "Couldn't load bookings.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBookings();
    }, [isAdmin]);

    const cancel = async (id) => {
        setActingId(id);
        setError("");
        try {
            await api.delete(`/bookings/${id}`);
            setBookings((prev) =>
                prev.map((b) => (b._id === id ? { ...b, status: "cancelled" } : b))
            );
        } catch (err) {
            setError(err.response?.data?.message || "Couldn't cancel this booking.");
        } finally {
            setActingId(null);
        }
    };

    const approve = async (id) => {
        setActingId(id);
        setError("");
        try {
            await api.put(`/bookings/${id}/confirm`, { status: "confirmed" });
            setBookings((prev) =>
                prev.map((b) => (b._id === id ? { ...b, status: "confirmed" } : b))
            );
        } catch (err) {
            setError(err.response?.data?.message || "Couldn't approve this booking.");
        } finally {
            setActingId(null);
        }
    };

    return (
        <div className="bookings-page">
            <div className="bookings-header">
                <span className="bookings-eyebrow">
                    {isAdmin ? "Admin view" : "Your passes"}
                </span>
                <h1 className="bookings-title">
                    {isAdmin ? "All Bookings" : "My Bookings"}
                </h1>
            </div>

            {error && <div className="bookings-alert">{error}</div>}

            {loading && <p className="bookings-empty">Loading bookings…</p>}

            {!loading && bookings.length === 0 && !error && (
                <p className="bookings-empty">
                    {isAdmin ? "No bookings yet." : "No bookings yet — go find an event to reserve."}
                </p>
            )}

            {!loading && bookings.length > 0 && isAdmin && (
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Mobile</th>
                                <th>No. of Passes</th>
                                <th>Amount</th>
                                <th>Ticket No.</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bookings.map((b) => (
                                <tr key={b._id} className={`admin-row status-${b.status}`}>
                                    <td>{b.user?.name || "—"}</td>
                                    <td>{b.user?.email || "—"}</td>
                                    <td>{b.user?.phone || "—"}</td>
                                    <td>{b.tickets ?? 1}</td>
                                    <td>{typeof b.amount === "number" ? `₹${b.amount}` : "—"}</td>
                                    <td>{b._id.slice(-6).toUpperCase()}</td>
                                    <td>
                                        <span className={`status-badge status-${b.status}`}>
                                            {STATUS_LABEL[b.status] || b.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="admin-row-actions">
                                            {b.status !== "confirmed" && (
                                                <button
                                                    className="booking-approve"
                                                    onClick={() => approve(b._id)}
                                                    disabled={actingId === b._id}
                                                >
                                                    {actingId === b._id ? "…" : "Approve"}
                                                </button>
                                            )}
                                            {b.status !== "cancelled" && (
                                                <button
                                                    className="booking-cancel"
                                                    onClick={() => cancel(b._id)}
                                                    disabled={actingId === b._id}
                                                >
                                                    {actingId === b._id ? "…" : "Cancel"}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {!loading && bookings.length > 0 && !isAdmin && (
                <div className="bookings-grid">
                    {bookings.map((b) => (
                        <div className={`booking-card status-${b.status}`} key={b._id}>
                            <div className="booking-card-perf" aria-hidden="true"></div>
                            <div className="booking-card-main">
                                <span className={`status-badge status-${b.status}`}>
                                    {STATUS_LABEL[b.status] || b.status}
                                </span>
                                <h3 className="booking-card-title">{b.eventId?.title || "Event"}</h3>
                                {b.eventId?.date && (
                                    <p className="booking-card-meta">
                                        {new Date(b.eventId.date).toLocaleDateString(undefined, {
                                            day: "numeric",
                                            month: "short",
                                            year: "numeric",
                                        })}
                                    </p>
                                )}
                                {typeof b.amount === "number" && (
                                    <p className="booking-card-amount">₹{b.amount}</p>
                                )}
                            </div>
                            <div className="booking-card-side">
                                <span className="booking-card-code">
                                    {b._id.slice(-6).toUpperCase()}
                                </span>
                                {b.status !== "cancelled" && (
                                    <button
                                        className="booking-cancel"
                                        onClick={() => cancel(b._id)}
                                        disabled={actingId === b._id}
                                    >
                                        {actingId === b._id ? "Cancelling…" : "Cancel"}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}