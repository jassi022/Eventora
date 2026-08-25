import { useState } from "react";
import api from "../api/axios.js";
import "./LoginSignup.css";

// Generates a fake ticket serial for flavor, e.g. EVT-7K2-9042
function makeSerial() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let block = "";
    for (let i = 0; i < 3; i++) {
        block += chars[Math.floor(Math.random() * chars.length)];
    }
    const num = Math.floor(1000 + Math.random() * 9000);
    return `EVT-${block}-${num}`;
}

export default function LoginSignup({ onAuthSuccess }) {
    const [mode, setMode] = useState("login"); // "login" | "signup" | "otp"
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [serial] = useState(makeSerial);

    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        otp: "",
    });

    const update = (field) => (e) =>
        setForm((f) => ({ ...f, [field]: e.target.value }));

    const handleAuthed = (data) => {
        localStorage.setItem("token", data.token);
        localStorage.setItem(
            "user",
            JSON.stringify({ id: data._id, name: data.name, email: data.email, role: data.role })
        );
        if (onAuthSuccess) onAuthSuccess(data);
        else window.location.href = "/dashboard";
    };

    const submitSignup = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await api.post("/auth/register", {
                name: form.name,
                email: form.email,
                password: form.password,
            });
            setNotice(`We sent a 6-digit code to ${res.data.email}`);
            setMode("otp");
        } catch (err) {
            setError(err.response?.data?.message || "Couldn't create your account. Try again.");
        } finally {
            setLoading(false);
        }
    };

    const submitLogin = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await api.post("/auth/login", {
                email: form.email,
                password: form.password,
            });
            handleAuthed(res.data);
        } catch (err) {
            const msg = err.response?.data?.message;
            if (msg === "Please verify your email before logging in") {
                setNotice(`We sent a new code to ${form.email}`);
                setMode("otp");
            } else {
                setError(msg || "Couldn't log you in. Check your details and try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    const submitOtp = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await api.post("/auth/verify-otp", {
                email: form.email,
                otp: form.otp,
            });
            handleAuthed(res.data);
        } catch (err) {
            setError(err.response?.data?.message || "That code didn't work. Check it and try again.");
        } finally {
            setLoading(false);
        }
    };

    const switchMode = (next) => {
        setError("");
        setNotice("");
        setMode(next);
    };

    return (
        <div className="ticket-stage">
            <div className="ticket">
                <div className="ticket-stub">
                    <span className="stub-eyebrow">Admit One</span>
                    <h1 className="stub-title">
                        EVENT<span>ORA</span>
                    </h1>
                    <p className="stub-copy">
                        {mode === "signup"
                            ? "Get your pass. Find your next event."
                            : mode === "otp"
                                ? "Almost there — confirm it's really you."
                                : "Welcome back. Your seat is waiting."}
                    </p>
                    <div className="stub-serial">
                        <span>NO.</span>
                        <span className="stub-serial-code">{serial}</span>
                    </div>
                </div>

                <div className="ticket-perf" aria-hidden="true"></div>

                <div className="ticket-panel">
                    {mode !== "otp" && (
                        <div className="mode-toggle" role="tablist">
                            <button
                                type="button"
                                role="tab"
                                aria-selected={mode === "login"}
                                className={mode === "login" ? "active" : ""}
                                onClick={() => switchMode("login")}
                            >
                                Log in
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={mode === "signup"}
                                className={mode === "signup" ? "active" : ""}
                                onClick={() => switchMode("signup")}
                            >
                                Sign up
                            </button>
                        </div>
                    )}

                    {error && <div className="alert alert-error">{error}</div>}
                    {notice && !error && <div className="alert alert-notice">{notice}</div>}

                    {mode === "login" && (
                        <form className="ticket-form" onSubmit={submitLogin}>
                            <label>
                                Email
                                <input
                                    type="email"
                                    required
                                    value={form.email}
                                    onChange={update("email")}
                                    placeholder="you@example.com"
                                    autoComplete="email"
                                />
                            </label>
                            <label>
                                Password
                                <input
                                    type="password"
                                    required
                                    value={form.password}
                                    onChange={update("password")}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                />
                            </label>
                            <button className="btn-primary" type="submit" disabled={loading}>
                                {loading ? "Checking…" : "Log in"}
                            </button>
                            <p className="switch-line">
                                New here?{" "}
                                <button type="button" className="link" onClick={() => switchMode("signup")}>
                                    Get your ticket
                                </button>
                            </p>
                        </form>
                    )}

                    {mode === "signup" && (
                        <form className="ticket-form" onSubmit={submitSignup}>
                            <label>
                                Full name
                                <input
                                    type="text"
                                    required
                                    value={form.name}
                                    onChange={update("name")}
                                    placeholder="Jane Doe"
                                    autoComplete="name"
                                />
                            </label>
                            <label>
                                Email
                                <input
                                    type="email"
                                    required
                                    value={form.email}
                                    onChange={update("email")}
                                    placeholder="you@example.com"
                                    autoComplete="email"
                                />
                            </label>
                            <label>
                                Password
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    value={form.password}
                                    onChange={update("password")}
                                    placeholder="At least 6 characters"
                                    autoComplete="new-password"
                                />
                            </label>
                            <button className="btn-primary" type="submit" disabled={loading}>
                                {loading ? "Creating…" : "Create account"}
                            </button>
                            <p className="switch-line">
                                Already have a pass?{" "}
                                <button type="button" className="link" onClick={() => switchMode("login")}>
                                    Log in
                                </button>
                            </p>
                        </form>
                    )}

                    {mode === "otp" && (
                        <form className="ticket-form" onSubmit={submitOtp}>
                            <label>
                                Email
                                <input
                                    type="email"
                                    required
                                    value={form.email}
                                    onChange={update("email")}
                                    placeholder="you@example.com"
                                    autoComplete="email"
                                />
                            </label>
                            <label>
                                6-digit code
                                <input
                                    type="text"
                                    required
                                    inputMode="numeric"
                                    pattern="[0-9]{6}"
                                    maxLength={6}
                                    value={form.otp}
                                    onChange={update("otp")}
                                    placeholder="123456"
                                    className="otp-input"
                                />
                            </label>
                            <button className="btn-primary" type="submit" disabled={loading}>
                                {loading ? "Verifying…" : "Verify & enter"}
                            </button>
                            <p className="switch-line">
                                <button type="button" className="link" onClick={() => switchMode("login")}>
                                    Back to log in
                                </button>
                            </p>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}