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
    const [cancellingId, setCancellingId] = useState(null);

    const loadBookings = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await api.get("/bookings/my");
            setBookings(res.data);
        } catch (err) {
            setError(err.response?.data?.message || "Couldn't load your bookings.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBookings();
    }, []);

    const cancel = async (id) => {
        setCancellingId(id);
        setError("");
        try {
            await api.delete(`/bookings/${id}`);
            setBookings((prev) =>
                prev.map((b) => (b._id === id ? { ...b, status: "cancelled" } : b))
            );
        } catch (err) {
            setError(err.response?.data?.message || "Couldn't cancel this booking.");
        } finally {
            setCancellingId(null);
        }
    };

    return (
        <div className="bookings-page">
            <div className="bookings-header">
                <span className="bookings-eyebrow">Your passes</span>
                <h1 className="bookings-title">My Bookings</h1>
            </div>

            {error && <div className="bookings-alert">{error}</div>}

            {loading && <p className="bookings-empty">Loading your bookings…</p>}

            {!loading && bookings.length === 0 && !error && (
                <p className="bookings-empty">No bookings yet — go find an event to reserve.</p>
            )}

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
                                    disabled={cancellingId === b._id}
                                >
                                    {cancellingId === b._id ? "Cancelling…" : "Cancel"}
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}