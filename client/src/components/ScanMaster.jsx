import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import api from "../api/axios";
import "./ScanMaster.css";

export default function ScanMaster() {
    const [mode, setMode] = useState(null); // null | "camera" | "manual"
    const [code, setCode] = useState("");
    const [ticket, setTicket] = useState(null);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [cameraError, setCameraError] = useState("");
    const [scanning, setScanning] = useState(false);

    const [stats, setStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [scanKey, setScanKey] = useState(0);

    const scannerRef = useRef(null);
    const scannerId = "scan-master-camera";

    const loadStats = async () => {
        setStatsLoading(true);
        try {
            const res = await api.get("/bookings/scan-stats");
            setStats(res.data);
        } catch {
            // silently ignore — dashboard is a nice-to-have, not critical
        } finally {
            setStatsLoading(false);
        }
    };

    useEffect(() => {
        loadStats();
    }, []);

    const fetchTicket = async (tktCod) => {
        if (!tktCod?.trim()) return;
        setLoading(true);
        setError("");
        setNotice("");
        setTicket(null);
        try {
            const res = await api.get(`/bookings/scan/${tktCod.trim()}`);
            setTicket(res.data);
        } catch (err) {
            setError(err.response?.data?.message || "Ticket not found.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (mode !== "camera" || ticket) return;

        const qr = new Html5Qrcode(scannerId);
        scannerRef.current = qr;
        setCameraError("");

        let isMounted = true;
        let hasStopped = false; // ⬅️ naya flag

        const safeStop = async () => {
            if (hasStopped) return;
            hasStopped = true;
            try {
                await qr.stop();
                await qr.clear();
            } catch (e) {
                console.log('Scanner stop skipped:', e?.message);
            }
        };

        qr.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 240, height: 240 } },
            async (decodedText) => {
                if (!isMounted) return;
                await safeStop();
                setScanning(false);
                fetchTicket(decodedText);
            },
            () => {}
        )
            .then(() => {
                if (isMounted) setScanning(true);
            })
            .catch((err) => {
                setCameraError("Camera access nahi mil payi. Manual entry use karo, ya browser permissions check karo.");
                console.error(err);
            });

        return () => {
            isMounted = false;
            safeStop();
        };
    }, [mode, ticket]);

    const goToChoice = () => {
        setMode(null);
        setTicket(null);
        setError("");
        setNotice("");
        setCode("");
        setCameraError("");
        setScanKey((k) => k + 1);   // ⬅️ YEH LINE BHI ADD KARO
    };

    const restartScan = () => {
        setTicket(null);
        setError("");
        setNotice("");
        setCode("");
        setScanKey((k) => k + 1);   // ⬅️ YEH LINE ADD KARO
    };

    const verify = async () => {
        if (!ticket?.TktCod) return; // safety check
        setVerifying(true);
        setError("");
        setNotice("");
        try {
            const res = await api.post(`/bookings/scan/${ticket.TktCod}/verify`);
            setNotice(res?.data?.message || "✅ Ticket verified successfully!");
            setTicket((t) => (t ? { ...t, TktStat: 409 } : t));
            loadStats();
        } catch (err) {
            if (err?.response?.status === 409) {
                setError("⚠️ This ticket has already been verified.");
                setTicket((t) => (t ? { ...t, TktStat: 409 } : t));
            } else {
                setError(err?.response?.data?.message || "Couldn't verify ticket.");
            }
        } finally {
            setVerifying(false);
        }
    };

    const scanPercent = stats && stats.total > 0
        ? Math.round((stats.scanned / stats.total) * 100)
        : 0;

    return (
        <div className="scan-page">
            <div className="scan-header">
                <span className="scan-eyebrow">Backstage</span>
                <h1 className="scan-title">Scan Tickets</h1>
            </div>

            {/* ---- Dashboard ---- */}
            <div className="scan-dashboard">
                {statsLoading ? (
                    <div className="scan-dash-loading">Loading stats…</div>
                ) : stats ? (
                    <>
                        <div className="scan-dash-card">
                            <span className="scan-dash-label">Total Tickets</span>
                            <span className="scan-dash-value">{stats.total}</span>
                        </div>
                        <div className="scan-dash-card scan-dash-scanned">
                            <span className="scan-dash-label">Scanned</span>
                            <span className="scan-dash-value">{stats.scanned}</span>
                        </div>
                        <div className="scan-dash-card scan-dash-pending">
                            <span className="scan-dash-label">Not Scanned</span>
                            <span className="scan-dash-value">{stats.notScanned}</span>
                        </div>
                        <div className="scan-dash-progress-card">
                            <div className="scan-dash-progress-top">
                                <span className="scan-dash-label">Entry Progress</span>
                                <span className="scan-dash-percent">{scanPercent}%</span>
                            </div>
                            <div className="scan-dash-progress-track">
                                <div
                                    className="scan-dash-progress-fill"
                                    style={{ width: `${scanPercent}%` }}
                                />
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="scan-dash-loading">Stats unavailable.</div>
                )}
            </div>

            {/* ---- Choice screen ---- */}
            {mode === null && (
                <div className="scan-choice-wrap">
                    <button className="scan-choice-card" onClick={() => setMode("camera")}>
                        <span className="scan-choice-icon">📷</span>
                        <span className="scan-choice-title">Scan by QR</span>
                        <span className="scan-choice-sub">Camera se QR code scan karo</span>
                    </button>
                    <button className="scan-choice-card" onClick={() => setMode("manual")}>
                        <span className="scan-choice-icon">⌨️</span>
                        <span className="scan-choice-title">By Ticket No.</span>
                        <span className="scan-choice-sub">Ticket number type karke dhoondo</span>
                    </button>
                </div>
            )}

            {mode !== null && (
                <>
                    <div className="scan-mode-toggle">
                        <button className="scan-back-btn" onClick={goToChoice}>← Back</button>
                        <button
                            className={`scan-mode-btn ${mode === "camera" ? "scan-mode-active" : ""}`}
                            onClick={() => { setMode("camera"); restartScan(); }}
                        >
                            📷 Camera Scan
                        </button>
                        <button
                            className={`scan-mode-btn ${mode === "manual" ? "scan-mode-active" : ""}`}
                            onClick={() => { setMode("manual"); restartScan(); }}
                        >
                            ⌨️ Manual Entry
                        </button>
                    </div>

                    <div className="scan-panel">
                        {mode === "camera" && !ticket && (
                            <div className="scan-camera-wrap">
                                <div className="scan-camera-frame">
                                    <div id={scannerId} key={scanKey} className="scan-camera-box" />   {/* ⬅️ key={scanKey} add karo */}
                                    <div className="scan-camera-corner scan-corner-tl" />
                                    <div className="scan-camera-corner scan-corner-tr" />
                                    <div className="scan-camera-corner scan-corner-bl" />
                                    <div className="scan-camera-corner scan-corner-br" />
                                </div>
                                {scanning && <p className="scan-hint">Keep QR Code In The Frame...</p>}
                                {cameraError && <div className="scan-alert scan-alert-error">{cameraError}</div>}
                            </div>
                        )}

                        {mode === "manual" && !ticket && (
                            <div className="scan-manual-wrap">
                                <label className="scan-field">
                                    Ticket code
                                    <input
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        placeholder="TKT-XXXXXXXX-XXXXXX"
                                        onKeyDown={(e) => e.key === "Enter" && fetchTicket(code)}
                                        autoFocus
                                    />
                                </label>
                                <button className="scan-btn-primary" onClick={() => fetchTicket(code)} disabled={loading}>
                                    {loading ? "Looking up…" : "Look up ticket"}
                                </button>
                            </div>
                        )}

                        {loading && mode === "camera" && (
                            <p className="scan-hint">Looking up ticket…</p>
                        )}

                        {error && !ticket && <div className="scan-alert scan-alert-error">{error}</div>}
                    </div>
                </>
            )}

            {/* ---- Result popup ---- */}
            {ticket && (
                <div className="scan-overlay" onClick={restartScan}>
                    <div className="scan-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="scan-modal-close" onClick={restartScan}>×</button>

                        <span className="scan-modal-eyebrow">
                            {ticket.TktStat === 409 ? "Already Used" : "Ticket Found"}
                        </span>
                        <h2 className="scan-modal-title">{ticket.eventTitle}</h2>
                        <p className="scan-modal-sub">Booked for: {ticket.bookedFor}</p>

                        <div className="scan-pass-list">
                            {ticket.passLines.map((p, i) => (
                                <div className="scan-pass-row" key={i}>
                                    <span className="scan-pass-name">{p.name}</span>
                                    <span className="scan-pass-qty">x {p.qty}</span>
                                    <span className="scan-pass-amt">₹{p.qty * p.rate}</span>
                                </div>
                            ))}
                        </div>

                        <div className="scan-total-row">
                            <span>Total</span>
                            <strong>₹{ticket.amount}</strong>
                        </div>

                        <div className="scan-status-row">
                            <span
                                className={`status-badge status-${ticket.TktStat === 409 ? "cancelled" : "confirmed"
                                    }`}
                            >
                                {ticket.TktStat === 409 ? "Already used" : "Valid — not used"}
                            </span>
                        </div>

                        {notice && <div className="scan-alert scan-alert-success">{notice}</div>}
                        {error && <div className="scan-alert scan-alert-error">{error}</div>}

                        {ticket.TktStat !== 409 ? (
                            <div className="scan-modal-actions">
                                <button className="scan-btn-ghost" onClick={restartScan}>
                                    Cancel
                                </button>
                                <button className="scan-btn-primary" onClick={verify} disabled={verifying}>
                                    {verifying ? "Verifying…" : "✓ Confirm & Verify"}
                                </button>
                            </div>
                        ) : (
                            <button className="scan-btn-primary" onClick={restartScan} style={{ marginTop: 8 }}>
                                Scan next ticket
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}