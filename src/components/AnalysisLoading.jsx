export default function AnalysisLoading({ fileName }) {
  return (
    <div className="w-full max-w-xl flex flex-col items-center gap-6 py-8">
      <div className="relative flex h-20 w-20 items-center justify-center">
        <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
        <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
        </svg>
      </div>

      <div className="text-center">
        <p className="text-base font-semibold text-slate-800">AI is analyzing your form</p>
        <p className="mt-1 text-sm text-slate-500 max-w-xs">
          Identifying fields in <span className="font-medium text-slate-700">{fileName}</span>
        </p>
      </div>

      <div className="w-full space-y-2.5 animate-pulse">
        {[80, 60, 70, 50].map((w, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-indigo-200 shrink-0" />
            <div className={`h-2.5 rounded-full bg-slate-200`} style={{ width: `${w}%` }} />
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-400">This usually takes 5–15 seconds</p>
    </div>
  )
}
