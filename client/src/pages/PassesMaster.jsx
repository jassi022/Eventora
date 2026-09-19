    import { useEffect, useState } from "react";
    import api from "../api/axios";
    import "./Admin.css";

    const EMPTY_FORM = {
        name: "",
        description: "",
        price: "",
        TtlPass: "",
        MaxPerBook: "",
        isActive: true,
    };

    export default function PassesMaster() {
        const [passes, setPasses] = useState([]);
        const [loading, setLoading] = useState(true);
        const [error, setError] = useState("");

        const [showForm, setShowForm] = useState(false);
        const [editingId, setEditingId] = useState(null);
        const [form, setForm] = useState(EMPTY_FORM);
        const [saving, setSaving] = useState(false);
        const [formError, setFormError] = useState("");
        const [deletingId, setDeletingId] = useState(null);

        const loadPasses = async () => {
            setLoading(true);
            setError("");
            try {
                const res = await api.get("/passes");
                setPasses(res.data);
            } catch (err) {
                setError(err.response?.data?.message || "Couldn't load passes.");
            } finally {
                setLoading(false);
            }
        };

        useEffect(() => {
            loadPasses();
        }, []);

        const openCreate = () => {
            setEditingId(null);
            setForm(EMPTY_FORM);
            setFormError("");
            setShowForm(true);
        };

        const openEdit = (pass) => {
            setEditingId(pass._id);
            setForm({
                name: pass.name || "",
                description: pass.description || "",
                price: pass.price ?? "",
                TtlPass: pass.TtlPass ?? "",
                MaxPerBook: pass.MaxPerBook ?? 10,
                isActive: pass.isActive ?? true,
            });
            setFormError("");
            setShowForm(true);
        };

        const closeForm = () => {
            setShowForm(false);
            setEditingId(null);
        };

        const updateField = (field) => (e) => {
            const value = field === "isActive" ? e.target.checked : e.target.value;
            setForm((f) => ({ ...f, [field]: value }));
        };

        const submitForm = async (e) => {
            e.preventDefault();
            setSaving(true);
            setFormError("");
            try {
                const payload = {
                    ...form,
                    price: Number(form.price),
                    TtlPass: Number(form.TtlPass),
                    MaxPerBook: Number(form.MaxPerBook) || 10,
                };
                if (editingId) {
                    await api.put(`/passes/${editingId}`, payload);
                } else {
                    await api.post("/passes", payload);
                }
                closeForm();
                await loadPasses();
            } catch (err) {
                setFormError(err.response?.data?.message || "Couldn't save this pass.");
            } finally {
                setSaving(false);
            }
        };

        const deletePass = async (id) => {
            if (!window.confirm("Delete this pass type? This can't be undone.")) return;
            setDeletingId(id);
            setError("");
            try {
                await api.delete(`/passes/${id}`);
                await loadPasses();
            } catch (err) {
                setError(err.response?.data?.message || "Couldn't delete this pass.");
            } finally {
                setDeletingId(null);
            }
        };

        return (
            <div className="admin-page">
                <div className="admin-header">
                    <div>
                        <span className="admin-eyebrow">Backstage</span>
                        <h1 className="admin-title">Passes master</h1>
                    </div>
                    <button className="admin-btn-primary" onClick={openCreate}>
                        + New pass type
                    </button>
                </div>

                {error && <div className="admin-alert">{error}</div>}

                {loading && <p className="admin-empty">Loading passes…</p>}

                {!loading && passes.length === 0 && !error && (
                    <p className="admin-empty">No pass types yet — create your first one.</p>
                )}

                {!loading && passes.length > 0 && (
                    <div className="admin-table-wrap">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Description</th>
                                    <th>Rate</th>
                                    <th>Total Passes</th>
                                    <th>Max/Booking</th>
                                    <th>Status</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {passes.map((pass) => (
                                    <tr key={pass._id}>
                                        <td>{pass.name}</td>
                                        <td>{pass.description || "—"}</td>
                                        <td>₹{pass.price}</td>
                                        <td>{pass.TtlPass}</td>
                                        <td>{pass.MaxPerBook}</td>
                                        <td>
                                            <span
                                                className={`status-badge status-${pass.isActive ? "confirmed" : "cancelled"}`}
                                            >
                                                {pass.isActive ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                        <td className="admin-table-actions">
                                            <button className="admin-link" onClick={() => openEdit(pass)}>
                                                Edit
                                            </button>
                                            <button
                                                className="admin-link admin-link-danger"
                                                onClick={() => deletePass(pass._id)}
                                                disabled={deletingId === pass._id}
                                            >
                                                {deletingId === pass._id ? "Deleting…" : "Delete"}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {showForm && (
                    <div className="admin-modal-backdrop" onClick={closeForm}>
                        <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                            <span className="admin-eyebrow">{editingId ? "Edit pass type" : "New pass type"}</span>
                            <h3 className="admin-modal-title">{form.name || "Untitled pass"}</h3>

                            {formError && <div className="admin-alert">{formError}</div>}

                            <form className="admin-form" onSubmit={submitForm}>
                                <label>
                                    Name
                                    <input required value={form.name} onChange={updateField("name")} placeholder="e.g. VIP, General, Early Bird" />
                                </label>
                                <label>
                                    Description
                                    <textarea rows={3} value={form.description} onChange={updateField("description")} />
                                </label>
                                <div className="admin-form-row">
                                    <label>
                                        Rate (₹)
                                        <input
                                            type="number"
                                            min="0"
                                            required
                                            value={form.price}
                                            onChange={updateField("price")}
                                        />
                                    </label>
                                    <label>
                                        Total passes
                                        <input type="number" min="0" required value={form.TtlPass} onChange={updateField("TtlPass")} />
                                    </label>
                                    <label>
                                        Max per booking
                                        <input type="number" min="1" required value={form.MaxPerBook} onChange={updateField("MaxPerBook")} />
                                    </label>
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={form.isActive}
                                            onChange={updateField("isActive")}
                                            style={{ marginRight: 8 }}
                                        />
                                        Active
                                    </label>
                                </div>

                                <div className="admin-form-actions">
                                    <button type="button" className="admin-btn-ghost" onClick={closeForm}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="admin-btn-primary" disabled={saving}>
                                        {saving ? "Saving…" : editingId ? "Save changes" : "Create pass"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        );
    }