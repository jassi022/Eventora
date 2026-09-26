export const PAGES = {
    EVENTS_MASTER: 5005,
    PASS_MASTER: 5010,
    PROMO_MASTER: 5015,
    RIGHTS_MASTER: 5020,
    SCAN_MASTER: 5025,
    USER_MASTER: 5030,
    BOOKINGS_MASTER: 5035,
};

export const PAGE_NAMES = {
    5005: "Events (Admin)",
    5010: "Pass Master",
    5015: "PromoCode",
    5020: "Rights Master",
    5025: "Scan Master",
    5030: "User Master",
    5035: "Bookings (Approve/Cancel)",
};

export const pageName = (id) => PAGE_NAMES[id] || `Page ${id}`;