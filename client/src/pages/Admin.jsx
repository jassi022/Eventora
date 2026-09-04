import { useEffect, useState } from "react";
import api from "../api/axios";
import "./Admin.css";

const EMPTY_FORM = {
    title: "",
    description: "",
    date: "",
    location: "",
    category: "",
    totalSeats: "",
    availableSeats: "",
    ticketPrice: "",
    imageUrl: "",
};

export default function Admin() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null); // null = creating new
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");
    const [deletingId, setDeletingId] = useState(null);

    const loadEvents = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await api.get("/events");
            setEvents(res.data);
        } catch (err) {
            setError(err.response?.data?.error || "Couldn't load events.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadEvents();
    }, []);

    const openCreate = () => {
        setEditingId(null);
        setForm(EMPTY_FORM);
        setFormError("");
        setShowForm(true);
    };

    const openEdit = (event) => {
        setEditingId(event._id);
        setForm({
            title: event.title || "",
            description: event.description || "",
            date: event.date ? event.date.slice(0, 10) : "",
            location: event.location || "",
            category: event.category || "",
            totalSeats: event.totalSeats ?? "",
            availableSeats: event.availableSeats ?? "",
            ticketPrice: event.ticketPrice ?? "",
            imageUrl: event.imageUrl || "",
        });
        setFormError("");
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        setEditingId(null);
    };

    const updateField = (field) => (e) =>
        setForm((f) => ({ ...f, [field]: e.target.value }));

    const submitForm = async (e) => {
        e.preventDefault();
        setSaving(true);
        setFormError("");
        try {
            const payload = {
                ...form,
                totalSeats: Number(form.totalSeats),
                availableSeats: Number(form.availableSeats || form.totalSeats),
                ticketPrice: Number(form.ticketPrice),
            };
            if (editingId) {
                await api.put(`/events/${editingId}`, payload);
            } else {
                await api.post("/events", payload);
            }
            closeForm();
            await loadEvents();
        } catch (err) {
            setFormError(err.response?.data?.error || "Couldn't save this event.");
        } finally {
            setSaving(false);
        }
    };

    const deleteEvent = async (id) => {
        if (!window.confirm("Delete this event? This can't be undone.")) return;
        setDeletingId(id);
        setError("");
        try {
            await api.delete(`/events/${id}`);
            await loadEvents();
        } catch (err) {
            setError(err.response?.data?.error || "Couldn't delete this event.");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="admin-page">
            <div className="admin-header">
                <div>
                    <span className="admin-eyebrow">Backstage</span>
                    <h1 className="admin-title">Manage events</h1>
                </div>
                <button className="admin-btn-primary" onClick={openCreate}>
                    + New event
                </button>
            </div>

            {error && <div className="admin-alert">{error}</div>}

            {loading && <p className="admin-empty">Loading events…</p>}

            {!loading && events.length === 0 && !error && (
                <p className="admin-empty">No events yet — create your first one.</p>
            )}

            {!loading && events.length > 0 && (
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Date</th>
                                <th>Location</th>
                                <th>Price</th>
                                <th>Seats</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {events.map((event) => (
                                <tr key={event._id}>
                                    <td>{event.title}</td>
                                    <td>
                                        {event.date
                                            ? new Date(event.date).toLocaleDateString(undefined, {
                                                day: "numeric",
                                                month: "short",
                                                year: "numeric",
                                            })
                                            : "—"}
                                    </td>
                                    <td>{event.location || "—"}</td>
                                    <td>₹{event.ticketPrice}</td>
                                    <td>{event.totalSeats}</td>
                                    <td className="admin-table-actions">
                                        <button className="admin-link" onClick={() => openEdit(event)}>
                                            Edit
                                        </button>
                                        <button
                                            className="admin-link admin-link-danger"
                                            onClick={() => deleteEvent(event._id)}
                                            disabled={deletingId === event._id}
                                        >
                                            {deletingId === event._id ? "Deleting…" : "Delete"}
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
                        <span className="admin-eyebrow">{editingId ? "Edit event" : "New event"}</span>
                        <h3 className="admin-modal-title">{form.title || "Untitled event"}</h3>

                        {formError && <div className="admin-alert">{formError}</div>}

                        <form className="admin-form" onSubmit={submitForm}>
                            <label>
                                Title
                                <input required value={form.title} onChange={updateField("title")} />
                            </label>
                            <label>
                                Description
                                <textarea rows={3} value={form.description} onChange={updateField("description")} />
                            </label>
                            <div className="admin-form-row">
                                <label>
                                    Date
                                    <input type="date" required value={form.date} onChange={updateField("date")} />
                                </label>
                                <label>
                                    Location
                                    <input value={form.location} onChange={updateField("location")} />
                                </label>
                            </div>
                            <div className="admin-form-row">
                                <label>
                                    Category
                                    <input value={form.category} onChange={updateField("category")} />
                                </label>
                                <label>
                                    Ticket price (₹)
                                    <input
                                        type="number"
                                        min="0"
                                        required
                                        value={form.ticketPrice}
                                        onChange={updateField("ticketPrice")}
                                    />
                                </label>
                            </div>
                            <div className="admin-form-row">
                                <label>
                                    Total seats
                                    <input
                                        type="number"
                                        min="0"
                                        required
                                        value={form.totalSeats}
                                        onChange={updateField("totalSeats")}
                                    />
                                </label>
                                <label>
                                    Available seats
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="Same as total if left blank"
                                        value={form.availableSeats}
                                        onChange={updateField("availableSeats")}
                                    />
                                </label>
                            </div>
                            <label>
                                Image URL
                                <input value={form.imageUrl} onChange={updateField("imageUrl")} placeholder="https://…" required />
                            </label>

                            <div className="admin-form-actions">
                                <button type="button" className="admin-btn-ghost" onClick={closeForm}>
                                    Cancel
                                </button>
                                <button type="submit" className="admin-btn-primary" disabled={saving}>
                                    {saving ? "Saving…" : editingId ? "Save changes" : "Create event"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}