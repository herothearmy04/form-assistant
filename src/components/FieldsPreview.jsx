const TYPE_LABELS = {
  text: 'Text',
  date: 'Date',
  number: 'Number',
  checkbox: 'Checkbox',
  select: 'Select',
}

const TYPE_COLORS = {
  text: 'bg-blue-50 text-blue-600',
  date: 'bg-amber-50 text-amber-600',
  number: 'bg-green-50 text-green-600',
  checkbox: 'bg-purple-50 text-purple-600',
  select: 'bg-rose-50 text-rose-600',
}

export default function FieldsPreview({ formTitle, fields, onStart, onReset }) {
  return (
    <div className="w-full max-w-xl">
      {/* 분석 완료 헤더 */}
      <div className="mb-5 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-green-800">Analysis complete!</p>
          <p className="text-sm text-green-700">
            Found <span className="font-medium">{fields.length} fields</span>{' '}
            in <span className="font-medium">{formTitle}</span>.
          </p>
        </div>
      </div>

      {/* 필드 목록 */}
      <div className="mb-5 space-y-2 max-h-80 overflow-y-auto pr-1">
        {fields.map((field, i) => (
          <div key={field.id} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-white p-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-slate-800">{field.label}</p>
                <span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${TYPE_COLORS[field.type] ?? 'bg-slate-50 text-slate-500'}`}>
                  {TYPE_LABELS[field.type] ?? field.type}
                </span>
                {field.required && (
                  <span className="text-xs text-red-400 font-medium">Required</span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-500 truncate">{field.question}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 액션 버튼 */}
      <button
        onClick={onStart}
        className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 active:scale-[0.98] transition-all duration-150"
      >
        Start Answering →
      </button>
      <button
        onClick={onReset}
        className="mt-2 w-full rounded-xl py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100 transition-colors"
      >
        Upload a different file
      </button>
    </div>
  )
}
