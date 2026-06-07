import { useEffect, useRef } from 'react'

export default function FillComplete({ downloadUrl, answers, fields, formTitle, onReset }) {
  const downloadRef = useRef(null)

  // 자동 다운로드 시작
  useEffect(() => {
    if (downloadUrl) downloadRef.current?.click()
  }, [downloadUrl])

  const answeredFields = fields.filter(f => answers[f.id] != null && answers[f.id] !== '')
  const skippedFields  = fields.filter(f => !answers[f.id])

  return (
    <div className="w-full max-w-xl">
      {/* 성공 헤더 */}
      <div className="mb-6 flex flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">{formTitle} — Done!</h2>
          <p className="mt-1 text-sm text-slate-500">
            Your PDF is ready with {answeredFields.length} {answeredFields.length === 1 ? 'field' : 'fields'} filled in
          </p>
        </div>
      </div>

      {/* 다운로드 버튼 */}
      <a
        ref={downloadRef}
        href={downloadUrl}
        download="completed_form.pdf"
        className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 active:scale-[0.98] transition-all"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        Download PDF
      </a>

      {/* 답변 요약 */}
      <div className="mb-5 rounded-xl border border-slate-100 bg-white">
        <div className="border-b border-slate-100 px-5 py-3.5">
          <p className="text-sm font-semibold text-slate-700">Answer Summary</p>
        </div>
        <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
          {answeredFields.map(f => (
            <div key={f.id} className="flex items-start gap-3 px-5 py-3">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-green-100">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-400">{f.label}</p>
                <p className="mt-0.5 truncate text-sm font-medium text-slate-800">{String(answers[f.id])}</p>
              </div>
            </div>
          ))}
          {skippedFields.map(f => (
            <div key={f.id} className="flex items-start gap-3 px-5 py-3 opacity-50">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-100">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              </span>
              <div>
                <p className="text-xs text-slate-400">{f.label}</p>
                <p className="mt-0.5 text-sm text-slate-400">Skipped</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onReset}
        className="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
      >
        Fill out another form
      </button>
    </div>
  )
}
