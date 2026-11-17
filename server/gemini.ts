import { GoogleGenAI, Type, type Schema } from '@google/genai'
import { CAREERS, RESOURCES, SKILLS, signQuizToken } from './store'
import type { ProfileData } from '../src/data/profile'
import type {
  AiRecommendationsResult,
  ProfileSectionId,
  ResumeAnalysis,
  SkillMicroQuiz,
} from '../src/types'

const PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite'
const FALLBACK_MODEL = 'gemini-4-hydrogen'

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please check the API key in the Settings > Secrets panel.'
    )
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  })
}

async function generateStructuredJson<T>(
  prompt: string,
  systemInstruction: string,
  responseSchema: Schema
): Promise<{ data: T; modelUsed: string }> {
  const ai = getAiClient()
  const modelsToTry = PRIMARY_MODEL === FALLBACK_MODEL ? [PRIMARY_MODEL] : [PRIMARY_MODEL, FALLBACK_MODEL]
  let lastError: unknown = null

  for (const model of modelsToTry) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema,
          },
        })
        const rawText = (response.text ?? '{}').trim()
        const parsed = JSON.parse(rawText) as T
        return { data: parsed, modelUsed: model }
      } catch (err: unknown) {
        lastError = err
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
          if (attempt === 0) {
            await new Promise(r => setTimeout(r, 1200))
            continue
          }
        }
        break
      }
    }
  }

  const errMsg = lastError instanceof Error ? lastError.message : String(lastError)
  if (errMsg.includes('403') || errMsg.includes('PERMISSION_DENIED') || errMsg.includes('API_KEY_INVALID')) {
    throw new Error(
      'Gemini API authentication failed. Please check your API key in the Settings > Secrets panel.'
    )
  }
  if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
    throw new Error(
      'Gemini API rate limit reached (RESOURCE_EXHAUSTED). Wait a moment and retry, or upgrade to a billing-enabled API key in Settings > Secrets.'
    )
  }
  throw new Error(`Gemini AI request failed: ${errMsg}`)
}

const VALID_SECTIONS: ProfileSectionId[] = [
  'name',
  'headline',
  'location',
  'education',
  'subjects',
  'technical',
  'soft',
  'interests',
  'experience',
  'projects',
  'certifications',
  'achievements',
  'goals',
]

const PROFILE_LIST_SECTIONS = [
  'education',
  'subjects',
  'technical',
  'soft',
  'interests',
  'experience',
  'projects',
  'certifications',
  'achievements',
  'goals',
]

export async function analyzeResumeWithGemini(
  fileName: string,
  resumeText: string,
  currentProfile: ProfileData
): Promise<ResumeAnalysis> {
  const canonicalSkills = SKILLS.map(s => s.name)
  const careerCatalogSummary = CAREERS.map(
    c => `${c.id}: ${c.title} (requires: ${c.required.join(', ')})`
  ).join('\n')

  const systemInstruction = `You are the AptiNexus Career & Skill Intelligence Resume Analyzer.
Analyze the uploaded resume text and compare it against:
1. The user's existing saved profile.
2. The canonical AptiNexus SKILLS catalog: ${canonicalSkills.join(', ')}.
3. The canonical AptiNexus CAREERS catalog:
${careerCatalogSummary}

Rules:
- Extract real, concise items from the resume for all 10 profile sections (education, subjects, technical, soft, interests, experience, projects, certifications, achievements, goals).
- Normalize technical skills to match canonical AptiNexus skill names when equivalent (e.g., "Python 3" -> "Python", "ROS2" -> "ROS", "SolidWorks / AutoCAD" -> "CAD Design", "C for Microcontrollers" -> "Embedded C", "OpenCV" -> "Computer Vision", "Simulink" -> "MATLAB", "ANSYS" -> "FEA"). Record each mapping in skillNormalizations.
- In suggestions, return actionable items from the resume that are not yet in the user's current profile. Each suggestion's section must be one of: name, headline, location, education, subjects, technical, soft, interests, experience, projects, certifications, achievements, goals.
- In profileCorrections, suggest improvements or updates to personal fields (name, headline, location) or profile sections where the resume provides stronger or updated details.
- In recommendedCareerIds, return the top 2-4 matching career IDs from the CAREERS catalog (${CAREERS.map(c => c.id).join(', ')}).
- Keep all strings concise and factual based strictly on the resume text.`

  const prompt = `Resume Filename: ${fileName}

Current Saved Profile:
${JSON.stringify(currentProfile)}

Extracted Resume Text:
"""
${resumeText.slice(0, 14000)}
"""`

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      summary: {
        type: Type.STRING,
        description: '2-3 sentence executive summary of the candidate resume, key strengths, and best-fit engineering/tech tracks.',
      },
      extracted: {
        type: Type.OBJECT,
        properties: {
          education: { type: Type.ARRAY, items: { type: Type.STRING } },
          subjects: { type: Type.ARRAY, items: { type: Type.STRING } },
          technical: { type: Type.ARRAY, items: { type: Type.STRING } },
          soft: { type: Type.ARRAY, items: { type: Type.STRING } },
          interests: { type: Type.ARRAY, items: { type: Type.STRING } },
          experience: { type: Type.ARRAY, items: { type: Type.STRING } },
          projects: { type: Type.ARRAY, items: { type: Type.STRING } },
          certifications: { type: Type.ARRAY, items: { type: Type.STRING } },
          achievements: { type: Type.ARRAY, items: { type: Type.STRING } },
          goals: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: PROFILE_LIST_SECTIONS,
      },
      suggestions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            section: { type: Type.STRING, description: 'One of: name, headline, location, education, subjects, technical, soft, interests, experience, projects, certifications, achievements, goals' },
            item: { type: Type.STRING },
            reason: { type: Type.STRING },
          },
          required: ['section', 'item', 'reason'],
        },
      },
      profileCorrections: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            section: { type: Type.STRING },
            currentValue: { type: Type.STRING },
            suggestedValue: { type: Type.STRING },
            reason: { type: Type.STRING },
          },
          required: ['section', 'suggestedValue', 'reason'],
        },
      },
      skillNormalizations: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            rawSkill: { type: Type.STRING },
            canonicalSkill: { type: Type.STRING },
            reason: { type: Type.STRING },
          },
          required: ['rawSkill', 'canonicalSkill', 'reason'],
        },
      },
      recommendedCareerIds: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      missingSections: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
    },
    required: [
      'summary',
      'extracted',
      'suggestions',
      'profileCorrections',
      'skillNormalizations',
      'recommendedCareerIds',
      'missingSections',
    ],
  }

  const { data, modelUsed } = await generateStructuredJson<Omit<ResumeAnalysis, 'fileName' | 'generatedBy'>>(
    prompt,
    systemInstruction,
    schema
  )

  const normalizedExtracted: Record<string, string[]> = {}
  for (const sec of PROFILE_LIST_SECTIONS) {
    const arr = data.extracted?.[sec]
    normalizedExtracted[sec] = Array.isArray(arr) ? arr.map(s => String(s).trim()).filter(Boolean) : []
  }

  const validSuggestions = (data.suggestions || [])
    .filter(s => s && s.item && VALID_SECTIONS.includes(s.section as ProfileSectionId))
    .map(s => ({
      section: s.section as ProfileSectionId,
      item: s.item.trim(),
      reason: s.reason || 'Extracted from resume',
    }))

  const validCorrections = (data.profileCorrections || [])
    .filter(c => c && c.suggestedValue && VALID_SECTIONS.includes(c.section as ProfileSectionId))
    .map(c => ({
      section: c.section as ProfileSectionId,
      currentValue: c.currentValue || '',
      suggestedValue: c.suggestedValue.trim(),
      reason: c.reason || 'Suggested improvement from resume',
    }))

  const validCareerIds = (data.recommendedCareerIds || []).filter(id =>
    CAREERS.some(c => c.id === id)
  )

  return {
    fileName,
    summary: data.summary || 'Resume analyzed against AptiNexus skill and career catalogs.',
    extracted: normalizedExtracted,
    suggestions: validSuggestions,
    profileCorrections: validCorrections,
    skillNormalizations: data.skillNormalizations || [],
    recommendedCareerIds: validCareerIds,
    missingSections: data.missingSections || [],
    generatedBy: modelUsed,
  }
}

export async function generateAiRecommendationsWithGemini(params: {
  profile: ProfileData
  projects: unknown[]
  evidence: unknown[]
  results: unknown[]
  focus?: string
  focusCareerId?: string
}): Promise<AiRecommendationsResult> {
  const { profile, projects, evidence, results, focus, focusCareerId } = params

  const systemInstruction = `You are the AptiNexus Career & Course Intelligence Advisor.
Evaluate the user's live profile, projects, SkillProof evidence, and quiz results against the AptiNexus catalogs:
- CAREERS: ${JSON.stringify(CAREERS)}
- SKILLS: ${JSON.stringify(SKILLS.map(s => ({ name: s.name, category: s.category, difficulty: s.difficulty, prereqs: s.prereqs })))}
- RESOURCES: ${JSON.stringify(RESOURCES)}

Instructions:
1. summary: Write a personalized 2-3 sentence synthesis of the user's current readiness, strongest skills, and next strategic move.
2. careerTargets: Select the top 3 career targets from CAREERS (if focusCareerId="${focusCareerId || ''}" is provided, include that career first). Provide accurate fitScore (0-100), rationale, matchedSkills, missingCoreSkills, bridgeSkills (the 1-2 highest-leverage missing skills to learn next), and a tailored suggestedHeadline.
3. courseRecommendations: Select 4-6 courses/resources from the RESOURCES catalog (or closely aligned official documentation/courses) targeting the user's missingCoreSkills and bridgeSkills. Priority must be 'Immediate', 'Next', or 'Stretch'.
4. profileCorrections: Suggest 2-4 concrete, high-impact additions or refinements to personal fields (name, headline, location) or profile sections (technical, goals, projects, certifications, etc.).
5. skillNormalizations: Map any non-canonical skills or subjects in the user's profile to canonical SKILLS names.`

  const prompt = `User Focus Mode: ${focus || 'all'}
Focus Career ID: ${focusCareerId || 'none'}
User Profile: ${JSON.stringify(profile)}
User Projects: ${JSON.stringify(projects)}
User Evidence: ${JSON.stringify(evidence)}
User Quiz Results: ${JSON.stringify(results)}`

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      summary: { type: Type.STRING },
      careerTargets: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            careerId: { type: Type.STRING },
            title: { type: Type.STRING },
            fitScore: { type: Type.NUMBER },
            rationale: { type: Type.STRING },
            matchedSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
            missingCoreSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
            bridgeSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestedHeadline: { type: Type.STRING },
          },
          required: [
            'careerId',
            'title',
            'fitScore',
            'rationale',
            'matchedSkills',
            'missingCoreSkills',
            'bridgeSkills',
          ],
        },
      },
      courseRecommendations: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            resourceId: { type: Type.STRING },
            title: { type: Type.STRING },
            skill: { type: Type.STRING },
            type: { type: Type.STRING },
            level: { type: Type.STRING },
            url: { type: Type.STRING },
            reason: { type: Type.STRING },
            targetCareerTitle: { type: Type.STRING },
            priority: { type: Type.STRING, description: 'Immediate, Next, or Stretch' },
          },
          required: [
            'title',
            'skill',
            'type',
            'level',
            'url',
            'reason',
            'targetCareerTitle',
            'priority',
          ],
        },
      },
      profileCorrections: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            section: { type: Type.STRING },
            currentValue: { type: Type.STRING },
            suggestedValue: { type: Type.STRING },
            reason: { type: Type.STRING },
          },
          required: ['section', 'suggestedValue', 'reason'],
        },
      },
      skillNormalizations: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            rawSkill: { type: Type.STRING },
            canonicalSkill: { type: Type.STRING },
            reason: { type: Type.STRING },
          },
          required: ['rawSkill', 'canonicalSkill', 'reason'],
        },
      },
    },
    required: [
      'summary',
      'careerTargets',
      'courseRecommendations',
      'profileCorrections',
      'skillNormalizations',
    ],
  }

  const { data, modelUsed } = await generateStructuredJson<Omit<AiRecommendationsResult, 'generatedBy'>>(
    prompt,
    systemInstruction,
    schema
  )

  const validCorrections = (data.profileCorrections || [])
    .filter(c => c && c.suggestedValue && VALID_SECTIONS.includes(c.section as ProfileSectionId))
    .map(c => ({
      section: c.section as ProfileSectionId,
      currentValue: c.currentValue || '',
      suggestedValue: c.suggestedValue.trim(),
      reason: c.reason,
    }))

  const normalizedCourses = (data.courseRecommendations || []).map(c => {
    const priority: 'Immediate' | 'Next' | 'Stretch' =
      c.priority === 'Immediate' || c.priority === 'Next' || c.priority === 'Stretch'
        ? c.priority
        : 'Immediate'
    return {
      ...c,
      url: c.url && c.url.startsWith('http') ? c.url : 'https://docs.python.org/3/tutorial/',
      priority,
    }
  })

  return {
    summary: data.summary,
    careerTargets: (data.careerTargets || []).slice(0, 3).map(t => ({
      ...t,
      fitScore: Math.max(0, Math.min(100, Math.round(Number(t.fitScore) || 0))),
    })),
    courseRecommendations: normalizedCourses,
    profileCorrections: validCorrections,
    skillNormalizations: data.skillNormalizations || [],
    generatedBy: modelUsed,
  }
}

interface RawGeneratedQuestion {
  q: string
  options: string[]
  correctIndex: number
  explanation: string
}

export async function generateSkillMicroQuizWithGemini(params: {
  skill: string
  userHeadline?: string
}): Promise<SkillMicroQuiz> {
  const { skill, userHeadline } = params
  const catalogSkill = SKILLS.find(s => s.name.toLowerCase() === skill.trim().toLowerCase())
  const canonicalName = catalogSkill?.name || skill.trim()

  const systemInstruction = `You are the AptiNexus Technical Assessment Engine.
Create a rigorous, practical 4-question scenario-based multiple-choice micro-quiz to verify applied proficiency in "${canonicalName}".
Skill Category: ${catalogSkill?.category || 'Engineering & Technology'}
Difficulty: ${catalogSkill?.difficulty || 'Intermediate'}
Skill Description: ${catalogSkill?.desc || `Practical engineering application of ${canonicalName}`}

Rules:
- Generate exactly 4 questions.
- Each question must have a realistic engineering or technical scenario (not trivial syntax lookup).
- Each question must have exactly 4 distinct options.
- correctIndex must be the 0-based integer index (0, 1, 2, or 3) of the single best answer.
- explanation must concisely explain why the correct option is right and what concept it tests.`

  const prompt = `Generate a 4-question scenario verification micro-quiz for skill: "${canonicalName}".
Candidate headline: "${userHeadline || 'Engineering Student'}".`

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      questions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            q: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctIndex: { type: Type.INTEGER },
            explanation: { type: Type.STRING },
          },
          required: ['q', 'options', 'correctIndex', 'explanation'],
        },
      },
    },
    required: ['title', 'questions'],
  }

  const { data, modelUsed } = await generateStructuredJson<{
    title: string
    questions: RawGeneratedQuestion[]
  }>(prompt, systemInstruction, schema)

  const questions = (data.questions || []).slice(0, 4).map(q => {
    const opts = Array.isArray(q.options) && q.options.length >= 4
      ? q.options.slice(0, 4)
      : [...(q.options || []), 'Option A', 'Option B', 'Option C', 'Option D'].slice(0, 4)
    const idx = typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex < 4 ? q.correctIndex : 0
    return {
      q: q.q,
      options: opts,
      correctIndex: idx,
      explanation: q.explanation || `Tests practical understanding of ${canonicalName}.`,
    }
  })

  if (questions.length === 0) {
    throw new Error('Gemini returned an empty question set. Please retry.')
  }

  const quizToken = signQuizToken({
    skill: canonicalName,
    correctAnswers: questions.map(q => q.correctIndex),
    explanations: questions.map(q => q.explanation),
    exp: Date.now() + 1000 * 60 * 60 * 2, // 2 hours validity
  })

  return {
    skill: canonicalName,
    title: data.title || `${canonicalName} Applied Verification Check`,
    quizToken,
    questions: questions.map(q => ({ q: q.q, options: q.options })),
    generatedBy: modelUsed,
  }
}
