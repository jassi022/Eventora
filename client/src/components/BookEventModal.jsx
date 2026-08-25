import { useState } from "react";
import api from "../api/axios";
import "./BookEventModal.css";

// Usage: <BookEventModal eventId={event._id} eventTitle={event.title} onClose={...} onBooked={...} />
export default function BookEventModal({ eventId, eventTitle, onClose, onBooked }) {
    const [step, setStep] = useState("confirm"); // "confirm" | "otp"
    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const sendOtp = async () => {
        setError("");
        setLoading(true);
        try {
            await api.post("/bookings/send-OTP", { eventId });
            setNotice("Code sent to your email — enter it below to confirm your seat.");
            setStep("otp");
        } catch (err) {
            setError(err.response?.data?.message || "Couldn't send the code. Try again.");
        } finally {
            setLoading(false);
        }
    };

    const confirmBooking = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await api.post("/bookings", { eventId, otp });
            onBooked?.(res.data.booking);
        } catch (err) {
            setError(err.response?.data?.message || "That code didn't work. Check it and try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="booking-overlay" onClick={onClose}>
            <div className="booking-modal" onClick={(e) => e.stopPropagation()}>
                <button className="booking-close" onClick={onClose} aria-label="Close">
                    ×
                </button>

                <span className="booking-eyebrow">Reserve your seat</span>
                <h2 className="booking-title">{eventTitle}</h2>

                {error && <div className="alert alert-error">{error}</div>}
                {notice && !error && <div className="alert alert-notice">{notice}</div>}

                {step === "confirm" && (
                    <>
                        <p className="booking-copy">
                            We'll email you a 6-digit code to confirm this booking.
                        </p>
                        <button className="btn-primary" onClick={sendOtp} disabled={loading}>
                            {loading ? "Sending…" : "Send verification code"}
                        </button>
                    </>
                )}

                {step === "otp" && (
                    <form className="booking-form" onSubmit={confirmBooking}>
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
                                placeholder="123456"
                                className="otp-input"
                                autoFocus
                            />
                        </label>
                        <button className="btn-primary" type="submit" disabled={loading}>
                            {loading ? "Booking…" : "Confirm booking"}
                        </button>
                        <button type="button" className="link" onClick={sendOtp} disabled={loading}>
                            Resend code
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}