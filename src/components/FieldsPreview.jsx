const TYPE_BADGE = {
  text:      { label: '텍스트', cls: 'bg-blue-50 text-blue-600' },
  date:      { label: '날짜',   cls: 'bg-amber-50 text-amber-600' },
  number:    { label: '숫자',   cls: 'bg-green-50 text-green-600' },
  checkbox:  { label: '체크',   cls: 'bg-purple-50 text-purple-600' },
  select:    { label: '선택',   cls: 'bg-rose-50 text-rose-600' },
  signature: { label: '서명',   cls: 'bg-indigo-50 text-indigo-600' },
}

export default function FieldsPreview({
  formTitle, purpose, categories, signatureOrSeal, importantNotes, totalFields,
  onStart, onReset,
}) {
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
          <p className="text-sm font-semibold text-green-800">분석 완료!</p>
          <p className="text-sm text-green-700">
            <span className="font-medium">{formTitle}</span>에서{' '}
            <span className="font-medium">{totalFields}개</span>의 입력 항목을 확인했습니다.
          </p>
        </div>
      </div>

      {/* 문서 목적 */}
      {purpose && (
        <div className="mb-4 rounded-xl border border-slate-100 bg-white p-4">
          <p className="mb-1.5 text-[10px] font-bold tracking-widest text-slate-400 uppercase">문서 목적</p>
          <p className="text-sm text-slate-700 leading-relaxed">{purpose}</p>
        </div>
      )}

      {/* 카테고리별 항목 목록 */}
      <div className="mb-4 space-y-3 max-h-72 overflow-y-auto pr-1">
        {categories.map(cat => (
          <div key={cat.name} className="overflow-hidden rounded-xl border border-slate-100 bg-white">
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-2">
              <p className="text-xs font-bold text-slate-600">{cat.name}</p>
            </div>
            <div className="divide-y divide-slate-50">
              {cat.fields.map(field => {
                const badge = TYPE_BADGE[field.type] ?? { label: field.type, cls: 'bg-slate-50 text-slate-500' }
                return (
                  <div key={field.id} className="flex items-start gap-3 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-slate-800">{field.label}</p>
                        <span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${badge.cls}`}>
                          {badge.label}
                        </span>
                        {field.required && (
                          <span className="text-xs font-medium text-red-400">필수</span>
                        )}
                      </div>
                      {field.description && (
                        <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{field.description}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 서명 / 날인 필요 여부 */}
      {signatureOrSeal?.required && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
          <div className="mb-1 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
            </svg>
            <p className="text-sm font-semibold text-amber-800">서명 / 날인 필요</p>
          </div>
          {signatureOrSeal.details && (
            <p className="text-xs text-amber-700 leading-relaxed">{signatureOrSeal.details}</p>
          )}
        </div>
      )}

      {/* 중요 주의사항 */}
      {importantNotes?.length > 0 && (
        <div className="mb-5 rounded-xl border border-red-100 bg-red-50 p-3.5">
          <p className="mb-2 text-xs font-bold text-red-700">중요 주의사항</p>
          <ul className="space-y-1.5">
            {importantNotes.map((note, i) => (
              <li key={i} className="flex gap-2 text-xs text-red-600 leading-relaxed">
                <span className="mt-0.5 shrink-0">•</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 액션 버튼 */}
      <button
        onClick={onStart}
        className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 active:scale-[0.98] transition-all duration-150"
      >
        작성 시작하기 →
      </button>
      <button
        onClick={onReset}
        className="mt-2 w-full rounded-xl py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100 transition-colors"
      >
        다른 파일 업로드
      </button>
    </div>
  )
}
