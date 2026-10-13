import { Navigate, Route, Routes } from "react-router-dom";
import AdminLogin from "./pages/admin/Login";
import CommandsAdmin from "./pages/admin/CommandsAdmin";
import Moderation from "./pages/admin/Moderation";
import Consent from "./pages/Consent";
import Home from "./pages/Home";
import Record from "./pages/Record";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/consent" element={<Consent />} />
      <Route path="/record" element={<Record />} />
      <Route path="/admin" element={<Navigate to="/admin/commands" replace />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/commands" element={<CommandsAdmin />} />
      <Route path="/admin/moderation" element={<Moderation />} />
    </Routes>
  );
}
