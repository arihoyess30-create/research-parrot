import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm]     = useState({ email: "", password: "" });
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await login(form.email, form.password);
      nav("/dashboard");
    } catch (err) {
      setError(err?.response?.data?.detail || "Login failed. Check your credentials.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:"80vh", display:"flex", alignItems:"center", justifyContent:"center", padding:"2rem 1rem" }}>
      <div className="card" style={{ width:"100%", maxWidth:400 }}>
        <h2 style={{ color:"#0F6E56", marginBottom:".25rem" }}>Welcome back</h2>
        <p style={{ fontSize:13, color:"#888780", marginBottom:"1.5rem" }}>Sign in to continue to Research Parrot</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handle}>
          <div className="form-group">
            <label>Email address</label>
            <input type="email" required value={form.email}
              onChange={e => setForm(f => ({...f, email: e.target.value}))}
              placeholder="you@example.com" />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" required value={form.password}
              onChange={e => setForm(f => ({...f, password: e.target.value}))}
              placeholder="••••••••" />
          </div>
          <button className="btn btn-primary" style={{ width:"100%", marginTop:".5rem", padding:"11px" }} disabled={loading}>
            {loading ? <><span className="spinner" style={{width:16,height:16}}/> Signing in…</> : "Sign In"}
          </button>
        </form>
        <p style={{ fontSize:13, color:"#888780", marginTop:"1.25rem", textAlign:"center" }}>
          No account? <Link to="/register" style={{ color:"#1D9E75", fontWeight:500 }}>Create one free</Link>
        </p>
      </div>
    </div>
  );
}
