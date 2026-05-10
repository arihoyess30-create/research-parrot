import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api/client";

const FIELDS   = ["Economics & Finance","Public Health","Education","Agriculture","Political Science","Social Sciences","Law","Business"];
const LEVELS   = ["undergraduate","postgraduate","phd"];
const CITATIONS = ["APA","MLA","Harvard"];
const PAGES    = [10,20,30,40];

export default function Workflow() {
  const { projectId } = useParams();
  const nav = useNavigate();

  const [step,        setStep]        = useState(1);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [project,     setProject]     = useState(null);
  const [outline,     setOutline]     = useState(null);
  const [sections,    setSections]    = useState({});
  const [currentCh,   setCurrentCh]   = useState(1);
  const [generating,  setGenerating]  = useState(false);
  const [editMode,    setEditMode]    = useState(false);
  const [editText,    setEditText]    = useState("");

  const [form, setForm] = useState({
    topic: "", questions: "What are the key challenges?\nWhat solutions exist?\nWhat recommendations apply to Uganda?",
    field: FIELDS[0], level: "undergraduate", citation_style: "APA", pages: 20,
  });

  useEffect(() => { if (projectId) loadProject(projectId); }, [projectId]);

  async function loadProject(id) {
    setLoading(true);
    try {
      const data = await api.get(`/research/projects/${id}`);
      setProject(data);
      if (data.outline) { setOutline(data.outline); setStep(3); }
      if (data.sections) setSections(data.sections);
    } catch { setError("Failed to load project."); }
    finally { setLoading(false); }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const questions = form.questions.split("\n").map(q => q.trim()).filter(Boolean);
      const res  = await api.post("/research/projects", { ...form, questions });
      nav(`/research/${res.project_id}`, { replace: true });
      setStep(2);
      const ol = await api.post("/research/outline", { project_id: res.project_id });
      const proj = await api.get(`/research/projects/${res.project_id}`);
      setProject(proj);
      setOutline(ol);
      setStep(3);
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to create project.");
      setStep(1);
    } finally { setLoading(false); }
  }

  async function handleGenerateSection(chNum, userEdit = null) {
    if (!project) return;
    setGenerating(true); setError("");
    try {
      const res = await api.post("/research/section", {
        project_id: project.id, chapter: chNum, user_edit: userEdit,
      });
      setSections(prev => ({ ...prev, [String(chNum)]: res.content }));
      setCurrentCh(chNum);
      setEditMode(false);
    } catch (err) {
      if (err?.response?.status === 402) { nav(`/payment/${project.id}`); return; }
      setError(err?.response?.data?.detail || "Generation failed.");
    } finally { setGenerating(false); }
  }

  const totalChapters = outline?.chapters?.length || 0;
  const isPaid = project?.is_paid;

  if (loading && !project) return <Loader msg="Loading…" />;

  return (
    <div className="page">
      <div style={{ marginBottom:"1.75rem" }}>
        <h2 style={{ color:"#0F6E56", marginBottom:".75rem" }}>
          {project ? project.title : "New Research Paper"}
        </h2>
        <StepBar current={step} />
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* STEP 1 */}
      {step === 1 && (
        <div className="card">
          <h3 style={{ marginBottom:"1rem" }}>Research Topic & Settings</h3>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label>Research topic *</label>
              <input required value={form.topic}
                onChange={e => setForm(f=>({...f,topic:e.target.value}))}
                placeholder="e.g. Impact of mobile banking on rural financial inclusion in Uganda" />
            </div>
            <div className="form-group">
              <label>Research questions (one per line)</label>
              <textarea value={form.questions} style={{ minHeight:100 }}
                onChange={e => setForm(f=>({...f,questions:e.target.value}))} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Academic level</label>
                <select value={form.level} onChange={e=>setForm(f=>({...f,level:e.target.value}))}>
                  {LEVELS.map(l=><option key={l} value={l}>{l.charAt(0).toUpperCase()+l.slice(1)}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Citation style</label>
                <select value={form.citation_style} onChange={e=>setForm(f=>({...f,citation_style:e.target.value}))}>
                  {CITATIONS.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Approximate pages</label>
                <select value={form.pages} onChange={e=>setForm(f=>({...f,pages:Number(e.target.value)}))}>
                  {PAGES.map(p=><option key={p} value={p}>{p} pages</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Field of study</label>
                <select value={form.field} onChange={e=>setForm(f=>({...f,field:e.target.value}))}>
                  {FIELDS.map(fd=><option key={fd}>{fd}</option>)}
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <><span className="spinner" style={{width:16,height:16}}/> Generating outline…</> : "Generate Outline →"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 2 loading */}
      {step === 2 && (
        <div className="card" style={{ textAlign:"center", padding:"3rem" }}>
          <span className="spinner" style={{ width:40, height:40, borderWidth:3, margin:"0 auto 1rem", display:"block" }} />
          <p style={{ color:"#5F5E5A" }}>Generating your research outline with AI…</p>
        </div>
      )}

      {/* STEP 3 writing */}
      {step === 3 && outline && (
        <div style={{ display:"grid", gridTemplateColumns:"220px 1fr", gap:16, alignItems:"start" }}>
          {/* Chapter nav */}
          <div className="card" style={{ padding:"1rem", position:"sticky", top:72 }}>
            <div style={{ fontSize:11, fontWeight:500, color:"#888780", textTransform:"uppercase", letterSpacing:".05em", marginBottom:".75rem" }}>Chapters</div>
            {outline.chapters.map(ch => {
              const done   = !!sections[String(ch.number)];
              const active = currentCh === ch.number;
              const locked = ch.number > 2 && !isPaid;
              return (
                <div key={ch.number} onClick={() => { if (!locked) setCurrentCh(ch.number); }}
                  style={{ padding:"7px 10px", borderRadius:8, fontSize:13, cursor:locked?"default":"pointer",
                    display:"flex", alignItems:"center", gap:8, marginBottom:2,
                    background: active?"#E1F5EE":"transparent",
                    color: active?"#0F6E56":done?"#2C2C2A":"#888780",
                    fontWeight: active?500:400 }}>
                  <span style={{ width:7, height:7, borderRadius:"50%", flexShrink:0,
                    background: done?"#1D9E75":active?"#0F6E56":"#D0CEC8" }} />
                  {locked?"🔒 ":""}{ch.title}
                </div>
              );
            })}
            {project && (
              <div style={{ marginTop:"1rem", paddingTop:"1rem", borderTop:"0.5px solid rgba(0,0,0,0.1)" }}>
                {isPaid ? (
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    <a href={`${import.meta.env.VITE_API_URL||"http://localhost:8000/api"}/export/pdf/${project.id}`}
                       className="btn btn-sm btn-primary" download>↓ PDF</a>
                    <a href={`${import.meta.env.VITE_API_URL||"http://localhost:8000/api"}/export/docx/${project.id}`}
                       className="btn btn-sm" download>↓ DOCX</a>
                  </div>
                ) : (
                  <Link to={`/payment/${project.id}`} className="btn btn-primary btn-sm" style={{ width:"100%", justifyContent:"center" }}>
                    🔓 Unlock Full Paper
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Writing area */}
          <div>
            {outline.chapters.map(ch => {
              if (ch.number !== currentCh) return null;
              const content = sections[String(ch.number)];
              const locked  = ch.number > 2 && !isPaid;
              return (
                <div key={ch.number}>
                  <div className="card" style={{ marginBottom:12 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:".75rem", flexWrap:"wrap", gap:8 }}>
                      <h3 style={{ color:"#0F6E56" }}>Chapter {ch.number}: {ch.title}</h3>
                      {content && !locked && (
                        <div style={{ display:"flex", gap:6 }}>
                          {editMode
                            ? <button className="btn btn-sm btn-primary" onClick={() => { setSections(p=>({...p,[String(ch.number)]:editText})); setEditMode(false); }}>Save edits</button>
                            : <button className="btn btn-sm" onClick={() => { setEditText(content); setEditMode(true); }}>✎ Edit</button>}
                          <button className="btn btn-sm" onClick={() => handleGenerateSection(ch.number)}>↺ Regen</button>
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize:12, color:"#888780", marginBottom:".75rem" }}>
                      {ch.sections?.join("  ·  ")}
                    </div>
                    {locked ? <LockedOverlay projectId={project?.id} />
                    : generating ? (
                      <div style={{ display:"flex", alignItems:"center", gap:10, color:"#1D9E75", padding:"1.5rem 0", fontSize:14 }}>
                        <div className="dot-pulse"><span/><span/><span/></div>
                        AI is writing Chapter {ch.number}…
                      </div>
                    ) : content ? (
                      editMode
                        ? <textarea value={editText} onChange={e=>setEditText(e.target.value)} style={{ minHeight:320, fontSize:14, lineHeight:1.85, width:"100%" }} />
                        : <div style={{ fontSize:14, lineHeight:1.9 }}>
                            {content.split("\n\n").map((p,i) => (
                              <p key={i} style={{ marginBottom:"1rem", textAlign:"justify" }}
                                dangerouslySetInnerHTML={{ __html: p.replace(/\(([^)]+\d{4}[^)]*)\)/g,'<span class="cite">($1)</span>') }} />
                            ))}
                          </div>
                    ) : (
                      <div style={{ color:"#888780", fontSize:14, fontStyle:"italic", padding:"1rem 0" }}>
                        This chapter has not been generated yet.
                      </div>
                    )}
                  </div>
                  {!locked && (
                    <div style={{ display:"flex", gap:10, justifyContent:"space-between", flexWrap:"wrap" }}>
                      <button className="btn" disabled={ch.number===1} onClick={()=>setCurrentCh(ch.number-1)}>← Previous</button>
                      <div style={{ display:"flex", gap:8 }}>
                        {!content && !generating && (
                          <button className="btn btn-primary" onClick={()=>handleGenerateSection(ch.number)}>
                            Generate Chapter {ch.number}
                          </button>
                        )}
                        {content && ch.number < totalChapters && (
                          <button className="btn btn-primary" onClick={()=>{ if(editMode){setSections(p=>({...p,[String(ch.number)]:editText}));setEditMode(false);} setCurrentCh(ch.number+1); }}>
                            Next chapter →
                          </button>
                        )}
                        {content && ch.number===totalChapters && !isPaid && (
                          <Link to={`/payment/${project?.id}`} className="btn btn-primary">🔓 Pay & Download</Link>
                        )}
                        {content && ch.number===totalChapters && isPaid && (
                          <a href={`${import.meta.env.VITE_API_URL||"http://localhost:8000/api"}/export/pdf/${project.id}`}
                             className="btn btn-primary" download>↓ Download PDF</a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StepBar({ current }) {
  const steps = ["Topic Setup","Outline","Write Paper","Export"];
  return (
    <div style={{ display:"flex", alignItems:"center" }}>
      {steps.map((s,i) => (
        <div key={s} style={{ display:"flex", alignItems:"center" }}>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
            <div style={{ width:28, height:28, borderRadius:"50%", border:"2px solid",
              borderColor: i+1<current?"#1D9E75":i+1===current?"#1D9E75":"#D0CEC8",
              background: i+1<current?"#1D9E75":"#fff",
              color: i+1<current?"#fff":i+1===current?"#1D9E75":"#888780",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:500 }}>
              {i+1<current?"✓":i+1}
            </div>
            <span style={{ fontSize:10, color:"#888780", marginTop:3, whiteSpace:"nowrap" }}>{s}</span>
          </div>
          {i<steps.length-1 && <div style={{ width:48, height:2, background:i+1<current?"#1D9E75":"#D0CEC8", margin:"0 2px", marginBottom:14 }} />}
        </div>
      ))}
    </div>
  );
}

function LockedOverlay({ projectId }) {
  return (
    <div style={{ background:"rgba(241,239,232,0.97)", borderRadius:8, padding:"2.5rem 1.5rem", textAlign:"center", border:"0.5px solid rgba(0,0,0,0.1)", marginTop:".5rem" }}>
      <div style={{ fontSize:"2.5rem", marginBottom:".75rem" }}>🔒</div>
      <h3 style={{ marginBottom:".5rem" }}>Unlock Full Paper</h3>
      <p style={{ fontSize:13, color:"#5F5E5A", marginBottom:"1.25rem", lineHeight:1.7 }}>
        Pay UGX 15,000 via MTN MoMo or Airtel Money to unlock all chapters and export as PDF & DOCX.
      </p>
      {projectId && <Link to={`/payment/${projectId}`} className="btn btn-primary btn-lg">Pay UGX 15,000 to Unlock</Link>}
    </div>
  );
}

function Loader({ msg }) {
  return (
    <div style={{ textAlign:"center", padding:"5rem 1rem" }}>
      <span className="spinner" style={{ width:36, height:36, display:"block", margin:"0 auto 1rem" }} />
      <p style={{ color:"#888780" }}>{msg}</p>
    </div>
  );
}
