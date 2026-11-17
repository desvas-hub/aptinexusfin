import express, { type NextFunction, type Request, type Response } from 'express'
import multer from 'multer'
import mammoth from 'mammoth'
import { extractText } from 'unpdf'
import path from 'node:path'
import fs from 'node:fs'
import {
  ASSESSMENTS,
  CAREERS,
  RESOURCES,
  SKILLS,
  computeCareerMatches,
  computeDashboard,
  computeNotifications,
  computeSkillGraph,
  createAccessToken,
  createUser,
  findUserByEmail,
  findUserById,
  getUserContext,
  readUserValue,
  toPublicUser,
  verifyAccessToken,
  verifyPassword,
  verifyQuizToken,
  writeUserValue,
} from './server/store'
import {
  analyzeResumeWithGemini,
  generateAiRecommendationsWithGemini,
  generateSkillMicroQuizWithGemini,
} from './server/gemini'
import { analyse } from './src/data/skills'
import { estimateFor } from './src/data/careers'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
})

const app = express()
app.use(express.json({ limit: '2mb' }))

function getAuthenticatedUser(req: Request, res: Response) {
  const auth = req.headers.authorization || ''
  if (auth.startsWith('Bearer ')) {
    const token = auth.slice(7).trim()
    const userId = verifyAccessToken(token)
    if (userId) {
      const user = findUserById(userId)
      if (user) return user
    }
  }
  res.status(401).json({ detail: 'Invalid or expired authentication token. Please sign in again.' })
  return null
}

const api = express.Router()

// ---- Health ----
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'aptinexus-api' })
})

// ---- Auth ----
api.post('/auth/register', (req, res) => {
  const { name, email, password } = req.body || {}
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(422).json({ detail: 'Enter your full name.' })
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(422).json({ detail: 'Enter a valid email address.' })
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return res.status(422).json({ detail: 'Password must be at least 8 characters.' })
  }
  if (findUserByEmail(email)) {
    return res.status(409).json({ detail: 'An account with this email already exists' })
  }
  const user = createUser(name, email, password)
  return res.status(201).json({
    user: toPublicUser(user),
    token: createAccessToken(user.id),
  })
})

api.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) {
    return res.status(401).json({ detail: 'Incorrect email or password' })
  }
  const user = findUserByEmail(String(email))
  if (!user || !verifyPassword(String(password), user.passwordHash)) {
    return res.status(401).json({ detail: 'Incorrect email or password' })
  }
  return res.json({
    user: toPublicUser(user),
    token: createAccessToken(user.id),
  })
})

// ---- Per-User Data ----
api.get('/profiles/me', (req, res) => {
  const user = getAuthenticatedUser(req, res)
  if (!user) return
  return res.json(
    readUserValue(user.id, 'profile', {
      personal: { name: user.name, headline: user.headline, location: '' },
      sections: {},
    })
  )
})

api.put('/profiles/me', (req, res) => {
  const user = getAuthenticatedUser(req, res)
  if (!user) return
  return res.json(writeUserValue(user.id, 'profile', req.body || {}))
})

api.get('/projects', (req, res) => {
  const user = getAuthenticatedUser(req, res)
  if (!user) return
  return res.json(readUserValue(user.id, 'projects', []))
})

api.put('/projects', (req, res) => {
  const user = getAuthenticatedUser(req, res)
  if (!user) return
  return res.json(writeUserValue(user.id, 'projects', Array.isArray(req.body) ? req.body : []))
})

api.get('/skillproof/evidence', (req, res) => {
  const user = getAuthenticatedUser(req, res)
  if (!user) return
  return res.json(readUserValue(user.id, 'evidence', []))
})

api.put('/skillproof/evidence', (req, res) => {
  const user = getAuthenticatedUser(req, res)
  if (!user) return
  const payload = Array.isArray(req.body) ? req.body : []
  for (const item of payload) {
    if (item && typeof item === 'object' && item.status === 'Verified') {
      item.status = 'Demonstrated'
    }
  }
  return res.json(writeUserValue(user.id, 'evidence', payload))
})

api.get('/assessments/results', (req, res) => {
  const user = getAuthenticatedUser(req, res)
  if (!user) return
  return res.json(readUserValue(user.id, 'results', []))
})

api.put('/assessments/results', (req, res) => {
  const user = getAuthenticatedUser(req, res)
  if (!user) return
  return res.json(writeUserValue(user.id, 'results', Array.isArray(req.body) ? req.body : []))
})

api.get('/users/me/settings', (req, res) => {
  const user = getAuthenticatedUser(req, res)
  if (!user) return
  return res.json(readUserValue(user.id, 'settings', { focus: 'Engineering', hours: 5 }))
})

api.put('/users/me/settings', (req, res) => {
  const user = getAuthenticatedUser(req, res)
  if (!user) return
  return res.json(writeUserValue(user.id, 'settings', req.body || {}))
})

api.get('/notifications', (req, res) => {
  const user = getAuthenticatedUser(req, res)
  if (!user) return
  return res.json(computeNotifications(user))
})

api.get('/notifications/read', (req, res) => {
  const user = getAuthenticatedUser(req, res)
  if (!user) return
  return res.json(readUserValue(user.id, 'notifRead', []))
})

api.put('/notifications/read', (req, res) => {
  const user = getAuthenticatedUser(req, res)
  if (!user) return
  return res.json(writeUserValue(user.id, 'notifRead', Array.isArray(req.body) ? req.body : []))
})

api.get('/roadmaps/:careerId/progress', (req, res) => {
  const user = getAuthenticatedUser(req, res)
  if (!user) return
  return res.json(readUserValue(user.id, `roadmap:${req.params.careerId}`, []))
})

api.put('/roadmaps/:careerId/progress', (req, res) => {
  const user = getAuthenticatedUser(req, res)
  if (!user) return
  return res.json(
    writeUserValue(user.id, `roadmap:${req.params.careerId}`, Array.isArray(req.body) ? req.body : [])
  )
})

// ---- Catalogs & Live Intelligence ----
api.get('/analytics/dashboard', (req, res) => {
  const user = getAuthenticatedUser(req, res)
  if (!user) return
  return res.json(computeDashboard(user))
})

api.get('/careers', (req, res) => {
  const user = getAuthenticatedUser(req, res)
  if (!user) return
  return res.json(CAREERS)
})

api.get('/careers/matches', (req, res) => {
  const user = getAuthenticatedUser(req, res)
  if (!user) return
  return res.json(computeCareerMatches(user))
})

api.get('/careers/:careerId', (req, res) => {
  const user = getAuthenticatedUser(req, res)
  if (!user) return
  const item = CAREERS.find(c => c.id === req.params.careerId)
  if (!item) return res.status(404).json({ detail: 'Career not found' })
  return res.json(item)
})

api.get('/careers/:careerId/gaps', (req, res) => {
  const user = getAuthenticatedUser(req, res)
  if (!user) return
  const career = CAREERS.find(c => c.id === req.params.careerId)
  if (!career) return res.status(404).json({ detail: 'Career not found' })
  const { allAcquired } = getUserContext(user)
  const gap = analyse(career, allAcquired)
  return res.json({
    careerId: career.id,
    strengths: gap.strengths,
    missing: gap.missing,
    optional: gap.optional,
    method: 'Compares skills in your saved profile, projects, quiz verifications, and evidence with this career’s listed requirements.',
  })
})

api.post('/what-if', (req, res) => {
  const user = getAuthenticatedUser(req, res)
  if (!user) return
  const extraSkills = Array.isArray(req.body?.extraSkills)
    ? req.body.extraSkills.map((s: unknown) => String(s).trim()).filter(Boolean)
    : null
  if (!extraSkills) return res.status(422).json({ detail: 'extraSkills must be a list' })

  const { allAcquired } = getUserContext(user)
  const combined = Array.from(new Set([...allAcquired, ...extraSkills]))
  const lowerCombined = new Set(combined.map(s => s.toLowerCase()))

  const projected = CAREERS.map(c => {
    const current = estimateFor(c, allAcquired)
    const hypothetical = estimateFor(c, combined)
    return {
      id: c.id,
      current,
      hypothetical,
      change: hypothetical - current,
      stillNeeded: c.required.filter(req => !lowerCombined.has(req.toLowerCase())),
    }
  }).sort((a, b) => b.hypothetical - a.hypothetical || a.id.localeCompare(b.id))

  return res.json(projected)
})

api.get('/skills', (req, res) => {
  const user = getAuthenticatedUser(req, res)
  if (!user) return
  return res.json(SKILLS)
})

api.get('/resources', (req, res) => {
  const user = getAuthenticatedUser(req, res)
  if (!user) return
  return res.json(RESOURCES)
})

api.get('/skillgraph', (req, res) => {
  const user = getAuthenticatedUser(req, res)
  if (!user) return
  return res.json(computeSkillGraph(user))
})

api.get('/assessments', (req, res) => {
  const user = getAuthenticatedUser(req, res)
  if (!user) return
  return res.json(
    ASSESSMENTS.map(item => ({
      id: item.id,
      title: item.title,
      skill: item.skill,
      questions: item.questions.map(q => ({ q: q.q, options: q.options })),
    }))
  )
})

api.post('/assessments/:assessmentId/submit', (req, res) => {
  const user = getAuthenticatedUser(req, res)
  if (!user) return
  const assessment = ASSESSMENTS.find(a => a.id === req.params.assessmentId)
  if (!assessment) return res.status(404).json({ detail: 'Assessment not found' })
  const answers = req.body?.answers
  const questions = assessment.questions
  if (!Array.isArray(answers) || answers.length !== questions.length) {
    return res.status(422).json({ detail: 'Submit one answer for every question' })
  }
  const correctAnswers = questions.map(q => q.answer ?? 0)
  const score = answers.filter((ans, idx) => ans === correctAnswers[idx]).length
  const total = questions.length
  const percentage = total ? Math.round((100 * score) / total) : 0
  return res.json({
    assessmentId: assessment.id,
    score,
    total,
    percentage,
    correctAnswers,
    feedback:
      percentage >= 75
        ? 'Strong result. Add a project or demonstration to back it up.'
        : percentage >= 50
          ? 'Partial result. Revisit the topics you missed.'
          : 'This skill needs more practice.',
  })
})

// ---- Gemini AI Endpoints ----
api.post('/ai/recommendations', async (req, res) => {
  const user = getAuthenticatedUser(req, res)
  if (!user) return
  try {
    const ctx = getUserContext(user)
    const { focus, focusCareerId } = req.body || {}
    const result = await generateAiRecommendationsWithGemini({
      profile: ctx.profile,
      projects: ctx.projects,
      evidence: ctx.evidence,
      results: ctx.results,
      focus: typeof focus === 'string' ? focus : undefined,
      focusCareerId: typeof focusCareerId === 'string' ? focusCareerId : undefined,
    })
    return res.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate AI recommendations.'
    return res.status(502).json({ detail: message })
  }
})

api.post('/ai/skill-quiz', async (req, res) => {
  const user = getAuthenticatedUser(req, res)
  if (!user) return
  const skill = String(req.body?.skill || '').trim()
  if (!skill) {
    return res.status(422).json({ detail: 'Provide a skill name to generate a verification quiz.' })
  }
  try {
    const ctx = getUserContext(user)
    const quiz = await generateSkillMicroQuizWithGemini({
      skill,
      userHeadline: ctx.profile.personal?.headline || user.headline,
    })
    return res.json(quiz)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate skill verification quiz.'
    return res.status(502).json({ detail: message })
  }
})

api.post('/ai/skill-quiz/submit', (req, res) => {
  const user = getAuthenticatedUser(req, res)
  if (!user) return
  const { quizToken, answers } = req.body || {}
  if (!quizToken || typeof quizToken !== 'string') {
    return res.status(422).json({ detail: 'Missing quiz verification token.' })
  }
  const verifiedPayload = verifyQuizToken(quizToken)
  if (!verifiedPayload) {
    return res.status(422).json({ detail: 'Quiz session expired or invalid. Generate a new quiz.' })
  }
  const { skill, correctAnswers, explanations } = verifiedPayload
  if (!Array.isArray(answers) || answers.length !== correctAnswers.length) {
    return res.status(422).json({ detail: 'Submit one answer for every question.' })
  }
  const score = answers.filter((a, i) => Number(a) === correctAnswers[i]).length
  const total = correctAnswers.length
  const percentage = total ? Math.round((100 * score) / total) : 0
  const verified = percentage >= 70
  const statusUpgrade = verified ? 'Practised' : 'Claimed'

  return res.json({
    skill,
    score,
    total,
    percentage,
    verified,
    statusUpgrade,
    correctAnswers,
    explanations,
    feedback: verified
      ? `Verified! You scored ${percentage}% (${score}/${total}). "${skill}" has been upgraded from Claimed to Practised across your SkillProof, Dashboard, and SkillGraph.`
      : `You scored ${percentage}% (${score}/${total}). Review the scenario explanations below and score 70% or higher to upgrade "${skill}" to Practised.`,
  })
})

api.post('/resume/analyze', upload.single('file'), async (req, res) => {
  const user = getAuthenticatedUser(req, res)
  if (!user) return
  const file = req.file
  if (!file) {
    return res.status(400).json({ detail: 'Upload a PDF or DOCX resume file.' })
  }
  const filename = (file.originalname || '').toLowerCase()
  if (!filename.endsWith('.pdf') && !filename.endsWith('.docx')) {
    return res.status(415).json({ detail: 'Upload a PDF or DOCX file.' })
  }
  if (!file.buffer || file.buffer.length === 0) {
    return res.status(400).json({ detail: 'The uploaded file is empty.' })
  }

  let extractedText = ''
  try {
    if (filename.endsWith('.pdf')) {
      const pdfData = await extractText(new Uint8Array(file.buffer))
      extractedText = Array.isArray(pdfData.text) ? pdfData.text.join('\n') : String(pdfData.text || '')
    } else {
      const docxData = await mammoth.extractRawText({ buffer: file.buffer })
      extractedText = docxData.value || ''
    }
  } catch {
    return res.status(422).json({ detail: 'Could not read this document. Try another PDF or DOCX.' })
  }

  extractedText = extractedText.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
  if (!extractedText) {
    return res
      .status(422)
      .json({ detail: 'No selectable text found. Scanned image-only PDFs are not supported yet.' })
  }

  try {
    const ctx = getUserContext(user)
    const analysis = await analyzeResumeWithGemini(file.originalname, extractedText, ctx.profile)
    return res.json(analysis)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to analyze resume with Gemini.'
    return res.status(502).json({ detail: message })
  }
})

app.use('/api/v1', api)

// JSON 404 catch-all on /api before vite.middlewares so unmatched API routes never return index.html
app.use('/api', (req, res) => {
  res.status(404).json({ detail: `API route not found: ${req.method} ${req.originalUrl}` })
})

// Multer error handler
app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ detail: 'Resume must be 5 MB or smaller.' })
  }
  next(err)
})

async function startServer() {
  const port = Number(process.env.PORT) || 3000
  const distPath = path.resolve(process.cwd(), 'dist')
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(distPath)

  if (isProd) {
    app.use(express.static(distPath))
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'))
    })
  } else {
    const { createServer: createViteServer } = await import('vite')
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    })
    app.use(vite.middlewares)
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`AptiNexus full-stack server listening on http://localhost:${port}`)
  })
}

startServer()
