import { useEffect, useState } from "react";
import api from "../api/axios";
import "./PaymentModal.css";
import upiQrFallback from "../assets/upi-qr.png";

export default function PaymentModal({
    booking,
    onClose,
    onSuccess,
}) {
    const [utr, setUtr] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [dynamicQR, setDynamicQR] = useState(null);
    const [qrFailed, setQrFailed] = useState(false);
    const [copied, setCopied] = useState(false);

    const UPI_ID = "jayeshsharma07@ybl";

    useEffect(() => {
        if (!booking?._id) return;

        api.get(`/payment/upi-qr?bookingId=${booking._id}`)
            .then((res) => setDynamicQR(res.data.qrImage))
            .catch(() => {
                // static fallback below will be used instead
            });
    }, [booking?._id]);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape") onClose?.();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    if (!booking) return null;

    const amount = booking.amount || 0;
    const qrSrc = dynamicQR || upiQrFallback;

    const copyUpiId = () => {
        navigator.clipboard.writeText(UPI_ID);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    const submitUTR = async () => {
        setError("");
        setSuccess("");

        const cleanUTR = utr.trim();

        if (!cleanUTR) {
            setError("Please enter UTR / Transaction ID");
            return;
        }

        if (!/^[A-Z0-9]{8,30}$/i.test(cleanUTR)) {
            setError("Please enter a valid UTR / Transaction ID");
            return;
        }

        try {
            setLoading(true);

            const res = await api.post("/payment/utr/submit", {
                bookingId: booking._id,
                utr: cleanUTR.toUpperCase(),
            });

            if (res.data.success) {
                setSuccess("UTR submitted successfully. Waiting for payment verification.");

                setTimeout(() => {
                    onSuccess?.(res.data.booking);
                }, 1500);
            }
        } catch (err) {
            console.error("UTR submission error:", err);
            setError(
                err.response?.data?.message ||
                "Unable to submit UTR. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="payment-overlay" onClick={onClose}>
            <div className="payment-modal" onClick={(e) => e.stopPropagation()}>

                <button className="payment-close" onClick={onClose} aria-label="Close">
                    ×
                </button>

                <h2>Complete Payment</h2>

                <div className="amount-box">
                    <span>Amount payable</span>
                    <strong>₹{amount}</strong>
                </div>

                <div className="payment-section">
                    <h3>Pay using UPI</h3>

                    <p className="payment-info">
                        {dynamicQR
                            ? "Scan the QR below — the amount is pre-filled for you."
                            : "Complete the payment using the UPI details provided by the organizer."}
                        {" Disclaimer: Make payment of the same amount as shown above. Do not pay more or less than the specified amount for successful booking. If you pay more or less, your booking may be rejected and you may not get a refund."}
                    </p>

                    <div className="qr-section">
                        <p className="qr-title">Scan QR Code</p>
                        {!qrFailed ? (
                            <img
                                src={qrSrc}
                                alt="UPI QR Code"
                                className="upi-qr"
                                onError={() => setQrFailed(true)}
                            />
                        ) : (
                            <div className="qr-placeholder">
                                QR unavailable — use the UPI ID below
                            </div>
                        )}
                        <p className="upi-label">UPI ID</p>
                        <div className="upi-id-box">
                            <span>{UPI_ID}</span>
                            <button type="button" onClick={copyUpiId}>
                                {copied ? "Copied!" : "Copy"}
                            </button>
                        </div>
                    </div>
                    <div className="divider">
                        <span>After payment</span>
                    </div>
                    <label className="utr-label">UTR / Transaction ID</label>
                    <input
                        type="text"
                        value={utr}
                        onChange={(e) => setUtr(e.target.value.toUpperCase())}
                        placeholder="Enter UTR / Transaction ID"
                        maxLength={30}
                        disabled={loading || !!success}
                    />

                    <p className="utr-help">Enter the UTR shown in your UPI payment transaction.</p>

                    {error && <div className="payment-error">{error}</div>}
                    {success && <div className="payment-success">{success}</div>}

                    <button
                        className="submit-utr-btn"
                        onClick={submitUTR}
                        disabled={loading || !!success}
                    >
                        {loading ? "Submitting..." : success ? "UTR Submitted ✓" : "Submit UTR"}
                    </button>
                </div>
            </div>
        </div>
    );
}