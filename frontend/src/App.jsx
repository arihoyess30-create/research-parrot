import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Workflow from "./pages/Workflow";
import Payment from "./pages/Payment";
import AdminPanel from "./pages/AdminPanel";
import "./index.css";

function PrivateRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { user } = useAuth();
  return user?.is_admin ? children : <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Navbar />
      <Routes>
        <Route path="/"          element={<Home />} />
        <Route path="/login"     element={<Login />} />
        <Route path="/register"  element={<Register />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/research"  element={<PrivateRoute><Workflow /></PrivateRoute>} />
        <Route path="/research/:projectId" element={<PrivateRoute><Workflow /></PrivateRoute>} />
        <Route path="/payment/:projectId"  element={<PrivateRoute><Payment /></PrivateRoute>} />
        <Route path="/admin"     element={<AdminRoute><AdminPanel /></AdminRoute>} />
        <Route path="*"          element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
