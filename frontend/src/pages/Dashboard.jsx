import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export default function Dashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");

  useEffect(() => {
    api.get("/research/projects")
      .then(setProjects)
      .catch(() => setError("Failed to load projects."))
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    total:     projects.length,
    completed: projects.filter(p => p.status === "complete").length,
    draft:     projects.filter(p => p.status === "draft").length,
    paid:      projects.filter(p => p.is_paid).length,
  };

  return (
    <div className="page">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.75rem", flexWrap:"wrap", gap:12 }}>
        <div>
          <h2 style={{ color:"#0F6E56" }}>My Research Papers</h2>
          <p style={{ fontSize:13, color:"#888780", marginTop:4 }}>Welcome back, {user?.full_name}</p>
        </div>
        <Link to="/research" className="btn btn-primary">+ New Paper</Link>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:12, marginBottom:"2rem" }}>
        {[
          { label:"Total Papers", value: stats.total },
          { label:"Completed",    value: stats.completed },
          { label:"Drafts",       value: stats.draft },
          { label:"Unlocked",     value: stats.paid },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding:"1rem" }}>
            <div style={{ fontSize:12, color:"#888780", marginBottom:4 }}>{s.label}</div>
            <div style={{ fontSize:26, fontWeight:500 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div style={{ textAlign:"center", padding:"4rem" }}>
          <span className="spinner" style={{ width:36, height:36, display:"block", margin:"0 auto 1rem" }} />
          <p style={{ color:"#888780" }}>Loading your papers…</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="card" style={{ textAlign:"center", padding:"3rem" }}>
          <div style={{ fontSize:"3rem", marginBottom:"1rem" }}>📄</div>
          <h3 style={{ marginBottom:".5rem" }}>No papers yet</h3>
          <p style={{ fontSize:13, color:"#888780", marginBottom:"1.5rem" }}>Start your first AI-powered research paper.</p>
          <Link to="/research" className="btn btn-primary">Start Research Paper</Link>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {projects.map(p => (
            <div key={p.id} className="card" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap", padding:"1rem 1.25rem" }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:500, marginBottom:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.title}</div>
                <div style={{ fontSize:12, color:"#888780" }}>
                  {p.field} · {p.level} · {p.citation_style} · {p.pages} pages ·{" "}
                  {new Date(p.created_at).toLocaleDateString("en-UG", { day:"numeric", month:"short", year:"numeric" })}
                </div>
              </div>
              <div style={{ display:"flex", gap:6, alignItems:"center", flexShrink:0, flexWrap:"wrap" }}>
                <span className={`badge ${p.status==="complete"?"badge-green":"badge-amber"}`}>
                  {p.status==="complete"?"Complete":"Draft"}
                </span>
                {p.is_paid && <span className="badge badge-green">Paid</span>}
                <Link to={`/research/${p.id}`} className="btn btn-sm">
                  {p.status==="complete"?"View":"Resume"}
                </Link>
                {p.is_paid && (
                  <>
                    <a href={`${API}/export/pdf/${p.id}`}  className="btn btn-sm" download>↓ PDF</a>
                    <a href={`${API}/export/docx/${p.id}`} className="btn btn-sm" download>↓ DOCX</a>
                  </>
                )}
                {!p.is_paid && p.status==="complete" && (
                  <Link to={`/payment/${p.id}`} className="btn btn-sm btn-primary">🔓 Unlock</Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
