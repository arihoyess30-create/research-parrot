import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm]     = useState({ full_name: "", email: "", password: "" });
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await register(form.full_name, form.email, form.password);
      nav("/research");
    } catch (err) {
      setError(err?.response?.data?.detail || "Registration failed. Try again.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:"80vh", display:"flex", alignItems:"center", justifyContent:"center", padding:"2rem 1rem" }}>
      <div className="card" style={{ width:"100%", maxWidth:420 }}>
        <h2 style={{ color:"#0F6E56", marginBottom:".25rem" }}>Create your account</h2>
        <p style={{ fontSize:13, color:"#888780", marginBottom:"1.5rem" }}>Start writing research papers in minutes</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handle}>
          <div className="form-group">
            <label>Full name</label>
            <input type="text" required value={form.full_name}
              onChange={e => setForm(f => ({...f, full_name: e.target.value}))}
              placeholder="e.g. Nakato Joan" />
          </div>
          <div className="form-group">
            <label>Email address</label>
            <input type="email" required value={form.email}
              onChange={e => setForm(f => ({...f, email: e.target.value}))}
              placeholder="you@mak.ac.ug" />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" required minLength={8} value={form.password}
              onChange={e => setForm(f => ({...f, password: e.target.value}))}
              placeholder="Minimum 8 characters" />
          </div>
          <button className="btn btn-primary" style={{ width:"100%", marginTop:".5rem", padding:"11px" }} disabled={loading}>
            {loading ? <><span className="spinner" style={{width:16,height:16}}/> Creating account…</> : "Create Account"}
          </button>
        </form>
        <p style={{ fontSize:13, color:"#888780", marginTop:"1.25rem", textAlign:"center" }}>
          Already have an account? <Link to="/login" style={{ color:"#1D9E75", fontWeight:500 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
