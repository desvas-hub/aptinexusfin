import time
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.orm import Session

from app.catalog_data import ASSESSMENTS, CAREERS, RESOURCES, SKILLS
from app.core.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.services.intelligence import (
    GEMINI_MODEL,
    all_career_matches,
    build_notifications,
    call_gemini_json,
    career_gaps,
    dashboard_data,
    read_user_value,
    sign_quiz_token,
    simulate_career_matches,
    skill_status_for,
    user_skill_names,
    verify_quiz_token,
)

router = APIRouter(tags=["AptiNexus"])


@router.get("/analytics/dashboard")
def dashboard(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return dashboard_data(db, user)


@router.get("/notifications")
def notifications(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return build_notifications(db, user)


@router.get("/careers")
def careers(user: User = Depends(get_current_user)):
    return CAREERS


@router.get("/careers/matches")
def career_matches(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return all_career_matches(db, user)


@router.get("/careers/{career_id}")
def career(career_id: str, user: User = Depends(get_current_user)):
    item = next((career for career in CAREERS if career["id"] == career_id), None)
    if item is None:
        raise HTTPException(status_code=404, detail="Career not found")
    return item


@router.get("/skills")
def skills(user: User = Depends(get_current_user)):
    return SKILLS


@router.get("/resources")
def resources(user: User = Depends(get_current_user)):
    return RESOURCES


@router.get("/assessments")
def assessments(user: User = Depends(get_current_user)):
    return [
        {
            "id": item["id"],
            "title": item["title"],
            "skill": item["skill"],
            "questions": [
                {"q": question["q"], "options": question["options"]}
                for question in item["questions"]
            ],
        }
        for item in ASSESSMENTS
    ]


@router.post("/assessments/{assessment_id}/submit")
def submit_assessment(
    assessment_id: str,
    payload: dict,
    user: User = Depends(get_current_user),
):
    assessment = next((item for item in ASSESSMENTS if item["id"] == assessment_id), None)
    if assessment is None:
        raise HTTPException(status_code=404, detail="Assessment not found")
    answers = payload.get("answers")
    questions = assessment["questions"]
    if not isinstance(answers, list) or len(answers) != len(questions):
        raise HTTPException(status_code=422, detail="Submit one answer for every question")
    if any(type(answer) is not int or answer < 0 or answer >= len(questions[index]["options"])
           for index, answer in enumerate(answers)):
        raise HTTPException(status_code=422, detail="One or more answers are invalid")
    correct_answers = [question["answer"] for question in questions]
    score = sum(answer == correct for answer, correct in zip(answers, correct_answers))
    total = len(questions)
    return {
        "assessmentId": assessment_id,
        "score": score,
        "total": total,
        "percentage": round(100 * score / total) if total else 0,
        "correctAnswers": correct_answers,
        "feedback": (
            "Strong result. Add a project or demonstration to back it up."
            if total and score / total >= 0.75 else
            "Partial result. Revisit the topics you missed."
            if total and score / total >= 0.5 else
            "This skill needs more practice."
        ),
    }


@router.get("/skillgraph")
def skillgraph(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    acquired = user_skill_names(db, user)
    catalog_by_name = {item["name"].casefold(): item for item in SKILLS}
    nodes = []
    skill_ids = {}
    for name in sorted(acquired, key=str.casefold):
        catalog = catalog_by_name.get(name.casefold(), {})
        node_id = "skill-" + "-".join(name.casefold().split())
        skill_ids[name.casefold()] = node_id
        st = skill_status_for(db, user, name)
        nodes.append({
            "id": node_id,
            "label": catalog.get("name", name),
            "cat": "skill",
            "status": st if st in {"Demonstrated", "Practised"} else "Claimed",
            "desc": catalog.get("desc", "A skill saved in your profile."),
        })

    edges = []
    for name in acquired:
        catalog = catalog_by_name.get(name.casefold(), {})
        for related in catalog.get("related", []):
            related_id = skill_ids.get(related.casefold())
            source_id = skill_ids[name.casefold()]
            if related_id and source_id != related_id:
                edge = sorted([source_id, related_id])
                if edge not in edges:
                    edges.append(edge)

    for career in CAREERS:
        matched_ids = [
            skill_ids[required.casefold()]
            for required in career.get("required", [])
            if required.casefold() in skill_ids
        ]
        if not matched_ids:
            continue
        nodes.append({
            "id": "career-" + career["id"],
            "label": career["title"],
            "cat": "career",
            "desc": "A possible career path connected to skills in your profile.",
        })
        edges.extend([[matched_id, "career-" + career["id"]] for matched_id in matched_ids])

    return {"nodes": nodes, "edges": edges}


@router.get("/careers/{career_id}/gaps")
def gaps(career_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    result = career_gaps(db, user, career_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Career not found")
    return result


@router.post("/what-if")
def what_if(payload: dict, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    extra_skills = payload.get("extraSkills", [])
    if not isinstance(extra_skills, list):
        raise HTTPException(status_code=422, detail="extraSkills must be a list")
    return simulate_career_matches(db, user, extra_skills)


@router.post("/ai/recommendations")
def ai_recommendations(payload: dict, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = read_user_value(db, user.id, "profile", {})
    projects = read_user_value(db, user.id, "projects", [])
    evidence = read_user_value(db, user.id, "evidence", [])
    results = read_user_value(db, user.id, "results", [])
    system_instruction = (
        "You are the AptiNexus Career & Course Intelligence Advisor. Return JSON with keys: "
        "summary (string), careerTargets (array of {careerId, title, fitScore, rationale, matchedSkills, missingCoreSkills, bridgeSkills, suggestedHeadline}), "
        "courseRecommendations (array of {resourceId, title, skill, type, level, url, reason, targetCareerTitle, priority}), "
        "profileCorrections (array of {section, currentValue, suggestedValue, reason}), "
        "skillNormalizations (array of {rawSkill, canonicalSkill, reason})."
    )
    prompt = json.dumps({
        "focus": payload.get("focus", "all"),
        "focusCareerId": payload.get("focusCareerId"),
        "profile": profile,
        "projects": projects,
        "evidence": evidence,
        "results": results,
        "careers": CAREERS,
        "skills": SKILLS,
        "resources": RESOURCES,
    })
    try:
        data = call_gemini_json(prompt, system_instruction)
        data["generatedBy"] = GEMINI_MODEL
        return data
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@router.post("/ai/skill-quiz")
def ai_skill_quiz(payload: dict, user: User = Depends(get_current_user)):
    skill = str(payload.get("skill", "")).strip()
    if not skill:
        raise HTTPException(status_code=422, detail="Provide a skill name")
    system_instruction = (
        "Generate a 4-question scenario-based multiple choice quiz in JSON: "
        "{title: string, questions: [{q: string, options: [str,str,str,str], correctIndex: int, explanation: string}]}"
    )
    try:
        data = call_gemini_json(f"Skill: {skill}", system_instruction)
        questions = data.get("questions", [])[:4]
        token = sign_quiz_token({
            "skill": skill,
            "correctAnswers": [int(q.get("correctIndex", 0)) for q in questions],
            "explanations": [str(q.get("explanation", "")) for q in questions],
            "exp": int(time.time() * 1000) + 7200 * 1000,
        })
        return {
            "skill": skill,
            "title": data.get("title", f"{skill} Verification Check"),
            "quizToken": token,
            "questions": [{"q": q["q"], "options": q["options"][:4]} for q in questions],
            "generatedBy": GEMINI_MODEL,
        }
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@router.post("/ai/skill-quiz/submit")
def ai_skill_quiz_submit(payload: dict, user: User = Depends(get_current_user)):
    token = str(payload.get("quizToken", ""))
    answers = payload.get("answers", [])
    verified_data = verify_quiz_token(token)
    if not verified_data:
        raise HTTPException(status_code=422, detail="Invalid or expired quiz token")
    correct = verified_data["correctAnswers"]
    explanations = verified_data["explanations"]
    skill = verified_data["skill"]
    if not isinstance(answers, list) or len(answers) != len(correct):
        raise HTTPException(status_code=422, detail="Submit one answer for every question")
    score = sum(int(a) == int(c) for a, c in zip(answers, correct))
    total = len(correct)
    pct = round(100 * score / total) if total else 0
    verified = pct >= 70
    return {
        "skill": skill,
        "score": score,
        "total": total,
        "percentage": pct,
        "verified": verified,
        "statusUpgrade": "Practised" if verified else "Claimed",
        "correctAnswers": correct,
        "explanations": explanations,
        "feedback": (
            f"Verified! You scored {pct}% ({score}/{total}). {skill} is now Practised."
            if verified else
            f"You scored {pct}% ({score}/{total}). Score 70% or higher to upgrade {skill} to Practised."
        ),
    }


@router.post("/resume/analyze")
async def resume_analyze(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    import io
    import json
    import re
    from docx import Document
    from pypdf import PdfReader

    filename = (file.filename or "").lower()
    if not (filename.endswith(".pdf") or filename.endswith(".docx")):
        raise HTTPException(status_code=415, detail="Upload a PDF or DOCX file")
    raw = await file.read(5 * 1024 * 1024 + 1)
    if len(raw) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Resume must be 5 MB or smaller")
    if not raw:
        raise HTTPException(status_code=400, detail="The uploaded file is empty")
    try:
        if filename.endswith(".pdf"):
            reader = PdfReader(io.BytesIO(raw))
            if reader.is_encrypted:
                raise HTTPException(status_code=422, detail="Password-protected PDFs are not supported")
            text = "\n".join(page.extract_text() or "" for page in reader.pages[:20])
        else:
            document = Document(io.BytesIO(raw))
            text = "\n".join(paragraph.text for paragraph in document.paragraphs)
            for table in document.tables:
                text += "\n" + "\n".join(" | ".join(cell.text for cell in row.cells) for row in table.rows)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=422, detail="Could not read this document. Try another PDF or DOCX.")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    if not text:
        raise HTTPException(status_code=422, detail="No selectable text found. Scanned image-only PDFs are not supported yet.")

    profile = read_user_value(db, user.id, "profile", {})
    system_instruction = (
        "Analyze the resume text against the user's current profile and AptiNexus catalogs. "
        "Return JSON with keys: summary, extracted (object with 10 section arrays), "
        "suggestions (array of {section, item, reason}), profileCorrections (array of {section, currentValue, suggestedValue, reason}), "
        "skillNormalizations (array of {rawSkill, canonicalSkill, reason}), recommendedCareerIds (array of career IDs), missingSections (array of strings)."
    )
    try:
        data = call_gemini_json(
            json.dumps({"fileName": file.filename, "profile": profile, "resumeText": text[:14000], "skills": [s["name"] for s in SKILLS], "careers": CAREERS}),
            system_instruction,
        )
        data["fileName"] = file.filename or "resume"
        data["generatedBy"] = GEMINI_MODEL
        return data
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))
