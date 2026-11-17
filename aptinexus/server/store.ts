import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { careers } from '../src/data/careers'
import { library, priorityOf } from '../src/data/skills'
import { resources } from '../src/data/resources'
import { assessments } from '../src/data/assessments'
import { completion, sectionDefs, type ProfileData } from '../src/data/profile'
import { statusFor, type Evidence, type Project, type Result } from '../src/data/evidence'
import type { DashboardData, NotificationItem, SkillStatus, User } from '../src/types'

const SECRET = process.env.SECRET_KEY || 'aptinexus-live-secret-key-2026'
const DATA_DIR = path.resolve(process.cwd(), '.data')
const DB_FILE = path.join(DATA_DIR, 'aptinexus-db.json')

interface StoredUser {
  id: string
  name: string
  email: string
  headline: string
  passwordHash: string
  createdAt: string
}

interface DbSchema {
  users: StoredUser[]
  userData: Record<string, Record<string, unknown>>
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const derived = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${derived}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, key] = stored.split(':')
  if (!salt || !key) return false
  const derived = crypto.scryptSync(password, salt, 64).toString('hex')
  return crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(derived, 'hex'))
}

export function createAccessToken(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ sub: userId, exp: Date.now() + 1000 * 60 * 60 * 24 * 7 })
  ).toString('base64url')
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

export function verifyAccessToken(token: string): string | null {
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null
  const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url')
  if (sig !== expected) return null
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { sub?: string; exp?: number }
    if (!parsed.sub || (parsed.exp && Date.now() > parsed.exp)) return null
    return String(parsed.sub)
  } catch {
    return null
  }
}

export interface SignedQuizPayload {
  skill: string
  correctAnswers: number[]
  explanations: string[]
  exp: number
}

export function signQuizToken(payload: SignedQuizPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = crypto.createHmac('sha256', SECRET).update(encoded).digest('base64url')
  return `${encoded}.${sig}`
}

export function verifyQuizToken(token: string): SignedQuizPayload | null {
  const [encoded, sig] = token.split('.')
  if (!encoded || !sig) return null
  const expected = crypto.createHmac('sha256', SECRET).update(encoded).digest('base64url')
  if (sig !== expected) return null
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SignedQuizPayload
    if (!parsed.skill || !Array.isArray(parsed.correctAnswers) || Date.now() > parsed.exp) return null
    return parsed
  } catch {
    return null
  }
}

function loadDb(): DbSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) as DbSchema
      if (raw && Array.isArray(raw.users) && raw.userData) return raw
    }
  } catch {
    // Re-initialize on corrupt file
  }
  const initial: DbSchema = { users: [], userData: {} }
  saveDb(initial)
  return initial
}

function saveDb(db: DbSchema): void {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8')
  } catch {
    // Ignore write failure in read-only environments
  }
}

const dbState: DbSchema = loadDb()

export function toPublicUser(u: StoredUser): User {
  return { id: u.id, name: u.name, email: u.email, headline: u.headline }
}

export function findUserByEmail(email: string): StoredUser | undefined {
  const clean = email.trim().toLowerCase()
  return dbState.users.find(u => u.email.toLowerCase() === clean)
}

export function findUserById(id: string): StoredUser | undefined {
  return dbState.users.find(u => u.id === id)
}

export function createUser(name: string, email: string, password: string): StoredUser {
  const id = String(dbState.users.length + 1)
  const user: StoredUser = {
    id,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    headline: 'Engineering Student',
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  }
  dbState.users.push(user)
  dbState.userData[id] = {
    profile: {
      personal: { name: user.name, headline: user.headline, location: '' },
      sections: {},
    },
    projects: [],
    evidence: [],
    results: [],
    settings: { focus: 'Engineering', hours: 5 },
    notifRead: [],
  }
  saveDb(dbState)
  return user
}

export function readUserValue<T>(userId: string, key: string, fallback: T): T {
  const bucket = dbState.userData[userId]
  if (!bucket || !(key in bucket)) return fallback
  return bucket[key] as T
}

export function writeUserValue<T>(userId: string, key: string, value: T): T {
  if (!dbState.userData[userId]) dbState.userData[userId] = {}
  dbState.userData[userId][key] = value
  if (key === 'profile' && value && typeof value === 'object') {
    const personal = (value as ProfileData).personal
    const user = findUserById(userId)
    if (user && personal) {
      if (personal.name?.trim()) user.name = personal.name.trim()
      if (personal.headline?.trim()) user.headline = personal.headline.trim()
    }
  }
  saveDb(dbState)
  return value
}

export function getUserContext(user: StoredUser) {
  const profile = readUserValue<ProfileData>(user.id, 'profile', {
    personal: { name: user.name, headline: user.headline, location: '' },
    sections: {},
  })
  const projects = readUserValue<Project[]>(user.id, 'projects', [])
  const evidence = readUserValue<Evidence[]>(user.id, 'evidence', [])
  const results = readUserValue<Result[]>(user.id, 'results', [])
  const settings = readUserValue<{ focus?: string; hours?: number }>(user.id, 'settings', {
    focus: 'Engineering',
    hours: 5,
  })
  const notifRead = readUserValue<string[]>(user.id, 'notifRead', [])

  const claimedSkills = Array.isArray(profile.sections?.technical)
    ? profile.sections.technical.map(s => String(s).trim()).filter(Boolean)
    : []

  const allAcquiredSet = new Set<string>(claimedSkills)
  projects.forEach(p => (p.skills || []).forEach(s => allAcquiredSet.add(s)))
  evidence.forEach(e => { if (e.skill) allAcquiredSet.add(e.skill) })
  results.forEach(r => { if (r.skill && r.total && r.score / r.total >= 0.7) allAcquiredSet.add(r.skill) })

  return {
    user,
    profile,
    projects,
    evidence,
    results,
    settings,
    notifRead,
    claimedSkills,
    allAcquired: Array.from(allAcquiredSet),
  }
}

export function computeCareerMatches(user: StoredUser) {
  const { allAcquired } = getUserContext(user)
  const lowerSet = new Set(allAcquired.map(s => s.toLowerCase()))

  return careers
    .map(c => {
      const matched = c.required.filter(req => lowerSet.has(req.toLowerCase()))
      const missing = c.required.filter(req => !lowerSet.has(req.toLowerCase()))
      const compatibility = c.required.length ? Math.round((100 * matched.length) / c.required.length) : 0
      return {
        id: c.id,
        title: c.title,
        category: c.category,
        compatibility,
        missingSkills: missing.length,
        matched,
        missing,
        requiredCount: c.required.length,
        matchedCount: matched.length,
        method: 'Based on skills listed in your profile, projects, quiz verifications, and submitted evidence.',
      }
    })
    .sort((a, b) => b.compatibility - a.compatibility || a.title.localeCompare(b.title))
}

export function computeDashboard(user: StoredUser): DashboardData {
  const { profile, projects, evidence, results, claimedSkills, allAcquired } = getUserContext(user)
  const profPct = completion(profile)

  const skillCounts: Record<SkillStatus, number> = {
    'Not started': 0,
    Claimed: 0,
    Practised: 0,
    Demonstrated: 0,
    Verified: 0,
  }

  const lowerAcquired = new Set(allAcquired.map(s => s.toLowerCase()))
  const skillRows: { id: string; name: string; category: string; status: SkillStatus }[] = []

  library.forEach(libSkill => {
    const st = statusFor(libSkill.name, projects, evidence, results, claimedSkills)
    const normalizedStatus: SkillStatus =
      st === 'Demonstrated' || st === 'Practised' || st === 'Claimed' || st === 'Verified'
        ? st
        : 'Not started'
    skillCounts[normalizedStatus] = (skillCounts[normalizedStatus] || 0) + 1
    if (lowerAcquired.has(libSkill.name.toLowerCase()) || normalizedStatus !== 'Not started') {
      skillRows.push({
        id: libSkill.name.toLowerCase().replace(/\s+/g, '-'),
        name: libSkill.name,
        category: libSkill.category,
        status: normalizedStatus,
      })
    }
  })

  // Also include custom technical skills claimed in profile not in canonical library
  claimedSkills.forEach(cs => {
    if (!library.some(l => l.name.toLowerCase() === cs.toLowerCase())) {
      const st = statusFor(cs, projects, evidence, results, claimedSkills)
      const normalizedStatus: SkillStatus =
        st === 'Demonstrated' || st === 'Practised' ? st : 'Claimed'
      skillRows.push({
        id: cs.toLowerCase().replace(/\s+/g, '-'),
        name: cs,
        category: 'Technical',
        status: normalizedStatus,
      })
      skillCounts[normalizedStatus] = (skillCounts[normalizedStatus] || 0) + 1
    }
  })

  const matches = computeCareerMatches(user)
  const topCareer = matches[0]
  const readiness = topCareer
    ? Math.min(100, Math.round(topCareer.compatibility * 0.7 + profPct * 0.3))
    : profPct

  const strengths = skillRows
    .filter(s => s.status === 'Demonstrated' || s.status === 'Practised' || s.status === 'Claimed')
    .map(s => s.name)
    .slice(0, 8)

  const focusSkills = topCareer
    ? (topCareer.missing || []).slice(0, 4).map(name => {
        const careerObj = careers.find(c => c.id === topCareer.id)
        return {
          name,
          priority: careerObj ? priorityOf(careerObj, name) : 'Essential',
          career: topCareer.title,
        }
      })
    : []

  const activities: { id: string; text: string; when: string }[] = []
  results.slice(-3).reverse().forEach(r => {
    activities.push({
      id: `res-${r.id}`,
      text: `Completed ${r.assessment} (${r.score}/${r.total})`,
      when: r.date || 'Recently',
    })
  })
  projects.slice(-2).reverse().forEach(p => {
    activities.push({
      id: `proj-${p.id}`,
      text: `Added project "${p.title}" (${(p.skills || []).join(', ') || 'General'})`,
      when: 'Saved in portfolio',
    })
  })
  if (activities.length === 0) {
    activities.push({
      id: 'act-welcome',
      text: `Profile is ${profPct}% complete with ${skillRows.length} tracked skill(s).`,
      when: 'Live status',
    })
  }

  return {
    profileCompletion: profPct,
    readiness,
    skills: skillRows,
    skillCounts,
    careers: matches.slice(0, 5),
    progress: [
      {
        month: 'Current',
        skills: skillRows.length,
        demonstrated: skillRows.filter(s => s.status === 'Demonstrated').length,
      },
    ],
    strengths,
    focusSkills,
    activities,
    assessmentCount: results.length,
  }
}

export function computeNotifications(user: StoredUser): NotificationItem[] {
  const { profile, projects, evidence, results, settings, claimedSkills } = getUserContext(user)
  const items: NotificationItem[] = []
  const profPct = completion(profile)

  // 1. Unverified Claimed skills -> alert linking to /app/assessments?skill=<encodeURIComponent(skill)>
  const unverifiedClaims = claimedSkills.filter(
    s => statusFor(s, projects, evidence, results, claimedSkills) === 'Claimed'
  )
  if (unverifiedClaims.length > 0) {
    const firstSkill = unverifiedClaims[0]
    items.push({
      id: `notif-claim-${firstSkill.toLowerCase().replace(/\s+/g, '-')}`,
      cat: 'Skill recommendation',
      title: `Verify your claimed skill: ${firstSkill}`,
      body: `You have ${unverifiedClaims.length} claimed skill(s) without verification (${unverifiedClaims.slice(0, 3).join(', ')}). Take a 4-question Gemini micro-assessment to upgrade ${firstSkill} to Practised.`,
      when: 'Action required',
      actionPath: `/app/assessments?skill=${encodeURIComponent(firstSkill)}`,
      actionLabel: `Take ${firstSkill} micro-quiz`,
    })
  }

  // 2. Latest quiz/assessment results (>= 70% vs < 70%)
  if (results.length > 0) {
    const latest = results[results.length - 1]
    const pct = latest.total ? Math.round((100 * latest.score) / latest.total) : 0
    if (pct >= 70) {
      items.push({
        id: `notif-quiz-pass-${latest.id}`,
        cat: 'Assessment result',
        title: `${latest.skill} verified as Practised (${pct}%)`,
        body: `Great job scoring ${latest.score}/${latest.total} on ${latest.assessment}. Add a linked project in SkillProof to reach Demonstrated status.`,
        when: latest.date || 'Recent',
        actionPath: '/app/skillproof',
        actionLabel: 'Open SkillProof',
      })
    } else {
      items.push({
        id: `notif-quiz-retry-${latest.id}`,
        cat: 'Assessment result',
        title: `Review ${latest.skill} (${pct}% on ${latest.assessment})`,
        body: `Score 70% or higher on ${latest.skill} to upgrade its status from Claimed to Practised.`,
        when: latest.date || 'Recent',
        actionPath: `/app/assessments?skill=${encodeURIComponent(latest.skill)}`,
        actionLabel: 'Retake micro-quiz',
      })
    }
  }

  // 3. Top career compatibility match & highest-impact missing bridge skill
  const matches = computeCareerMatches(user)
  if (matches.length > 0) {
    const top = matches[0]
    const bridge = top.missing?.[0]
    items.push({
      id: `notif-career-${top.id}-${top.compatibility}`,
      cat: 'Skill recommendation',
      title: `Top Career Fit: ${top.title} (${top.compatibility}%)`,
      body: bridge
        ? `Your highest-impact bridge skill for ${top.title} is ${bridge}. Closing this gap will directly boost your role compatibility.`
        : `You match all core requirements for ${top.title}! Focus on demonstrating your skills with portfolio links.`,
      when: 'Live match',
      actionPath: `/app/gaps?career=${encodeURIComponent(top.id)}`,
      actionLabel: 'View skill gap analysis',
    })
  }

  // 4. Active roadmap tasks completed
  let totalRoadmapDone = 0
  let activeCareerTitle = ''
  for (const c of careers) {
    const doneList = readUserValue<string[]>(user.id, `roadmap:${c.id}`, [])
    if (Array.isArray(doneList) && doneList.length > 0) {
      totalRoadmapDone += doneList.length
      if (!activeCareerTitle) activeCareerTitle = c.title
    }
  }
  if (totalRoadmapDone > 0) {
    items.push({
      id: `notif-roadmap-${totalRoadmapDone}`,
      cat: 'Roadmap milestone',
      title: `${totalRoadmapDone} roadmap task${totalRoadmapDone === 1 ? '' : 's'} completed`,
      body: `You're making steady progress on your ${activeCareerTitle || 'career'} learning roadmap. Keep checking off milestones!`,
      when: 'In progress',
      actionPath: '/app/roadmap',
      actionLabel: 'Continue roadmap',
    })
  }

  // 5. Weekly learning goal reminder (settings.hours)
  const hours = settings?.hours ?? 5
  items.push({
    id: `notif-goal-${hours}h`,
    cat: 'Learning reminder',
    title: `Weekly learning target: ${hours} hours`,
    body: `Your study goal is set to ${hours} hrs/week (${settings?.focus || 'Engineering'} focus). Explore curated courses and AI recommendations to stay on track.`,
    when: 'Weekly target',
    actionPath: '/app/resources',
    actionLabel: 'Browse learning resources',
  })

  // 6. Profile completion alert if < 85% (linking to /app/resume)
  if (profPct < 85) {
    const missingNames = sectionDefs
      .filter(s => !(profile.sections?.[s.id]?.length))
      .slice(0, 3)
      .map(s => s.title)
    items.push({
      id: `notif-profile-${profPct}`,
      cat: 'Profile update',
      title: `Profile completion is at ${profPct}%`,
      body: `Upload your resume for instant Gemini auto-extraction or fill in ${missingNames.join(', ') || 'remaining sections'} to unlock more accurate career projections.`,
      when: 'Profile check',
      actionPath: '/app/resume',
      actionLabel: 'Analyze resume with AI',
    })
  }

  return items
}

export function computeSkillGraph(user: StoredUser) {
  const { profile, projects, evidence, results, claimedSkills, allAcquired } = getUserContext(user)
  const catalogByName = new Map(library.map(item => [item.name.toLowerCase(), item]))
  const nodes: { id: string; label: string; cat: string; status?: string; desc: string }[] = []
  const edges: [string, string][] = []
  const skillIds = new Map<string, string>()

  for (const name of [...allAcquired].sort((a, b) => a.localeCompare(b))) {
    const catalog = catalogByName.get(name.toLowerCase())
    const nodeId = 'skill-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    skillIds.set(name.toLowerCase(), nodeId)
    const st = statusFor(name, projects, evidence, results, claimedSkills)
    nodes.push({
      id: nodeId,
      label: catalog?.name || name,
      cat: 'skill',
      status: st === 'Demonstrated' || st === 'Practised' ? st : 'Claimed',
      desc: catalog?.desc || 'A skill saved in your profile.',
    })
  }

  for (const name of allAcquired) {
    const catalog = catalogByName.get(name.toLowerCase())
    const sourceId = skillIds.get(name.toLowerCase())
    if (!catalog || !sourceId) continue
    for (const related of catalog.related) {
      const targetId = skillIds.get(related.toLowerCase())
      if (targetId && sourceId !== targetId) {
        const pair: [string, string] = sourceId < targetId ? [sourceId, targetId] : [targetId, sourceId]
        if (!edges.some(([a, b]) => a === pair[0] && b === pair[1])) {
          edges.push(pair)
        }
      }
    }
  }

  // Add project nodes connected to skills
  projects.forEach(proj => {
    const projId = `project-${proj.id}`
    nodes.push({
      id: projId,
      label: proj.title,
      cat: 'project',
      desc: proj.desc || 'Portfolio project.',
    })
    ;(proj.skills || []).forEach(sk => {
      const sid = skillIds.get(sk.toLowerCase())
      if (sid) edges.push([sid, projId])
    })
  })

  // Add subject & certification nodes from profile if present
  ;(profile.sections?.subjects || []).slice(0, 6).forEach((subj, idx) => {
    const subjId = `subject-${idx}`
    nodes.push({
      id: subjId,
      label: subj,
      cat: 'subject',
      desc: 'Academic subject in your profile.',
    })
    const firstSkill = nodes.find(n => n.cat === 'skill')
    if (firstSkill) edges.push([subjId, firstSkill.id])
  })

  ;(profile.sections?.certifications || []).slice(0, 5).forEach((cert, idx) => {
    const certId = `cert-${idx}`
    nodes.push({
      id: certId,
      label: cert,
      cat: 'certification',
      desc: 'Certification listed in your profile.',
    })
    const matchedSkill = Array.from(skillIds.entries()).find(([k]) => cert.toLowerCase().includes(k))
    if (matchedSkill) edges.push([certId, matchedSkill[1]])
  })

  // Career nodes connected to matched skills
  for (const career of careers) {
    const matchedIds = career.required
      .map(req => skillIds.get(req.toLowerCase()))
      .filter((id): id is string => Boolean(id))
    if (!matchedIds.length) continue
    const careerNodeId = `career-${career.id}`
    nodes.push({
      id: careerNodeId,
      label: career.title,
      cat: 'career',
      desc: career.why,
    })
    matchedIds.forEach(sid => edges.push([sid, careerNodeId]))
  }

  return { nodes, edges }
}

export { careers as CAREERS, library as SKILLS, resources as RESOURCES, assessments as ASSESSMENTS }
