import { useState, useEffect, useRef } from 'react'

// ── 타입별 입력 컴포넌트 ──────────────────────────────────────
function TextInput({ field, value, onChange, onSubmit }) {
  const ref = useRef(null)
  useEffect(() => { ref.current?.focus() }, [field.id])
  return (
    <input
      ref={ref}
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => e.key === 'Enter' && onSubmit()}
      placeholder={field.placeholder ?? `Enter ${field.label}`}
      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-800 placeholder:text-slate-300 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
    />
  )
}

function DateInput({ field, value, onChange }) {
  return (
    <input
      type="date"
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
    />
  )
}

function NumberInput({ field, value, onChange, onSubmit }) {
  const ref = useRef(null)
  useEffect(() => { ref.current?.focus() }, [field.id])
  return (
    <input
      ref={ref}
      type="number"
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => e.key === 'Enter' && onSubmit()}
      placeholder={field.placeholder ?? 'Enter a number'}
      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-800 placeholder:text-slate-300 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
    />
  )
}

function CheckboxInput({ value, onChange }) {
  return (
    <div className="flex gap-3">
      {['Yes', 'No'].map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={[
            'flex-1 rounded-xl border-2 py-4 text-base font-semibold transition-all duration-150',
            value === opt
              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
              : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300',
          ].join(' ')}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

function SignatureInput({ field, value, onChange, onSubmit }) {
  const ref = useRef(null)
  useEffect(() => { ref.current?.focus() }, [field.id])
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">
        Type your full legal name · This serves as your digital signature
        <br />
        <span className="text-slate-400">디지털 서명을 위해 영문 풀네임을 입력해 주세요</span>
      </p>
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onSubmit()}
        placeholder={field.placeholder ?? 'e.g., John Smith'}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-800 italic placeholder:text-slate-300 placeholder:not-italic focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
        style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
      />
      <div className="border-b-2 border-slate-400 mx-1 mt-1" />
    </div>
  )
}

function SelectInput({ field, value, onChange }) {
  return (
    <div className="grid gap-2.5">
      {(field.options ?? []).map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={[
            'w-full rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-all duration-150',
            value === opt
              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
              : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300',
          ].join(' ')}
        >
          <span className={['mr-2 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors', value === opt ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'].join(' ')}>
            {value === opt && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
          </span>
          {opt}
        </button>
      ))}
    </div>
  )
}

// ── 메인 Q&A 컴포넌트 ────────────────────────────────────────
export default function QASession({ formTitle, fields, file, onComplete, onBack }) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState({})
  const [value, setValue] = useState('')
  const [visible, setVisible] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const field = fields[currentIdx]
  const total = fields.length
  const isLast = currentIdx === total - 1
  const progress = Math.round(((currentIdx) / total) * 100)
  const answeredCount = Object.values(answers).filter(v => v !== '').length

  // 질문 전환 시 저장된 답변 복원
  useEffect(() => {
    setValue(answers[field?.id] ?? '')
  }, [currentIdx])

  const transition = (fn) => {
    setVisible(false)
    setTimeout(() => { fn(); setVisible(true) }, 180)
  }

  const saveAndGo = (nextIdx) => {
    setAnswers(prev => ({ ...prev, [field.id]: value }))
    transition(() => setCurrentIdx(nextIdx))
  }

  const handleNext = () => {
    if (isLast) handleSubmit({ ...answers, [field.id]: value })
    else saveAndGo(currentIdx + 1)
  }

  const handlePrev = () => {
    if (currentIdx === 0) { onBack(); return }
    setAnswers(prev => ({ ...prev, [field.id]: value }))
    transition(() => setCurrentIdx(i => i - 1))
  }

  const handleSkip = () => {
    setAnswers(prev => ({ ...prev, [field.id]: '' }))
    if (isLast) handleSubmit({ ...answers, [field.id]: '' })
    else transition(() => setCurrentIdx(i => i + 1))
  }

  const handleSubmit = async (finalAnswers) => {
    setIsSubmitting(true)
    setSubmitError('')
    try {
      const body = new FormData()
      body.append('pdf', file)
      body.append('answers', JSON.stringify(finalAnswers))
      body.append('fields', JSON.stringify(fields))

      const res = await fetch('/api/fill', { method: 'POST', body })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? 'Failed to generate PDF.')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      onComplete(url, finalAnswers)
    } catch (err) {
      setSubmitError(err.message)
      setIsSubmitting(false)
    }
  }

  if (isSubmitting) {
    return (
      <div className="w-full max-w-xl flex flex-col items-center gap-6 py-10">
        <div className="relative flex h-20 w-20 items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
          <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-base font-semibold text-slate-800">Generating your PDF</p>
          <p className="mt-1 text-sm text-slate-500">Filling in your answers…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-xl">
      {/* 진행 상태 바 */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
          <span className="font-medium text-slate-700">{formTitle}</span>
          <span>{currentIdx + 1} / {total}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-indigo-500 transition-all duration-500"
            style={{ width: `${progress + (100 / total)}%` }}
          />
        </div>
      </div>

      {/* 질문 카드 */}
      <div
        className={[
          'rounded-2xl border border-slate-100 bg-white p-8 shadow-sm transition-all duration-180',
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
        ].join(' ')}
      >
        {/* 필드 번호 뱃지 */}
        <div className="mb-5 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">
            {currentIdx + 1}
          </span>
          <span className="text-xs font-medium text-slate-400">
            {field.required ? 'Required' : 'Optional'}
          </span>
        </div>

        {/* 질문 텍스트 */}
        <p className="mb-6 text-xl font-semibold leading-snug text-slate-800">
          {field.question}
        </p>

        {/* 입력 필드 */}
        <div className="mb-6">
          {field.type === 'text'      && <TextInput      field={field} value={value} onChange={setValue} onSubmit={handleNext} />}
          {field.type === 'date'      && <DateInput      field={field} value={value} onChange={setValue} />}
          {field.type === 'number'    && <NumberInput    field={field} value={value} onChange={setValue} onSubmit={handleNext} />}
          {field.type === 'checkbox'  && <CheckboxInput  value={value} onChange={v => { setValue(v) }} />}
          {field.type === 'select'    && <SelectInput    field={field} value={value} onChange={v => { setValue(v) }} />}
          {field.type === 'signature' && <SignatureInput field={field} value={value} onChange={setValue} onSubmit={handleNext} />}
        </div>

        {/* 오류 */}
        {submitError && (
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">{submitError}</p>
        )}

        {/* 버튼 영역 */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrev}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
            </svg>
          </button>

          <button
            onClick={handleNext}
            disabled={field.required && !value}
            className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLast ? 'Generate PDF →' : 'Next →'}
          </button>

          {!field.required && (
            <button
              onClick={handleSkip}
              className="rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:bg-slate-50 transition-colors"
            >
              Skip
            </button>
          )}
        </div>
      </div>

      {/* 진행 점 */}
      <div className="mt-5 flex justify-center gap-1.5">
        {fields.map((f, i) => {
          const answered = answers[f.id] !== undefined && answers[f.id] !== ''
          return (
            <button
              key={f.id}
              onClick={() => { setAnswers(prev => ({ ...prev, [field.id]: value })); transition(() => setCurrentIdx(i)) }}
              className={[
                'rounded-full transition-all duration-200',
                i === currentIdx ? 'w-5 h-2 bg-indigo-500' :
                  answered ? 'w-2 h-2 bg-indigo-200' : 'w-2 h-2 bg-slate-200',
              ].join(' ')}
            />
          )
        })}
      </div>

      {/* 저장된 답변 수 */}
      {answeredCount > 0 && (
        <p className="mt-3 text-center text-xs text-slate-400">
          {answeredCount} {answeredCount === 1 ? 'answer' : 'answers'} saved
        </p>
      )}
    </div>
  )
}
