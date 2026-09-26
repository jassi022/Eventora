import { useEffect, useState } from "react";
import api from "../api/axios";
import "./BookEventModal.css";
import PaymentModal from "./PaymentModal";

export default function BookEventModal({ eventId, eventTitle, isAdmin = false, onClose, onBooked }) {
    const [step, setStep] = useState("confirm");
    const [passes, setPasses] = useState([]);
    const [qtyMap, setQtyMap] = useState({});
    const [gstEmail, setGstEmail] = useState("");
    const [gstPh, setGstPh] = useState("");
    const [promoInput, setPromoInput] = useState("");
    const [promoApplied, setPromoApplied] = useState(null);
    const [promoError, setPromoError] = useState("");
    const [promoChecking, setPromoChecking] = useState(false);
    const [showSavedAnim, setShowSavedAnim] = useState(false);
    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [createdBooking, setCreatedBooking] = useState(null);

    useEffect(() => {
        api.get("/passes/active")
            .then((res) => {
                setPasses(res.data);
            })
            .catch((err) => {
                console.error("passes/active failed:", err.response?.status, err.response?.data);
                setError(err.response?.data?.message || "Couldn't load pass types.");
            });
    }, []);

    const totalQty = Object.values(qtyMap).reduce((sum, q) => sum + Number(q), 0);

    const baseAmount = passes.reduce((sum, p) => sum + (qtyMap[p._id] || 0) * p.price, 0);

    const finalAmount = promoApplied ? promoApplied.finalAmount : baseAmount;

    const changeQty = (pass, delta) => {
        setQtyMap((prev) => {
            const current = prev[pass._id] || 0;
            const next = Math.max(0, Math.min(pass.MaxPerBook, current + delta));
            const updated = { ...prev, [pass._id]: next };
            if (next === 0) {
                delete updated[pass._id];
            }
            return updated;
        });
        setPromoApplied(null);
        setPromoError("");
    };

    const buildPassLines = () =>
        Object.entries(qtyMap).map(([passId, qty]) => ({ passId, qty }));

    const applyPromo = async () => {
        if (!promoInput.trim()) {
            return;
        }
        if (baseAmount <= 0) {
            setPromoError("Select at least one pass first.");
            return;
        }
        setPromoChecking(true);
        setPromoError("");
        setPromoApplied(null);
        setShowSavedAnim(false);
        try {
            const res = await api.post("/promos/validate", { Cod: promoInput.trim(), amount: baseAmount });
            setPromoApplied(res.data);
            setShowSavedAnim(true);
            setTimeout(() => {
                setShowSavedAnim(false);
            }, 2500);
        } catch (err) {
            setPromoError(err.response?.data?.message || "Couldn't apply this code.");
        } finally {
            setPromoChecking(false);
        }
    };

    const sendOtp = async () => {
        if (totalQty === 0) {
            return setError("Select at least one pass.");
        }
        setError("");
        setNotice("");
        setLoading(true);
        try {
            await api.post("/bookings/send-OTP", { eventId, passLines: buildPassLines() });
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
        setNotice("");
        setLoading(true);

        try {
            const res = await api.post("/bookings", {
                eventId,
                otp,
                passLines: buildPassLines(),
                promoCode: promoApplied
                    ? promoApplied.Cod
                    : undefined,
            });

            // bookEvent now creates the real Booking row and returns it
            // as res.data.booking (has _id, amount, etc.) — PaymentModal
            // needs that _id.
            if (res.data.success && res.data.paymentRequired) {
                setCreatedBooking(res.data.booking);
                setLoading(false);
                setStep("payment");
                return;
            }

            setLoading(false);

        } catch (err) {
            console.error("confirmBooking error:", err);

            setError(
                err.response?.data?.message ||
                "That code didn't work. Check it and try again."
            );

            setLoading(false);
        }
    };

    const adminBook = async () => {
        if (totalQty === 0) {
            return setError("Select at least one pass.");
        }
        if (!gstEmail.trim() && !gstPh.trim()) {
            return setError("Enter the guest's email or phone number.");
        }
        setError("");
        setLoading(true);
        try {
            const res = await api.post("/bookings/admin", {
                eventId,
                passLines: buildPassLines(),
                promoCode: promoApplied ? promoApplied.Cod : undefined,
                gstEmail: gstEmail.trim() || undefined,
                gstPh: gstPh.trim() || undefined,
            });
            onBooked?.(res.data.booking);
        } catch (err) {
            setError(err.response?.data?.message || "Couldn't create this booking.");
        } finally {
            setLoading(false);
        }
    };

    // Once OTP is verified and the pending booking exists, hand off
    // straight to PaymentModal — it owns the whole UPI-QR + UTR-submit
    // flow, so we don't duplicate that UI here.
    if (step === "payment" && !isAdmin) {
        return (
            <PaymentModal
                booking={createdBooking}
                onClose={onClose}
                onSuccess={(updatedBooking) => {
                    onBooked?.(updatedBooking);
                    onClose?.();
                }}
            />
        );
    }

    return (
        <div className="booking-overlay" onClick={onClose}>
            <div className="booking-modal" onClick={(e) => e.stopPropagation()}>
                <button className="booking-close" onClick={onClose} aria-label="Close">×</button>

                <span className="booking-eyebrow">
                    {isAdmin ? "Book on behalf" : "Reserve your seat"}
                </span>

                <h2 className="booking-title">{eventTitle}</h2>

                {error && <div className="alert alert-error">{error}</div>}

                {notice && !error && <div className="alert alert-notice">{notice}</div>}

                {step === "confirm" && (
                    <>
                        {isAdmin && (
                            <div className="admin-book-contact">
                                <label className="booking-field">
                                    Guest email
                                    <input type="email" value={gstEmail} onChange={(e) => setGstEmail(e.target.value)} placeholder="guest@example.com" />
                                </label>
                                <label className="booking-field">
                                    Guest phone
                                    <input type="tel" value={gstPh} onChange={(e) => setGstPh(e.target.value)} placeholder="98XXXXXXXX" />
                                </label>
                            </div>
                        )}

                        <div className="pass-picker">
                            <span className="pass-picker-label">Select passes</span>

                            <div className="pass-grid">
                                {passes.map((p) => {
                                    const qty = qtyMap[p._id] || 0;
                                    const isActive = qty > 0;
                                    return (
                                        <div
                                            className={isActive ? "pass-card pass-card-active" : "pass-card"}
                                            key={p._id}
                                            onClick={() => { if (qty < p.MaxPerBook) changeQty(p, 1); }}
                                        >
                                            {qty > 0 && <span className="pass-card-check">✓</span>}

                                            <div className="pass-card-top">
                                                <span className="pass-line-name">{p.name}</span>
                                                <span className="pass-line-price">₹{p.price}</span>
                                            </div>

                                            <span className="pass-line-max">max {p.MaxPerBook}/booking</span>

                                            <div className="pass-stepper" onClick={(e) => e.stopPropagation()}>
                                                <button type="button" className="pass-stepper-btn" onClick={() => changeQty(p, -1)} disabled={qty === 0}>−</button>
                                                <span key={qty} className="pass-stepper-qty pass-stepper-pop">{qty}</span>
                                                <button type="button" className="pass-stepper-btn" onClick={() => changeQty(p, 1)} disabled={qty >= p.MaxPerBook}>+</button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {passes.length === 0 && !error && <p className="booking-copy">No pass types available right now.</p>}
                        </div>

                        <div className="booking-promo-row">
                            <input
                                type="text"
                                placeholder="Promo code"
                                value={promoInput}
                                onChange={(e) => setPromoInput(e.target.value)}
                                className="booking-promo-input"
                            />
                            <button type="button" className="btn-ghost" onClick={applyPromo} disabled={promoChecking || baseAmount === 0}>
                                {promoChecking ? "Checking…" : "Apply"}
                            </button>
                        </div>

                        {promoError && <div className="alert alert-error">{promoError}</div>}

                        {promoApplied && (
                            <div className={showSavedAnim ? "promo-saved promo-saved-pop" : "promo-saved"}>
                                🎉 You saved ₹{promoApplied.discount} on this booking!
                            </div>
                        )}

                        <div className="booking-total">
                            <span>Total ({totalQty} ticket{totalQty !== 1 ? "s" : ""})</span>
                            <strong>
                                {promoApplied && promoApplied.discount > 0 && (
                                    <span className="booking-total-strike">₹{baseAmount}</span>
                                )}
                                {" "}₹{finalAmount}
                            </strong>
                        </div>

                        {isAdmin ? (
                            <button className="btn-primary" onClick={adminBook} disabled={loading || totalQty === 0}>
                                {loading ? "Booking…" : "Confirm booking"}
                            </button>
                        ) : (
                            <>
                                <p className="booking-copy">We'll email you a 6-digit code to confirm this booking.</p>
                                <button className="btn-primary" onClick={sendOtp} disabled={loading || totalQty === 0}>
                                    {loading ? "Sending…" : "Send verification code"}
                                </button>
                            </>
                        )}
                    </>
                )}

                {step === "otp" && !isAdmin && (
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
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                                placeholder="123456"
                                className="otp-input"
                                autoFocus
                            />
                        </label>
                        <button className="btn-primary" type="submit" disabled={loading}>
                            {loading ? "Booking…" : "Confirm booking — ₹" + finalAmount}
                        </button>
                        <button type="button" className="link" onClick={sendOtp} disabled={loading}>Resend code</button>
                    </form>
                )}
            </div>
        </div>
    );
}