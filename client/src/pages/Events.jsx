import { useEffect, useState } from "react";
import api from "../api/axios";
import "./Events.css";

export default function Events() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [bookingId, setBookingId] = useState(null);

    const [otpTarget, setOtpTarget] = useState(null);
    const [otp, setOtp] = useState("");
    const [otpError, setOtpError] = useState("");
    const [otpNotice, setOtpNotice] = useState("");
    const [otpLoading, setOtpLoading] = useState(false);

    const loadEvents = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await api.get("/events");
            setEvents(res.data);
        } catch (err) {
            setError(err.response?.data?.message || "Couldn't load events.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadEvents();
    }, []);

    const openBooking = async (event) => {
        setBookingId(event._id);
        setError("");
        try {
            await api.post("/bookings/send-OTP", { eventId: event._id });
            setOtpTarget(event);
            setOtp("");
            setOtpError("");
            setOtpNotice(`We sent a 6-digit code to your email to confirm ${event.title}`);
        } catch (err) {
            setError(err.response?.data?.message || "Couldn't send OTP. Try again.");
        } finally {
            setBookingId(null);
        }
    };

    const closeModal = () => {
        setOtpTarget(null);
        setOtp("");
        setOtpError("");
        setOtpNotice("");
    };

    const confirmBooking = async (e) => {
        e.preventDefault();
        if (!otpTarget) return;
        setOtpLoading(true);
        setOtpError("");
        try {
            await api.post("/bookings", { eventId: otpTarget._id, otp });
            closeModal();
            await loadEvents();
            setSuccessMsg("Booking confirmed! Check My Bookings.");
            setTimeout(() => setSuccessMsg(""), 4000);
        } catch (err) {
            setOtpError(err.response?.data?.message || "That code didn't work. Check it and try again.");
        } finally {
            setOtpLoading(false);
        }
    };

    return (
        <div className="events-page">
            <div className="events-header">
                <span className="events-eyebrow">Now Boarding</span>
                <h1 className="events-title">Find your next event</h1>
            </div>

            {error && <div className="events-alert">{error}</div>}

            {loading && <p className="events-empty">Loading events…</p>}

            {!loading && events.length === 0 && !error && (
                <p className="events-empty">No events available right now — check back soon.</p>
            )}

            <div className="events-grid">
                {events.map((event) => {
                    const soldOut = event.totalSeats <= 0;
                    return (
                        <div className="event-card" key={event._id}>
                            <div className="event-card-body">
                                <h3 className="event-card-title">{event.title}</h3>
                                {event.date && (
                                    <p className="event-card-meta">
                                        {new Date(event.date).toLocaleDateString(undefined, {
                                            day: "numeric",
                                            month: "short",
                                            year: "numeric",
                                        })}
                                    </p>
                                )}
                                {event.description && (
                                    <p className="event-card-desc">{event.description}</p>
                                )}
                                <div className="event-card-footer">
                                    <span className="event-card-price">₹{event.ticketPrice}</span>
                                    <span className="event-card-seats">
                                        {soldOut ? "Sold out" : `${event.availableSeats} seats left`}
                                    </span>
                                </div>
                            </div>
                            <button
                                className="event-card-btn"
                                disabled={soldOut || bookingId === event._id}
                                onClick={() => openBooking(event)}
                            >
                                {soldOut ? "Sold out" : bookingId === event._id ? "Sending code…" : "Book now"}
                            </button>
                        </div>
                    );
                })}
            </div>

            {otpTarget && (
                <div className="events-modal-backdrop" onClick={closeModal}>
                    <div className="events-modal" onClick={(e) => e.stopPropagation()}>
                        <span className="events-modal-eyebrow">Confirm booking</span>
                        <h3 className="events-modal-title">{otpTarget.title}</h3>

                        {otpNotice && !otpError && <div className="alert-notice">{otpNotice}</div>}
                        {otpError && <div className="alert-error">{otpError}</div>}

                        <form onSubmit={confirmBooking} className="events-modal-form">
                            <label>
                                6-digit code
                                <input
                                    type="text"
                                    required
                                    inputMode="numeric"
                                    pattern="[0-9]{6}"
                                    maxLength={6}
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    placeholder="XXXXX"
                                    className="otp-input"
                                    autoFocus
                                />
                            </label>
                            <div className="events-modal-actions">
                                <button type="button" className="events-modal-cancel" onClick={closeModal}>
                                    Cancel
                                </button>
                                <button type="submit" className="event-card-btn" disabled={otpLoading}>
                                    {otpLoading ? "Confirming…" : "Confirm booking"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}