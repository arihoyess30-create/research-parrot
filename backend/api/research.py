import anthropic, json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from db import get_db
from models import Project, User
from api.auth import get_current_user

router = APIRouter()
client = anthropic.Anthropic()

SYSTEM_PROMPT = """You are an expert academic research assistant specialising in Ugandan and East African
contexts. You write in a formal, scholarly tone appropriate for university-level research.
When generating content:
- Use real, verifiable academic references (authors, years, journals)
- Include Uganda-specific statistics, institutions (Makerere University, Bank of Uganda,
  UBOS, Ministry of Health, etc.) and real place names (Kampala, Gulu, Mbarara, etc.)
- Insert citation placeholders in the requested style
- Structure paragraphs clearly: claim, evidence, analysis
- Write at the specified academic level
"""

CITATION_FORMATS = {"APA": "APA 7th Edition", "MLA": "MLA 9th Edition", "Harvard": "Harvard Referencing System"}

class ProjectCreate(BaseModel):
    topic: str
    questions: list[str]
    field: str
    level: str
    citation_style: str
    pages: int = 20

class OutlineRequest(BaseModel):
    project_id: str

class SectionRequest(BaseModel):
    project_id: str
    chapter: int
    user_edit: Optional[str] = None

def build_outline_prompt(p):
    qs = json.loads(p.questions) if isinstance(p.questions, str) else p.questions
    return f"""Generate a detailed chapter outline for a {p.pages}-page {p.level} research paper.
Topic: {p.topic}
Field: {p.field}
Research Questions:
{chr(10).join(f'- {q}' for q in qs)}
Citation Style: {CITATION_FORMATS.get(p.citation_style, p.citation_style)}

Return a JSON object with this exact structure:
{{
  "title": "Full paper title",
  "chapters": [
    {{
      "number": 1,
      "title": "Introduction",
      "sections": ["1.1 Background", "1.2 Problem Statement", "1.3 Objectives"]
    }}
  ]
}}
Return only the JSON, no markdown fences."""

def build_section_prompt(p, chapter_obj, all_chapters):
    qs = json.loads(p.questions) if isinstance(p.questions, str) else p.questions
    style = CITATION_FORMATS.get(p.citation_style, p.citation_style)
    sections_list = "\n".join(f"  - {s}" for s in chapter_obj.get("sections", []))
    word_count = max(400, (p.pages * 250) // len(all_chapters))
    return f"""Write Chapter {chapter_obj['number']}: {chapter_obj['title']} for the following research paper.

Paper Title: {p.title}
Topic: {p.topic}
Field: {p.field}
Academic Level: {p.level}
Citation Style: {style}
Research Questions: {'; '.join(qs)}

This chapter covers:
{sections_list}

Full paper structure:
{chr(10).join(f"Chapter {c['number']}: {c['title']}" for c in all_chapters)}

Instructions:
- Write approximately {word_count} words
- Use {style} citations inline e.g. (Author, Year, p.X)
- Include Uganda/East Africa specific examples, institutions and real data
- Every major claim must be supported by a real academic source
- Use formal academic English appropriate for {p.level} level
- End with a transition sentence to the next chapter

Write the full chapter content only."""

@router.post("/projects")
def create_project(body: ProjectCreate, db: Session = Depends(get_db),
                   user: User = Depends(get_current_user)):
    proj = Project(
        user_id=user.id, title=body.topic[:120], topic=body.topic,
        questions=json.dumps(body.questions), field=body.field,
        level=body.level, citation_style=body.citation_style, pages=body.pages,
    )
    db.add(proj); db.commit(); db.refresh(proj)
    return {"project_id": proj.id}

@router.post("/outline")
def generate_outline(body: OutlineRequest, db: Session = Depends(get_db),
                     user: User = Depends(get_current_user)):
    proj = db.query(Project).filter_by(id=body.project_id, user_id=user.id).first()
    if not proj: raise HTTPException(404, "Project not found")
    msg = client.messages.create(
        model="claude-sonnet-4-20250514", max_tokens=1500,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": build_outline_prompt(proj)}],
    )
    try:
        outline = json.loads(msg.content[0].text.strip())
    except json.JSONDecodeError:
        raise HTTPException(500, "Failed to parse outline")
    proj.outline = json.dumps(outline)
    proj.title   = outline.get("title", proj.title)
    db.commit()
    return outline

@router.post("/section")
def generate_section(body: SectionRequest, db: Session = Depends(get_db),
                     user: User = Depends(get_current_user)):
    proj = db.query(Project).filter_by(id=body.project_id, user_id=user.id).first()
    if not proj or not proj.outline:
        raise HTTPException(400, "Project or outline not found")
    outline  = json.loads(proj.outline)
    chapters = outline.get("chapters", [])
    if body.chapter < 1 or body.chapter > len(chapters):
        raise HTTPException(400, "Invalid chapter index")
    if body.chapter > 2 and not proj.is_paid:
        raise HTTPException(402, "Payment required to generate chapters 3+")
    if body.user_edit is not None:
        secs = json.loads(proj.sections) if proj.sections else {}
        secs[str(body.chapter - 1)] = body.user_edit
        proj.sections = json.dumps(secs)
        db.commit()
    chapter_obj = chapters[body.chapter - 1]
    msg = client.messages.create(
        model="claude-sonnet-4-20250514", max_tokens=2500,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": build_section_prompt(proj, chapter_obj, chapters)}],
    )
    content = msg.content[0].text.strip()
    secs = json.loads(proj.sections) if proj.sections else {}
    secs[str(body.chapter)] = content
    proj.sections = json.dumps(secs)
    if body.chapter == len(chapters):
        proj.status = "complete"
    db.commit()
    return {"chapter": body.chapter, "title": chapter_obj["title"],
            "content": content, "is_last": body.chapter == len(chapters)}

@router.get("/projects")
def list_projects(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    projs = db.query(Project).filter_by(user_id=user.id).order_by(Project.created_at.desc()).all()
    return [{"id": p.id, "title": p.title, "field": p.field, "level": p.level,
             "citation_style": p.citation_style, "pages": p.pages,
             "status": p.status, "is_paid": p.is_paid, "created_at": p.created_at}
            for p in projs]

@router.get("/projects/{project_id}")
def get_project(project_id: str, db: Session = Depends(get_db),
                user: User = Depends(get_current_user)):
    proj = db.query(Project).filter_by(id=project_id, user_id=user.id).first()
    if not proj: raise HTTPException(404, "Not found")
    sections = json.loads(proj.sections) if proj.sections else {}
    if not proj.is_paid:
        sections = {k: v for k, v in sections.items() if int(k) <= 2}
    return {"id": proj.id, "title": proj.title, "topic": proj.topic,
            "outline": json.loads(proj.outline) if proj.outline else None,
            "sections": sections, "status": proj.status,
            "is_paid": proj.is_paid, "citation_style": proj.citation_style, "level": proj.level}
