import { Router } from 'express'

const router = Router()

interface AiSettings {
  enabled: boolean
  model: string
  language: string
  maxTokens: number
  systemPrompt: string
  features: {
    leadSummary: boolean
    dealAnalysis: boolean
    emailDraft: boolean
  }
}

let aiSettings: AiSettings = {
  enabled: true,
  model: 'claude-sonnet-4-6',
  language: 'de',
  maxTokens: 2048,
  systemPrompt: 'Du bist ein Assistent für ein Schweizer Solar-Unternehmen. Antworte immer auf Deutsch und beziehe dich auf den Schweizer PV-Markt.',
  features: {
    leadSummary: true,
    dealAnalysis: true,
    emailDraft: false,
  },
}

router.get('/', (_req, res) => {
  res.json({ data: aiSettings })
})

router.put('/', (req, res) => {
  const { enabled, model, language, maxTokens, systemPrompt, features } = req.body
  if (enabled !== undefined) aiSettings.enabled = enabled
  if (model !== undefined) aiSettings.model = model
  if (language !== undefined) aiSettings.language = language
  if (maxTokens !== undefined) aiSettings.maxTokens = maxTokens
  if (systemPrompt !== undefined) aiSettings.systemPrompt = systemPrompt
  if (features !== undefined) aiSettings.features = { ...aiSettings.features, ...features }
  res.json({ data: aiSettings })
})

export default router
