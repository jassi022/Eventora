import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "./Layout.css";

export default function Layout() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user") || "null");

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/", { replace: true });
    };

    return (
        <div className="app-shell">
            <header className="app-nav">
                <span className="app-nav-brand">
                    EVENT<span>ORA</span>
                </span>

                <nav className="app-nav-links">
                    <NavLink
                        to="/dashboard"
                        className={({ isActive }) => `app-nav-link${isActive ? " active" : ""}`}
                    >
                        Events
                    </NavLink>
                    <NavLink
                        to="/my-bookings"
                        className={({ isActive }) => `app-nav-link${isActive ? " active" : ""}`}
                    >
                        My Bookings
                    </NavLink>
                    {user?.role === "admin" && (
                        <NavLink
                            to="/admin"
                            className={({ isActive }) => `app-nav-link${isActive ? " active" : ""}`}
                        >
                            Admin
                        </NavLink>

                    )}
                    {user?.role === "admin" && (
                    <NavLink
                            to="/pass-master"
                            className={({ isActive }) => `app-nav-link${isActive ? " active" : ""}`}
                        >
                            Pass Master
                        </NavLink>
                    )}
                </nav>

                <div className="app-nav-user">
                    {user?.name && <span className="app-nav-name">{user.name}</span>}
                    <button className="app-nav-logout" onClick={logout}>
                        Log out
                    </button>
                </div>
            </header>

            <main className="app-main">
                <Outlet />
            </main>
        </div>
    );
}