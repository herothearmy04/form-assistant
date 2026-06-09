import 'dotenv/config'
import express from 'express'
import multer from 'multer'
import cors from 'cors'
import { PDFDocument, PDFTextField, PDFCheckBox, PDFDropdown, PDFRadioGroup, PDFSignature, StandardFonts, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { PDFParse } from 'pdf-parse'
import Anthropic from '@anthropic-ai/sdk'
import { readFile } from 'fs/promises'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    cb(null, file.mimetype === 'application/pdf')
  },
})

const client = new Anthropic()

// Font cache for text rendering
let fontBytes = null
async function getFont() {
  if (fontBytes) return fontBytes
  const candidates = [
    'C:\\Windows\\Fonts\\malgun.ttf',
    'C:\\Windows\\Fonts\\gulim.ttc',
    '/usr/share/fonts/truetype/nanum/NanumGothic.ttf',
  ]
  for (const p of candidates) {
    try { fontBytes = await readFile(p); return fontBytes } catch {}
  }
  return null
}
// Preload font at startup
getFont().catch(() => {})

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin) || origin === 'https://form-assistant.onrender.com') {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
}))
app.use(express.json())

// System prompt is identical across requests → prompt cache applies
const SYSTEM_PROMPT = `You are an expert PDF form analyst. You analyze text and form field information extracted from PDF documents to identify all fields the user needs to fill in.

CRITICAL LANGUAGE REQUIREMENT — READ THIS FIRST:
ALL output text — including formTitle, every label, every question, every placeholder, and every option — MUST be written in ENGLISH ONLY. This rule is absolute and applies regardless of:
- The language of the source PDF document (Korean, Japanese, Chinese, Spanish, French, etc.)
- The language of the user's message
- The content detected in the form
Do NOT output a single word in any language other than English. If the form is in Korean, translate everything to English. If the form is in any non-English language, translate everything to English. There are NO exceptions.

Return your analysis ONLY as the JSON structure below. Do not include any other text whatsoever:

{
  "formTitle": "Name of the form in English (e.g., Job Application, Lease Agreement)",
  "fields": [
    {
      "id": "camelCaseIdentifier",
      "label": "Field label in English ONLY (e.g., Full Name, Date of Birth)",
      "question": "A natural, friendly question in English ONLY (e.g., 'What is your full name?')",
      "type": "text | date | number | checkbox | select | signature",
      "required": true,
      "placeholder": "Example input in English ONLY (optional)",
      "options": ["Option 1 in English", "Option 2 in English"],
      "description": "Full verbatim text of the disclaimer, notice, or consent paragraph from the PDF — include ONLY when such a paragraph exists in the source document for this field"
    }
  ]
}

MANDATORY FIELD INCLUSION RULES — NEVER skip these:

1. SIGNATURE fields → ALWAYS use type "signature"
   Includes any field labeled: Signature, Sign Here, Patient Signature, Authorized Signature, Applicant Signature, Guardian Signature, etc.
   - question: "Please type your full legal name as your digital signature"
   - placeholder: "e.g., John Smith"
   - required: true
   - If the AcroForm field list contains any field with type "signature", you MUST include it.

2. DATE fields → ALWAYS use type "date"
   Includes: Date, Today's Date, Date of Signature, Date Signed, Consent Date, etc.
   NEVER omit a date field. If it has "date" in the name or is adjacent to a signature, include it.

3. CHECKBOX / RADIO / CONSENT / DISCLAIMER fields → ALWAYS use type "checkbox"
   Includes any field labeled or described as: Disclaimer, Consent, I Agree, I Acknowledge, I Understand, Authorization, Agreement, Terms, Waiver, Release, Notice, Acknowledgement, Privacy, HIPAA, etc.
   - Frame as a Yes/No question, e.g.: "Do you agree to the disclaimer and consent to the terms stated above?"
   - NEVER skip a checkbox, radio button, or consent/disclaimer field — even if it appears to be just a legal notice.
   - If the AcroForm field list marks any field as type "checkbox" or "radio", you MUST include it.
   - DESCRIPTION RULE: If the PDF contains a paragraph of disclaimer, consent, notice, or advisory text that the user must read before answering this field, copy that paragraph VERBATIM into the "description" property. Translate it to English if the source is non-English. Do NOT truncate or summarize — include the full text. If no such paragraph exists, omit the "description" key entirely.

4. TEXT fields → type "text"
5. NUMBER fields → type "number"
6. DROPDOWN / SELECT fields → type "select" with options listed

GENERAL RULES:
- LANGUAGE: Every single string value in the JSON output must be in English only.
- Include ALL fields that require any form of input (text, checkbox, date, signature, radio, dropdown).
- NEVER skip a field just because it looks like a legal notice, disclaimer, or consent — if it has a checkbox or input area, include it.
- Include options only when type is "select".
- Extract ALL fields you find — prefer completeness over brevity. Aim for up to 30 fields if the form has that many.
- If the user's answer is in another language, translate it to English before storing it as the field value.

RESPONSE FORMAT — ABSOLUTE RULE:
Only return raw JSON without any markdown formatting. Do NOT wrap output in \`\`\`json or \`\`\` code fences. Do NOT include any prose, explanation, or whitespace before or after the JSON object. The very first character of your response must be { and the very last character must be }.`

// Robustly extract the first valid JSON object from an AI response that may
// include markdown fences, preamble text, or trailing commentary.
function extractJSON(text) {
  // Step 1: strip markdown code fences (```json ... ``` or ``` ... ```)
  let cleaned = text.replace(/^```(?:json)?\s*/im, '').replace(/\s*```\s*$/im, '').trim()

  // Step 2: try parsing the cleaned string directly
  try { return JSON.parse(cleaned) } catch {}

  // Step 3: find the first '{' and match to its closing '}' using bracket counting
  const start = cleaned.indexOf('{')
  if (start !== -1) {
    let depth = 0
    let inString = false
    let escape = false
    for (let i = start; i < cleaned.length; i++) {
      const ch = cleaned[i]
      if (escape) { escape = false; continue }
      if (ch === '\\' && inString) { escape = true; continue }
      if (ch === '"') { inString = !inString; continue }
      if (inString) continue
      if (ch === '{') depth++
      else if (ch === '}') {
        depth--
        if (depth === 0) {
          try { return JSON.parse(cleaned.slice(start, i + 1)) } catch {}
        }
      }
    }
  }

  // Step 4: regex fallback — grab anything that looks like a JSON object
  const match = text.match(/\{[\s\S]*\}/)
  if (match) {
    try { return JSON.parse(match[0]) } catch {}
  }

  throw new SyntaxError(`Could not extract valid JSON from AI response. Raw text: ${text.slice(0, 200)}`)
}

app.post('/api/analyze', upload.single('pdf'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Please upload a PDF file.' })
  }

  try {
    // 1) Extract PDF text
    const parser = new PDFParse({ data: req.file.buffer, verbosity: 0 })
    const parsed = await parser.getText()
    const textContent = parsed.text.slice(0, 10000).trim()

    if (!textContent) {
      return res.status(422).json({ error: 'No text could be extracted from this PDF. Scanned image PDFs are not supported.' })
    }

    // 2) Extract AcroForm interactive fields (if present)
    let acroFields = []
    try {
      const pdfDoc = await PDFDocument.load(req.file.buffer, { ignoreEncryption: true })
      const form = pdfDoc.getForm()
      acroFields = form.getFields().map(f => {
        let type = 'unknown'
        if (f instanceof PDFTextField) type = 'text'
        else if (f instanceof PDFCheckBox) type = 'checkbox'
        else if (f instanceof PDFDropdown) type = 'dropdown'
        else if (f instanceof PDFRadioGroup) type = 'radio'
        else if (f instanceof PDFSignature) type = 'signature'
        else {
          // Signature detection by field name as fallback
          const nameLower = f.getName().toLowerCase()
          if (/sign|signature|sig$/.test(nameLower)) type = 'signature'
        }

        const info = { name: f.getName(), type }

        // Include options for radio/dropdown so Claude can create a select field
        if (f instanceof PDFDropdown || f instanceof PDFRadioGroup) {
          try { info.options = f.getOptions() } catch {}
        }

        return info
      })
    } catch {
      // No interactive fields — proceed with text analysis
    }

    const formatAcroField = (f) => {
      let line = `- ${f.name} [type: ${f.type}]`
      if (f.options?.length) line += `, options: ${f.options.slice(0, 8).join(' | ')}`
      if (f.type === 'signature') line += '  ← MUST include as type "signature"'
      else if (f.type === 'checkbox' || f.type === 'radio') line += '  ← MUST include as type "checkbox" (Yes/No)'
      return line
    }

    const userContent = [
      `[PDF Source Text]\n${textContent}`,
      acroFields.length > 0
        ? `\n\n[Detected Interactive Form Fields: ${acroFields.length}]\n${acroFields.map(formatAcroField).join('\n')}`
        : '',
    ].join('')

    // 3) Claude API call — prompt caching + adaptive thinking + streaming
    const stream = await client.messages.stream({
      model: 'claude-opus-4-8',
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' }, // 시스템 프롬프트 캐시
        },
      ],
      messages: [
        {
          role: 'user',
          content: userContent,
        },
      ],
    })

    const message = await stream.finalMessage()

    // Extract only text blocks (skip thinking blocks)
    const textBlock = message.content.find(b => b.type === 'text')
    if (!textBlock) {
      return res.status(500).json({ error: 'No text found in AI response.' })
    }

    const result = extractJSON(textBlock.text)

    // Usage log (for cache hit verification)
    const { usage } = message
    console.log(`[API] input: ${usage.input_tokens} | cache_read: ${usage.cache_read_input_tokens ?? 0} | cache_write: ${usage.cache_creation_input_tokens ?? 0} | output: ${usage.output_tokens}`)

    // Pass AcroForm field names to frontend (used for mapping in the fill step)
    res.json({ ...result, acroFieldNames: acroFields.map(f => f.name) })
  } catch (err) {
    console.error('[analyze error]', err)

    if (err instanceof SyntaxError) {
      return res.status(500).json({ error: 'The AI returned an invalid response. Please try again.' })
    }
    if (err instanceof Anthropic.AuthenticationError) {
      return res.status(500).json({ error: 'Invalid API key. Please check your .env file.' })
    }
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: 'API rate limit exceeded. Please wait a moment and try again.' })
    }

    res.status(500).json({ error: 'An error occurred during analysis. Please try again.' })
  }
})

// Find which page contains a widget annotation by comparing dict references
function findWidgetPage(pdfDoc, widget) {
  const pages = pdfDoc.getPages()
  for (const page of pages) {
    try {
      const annots = page.node.Annots()
      if (!annots) continue
      for (const ref of annots.asArray()) {
        try {
          if (pdfDoc.context.lookup(ref) === widget.dict) return { page, rect: widget.getRectangle() }
        } catch {}
      }
    } catch {}
  }
  return null
}

// ─────────────────────────────────────────────
// PDF 채우기 엔드포인트
// ─────────────────────────────────────────────
app.post('/api/fill', upload.single('pdf'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No PDF file provided.' })

  const answers = JSON.parse(req.body.answers)  // { fieldId: value }
  const fields  = JSON.parse(req.body.fields)   // [{ id, label, question, type, ... }]

  const pdfDoc = await PDFDocument.load(req.file.buffer, { ignoreEncryption: true })
  pdfDoc.registerFontkit(fontkit)

  // Embed font upfront (shared by AcroForm fill + summary page)
  const loadedFontBytes = await getFont()
  let embeddedFont
  if (loadedFontBytes) {
    try {
      embeddedFont = await pdfDoc.embedFont(loadedFontBytes, { subset: false })
    } catch (e) {
      console.warn('[font embed] custom font failed, falling back to Helvetica:', e.message)
    }
  }
  if (!embeddedFont) {
    embeddedFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  }

  // ── 1. Fill AcroForm fields ──────────────────
  let acroFilled = 0
  const useCustomFont = loadedFontBytes && embeddedFont
  try {
    const form = pdfDoc.getForm()
    const pdfFields = form.getFields()

    for (const field of fields) {
      const answer = answers[field.id]
      if (answer == null || answer === '') continue

      // Fuzzy name matching (ignore spaces, underscores, hyphens)
      const normalize = s => s.toLowerCase().replace(/[\s_\-()]/g, '')
      const match = pdfFields.find(f => {
        const n = normalize(f.getName())
        return n === normalize(field.id) || n === normalize(field.label) ||
               n.includes(normalize(field.id)) || normalize(field.id).includes(n)
      })

      if (!match) continue

      try {
        if (match instanceof PDFTextField) {
          match.setFontSize(11)
          match.setText(String(answer))
          // Update appearances with custom font to avoid WinAnsi encoding errors
          if (useCustomFont) match.updateAppearances(embeddedFont)
          acroFilled++
        } else if (match instanceof PDFCheckBox) {
          const checked = answer === true || answer === 'true' ||
            String(answer).toLowerCase() === 'yes'
          checked ? match.check() : match.uncheck()
          acroFilled++
        } else if (match instanceof PDFDropdown) {
          const opts = match.getOptions()
          const normalize2 = s => s.toLowerCase().replace(/[\s_\-()]/g, '')
          const target = opts.find(o => o === answer || normalize2(o) === normalize2(answer))
          if (target) { match.select(target); acroFilled++ }
        } else if (match instanceof PDFRadioGroup) {
          try { match.select(String(answer)); acroFilled++ } catch {}
        } else if (match instanceof PDFSignature) {
          // Draw the typed name as text at the signature field's location
          try {
            const widgets = match.acroField.Widgets()
            if (widgets.length > 0) {
              const found = findWidgetPage(pdfDoc, widgets[0])
              if (found) {
                const { page, rect } = found
                const fontSize = Math.min(10, Math.max(6, rect.height * 0.6))
                page.drawText(String(answer), {
                  x: rect.x + 4,
                  y: rect.y + (rect.height - fontSize) / 2,
                  font: embeddedFont,
                  size: fontSize,
                  color: rgb(0.05, 0.05, 0.4),
                })
                acroFilled++
              }
            }
          } catch { /* ignore */ }
        }
      } catch { /* ignore per-field failures */ }
    }

    // Flatten all fields to static content → non-editable PDF
    try { form.flatten() } catch (e) { console.warn('[flatten]', e.message) }
  } catch { /* no AcroForm present */ }

  // ── 2. Append answer summary page ────────────
  try {
    const page = pdfDoc.addPage([595, 842]) // A4
    const { width, height } = page.getSize()
    const margin = 48
    let y = height - margin

    const drawText = (text, opts = {}) => {
      const { size = 11, color = rgb(0.1, 0.1, 0.1) } = opts
      try {
        page.drawText(text, { x: margin, y, font: embeddedFont, size, color })
      } catch { /* ignore unsupported characters */ }
      y -= size * 1.8
    }

    // Header
    page.drawRectangle({ x: 0, y: height - 56, width, height: 56, color: rgb(0.29, 0.34, 0.87) })
    page.drawText('Form Complete — Answer Summary', { x: margin, y: height - 36, font: embeddedFont, size: 16, color: rgb(1,1,1) })
    y = height - 80

    drawText(`${Object.keys(answers).filter(k => answers[k] !== '').length} of ${fields.length} fields completed`, { size: 10, color: rgb(0.45, 0.45, 0.45) })
    y -= 8

    // Divider
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) })
    y -= 16

    for (const field of fields) {
      if (y < margin + 40) break // prevent page overflow
      const answer = answers[field.id]
      const displayAnswer = answer != null && answer !== '' ? String(answer) : '(skipped)'

      drawText(field.label, { size: 9, color: rgb(0.5, 0.5, 0.5) })
      y += 4
      drawText(displayAnswer, { size: 12 })
      y -= 4
    }
  } catch (fontErr) {
    console.warn('[summary page] failed:', fontErr.message)
  }

  const pdfBytes = await pdfDoc.save()
  const filename = encodeURIComponent('completed_form.pdf')

  res.set('Content-Type', 'application/pdf')
  res.set('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${filename}`)
  res.send(Buffer.from(pdfBytes))
})

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, 'dist')))
  app.get('/{*path}', (req, res) => {
    res.sendFile(join(__dirname, 'dist', 'index.html'))
  })
}

app.listen(PORT, (err) => {
  if (err) {
    console.error(`[server] Failed to bind port ${PORT}:`, err.message)
    process.exit(1)
  }
  console.log(`Server running: http://localhost:${PORT}`)
})
