import { useEffect, useState } from "react";
import api from "../api/axios";
import BookEventModal from "../components/BookEventModal";
import "./Events.css";

export default function Events() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [bookingEvent, setBookingEvent] = useState(null);
    const [successMsg, setSuccessMsg] = useState("");
    const user = JSON.parse(localStorage.getItem("user"));

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

    const handleBooked = () => {
        setBookingEvent(null);
        loadEvents();
        setSuccessMsg("Booking is still pending it will be confirmed once verified  ! Check My Bookings.");
        setTimeout(() => setSuccessMsg(""), 4000);
    };

    return (
        <div className="events-page">
            <div className="events-header">
                <span className="events-eyebrow">Now Boarding</span>
                <h1 className="events-title">Find your next event</h1>
                {!loading && events.length > 0 && (
                    <p className="events-subtitle">
                        {events.length} event{events.length !== 1 ? "s" : ""} up for grabs — grab your pass before seats run out.
                    </p>
                )}
            </div>

            {error && <div className="events-alert">{error}</div>}
            {successMsg && (
                <div className="events-alert" style={{ background: "rgba(101,213,152,0.12)", color: "#65d598" }}>
                    {successMsg}
                </div>
            )}

            {loading && <p className="events-empty">Loading events…</p>}

            {!loading && events.length === 0 && !error && (
                <p className="events-empty">No events available right now — check back soon.</p>
            )}

            <div className="events-grid">
                {events.map((event) => {
                    const soldOut = event.availableSeats <= 0;
                    return (
                        <div className="event-card" key={event._id}>
                            <div className="event-card-media">
                                {event.imageUrl ? (
                                    <img
                                        src={event.imageUrl}
                                        alt={event.title}
                                        className="event-card-img"
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="event-card-img-placeholder">🎟️</div>
                                )}
                            </div>

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
                                disabled={soldOut}
                                onClick={() => setBookingEvent(event)}
                            >
                                {soldOut ? "Sold out" : "Book now"}
                            </button>
                        </div>
                    );
                })}
            </div>

            {bookingEvent && (
                <BookEventModal
                    eventId={bookingEvent._id}
                    eventTitle={bookingEvent.title}
                    isAdmin={user.role === "admin"}
                    ticketPrice={bookingEvent.ticketPrice}
                    onClose={() => setBookingEvent(null)}
                    onBooked={handleBooked}
                />
            )}
        </div>
    );
}