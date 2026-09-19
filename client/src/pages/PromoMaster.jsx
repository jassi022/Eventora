import { useEffect, useState } from "react";
import api from "../api/axios";
import "./Admin.css";

const EMPTY_FORM = {
    Cod: "",
    Typ: "percent",
    Val: "",
    MinAmt: "",
    ExpDt: "",
    IsActv: true,
};

export default function PromoMaster() {
    const [promos, setPromos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");
    const [deletingId, setDeletingId] = useState(null);

    const loadPromos = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await api.get("/promos");
            setPromos(res.data);
        } catch (err) {
            setError(err.response?.data?.message || "Couldn't load promo codes.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPromos();
    }, []);

    const openCreate = () => {
        setEditingId(null);
        setForm(EMPTY_FORM);
        setFormError("");
        setShowForm(true);
    };

    const openEdit = (promo) => {
        setEditingId(promo._id);
        setForm({
            Cod: promo.Cod || "",
            Typ: promo.Typ || "percent",
            Val: promo.Val ?? "",
            MinAmt: promo.MinAmt ?? "",
            ExpDt: promo.ExpDt ? promo.ExpDt.slice(0, 10) : "",
            IsActv: promo.IsActv ?? true,
        });
        setFormError("");
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        setEditingId(null);
    };

    const updateField = (field) => (e) => {
        const value = field === "IsActv" ? e.target.checked : e.target.value;
        setForm((f) => ({ ...f, [field]: value }));
    };

    const submitForm = async (e) => {
        e.preventDefault();
        setSaving(true);
        setFormError("");
        try {
            const payload = {
                ...form,
                Cod: form.Cod.trim().toUpperCase(),
                Val: Number(form.Val),
                MinAmt: Number(form.MinAmt),
            };
            if (editingId) {
                await api.put(`/promos/${editingId}`, payload);
            } else {
                await api.post("/promos", payload);
            }
            closeForm();
            await loadPromos();
        } catch (err) {
            setFormError(err.response?.data?.message || "Couldn't save this promo code.");
        } finally {
            setSaving(false);
        }
    };

    const deletePromo = async (id) => {
        if (!window.confirm("Delete this promo code? This can't be undone.")) return;
        setDeletingId(id);
        setError("");
        try {
            await api.delete(`/promos/${id}`);
            await loadPromos();
        } catch (err) {
            setError(err.response?.data?.message || "Couldn't delete this promo code.");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="admin-page">
            <div className="admin-header">
                <div>
                    <span className="admin-eyebrow">Backstage</span>
                    <h1 className="admin-title">Promo codes</h1>
                </div>
                <button className="admin-btn-primary" onClick={openCreate}>
                    + New promo code
                </button>
            </div>

            {error && <div className="admin-alert">{error}</div>}
            {loading && <p className="admin-empty">Loading promo codes…</p>}
            {!loading && promos.length === 0 && !error && (
                <p className="admin-empty">No promo codes yet — create your first one.</p>
            )}

            {!loading && promos.length > 0 && (
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Type</th>
                                <th>Value</th>
                                <th>Min. order</th>
                                <th>Expires</th>
                                <th>Status</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {promos.map((promo) => {
                                const expired = new Date(promo.ExpDt) < new Date();
                                return (
                                    <tr key={promo._id}>
                                        <td>{promo.Cod}</td>
                                        <td>{promo.Typ === "percent" ? "Percent" : "Flat amount"}</td>
                                        <td>{promo.Typ === "percent" ? `${promo.Val}%` : `₹${promo.Val}`}</td>
                                        <td>₹{promo.MinAmt}</td>
                                        <td>
                                            {new Date(promo.ExpDt).toLocaleDateString(undefined, {
                                                day: "numeric", month: "short", year: "numeric",
                                            })}
                                        </td>
                                        <td>
                                            <span className={`status-badge status-${promo.IsActv && !expired ? "confirmed" : "cancelled"}`}>
                                                {expired ? "Expired" : promo.IsActv ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                        <td className="admin-table-actions">
                                            <button className="admin-link" onClick={() => openEdit(promo)}>Edit</button>
                                            <button
                                                className="admin-link admin-link-danger"
                                                onClick={() => deletePromo(promo._id)}
                                                disabled={deletingId === promo._id}
                                            >
                                                {deletingId === promo._id ? "Deleting…" : "Delete"}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {showForm && (
                <div className="admin-modal-backdrop" onClick={closeForm}>
                    <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                        <span className="admin-eyebrow">{editingId ? "Edit promo code" : "New promo code"}</span>
                        <h3 className="admin-modal-title">{form.Cod || "Untitled code"}</h3>

                        {formError && <div className="admin-alert">{formError}</div>}

                        <form className="admin-form" onSubmit={submitForm}>
                            <label>
                                Code
                                <input required value={form.Cod} onChange={updateField("Cod")} placeholder="e.g. FEST100" />
                            </label>

                            <div className="admin-form-row">
                                <label>
                                    Type
                                    <select value={form.Typ} onChange={updateField("Typ")}>
                                        <option value="percent">Percent (%)</option>
                                        <option value="amount">Flat amount (₹)</option>
                                    </select>
                                </label>
                                <label>
                                    Value {form.Typ === "percent" ? "(%)" : "(₹)"}
                                    <input type="number" min="0" required value={form.Val} onChange={updateField("Val")} />
                                </label>
                            </div>

                            <div className="admin-form-row">
                                <label>
                                    Valid on orders more than (₹)
                                    <input type="number" min="0" required value={form.MinAmt} onChange={updateField("MinAmt")} />
                                </label>
                                <label>
                                    Expiry date
                                    <input type="date" required value={form.ExpDt} onChange={updateField("ExpDt")} />
                                </label>
                            </div>

                            <label>
                                <input type="checkbox" checked={form.IsActv} onChange={updateField("IsActv")} style={{ marginRight: 8 }} />
                                Active
                            </label>

                            <div className="admin-form-actions">
                                <button type="button" className="admin-btn-ghost" onClick={closeForm}>Cancel</button>
                                <button type="submit" className="admin-btn-primary" disabled={saving}>
                                    {saving ? "Saving…" : editingId ? "Save changes" : "Create promo code"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}