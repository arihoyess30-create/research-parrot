import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const features = [
  { icon: "🧠", title: "AI Research Engine", desc: "Generates structured outlines and section-by-section content with Uganda-specific examples and real academic citations." },
  { icon: "📚", title: "Citation Intelligence", desc: "Automatic APA, MLA & Harvard formatting with real references from Makerere University, UBOS, Bank of Uganda and more." },
  { icon: "✍️", title: "Guided Workflow", desc: "Step-by-step writing from Introduction through Conclusion. Review and edit each section before proceeding." },
  { icon: "📄", title: "Export Ready", desc: "Download your compiled paper as a professionally formatted PDF or DOCX instantly after payment." },
  { icon: "📱", title: "Mobile Money Pay", desc: "Pay via MTN Mobile Money or Airtel Money. No bank account needed — works on any Ugandan phone." },
  { icon: "💾", title: "Save & Resume", desc: "Save projects at any stage and resume anytime. All your papers stored securely in your dashboard." },
];

export default function Home() {
  const { token } = useAuth();
  return (
    <div>
      <section style={{ background:"linear-gradient(135deg,#E1F5EE 0%,#F1EFE8 100%)", padding:"4rem 1.5rem 3.5rem", textAlign:"center" }}>
        <HeroParrot />
        <h1 style={{ color:"#0F6E56", marginBottom:".75rem" }}>Research Parrot</h1>
        <p style={{ color:"#5F5E5A", fontSize:"1.05rem", maxWidth:520, margin:"0 auto 2rem", lineHeight:1.75 }}>
          AI-powered academic research assistant for Ugandan students and scholars.
          Generate structured, well-cited research papers with real academic sources.
        </p>
        <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
          <Link to={token ? "/research" : "/register"} className="btn btn-primary btn-lg">Start Research Paper</Link>
          <Link to="/login" className="btn btn-outline btn-lg">Sign In</Link>
        </div>
      </section>

      <section style={{ padding:"3rem 1.5rem", maxWidth:900, margin:"0 auto" }}>
        <h2 style={{ textAlign:"center", color:"#0F6E56", marginBottom:"1.5rem" }}>Everything you need for academic excellence</h2>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))", gap:16 }}>
          {features.map(f => (
            <div key={f.title} className="card" style={{ padding:"1.25rem" }}>
              <div style={{ width:40, height:40, background:"#E1F5EE", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, marginBottom:".75rem" }}>{f.icon}</div>
              <h3 style={{ marginBottom:".4rem" }}>{f.title}</h3>
              <p style={{ fontSize:13, color:"#5F5E5A", lineHeight:1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding:"3rem 1.5rem", background:"#fff" }}>
        <h2 style={{ textAlign:"center", color:"#0F6E56", marginBottom:"1.75rem" }}>Simple, affordable pricing</h2>
        <div style={{ display:"flex", gap:16, maxWidth:680, margin:"0 auto", flexWrap:"wrap", justifyContent:"center" }}>
          <PlanCard name="Preview" price="Free"
            features={["View introduction section","Generate outline","APA citations only"]}
            cta="Try Free" to={token ? "/research" : "/register"} />
          <PlanCard name="Full Paper" price="UGX 15,000" sub="per paper" featured
            features={["Full research paper","APA, MLA & Harvard","PDF + DOCX export","Uganda-specific examples","MTN & Airtel payment","Save to dashboard"]}
            cta="Get Full Paper" to={token ? "/research" : "/register"} />
        </div>
      </section>

      <section style={{ padding:"3rem 1.5rem", maxWidth:760, margin:"0 auto" }}>
        <h2 style={{ textAlign:"center", color:"#0F6E56", marginBottom:"1.75rem" }}>How it works</h2>
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {[
            ["1","Enter your topic & settings","Provide your research topic, questions, academic level and citation style."],
            ["2","Generate outline","Research Parrot creates a structured chapter outline you can review and edit."],
            ["3","AI writes section-by-section","Each chapter is generated with academic tone, Uganda-specific examples and real citations."],
            ["4","Pay & download","Pay UGX 15,000 via MTN MoMo or Airtel Money to unlock and export your full paper."],
          ].map(([n,title,desc]) => (
            <div key={n} style={{ display:"flex", gap:16, alignItems:"flex-start" }}>
              <div style={{ width:36, height:36, borderRadius:"50%", background:"#0F6E56", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:600, flexShrink:0, fontSize:15 }}>{n}</div>
              <div>
                <div style={{ fontWeight:500, marginBottom:3 }}>{title}</div>
                <div style={{ fontSize:13, color:"#5F5E5A" }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function PlanCard({ name, price, sub, featured, features, cta, to }) {
  return (
    <div className="card" style={{ flex:1, minWidth:220, maxWidth:300, border: featured ? "2px solid #1D9E75" : undefined }}>
      {featured && <span className="badge badge-green" style={{ marginBottom:8 }}>Most Popular</span>}
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.15rem", marginBottom:4 }}>{name}</div>
      <div style={{ fontSize:"1.9rem", fontWeight:500, color:"#0F6E56", margin:".4rem 0" }}>
        {price} {sub && <span style={{ fontSize:13, color:"#888780", fontWeight:400 }}>/{sub}</span>}
      </div>
      <ul style={{ listStyle:"none", margin:"1rem 0", fontSize:13, color:"#5F5E5A" }}>
        {features.map(f => (
          <li key={f} style={{ padding:"4px 0", display:"flex", gap:6 }}>
            <span style={{ color:"#1D9E75", fontWeight:600 }}>✓</span>{f}
          </li>
        ))}
      </ul>
      <Link to={to} className={`btn ${featured ? "btn-primary" : ""}`} style={{ width:"100%", justifyContent:"center" }}>{cta}</Link>
    </div>
  );
}

function HeroParrot() {
  return (
    <svg width="90" height="90" viewBox="0 0 90 90" fill="none" style={{ margin:"0 auto 1.5rem", display:"block" }}>
      <circle cx="45" cy="45" r="45" fill="#E1F5EE"/>
      <ellipse cx="45" cy="56" rx="20" ry="22" fill="#1D9E75"/>
      <ellipse cx="45" cy="38" rx="18" ry="18" fill="#0F6E56"/>
      <ellipse cx="38" cy="32" rx="13" ry="13" fill="#1D9E75"/>
      <circle cx="37" cy="32" r="6" fill="#fff"/>
      <circle cx="37" cy="32" r="3" fill="#2C2C2A"/>
      <circle cx="38" cy="31" r="1" fill="#fff"/>
      <ellipse cx="58" cy="28" rx="12" ry="7" fill="#BA7517" transform="rotate(35 58 28)"/>
      <ellipse cx="59" cy="33" rx="10" ry="5" fill="#EF9F27" transform="rotate(15 59 33)"/>
      <path d="M34 42 Q38 47 44 42" stroke="#0F6E56" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <path d="M27 24 Q20 17 24 12 Q32 18 30 28" fill="#1D9E75"/>
      <ellipse cx="45" cy="72" rx="8" ry="6" fill="#BA7517"/>
      <path d="M38 72 L40 80 M52 72 L50 80" stroke="#BA7517" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}
