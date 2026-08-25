import axios from "axios";

// Set VITE_API_URL in client/.env if your backend isn't on localhost:5000
// e.g. VITE_API_URL=http://localhost:5000/api
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
    baseURL: BASE_URL,
    headers: { "Content-Type": "application/json" },
});

// Attach the saved auth token (set by LoginSignup on success) to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;