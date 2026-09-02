import { Navigate, Outlet } from "react-router-dom";

export default function AdminRoute() {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");

    if (!token) return <Navigate to="/" replace />;
    if (user?.role !== "admin") return <Navigate to="/dashboard" replace />;

    return <Outlet />;
}