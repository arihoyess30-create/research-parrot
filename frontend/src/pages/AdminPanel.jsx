import { useState, useEffect } from "react";
import api from "../api/client";

const tableStyle = { width:"100%", borderCollapse:"collapse", background:"#fff", borderRadius:12, overflow:"hidden", border:"0.5px solid rgba(0,0,0,0.11)", fontSize:13 };
const thStyle    = { background:"#F1EFE8", padding:"9px 14px", textAlign:"left", fontSize:11, fontWeight:500, color:"#888780", textTransform:"uppercase", letterSpacing:".04em", whiteSpace:"nowrap" };
const tdStyle    = { padding:"10px 14px", borderTop:"0.5px solid rgba(0,0,0,0.08)", color:"#2C2C2A" };

function fmt(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-UG", { day:"numeric", month:"short", year:"numeric" });
}

function Empty({ msg }) {
  return <div style={{ textAlign:"center", padding:"3rem", color:"#888780", fontSize:14 }}>{msg}</div>;
}

export default function AdminPanel() {
  const [tab,      setTab]      = useState("payments");
  const [stats,    setStats]    = useState(null);
  const [payments, setPayments] = useState([]);
  const [users,    setUsers]    = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [msg,      setMsg]      = useState("");

  useEffect(() => {
    Promise.all([
      api.get("/admin/stats"),
      api.get("/admin/payments"),
      api.get("/admin/users"),
      api.get("/admin/projects"),
    ]).then(([s, p, u, pr]) => {
      setStats(s); setPayments(p); setUsers(u); setProjects(pr);
    }).finally(() => setLoading(false));
  }, []);

  async function verifyPayment(id, approve) {
    try {
      const res = await api.post("/admin/payments/verify", { payment_id: id, approve });
      setMsg(`Payment ${approve ? "approved" : "rejected"}.`);
      setPayments(prev => prev.map(p => p.id === id ? { ...p, status: res.status } : p));
    } catch { setMsg("Action failed."); }
  }

  async function deleteUser(id) {
    if (!window.confirm("Delete this user and all their data?")) return;
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers(prev => prev.filter(u => u.id !== id));
      setMsg("User deleted.");
    } catch { setMsg("Delete failed."); }
  }

  if (loading) return (
    <div style={{ textAlign:"center", padding:"5rem" }}>
      <span className="spinner" style={{ width:36, height:36, display:"block", margin:"0 auto 1rem" }} />
      <p style={{ color:"#888780" }}>Loading admin data…</p>
    </div>
  );

  return (
    <div className="page" style={{ maxWidth:1000 }}>
      <h2 style={{ color:"#0F6E56", marginBottom:"1.5rem" }}>Admin Panel</h2>

      {msg && <div className="alert alert-success" style={{ marginBottom:"1rem" }}>{msg}</div>}

      {/* Stats */}
      {stats && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12, marginBottom:"2rem" }}>
          {[
            { label:"Total Users",      value: stats.total_users },
            { label:"Total Papers",     value: stats.total_projects },
            { label:"Paid Papers",      value: stats.paid_papers },
            { label:"Pending Payments", value: stats.pending_payments },
            { label:"Revenue (UGX)",    value: `${Math.round((stats.total_revenue_ugx||0)/1000)}K` },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding:"1rem" }}>
              <div style={{ fontSize:11, color:"#888780", marginBottom:4 }}>{s.label}</div>
              <div style={{ fontSize:22, fontWeight:500, color:"#0F6E56" }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:"flex", borderBottom:"0.5px solid rgba(0,0,0,0.11)", marginBottom:"1.5rem" }}>
        {["payments","users","projects"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding:"8px 18px", fontSize:14, cursor:"pointer", background:"transparent",
            border:"none", borderBottom: tab===t?"2px solid #1D9E75":"2px solid transparent",
            color: tab===t?"#0F6E56":"#888780", fontWeight: tab===t?500:400,
            textTransform:"capitalize", fontFamily:"'DM Sans',sans-serif",
          }}>{t}</button>
        ))}
      </div>

      {/* Payments */}
      {tab === "payments" && (
        <div style={{ overflowX:"auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>{["Date","User","Phone","Amount","Method","Txn Ref","Status","Actions"].map(h=>(
                <th key={h} style={thStyle}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id}>
                  <td style={tdStyle}>{fmt(p.created_at)}</td>
                  <td style={tdStyle}>{p.user}</td>
                  <td style={tdStyle}>{p.phone}</td>
                  <td style={tdStyle}>UGX {p.amount?.toLocaleString()}</td>
                  <td style={tdStyle}>
                    <span className={`badge ${p.method==="mtn"?"badge-amber":"badge-red"}`} style={{ textTransform:"uppercase" }}>
                      {p.method}
                    </span>
                  </td>
                  <td style={tdStyle}>{p.txn_ref || p.external_ref || "—"}</td>
                  <td style={tdStyle}>
                    <span className={`badge ${p.status==="confirmed"?"badge-green":p.status==="failed"?"badge-red":"badge-amber"}`}>
                      {p.status}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {(p.status==="pending_verification"||p.status==="pending_manual") && (
                      <div style={{ display:"flex", gap:4 }}>
                        <button className="btn btn-sm" style={{ background:"#E1F5EE", color:"#0F6E56", border:"none" }}
                          onClick={()=>verifyPayment(p.id,true)}>✓ Approve</button>
                        <button className="btn btn-sm btn-danger"
                          onClick={()=>verifyPayment(p.id,false)}>✗ Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {payments.length===0 && <Empty msg="No payments yet." />}
        </div>
      )}

      {/* Users */}
      {tab === "users" && (
        <div style={{ overflowX:"auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>{["Name","Email","Papers","Joined","Actions"].map(h=>(
                <th key={h} style={thStyle}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={tdStyle}>{u.full_name} {u.is_admin&&<span className="badge badge-green">Admin</span>}</td>
                  <td style={tdStyle}>{u.email}</td>
                  <td style={tdStyle}>{u.paper_count}</td>
                  <td style={tdStyle}>{fmt(u.created_at)}</td>
                  <td style={tdStyle}>
                    {!u.is_admin && (
                      <button className="btn btn-sm btn-danger" onClick={()=>deleteUser(u.id)}>Delete</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length===0 && <Empty msg="No users yet." />}
        </div>
      )}

      {/* Projects */}
      {tab === "projects" && (
        <div style={{ overflowX:"auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>{["Title","User","Field","Level","Pages","Status","Paid"].map(h=>(
                <th key={h} style={thStyle}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {projects.map(p => (
                <tr key={p.id}>
                  <td style={{ ...tdStyle, maxWidth:220, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.title}</td>
                  <td style={tdStyle}>{p.user}</td>
                  <td style={tdStyle}>{p.field}</td>
                  <td style={tdStyle}>{p.level}</td>
                  <td style={tdStyle}>{p.pages}</td>
                  <td style={tdStyle}>
                    <span className={`badge ${p.status==="complete"?"badge-green":"badge-amber"}`}>{p.status}</span>
                  </td>
                  <td style={tdStyle}>
                    {p.is_paid
                      ? <span className="badge badge-green">Yes</span>
                      : <span className="badge badge-gray">No</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {projects.length===0 && <Empty msg="No projects yet." />}
        </div>
      )}
    </div>
  );
}
