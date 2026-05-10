import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { token, user, logout } = useAuth();
  const nav = useNavigate();
  const handleLogout = () => { logout(); nav("/"); };

  return (
    <nav style={{
      background: "#fff", borderBottom: "0.5px solid rgba(0,0,0,0.11)",
      padding: "0 1.5rem", height: 60, display: "flex",
      alignItems: "center", justifyContent: "space-between",
      position: "sticky", top: 0, zIndex: 100,
    }}>
      <Link to="/" style={{ display:"flex", alignItems:"center", gap:10, textDecoration:"none" }}>
        <ParrotLogo size={34} />
        <span style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.2rem", color:"#0F6E56" }}>
          Research Parrot
        </span>
      </Link>
      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        {token ? (
          <>
            <Link to="/dashboard" className="btn btn-sm">My Papers</Link>
            {user?.is_admin && <Link to="/admin" className="btn btn-sm">Admin</Link>}
            <Link to="/research" className="btn btn-sm btn-primary">+ New Paper</Link>
            <button onClick={handleLogout} className="btn btn-sm" style={{ color:"#C0392B" }}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login"    className="btn btn-sm">Login</Link>
            <Link to="/register" className="btn btn-sm btn-primary">Get Started</Link>
          </>
        )}
      </div>
    </nav>
  );
}

export function ParrotLogo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <circle cx="18" cy="18" r="18" fill="#E1F5EE"/>
      <ellipse cx="18" cy="22" rx="8" ry="9" fill="#1D9E75"/>
      <ellipse cx="18" cy="15" rx="7" ry="7" fill="#0F6E56"/>
      <ellipse cx="15.5" cy="13" rx="5" ry="5" fill="#1D9E75"/>
      <circle cx="15" cy="13" r="2.5" fill="#fff"/>
      <circle cx="15" cy="13" r="1.2" fill="#2C2C2A"/>
      <ellipse cx="23" cy="12" rx="5" ry="3" fill="#BA7517" transform="rotate(30 23 12)"/>
      <ellipse cx="23" cy="14" rx="4" ry="2" fill="#EF9F27" transform="rotate(15 23 14)"/>
      <path d="M14 17 Q16 19 18 17" stroke="#0F6E56" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M11 10 Q8 7 10 5 Q14 8 13 12" fill="#1D9E75"/>
    </svg>
  );
}
