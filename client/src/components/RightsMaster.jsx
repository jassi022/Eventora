import { useEffect, useState } from "react";
import api from "../api/axios";
import "../pages/Admin.css";

const PAGE_NAMES = {
    5005: "Events (Admin)",
    5010: "Pass Master",
    5015: "PromoCode",
    5020: "Rights Master",
    5025: "Scan Master",
    5030: "User Master",
    5035: "Bookings (Approve/Cancel)",
};

export default function RightsMaster() {
    const [rights, setRights] = useState([]);
    const [staffUsers, setStaffUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [selectedUser, setSelectedUser] = useState("");
    const [selectedPage, setSelectedPage] = useState("");
    const [perms, setPerms] = useState({ CanAdd: false, CanEdit: false, CanView: false, CanDelete: false });
    const [saving, setSaving] = useState(false);
    const [saveNotice, setSaveNotice] = useState("");

    const loadAll = async () => {
        setLoading(true);
        setError("");
        try {
            const [rightsRes, usersRes] = await Promise.all([
                api.get("/rights/all"),
                api.get("/user-master"),
            ]);
            setRights(rightsRes.data);
            setStaffUsers(usersRes.data);
        } catch (err) {
            setError(err.response?.data?.message || "Couldn't load rights.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAll();
    }, []);

    useEffect(() => {
        if (!selectedUser || !selectedPage) {
            setPerms({ CanAdd: false, CanEdit: false, CanView: false, CanDelete: false });
            return;
        }
        const existing = rights.find(
            (r) => r.UsrId?._id === selectedUser && r.PageId === Number(selectedPage)
        );
        setPerms(
            existing
                ? { CanAdd: existing.CanAdd, CanEdit: existing.CanEdit, CanView: existing.CanView, CanDelete: existing.CanDelete }
                : { CanAdd: false, CanEdit: false, CanView: false, CanDelete: false }
        );
    }, [selectedUser, selectedPage, rights]);

    const togglePerm = (key) => setPerms((p) => ({ ...p, [key]: !p[key] }));

    const saveRight = async () => {
        if (!selectedUser || !selectedPage) return;
        setSaving(true);
        setSaveNotice("");
        try {
            await api.post("/rights", {
                userId: selectedUser,
                pageId: Number(selectedPage),
                ...perms,
            });
            setSaveNotice("✅ Rights saved!");
            await loadAll();
            setTimeout(() => setSaveNotice(""), 2500);
        } catch (err) {
            setError(err.response?.data?.message || "Couldn't save rights.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="admin-page">
            <div className="admin-header">
                <div>
                    <span className="admin-eyebrow">Backstage</span>
                    <h1 className="admin-title">Rights Master</h1>
                </div>
            </div>

            {error && <div className="admin-alert">{error}</div>}

            <div className="rights-form-card">
                <div className="rights-form-row">
                    <label className="rights-select-label">
                        User
                        <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
                            <option value="">Select user…</option>
                            {staffUsers.map((u) => (
                                <option key={u._id} value={u._id}>
                                    {u.name} — ID {u.UsrTyp} ({u.email})
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="rights-select-label">
                        Page
                        <select value={selectedPage} onChange={(e) => setSelectedPage(e.target.value)}>
                            <option value="">Select page…</option>
                            {Object.entries(PAGE_NAMES).map(([id, name]) => (
                                <option key={id} value={id}>
                                    {name} — {id}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                {selectedUser && selectedPage && (
                    <>
                        <div className="rights-perm-grid">
                            {[
                                { key: "CanView", label: "View" },
                                { key: "CanAdd", label: "Add" },
                                { key: "CanEdit", label: "Edit" },
                                { key: "CanDelete", label: "Delete" },
                            ].map(({ key, label }) => (
                                <button
                                    type="button"
                                    key={key}
                                    className={`rights-perm-toggle ${perms[key] ? "rights-perm-on" : ""}`}
                                    onClick={() => togglePerm(key)}
                                >
                                    <span className="rights-perm-check">{perms[key] ? "✓" : ""}</span>
                                    {label}
                                </button>
                            ))}
                        </div>

                        {saveNotice && (
                            <div className="admin-alert" style={{ background: "rgba(101,213,152,0.12)", color: "#65d598" }}>
                                {saveNotice}
                            </div>
                        )}

                        <button className="admin-btn-primary" onClick={saveRight} disabled={saving}>
                            {saving ? "Saving…" : "Save Rights"}
                        </button>
                    </>
                )}
            </div>

            {loading && <p className="admin-empty">Loading rights…</p>}
            {!loading && rights.length === 0 && <p className="admin-empty">No rights assigned yet.</p>}

            {!loading && rights.length > 0 && (
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>ID</th>
                                <th>Page</th>
                                <th>View</th>
                                <th>Add</th>
                                <th>Edit</th>
                                <th>Delete</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rights.map((r) => (
                                <tr key={r._id}>
                                    <td>{r.UsrId?.name || "—"}</td>
                                    <td><span className="ticket-code">{r.UsrId?.UsrTyp}</span></td>
                                    <td>{PAGE_NAMES[r.PageId] || `Page ${r.PageId}`}</td>
                                    <td>{r.CanView ? "✅" : "—"}</td>
                                    <td>{r.CanAdd ? "✅" : "—"}</td>
                                    <td>{r.CanEdit ? "✅" : "—"}</td>
                                    <td>{r.CanDelete ? "✅" : "—"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}