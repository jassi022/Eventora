import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import api from "../api/axios";
import "./Layout.css";

const PAGE_IDS = {
    EVENTS_MASTER: 5005,
    PASS_MASTER: 5010,
    PROMO_MASTER: 5015,
    RIGHTS_MASTER: 5020,
    SCAN_MASTER: 5025,
    USER_MASTER: 5030,
    BOOKINGS_MASTER: 5035,
};

export default function Layout() {
    const navigate = useNavigate();

    const user = JSON.parse(
        localStorage.getItem("user") || "null"
    );

    const [mobileOpen, setMobileOpen] = useState(false);

    const [rights, setRights] = useState([]);
    const [isSuperadmin, setIsSuperadmin] = useState(false);
    const [rightsLoading, setRightsLoading] = useState(true);

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        navigate("/", { replace: true });
    };

    const closeMobile = () => {
        setMobileOpen(false);
    };

    useEffect(() => {
        const loadMyRights = async () => {
            try {
                setRightsLoading(true);

                const res = await api.get("/rights/my");

                setRights(res.data.rights || []);
                setIsSuperadmin(res.data.isSuperadmin || false);
            } catch (error) {
                console.error(
                    "Error loading user rights:",
                    error
                );

                setRights([]);
                setIsSuperadmin(false);
            } finally {
                setRightsLoading(false);
            }
        };

        loadMyRights();
    }, []);

    const canView = (pageId) => {
        // Superadmin ko sab access
        if (isSuperadmin || user?.UsrTyp === 500) {
            return true;
        }

        const right = rights.find(
            (r) => Number(r.PageId) === Number(pageId)
        );

        return !!right?.CanView;
    };

    return (
        <div className="app-shell">

            <button
                className="app-mobile-toggle"
                onClick={() =>
                    setMobileOpen((v) => !v)
                }
                aria-label="Toggle menu"
            >
                {mobileOpen ? "×" : "☰"}
            </button>


            {mobileOpen && (
                <div
                    className="app-sidebar-backdrop"
                    onClick={closeMobile}
                />
            )}


            <aside
                className={`app-sidebar ${
                    mobileOpen
                        ? "app-sidebar-open"
                        : ""
                }`}
            >

                <div className="app-sidebar-brand">
                    EVENT<span>ORA</span>
                </div>


                <nav className="app-sidebar-links">

                    {/* EVENTS */}
                    <NavLink
                        to="/dashboard"
                        onClick={closeMobile}
                        className={({ isActive }) =>
                            `app-sidebar-link${
                                isActive
                                    ? " active"
                                    : ""
                            }`
                        }
                    >
                        <span className="app-sidebar-icon">
                            🎫
                        </span>

                        Events
                    </NavLink>


                    {/* MY BOOKINGS */}
                    <NavLink
                        to="/my-bookings"
                        onClick={closeMobile}
                        className={({ isActive }) =>
                            `app-sidebar-link${
                                isActive
                                    ? " active"
                                    : ""
                            }`
                        }
                    >
                        <span className="app-sidebar-icon">
                            📋
                        </span>

                        My Bookings
                    </NavLink>


                    {/* ADMIN SECTION */}
                    {(isSuperadmin ||
                        canView(PAGE_IDS.EVENTS_MASTER) ||
                        canView(PAGE_IDS.PASS_MASTER) ||
                        canView(PAGE_IDS.PROMO_MASTER) ||
                        canView(PAGE_IDS.RIGHTS_MASTER) ||
                        canView(PAGE_IDS.SCAN_MASTER) ||
                        canView(PAGE_IDS.USER_MASTER) ||
                        canView(PAGE_IDS.BOOKINGS_MASTER)) && (

                        <>
                            <div className="app-sidebar-divider">
                                <span>
                                    Admin
                                </span>
                            </div>


                            {/* ADMIN HOME */}
                            {isSuperadmin && (
                                <NavLink
                                    to="/admin"
                                    onClick={closeMobile}
                                    className={({ isActive }) =>
                                        `app-sidebar-link${
                                            isActive
                                                ? " active"
                                                : ""
                                        }`
                                    }
                                >
                                    <span className="app-sidebar-icon">
                                        🛠️
                                    </span>

                                    Admin
                                </NavLink>
                            )}


                            {/* PASS MASTER */}
                            {canView(
                                PAGE_IDS.PASS_MASTER
                            ) && (
                                <NavLink
                                    to="/pass-master"
                                    onClick={closeMobile}
                                    className={({ isActive }) =>
                                        `app-sidebar-link${
                                            isActive
                                                ? " active"
                                                : ""
                                        }`
                                    }
                                >
                                    <span className="app-sidebar-icon">
                                        🎟️
                                    </span>

                                    Pass Master
                                </NavLink>
                            )}


                            {/* PROMO CODE */}
                            {canView(
                                PAGE_IDS.PROMO_MASTER
                            ) && (
                                <NavLink
                                    to="/my-promocode"
                                    onClick={closeMobile}
                                    className={({ isActive }) =>
                                        `app-sidebar-link${
                                            isActive
                                                ? " active"
                                                : ""
                                        }`
                                    }
                                >
                                    <span className="app-sidebar-icon">
                                        🏷️
                                    </span>

                                    PromoCode
                                </NavLink>
                            )}


                            {/* RIGHTS MASTER */}
                            {canView(
                                PAGE_IDS.RIGHTS_MASTER
                            ) && (
                                <NavLink
                                    to="/rights-master"
                                    onClick={closeMobile}
                                    className={({ isActive }) =>
                                        `app-sidebar-link${
                                            isActive
                                                ? " active"
                                                : ""
                                        }`
                                    }
                                >
                                    <span className="app-sidebar-icon">
                                        🔐
                                    </span>

                                    Rights Master
                                </NavLink>
                            )}


                            {/* SCAN MASTER */}
                            {canView(
                                PAGE_IDS.SCAN_MASTER
                            ) && (
                                <NavLink
                                    to="/scan-master"
                                    onClick={closeMobile}
                                    className={({ isActive }) =>
                                        `app-sidebar-link${
                                            isActive
                                                ? " active"
                                                : ""
                                        }`
                                    }
                                >
                                    <span className="app-sidebar-icon">
                                        📷
                                    </span>

                                    Scan Master
                                </NavLink>
                            )}

                        </>
                    )}

                </nav>


                <div className="app-sidebar-user">

                    {user?.name && (
                        <span className="app-sidebar-name">
                            {user.name}
                        </span>
                    )}

                    <button
                        className="app-sidebar-logout"
                        onClick={logout}
                    >
                        Log out
                    </button>

                </div>

            </aside>


            <main className="app-main">
                {rightsLoading ? (
                    <div
                        style={{
                            padding: "30px",
                        }}
                    >
                        Loading permissions...
                    </div>
                ) : (
                    <Outlet />
                )}
            </main>

        </div>
    );
}