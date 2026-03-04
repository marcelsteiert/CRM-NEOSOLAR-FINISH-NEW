import { Router } from 'express'

const router = Router()

interface BrandingSettings {
  companyName: string
  companySlogan: string
  logoUrl: string | null
  primaryColor: string
  offerTemplate: string
  footerText: string
}

let branding: BrandingSettings = {
  companyName: 'NEOSOLAR AG',
  companySlogan: 'Ihre Solarenergie-Partner',
  logoUrl: null,
  primaryColor: '#F59E0B',
  offerTemplate: 'standard',
  footerText: 'NEOSOLAR AG | Industriestrasse 12 | 9430 St. Margrethen | info@neosolar.ch',
}

router.get('/', (_req, res) => {
  res.json({ data: branding })
})

router.put('/', (req, res) => {
  const { companyName, companySlogan, logoUrl, primaryColor, offerTemplate, footerText } = req.body
  if (companyName !== undefined) branding.companyName = companyName
  if (companySlogan !== undefined) branding.companySlogan = companySlogan
  if (logoUrl !== undefined) branding.logoUrl = logoUrl
  if (primaryColor !== undefined) branding.primaryColor = primaryColor
  if (offerTemplate !== undefined) branding.offerTemplate = offerTemplate
  if (footerText !== undefined) branding.footerText = footerText
  res.json({ data: branding })
})

export default router
