"""Live profile-driven and Gemini-backed AptiNexus intelligence services."""
import base64
import hashlib
import hmac
import json
import os
import time
import urllib.parse
import urllib.request
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.catalog_data import CAREERS, RESOURCES, SKILLS
from app.core.config import settings
from app.models import User, UserData

GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")


def read_user_value(db: Session, user_id: int, key: str, default: Any) -> Any:
    row = db.scalar(
        select(UserData).where(
            UserData.user_id == user_id,
            UserData.data_key == key,
        )
    )
    return row.value if row is not None else default


def _strings(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [item.strip() for item in value if isinstance(item, str) and item.strip()]


def user_skill_names(db: Session, user: User) -> set[str]:
    profile = read_user_value(db, user.id, "profile", {})
    names: set[str] = set()
    if isinstance(profile, dict):
        sections = profile.get("sections", {})
        if isinstance(sections, dict):
            names.update(_strings(sections.get("technical")))
    projects = read_user_value(db, user.id, "projects", [])
    if isinstance(projects, list):
        for proj in projects:
            if isinstance(proj, dict):
                names.update(_strings(proj.get("skills")))
    evidence = read_user_value(db, user.id, "evidence", [])
    if isinstance(evidence, list):
        for item in evidence:
            if not isinstance(item, dict):
                continue
            skill = item.get("skill") or item.get("skillName") or item.get("name")
            if isinstance(skill, str) and skill.strip():
                names.add(skill.strip())
    results = read_user_value(db, user.id, "results", [])
    if isinstance(results, list):
        for res in results:
            if not isinstance(res, dict):
                continue
            skill = res.get("skill")
            score = res.get("score", 0)
            total = res.get("total", 0)
            if isinstance(skill, str) and skill.strip() and total and (score / total) >= 0.7:
                names.add(skill.strip())
    return names


def skill_status_for(db: Session, user: User, skill_name: str) -> str:
    target = skill_name.strip().casefold()
    projects = read_user_value(db, user.id, "projects", [])
    evidence = read_user_value(db, user.id, "evidence", [])
    results = read_user_value(db, user.id, "results", [])
    profile = read_user_value(db, user.id, "profile", {})
    claimed = _strings(profile.get("sections", {}).get("technical", [])) if isinstance(profile, dict) else []

    strong = False
    practised = False

    if isinstance(projects, list):
        for proj in projects:
            if isinstance(proj, dict) and any(s.casefold() == target for s in _strings(proj.get("skills"))):
                practised = True
                if proj.get("link"):
                    strong = True

    if isinstance(evidence, list):
        for ev in evidence:
            if isinstance(ev, dict) and str(ev.get("skill", "")).strip().casefold() == target:
                practised = True
                if ev.get("type") == "Demonstration" and ev.get("link"):
                    strong = True

    if isinstance(results, list):
        for res in results:
            if isinstance(res, dict) and str(res.get("skill", "")).strip().casefold() == target:
                total = res.get("total", 0)
                score = res.get("score", 0)
                if total and (score / total) >= 0.7:
                    practised = True

    if strong:
        return "Demonstrated"
    if practised:
        return "Practised"
    if any(c.casefold() == target for c in claimed):
        return "Claimed"
    return "Not started"


def evidenced_skill_names(db: Session, user: User) -> set[str]:
    acquired = user_skill_names(db, user)
    return {name for name in acquired if skill_status_for(db, user, name) == "Demonstrated"}


def profile_completion(db: Session, user: User) -> int:
    profile = read_user_value(
        db,
        user.id,
        "profile",
        {"personal": {"name": user.name, "headline": user.headline, "location": ""}, "sections": {}},
    )
    if not isinstance(profile, dict):
        profile = {}
    personal = profile.get("personal", {"name": user.name, "headline": user.headline, "location": ""})
    sections = profile.get("sections", {})
    if not isinstance(personal, dict):
        personal = {}
    if not isinstance(sections, dict):
        sections = {}
    section_ids = [
        "education", "subjects", "technical", "soft", "interests",
        "experience", "projects", "certifications", "achievements", "goals",
    ]
    filled_sections = sum(bool(_strings(sections.get(key))) for key in section_ids)
    filled_personal = sum(
        bool(value.strip()) for value in personal.values() if isinstance(value, str)
    )
    return round(100 * (filled_sections + filled_personal) / (len(section_ids) + 3))


def career_match(career: dict, acquired: set[str]) -> dict:
    required = career.get("required", [])
    acquired_keys = {name.casefold() for name in acquired}
    matched = [name for name in required if name.casefold() in acquired_keys]
    missing = [name for name in required if name.casefold() not in acquired_keys]
    compatibility = round(100 * len(matched) / len(required)) if required else 0
    return {
        "id": career["id"],
        "title": career["title"],
        "category": career["category"],
        "compatibility": compatibility,
        "missingSkills": len(missing),
        "missing": missing,
        "matched": matched,
        "requiredCount": len(required),
        "matchedCount": len(matched),
        "method": "Based on skills listed in your profile, projects, quiz verifications, and submitted evidence.",
    }


def all_career_matches(db: Session, user: User) -> list[dict]:
    acquired = user_skill_names(db, user)
    return sorted(
        (career_match(career, acquired) for career in CAREERS),
        key=lambda item: (-item["compatibility"], item["title"]),
    )


def dashboard_data(db: Session, user: User) -> dict:
    acquired = user_skill_names(db, user)
    acquired_keys = {name.casefold() for name in acquired}
    skill_counts = {
        "Not started": 0,
        "Claimed": 0,
        "Practised": 0,
        "Demonstrated": 0,
        "Verified": 0,
    }
    skill_rows = []
    for item in SKILLS:
        name = item["name"]
        status = skill_status_for(db, user, name)
        skill_counts[status] = skill_counts.get(status, 0) + 1
        if name.casefold() not in acquired_keys and status == "Not started":
            continue
        skill_rows.append({
            "id": name.lower().replace(" ", "-"),
            "name": name,
            "category": item["category"],
            "status": status,
        })

    matches = all_career_matches(db, user)
    results = read_user_value(db, user.id, "results", [])
    projects = read_user_value(db, user.id, "projects", [])
    completed = len(results) if isinstance(results, list) else 0
    demonstrated = sum(1 for item in skill_rows if item["status"] == "Demonstrated")
    prof_pct = profile_completion(db, user)
    top_career = matches[0] if matches else None
    readiness = min(100, round(top_career["compatibility"] * 0.7 + prof_pct * 0.3)) if top_career else prof_pct

    focus_skills = []
    if top_career:
        for idx, m_skill in enumerate(top_career.get("missing", [])[:4]):
            focus_skills.append({
                "name": m_skill,
                "priority": "Essential" if idx < 3 else "Recommended",
                "career": top_career["title"],
            })

    activities = []
    if isinstance(results, list):
        for r in reversed(results[-3:]):
            if isinstance(r, dict):
                activities.append({
                    "id": f"res-{r.get('id', '1')}",
                    "text": f"Completed {r.get('assessment', 'Quiz')} ({r.get('score', 0)}/{r.get('total', 4)})",
                    "when": str(r.get("date", "Recently")),
                })
    if isinstance(projects, list):
        for p in reversed(projects[-2:]):
            if isinstance(p, dict):
                activities.append({
                    "id": f"proj-{p.get('id', '1')}",
                    "text": f"Added project \"{p.get('title', 'Project')}\"",
                    "when": "Saved in portfolio",
                })
    if not activities:
        activities.append({
            "id": "act-init",
            "text": f"Profile is {prof_pct}% complete with {len(skill_rows)} tracked skill(s).",
            "when": "Live status",
        })

    return {
        "profileCompletion": prof_pct,
        "readiness": readiness,
        "skills": skill_rows,
        "skillCounts": skill_counts,
        "careers": matches[:5],
        "progress": [
            {"month": "Current", "skills": len(skill_rows), "demonstrated": demonstrated}
        ],
        "strengths": [s["name"] for s in skill_rows][:8],
        "focusSkills": focus_skills,
        "activities": activities,
        "assessmentCount": completed,
    }


def build_notifications(db: Session, user: User) -> list[dict]:
    profile = read_user_value(db, user.id, "profile", {})
    results = read_user_value(db, user.id, "results", [])
    user_settings = read_user_value(db, user.id, "settings", {"focus": "Engineering", "hours": 5})
    claimed = _strings(profile.get("sections", {}).get("technical", [])) if isinstance(profile, dict) else []
    unverified = [s for s in claimed if skill_status_for(db, user, s) == "Claimed"]
    items = []

    if unverified:
        first = unverified[0]
        items.append({
            "id": f"notif-claim-{first.lower().replace(' ', '-')}",
            "cat": "Skill recommendation",
            "title": f"Verify your claimed skill: {first}",
            "body": f"You have {len(unverified)} claimed skill(s) awaiting verification. Take a 4-question micro-assessment to upgrade {first} to Practised.",
            "when": "Action required",
            "actionPath": f"/app/assessments?skill={urllib.parse.quote(first)}",
            "actionLabel": f"Take {first} micro-quiz",
        })

    if isinstance(results, list) and results:
        latest = results[-1]
        if isinstance(latest, dict):
            score = latest.get("score", 0)
            total = latest.get("total", 4) or 4
            pct = round(100 * score / total)
            skill = latest.get("skill", "Skill")
            if pct >= 70:
                items.append({
                    "id": f"notif-quiz-pass-{latest.get('id', 'latest')}",
                    "cat": "Assessment result",
                    "title": f"{skill} verified as Practised ({pct}%)",
                    "body": f"You scored {score}/{total} on {latest.get('assessment', skill)}. Add a linked project in SkillProof to reach Demonstrated.",
                    "when": str(latest.get("date", "Recent")),
                    "actionPath": "/app/skillproof",
                    "actionLabel": "Open SkillProof",
                })
            else:
                items.append({
                    "id": f"notif-quiz-retry-{latest.get('id', 'latest')}",
                    "cat": "Assessment result",
                    "title": f"Review {skill} ({pct}%)",
                    "body": f"Score 70% or higher on {skill} to upgrade its status from Claimed to Practised.",
                    "when": str(latest.get("date", "Recent")),
                    "actionPath": f"/app/assessments?skill={urllib.parse.quote(str(skill))}",
                    "actionLabel": "Retake micro-quiz",
                })

    matches = all_career_matches(db, user)
    if matches:
        top = matches[0]
        missing = top.get("missing", [])
        bridge = missing[0] if missing else None
        items.append({
            "id": f"notif-career-{top['id']}-{top['compatibility']}",
            "cat": "Skill recommendation",
            "title": f"Top Career Fit: {top['title']} ({top['compatibility']}%)",
            "body": (
                f"Your highest-impact bridge skill for {top['title']} is {bridge}."
                if bridge else f"You match all core skills for {top['title']}!"
            ),
            "when": "Live match",
            "actionPath": f"/app/gaps?career={top['id']}",
            "actionLabel": "View skill gap analysis",
        })

    roadmap_done = 0
    for c in CAREERS:
        done = read_user_value(db, user.id, f"roadmap:{c['id']}", [])
        if isinstance(done, list):
            roadmap_done += len(done)
    if roadmap_done > 0:
        items.append({
            "id": f"notif-roadmap-{roadmap_done}",
            "cat": "Roadmap milestone",
            "title": f"{roadmap_done} roadmap task(s) completed",
            "body": "Keep completing milestones on your career learning roadmap.",
            "when": "In progress",
            "actionPath": "/app/roadmap",
            "actionLabel": "Continue roadmap",
        })

    hours = user_settings.get("hours", 5) if isinstance(user_settings, dict) else 5
    items.append({
        "id": f"notif-goal-{hours}h",
        "cat": "Learning reminder",
        "title": f"Weekly learning target: {hours} hours",
        "body": f"Your weekly study target is set to {hours} hours. Explore courses and tutorials aligned with your target career.",
        "when": "Weekly target",
        "actionPath": "/app/resources",
        "actionLabel": "Browse learning resources",
    })

    prof_pct = profile_completion(db, user)
    if prof_pct < 85:
        items.append({
            "id": f"notif-profile-{prof_pct}",
            "cat": "Profile update",
            "title": f"Profile completion is at {prof_pct}%",
            "body": "Upload your resume for Gemini auto-extraction or complete remaining profile sections.",
            "when": "Profile check",
            "actionPath": "/app/resume",
            "actionLabel": "Analyze resume with AI",
        })

    return items


def career_gaps(db: Session, user: User, career_id: str) -> dict | None:
    career = next((item for item in CAREERS if item["id"] == career_id), None)
    if career is None:
        return None
    acquired = user_skill_names(db, user)
    acquired_keys = {name.casefold() for name in acquired}
    required = career.get("required", [])
    return {
        "careerId": career_id,
        "strengths": [name for name in required if name.casefold() in acquired_keys],
        "missing": [name for name in required if name.casefold() not in acquired_keys],
        "optional": [
            item["name"] for item in SKILLS
            if item["name"] not in required
            and item["name"].casefold() not in acquired_keys
            and any(related in required for related in item.get("related", []))
        ][:3],
        "method": "Compares skills in your saved profile and evidence with this career's listed requirements.",
    }


def simulate_career_matches(db: Session, user: User, extra_skills: list[str]) -> list[dict]:
    acquired = user_skill_names(db, user)
    hypothetical = acquired | {name.strip() for name in extra_skills if isinstance(name, str) and name.strip()}
    hypothetical_keys = {name.casefold() for name in hypothetical}
    current = {item["id"]: item for item in (career_match(c, acquired) for c in CAREERS)}
    projected = []
    for career in CAREERS:
        before = current[career["id"]]["compatibility"]
        after = career_match(career, hypothetical)["compatibility"]
        projected.append({
            "id": career["id"],
            "current": before,
            "hypothetical": after,
            "change": after - before,
            "stillNeeded": [name for name in career.get("required", []) if name.casefold() not in hypothetical_keys],
        })
    return sorted(projected, key=lambda item: (-item["hypothetical"], item["id"]))


def sign_quiz_token(payload: dict) -> str:
    encoded = base64.urlsafe_b64encode(json.dumps(payload).encode("utf-8")).decode("utf-8").rstrip("=")
    sig = hmac.new(settings.secret_key.encode("utf-8"), encoded.encode("utf-8"), hashlib.sha256).digest()
    sig_b64 = base64.urlsafe_b64encode(sig).decode("utf-8").rstrip("=")
    return f"{encoded}.{sig_b64}"


def verify_quiz_token(token: str) -> dict | None:
    parts = token.split(".")
    if len(parts) != 2:
        return None
    encoded, sig_b64 = parts
    expected_sig = hmac.new(settings.secret_key.encode("utf-8"), encoded.encode("utf-8"), hashlib.sha256).digest()
    expected_b64 = base64.urlsafe_b64encode(expected_sig).decode("utf-8").rstrip("=")
    if not hmac.compare_digest(sig_b64, expected_b64):
        return None
    padding = "=" * (-len(encoded) % 4)
    try:
        data = json.loads(base64.urlsafe_b64decode(encoded + padding).decode("utf-8"))
        if data.get("exp", 0) < time.time() * 1000:
            return None
        return data
    except Exception:
        return None


def call_gemini_json(prompt: str, system_instruction: str) -> dict:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured.")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={api_key}"
    body = {
        "systemInstruction": {"parts": [{"text": system_instruction}]},
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json"},
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json", "User-Agent": "aistudio-build"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
    text = payload["candidates"][0]["content"]["parts"][0]["text"]
    return json.loads(text)
