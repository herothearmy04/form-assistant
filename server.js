import 'dotenv/config'
import express from 'express'
import multer from 'multer'
import cors from 'cors'
import { PDFDocument, PDFTextField, PDFCheckBox, PDFDropdown, PDFRadioGroup, PDFSignature, StandardFonts, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
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
const SYSTEM_PROMPT = `You are an expert document analyst. The uploaded document is a blank form or application that the user needs to fill in with their information. Your task is to analyze this blank form and provide a friendly, structured guide explaining exactly what the user needs to write or check.

LANGUAGE REQUIREMENT:
The document may be in Korean. Automatically detect the language of the document. If the document is written in Korean, your entire response — including all field labels, descriptions, category names, notes, purpose text, and signatureOrSeal details — must be written in natural Korean. For documents in other languages, respond in English.

Your response must cover:
1. The name and purpose of the document (e.g., "LG U+ 위임장 — 통신 서비스 관련 업무를 대리인에게 위임하기 위한 서류")
2. All items the user must fill in or check, organized into logical categories that reflect the document's actual structure (e.g., 위임인 정보, 수임인 정보, 위임 내용)
3. Whether a signature or seal (서명/도장/인감) is required, and any important notices or warnings present in the document

Return your analysis ONLY as the JSON structure below. Do not include any other text whatsoever:

{
  "formTitle": "문서 제목 (예: LG U+ 위임장)",
  "purpose": "이 문서의 목적을 2~3문장으로 명확하게 설명",
  "categories": [
    {
      "name": "카테고리명 (예: 위임인 정보)",
      "fields": [
        {
          "id": "camelCaseIdentifier",
          "label": "항목명 (예: 성명)",
          "description": "무엇을 어떻게 작성해야 하는지 친절하고 구체적인 설명",
          "required": true,
          "type": "text | date | number | checkbox | select | signature"
        }
      ]
    }
  ],
  "signatureOrSeal": {
    "required": true,
    "details": "서명 또는 날인이 필요한 위치와 방법을 구체적으로 안내"
  },
  "importantNotes": [
    "문서에 명시된 중요 주의사항이나 유의사항을 원문 그대로 또는 가깝게 옮길 것"
  ]
}

RULES:
- Include ALL fields that require user input (text, checkbox, date, signature, dropdown, radio, etc.).
- Group fields into logical categories that mirror the document's actual layout and sections.
- For checkbox or consent items, describe clearly what the user is agreeing to or confirming.
- Copy important notices and warnings verbatim or with close paraphrase — do NOT omit or shorten them.
- signatureOrSeal.required must be true if ANY signature, seal, stamp, or 인감 field exists in the document.
- Extract ALL fields — prefer completeness over brevity. Aim for up to 30 fields if the form has that many.
- If importantNotes is empty, return an empty array [].

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
    // Convert PDF buffer to Base64 for Anthropic native PDF processing
    const base64Data = req.file.buffer.toString('base64')

    // Claude API call — native PDF document block (handles scanned images too)
    const stream = await client.messages.stream({
      model: 'claude-opus-4-8',
      max_tokens: 16000,
      thinking: { type: 'enabled', budget_tokens: 10000 },
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64Data,
              },
            },
            {
              type: 'text',
              text: '위 PDF 문서를 분석하여 빈 양식 작성 가이드를 제공해 주세요.',
            },
          ],
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

    res.json(result)
  } catch (err) {
    console.error('[analyze error]', err)

    if (err instanceof SyntaxError) {
      return res.status(500).json({ error: 'The AI returned an invalid response. Please try again.' })
    }
    if (err instanceof Anthropic.AuthenticationError) {
      return res.status(401).json({ error: err.message })
    }
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: err.message })
    }

    res.status(500).json({ error: err.message || 'An error occurred during analysis. Please try again.' })
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
