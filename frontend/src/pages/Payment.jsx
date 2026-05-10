import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api/client";

const numStyle = { background:"#FAEEDA", color:"#BA7517", fontWeight:500, padding:"1px 7px", borderRadius:4, fontSize:13 };

export default function Payment() {
  const { projectId } = useParams();
  const nav = useNavigate();

  const [project,   setProject]   = useState(null);
  const [method,    setMethod]    = useState("mtn");
  const [phone,     setPhone]     = useState("");
  const [txnRef,    setTxnRef]    = useState("");
  const [paymentId, setPaymentId] = useState(null);
  const [status,    setStatus]    = useState("idle");
  const [message,   setMessage]   = useState("");
  const [error,     setError]     = useState("");

  useEffect(() => {
    api.get(`/research/projects/${projectId}`)
       .then(setProject)
       .catch(() => setError("Project not found."));
  }, [projectId]);

  useEffect(() => {
    if (!paymentId || status !== "pending") return;
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/payment/status/${paymentId}`);
        if (res.status === "confirmed") { setStatus("confirmed"); clearInterval(interval); }
        else if (res.status === "failed") { setStatus("failed"); setMessage("Payment failed. Please try again."); clearInterval(interval); }
      } catch { /* keep polling */ }
    }, 8000);
    return () => clearInterval(interval);
  }, [paymentId, status]);

  async function initiatePayment(e) {
    e.preventDefault();
    setError(""); setStatus("initiating");
    try {
      const res = await api.post("/payment/initiate", { project_id: projectId, method, phone });
      setPaymentId(res.payment_id);
      setMessage(res.message);
      setStatus(res.status === "manual" ? "manual" : "pending");
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to initiate payment.");
      setStatus("idle");
    }
  }

  async function submitManualRef(e) {
    e.preventDefault();
    setError("");
    try {
      const res = await api.post("/payment/confirm-manual", { payment_id: paymentId, txn_ref: txnRef });
      setMessage(res.message);
      setStatus("manual_submitted");
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to submit reference.");
    }
  }

  const instructions = {
    mtn: {
      title: "MTN Mobile Money Instructions",
      steps: [
        <span>Dial <strong>*165*3#</strong> on your MTN line</span>,
        <span>Select <strong>Transfer Money</strong> → <strong>To another number</strong></span>,
        <span>Enter merchant number: <span style={numStyle}>0776871411</span></span>,
        <span>Amount: <strong>UGX 15,000</strong></span>,
        <span>Enter your PIN to confirm</span>,
        <span>Note the transaction ID shown on screen</span>,
      ],
    },
    airtel: {
      title: "Airtel Money Instructions",
      steps: [
        <span>Dial <strong>*185#</strong> on your Airtel line</span>,
        <span>Select <strong>Send Money</strong> → <strong>To another number</strong></span>,
        <span>Enter number: <span style={numStyle}>0776871411</span></span>,
        <span>Amount: <strong>UGX 15,000</strong></span>,
        <span>Enter your PIN to confirm</span>,
        <span>Note the transaction ID shown on screen</span>,
      ],
    },
  };

  if (!project) return (
    <div style={{ textAlign:"center", padding:"5rem" }}>
      <span className="spinner" style={{ width:36, height:36, display:"block", margin:"0 auto 1rem" }} />
      <p style={{ color:"#888780" }}>Loading…</p>
    </div>
  );

  if (status === "confirmed" || project.is_paid) return (
    <div className="page" style={{ maxWidth:480 }}>
      <div className="card" style={{ textAlign:"center", padding:"3rem 2rem" }}>
        <div style={{ fontSize:"3rem", marginBottom:"1rem" }}>🎉</div>
        <h2 style={{ color:"#0F6E56", marginBottom:".5rem" }}>Payment Confirmed!</h2>
        <p style={{ fontSize:14, color:"#5F5E5A", marginBottom:"2rem", lineHeight:1.7 }}>
          Your paper is unlocked. Download your full research paper below.
        </p>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <a href={`${import.meta.env.VITE_API_URL||"http://localhost:8000/api"}/export/pdf/${projectId}`}
             className="btn btn-primary btn-lg" download>↓ Download PDF</a>
          <a href={`${import.meta.env.VITE_API_URL||"http://localhost:8000/api"}/export/docx/${projectId}`}
             className="btn btn-lg" download>↓ Download DOCX</a>
          <Link to="/dashboard" className="btn">View Dashboard</Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="page" style={{ maxWidth:480 }}>
      <div className="card">
        <h2 style={{ color:"#0F6E56", marginBottom:".25rem" }}>Unlock Full Paper</h2>
        <p style={{ fontSize:13, color:"#888780", marginBottom:"1.5rem" }}>{project.title}</p>

        <div style={{ background:"#E1F5EE", borderRadius:8, padding:"1rem", textAlign:"center", marginBottom:"1.5rem" }}>
          <div style={{ fontSize:"2rem", fontWeight:500, color:"#0F6E56" }}>UGX 15,000</div>
          <div style={{ fontSize:12, color:"#5F5E5A" }}>One-time · Instant access · PDF + DOCX</div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {status === "idle" && (
          <form onSubmit={initiatePayment}>
            <div style={{ fontSize:13, fontWeight:500, marginBottom:".75rem" }}>Choose payment method</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:"1.25rem" }}>
              {["mtn","airtel"].map(m => (
                <div key={m} onClick={() => setMethod(m)} style={{
                  border:`2px solid ${method===m?"#1D9E75":"rgba(0,0,0,0.11)"}`,
                  background:method===m?"#E1F5EE":"#fff",
                  borderRadius:8, padding:".85rem", cursor:"pointer", textAlign:"center", transition:"all .2s"
                }}>
                  <div style={{ fontSize:"1.75rem", marginBottom:4 }}>{m==="mtn"?"📱":"📲"}</div>
                  <div style={{ fontSize:12, fontWeight:500 }}>{m==="mtn"?"MTN MoMo":"Airtel Money"}</div>
                </div>
              ))}
            </div>
            <div className="form-group">
              <label>Your phone number</label>
              <input type="tel" required value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder={method==="mtn"?"e.g. 0771234567":"e.g. 0752345678"} />
            </div>
            <div style={{ background:"#F9F7F2", borderRadius:8, padding:"1rem", marginBottom:"1.25rem", fontSize:13 }}>
              <div style={{ fontWeight:500, marginBottom:".5rem" }}>{instructions[method].title}</div>
              <ol style={{ paddingLeft:"1.1rem", lineHeight:2, color:"#5F5E5A" }}>
                {instructions[method].steps.map((s,i) => <li key={i}>{s}</li>)}
              </ol>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width:"100%", padding:12 }}>
              Send Payment Request
            </button>
          </form>
        )}

        {status === "initiating" && (
          <div style={{ textAlign:"center", padding:"2rem" }}>
            <span className="spinner" style={{ width:36, height:36, display:"block", margin:"0 auto 1rem" }} />
            <p style={{ color:"#5F5E5A", fontSize:14 }}>Sending payment request to your phone…</p>
          </div>
        )}

        {status === "pending" && (
          <div style={{ textAlign:"center", padding:"1.5rem 0" }}>
            <div className="dot-pulse" style={{ justifyContent:"center", marginBottom:"1rem" }}><span/><span/><span/></div>
            <p style={{ fontSize:14, color:"#2C2C2A", fontWeight:500, marginBottom:".5rem" }}>Waiting for you to approve the payment prompt…</p>
            <p style={{ fontSize:13, color:"#888780", marginBottom:"1.5rem" }}>{message}</p>
            <div style={{ borderTop:"0.5px solid rgba(0,0,0,0.1)", paddingTop:"1.25rem", textAlign:"left" }}>
              <p style={{ fontSize:13, color:"#5F5E5A", marginBottom:".75rem" }}>Didn't receive a prompt? Enter your transaction ID manually:</p>
              <form onSubmit={submitManualRef} style={{ display:"flex", gap:8 }}>
                <input value={txnRef} onChange={e=>setTxnRef(e.target.value)} placeholder="Transaction ID" style={{ flex:1 }} />
                <button type="submit" className="btn btn-primary">Submit</button>
              </form>
            </div>
          </div>
        )}

        {status === "manual" && (
          <div>
            <div className="alert alert-info" style={{ marginBottom:"1rem" }}>
              Pay manually using the USSD instructions above, then enter your transaction ID below.
            </div>
            <form onSubmit={submitManualRef}>
              <div className="form-group">
                <label>Transaction ID / Reference</label>
                <input required value={txnRef} onChange={e=>setTxnRef(e.target.value)} placeholder="e.g. 1287364901" />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width:"100%" }}>Submit for Verification</button>
            </form>
          </div>
        )}

        {status === "manual_submitted" && (
          <div style={{ textAlign:"center", padding:"1.5rem 0" }}>
            <div style={{ fontSize:"2.5rem", marginBottom:".75rem" }}>⏳</div>
            <h3 style={{ marginBottom:".5rem" }}>Under Review</h3>
            <p style={{ fontSize:13, color:"#5F5E5A", lineHeight:1.7 }}>{message}</p>
            <Link to="/dashboard" className="btn" style={{ marginTop:"1.25rem" }}>Go to Dashboard</Link>
          </div>
        )}

        {status === "failed" && (
          <div>
            <div className="alert alert-error">{message}</div>
            <button className="btn btn-primary" style={{ width:"100%" }} onClick={()=>setStatus("idle")}>Try Again</button>
          </div>
        )}

        <Link to={`/research/${projectId}`} className="btn"
          style={{ width:"100%", marginTop:10, justifyContent:"center", display:"flex" }}>
          ← Back to Paper
        </Link>
      </div>
    </div>
  );
}
