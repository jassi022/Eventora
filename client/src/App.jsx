import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginSignup from "./pages/LoginSignup";
import Events from "./pages/Events";
import MyBookings from "./pages/MyBookings";
import Admin from "./pages/Admin";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import PassMaster from "./pages/PassesMaster";
import PrmoMaster from "./pages/PromoMaster";
import RightsMaster from "./components/RightsMaster";
import ScanMaster from "./components/ScanMaster";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginSignup />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Events />} />
            <Route path="/my-bookings" element={<MyBookings />} />
            <Route path="/pass-master" element={<PassMaster />} />
            <Route path="/my-promocode" element={<PrmoMaster />} />
            <Route path="/rights-master" element={<RightsMaster />} />
            <Route path="/scan-master" element={<ScanMaster />} />

            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<Admin />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;