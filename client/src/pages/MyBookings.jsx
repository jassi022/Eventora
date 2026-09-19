import { useEffect, useRef, useState } from "react";
import api from "../api/axios";
import html2canvas from "html2canvas";
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

    const [qrData, setQrData] = useState(null);
    const [qrLoading, setQrLoading] = useState(false);
    const qrCardRef = useRef(null);

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

    const openQr = async (bookingId) => {
        setQrLoading(true);
        setQrData(null);
        try {
            const res = await api.get(`/bookings/${bookingId}/qr`);
            setQrData(res.data);
        } catch (err) {
            setError(err.response?.data?.message || "Couldn't load ticket QR.");
        } finally {
            setQrLoading(false);
        }
    };

    const closeQr = () => setQrData(null);

    const takeScreenshot = async () => {
        if (!qrCardRef.current) return;
        const canvas = await html2canvas(qrCardRef.current, { backgroundColor: "#1a1530" });
        const link = document.createElement("a");
        link.download = `ticket-${qrData.TktCod}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    };

    // admin stats
    const totalBookings = bookings.length;
    const confirmedCount = bookings.filter((b) => b.status === "confirmed").length;
    const pendingCount = bookings.filter((b) => b.status === "pending").length;
    const totalRevenue = bookings
        .filter((b) => b.status === "confirmed")
        .reduce((sum, b) => sum + (b.amount || 0), 0);

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

            {isAdmin && !loading && bookings.length > 0 && (
                <div className="stats-row">
                    <div className="stat-card">
                        <span className="stat-label">Total Bookings</span>
                        <span className="stat-value">{totalBookings}</span>
                    </div>
                    <div className="stat-card stat-confirmed">
                        <span className="stat-label">Confirmed</span>
                        <span className="stat-value">{confirmedCount}</span>
                    </div>
                    <div className="stat-card stat-pending">
                        <span className="stat-label">Pending</span>
                        <span className="stat-value">{pendingCount}</span>
                    </div>
                    <div className="stat-card stat-revenue">
                        <span className="stat-label">Revenue</span>
                        <span className="stat-value">₹{totalRevenue}</span>
                    </div>
                </div>
            )}

            {loading && (
                <div className="bookings-loading">
                    <div className="spinner"></div>
                    <p className="bookings-empty">Loading bookings…</p>
                </div>
            )}

            {!loading && bookings.length === 0 && !error && (
                <div className="bookings-empty-state">
                    <span className="bookings-empty-icon">🎟️</span>
                    <p className="bookings-empty">
                        {isAdmin ? "No bookings yet." : "No bookings yet — go find an event to reserve."}
                    </p>
                </div>
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
                                    <td>
                                        <span className="admin-row-name">
                                            {b.user?.name || b.GstEmail || b.GstPh || "—"}
                                        </span>
                                        {b.nBookedBy === 500 && (
                                            <span className="admin-row-tag">via admin</span>
                                        )}
                                    </td>
                                    <td>{b.user?.email || b.GstEmail || "—"}</td>
                                    <td>{b.user?.phone || b.GstPh || "—"}</td>
                                    <td>{b.tickets ?? 1}</td>
                                    <td className="admin-row-amount">
                                        {typeof b.amount === "number" ? `₹${b.amount}` : "—"}
                                    </td>
                                    <td>
                                        <span className="ticket-code">{b.TktCod || b._id.slice(-6).toUpperCase()}</span>
                                    </td>
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
                                {b.eventId?.location && (
                                    <p className="booking-card-location">📍 {b.eventId.location}</p>
                                )}
                                {typeof b.amount === "number" && (
                                    <p className="booking-card-amount">₹{b.amount}</p>
                                )}
                            </div>
                            <div className="booking-card-side">
                                <span className="booking-card-code">
                                    {b.TktCod ? b.TktCod.split("-").pop() : b._id.slice(-6).toUpperCase()}
                                </span>
                                {b.status === "confirmed" && (
                                    <button className="view-ticket-btn" onClick={() => openQr(b._id)}>
                                        🎫 View Ticket
                                    </button>
                                )}
                                {b.status !== "cancelled" && currentUser?.Rights?.CanCncl && (
                                    <button
                                        className="booking-cancel"
                                        onClick={() => cancel(b._id)}
                                        disabled={actingId === b._id}
                                    >
                                        {actingId === b._id ? "…" : "Cancel"}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {(qrLoading || qrData) && (
                <div className="qr-overlay" onClick={closeQr}>
                    <div className="qr-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="qr-modal-close" onClick={closeQr}>×</button>

                        {qrLoading && (
                            <div className="qr-loading-wrap">
                                <div className="spinner"></div>
                                <p className="qr-loading">Loading ticket…</p>
                            </div>
                        )}

                        {qrData && (
                            <>
                                <span className="qr-eyebrow">
                                    {qrData.TktStat === 409 ? "Already Scanned" : "Your Ticket"}
                                </span>
                                <h2 className="qr-event-title">{qrData.eventTitle}</h2>
                                {qrData.eventDate && (
                                    <p className="qr-event-meta">
                                        {new Date(qrData.eventDate).toLocaleDateString(undefined, {
                                            day: "numeric",
                                            month: "short",
                                            year: "numeric",
                                        })}
                                        {qrData.eventLocation && ` · ${qrData.eventLocation}`}
                                    </p>
                                )}

                                <div ref={qrCardRef} className="qr-screenshot-card">
                                    <img src={qrData.qrImage} alt="Ticket QR" className="qr-image" />
                                    <p className="qr-code-text">{qrData.TktCod}</p>
                                </div>

                                <div className="qr-pass-list">
                                    {qrData.passLines.map((p, i) => (
                                        <div className="qr-pass-row" key={i}>
                                            <span className="qr-pass-name">{p.name}</span>
                                            <span className="qr-pass-qty">x {p.qty}</span>
                                            <span className="qr-pass-amt">₹{p.qty * p.rate}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="qr-total-row">
                                    <span>Total Paid</span>
                                    <strong>₹{qrData.amount}</strong>
                                </div>

                                <p className="qr-guard-note">
                                    🛡️ Show this QR code to our scanning guard or member display at entry.
                                </p>

                                {qrData.TktStat === 409 && (
                                    <p className="qr-used-warning">⚠️ This ticket has already been scanned.</p>
                                )}

                                <button className="qr-screenshot-btn" onClick={takeScreenshot}>
                                    📸 Take Screenshot
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}