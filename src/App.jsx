import { useState } from 'react'
import UploadZone from './components/UploadZone'
import FilePreview from './components/FilePreview'
import AnalysisLoading from './components/AnalysisLoading'
import FieldsPreview from './components/FieldsPreview'
import QASession from './components/QASession'
import FillComplete from './components/FillComplete'

// 상태 흐름: idle → selected → loading → done → answering → complete | error

function App() {
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState('idle')
  const [formData, setFormData] = useState(null)   // { formTitle, fields, acroFieldNames }
  const [downloadUrl, setDownloadUrl] = useState(null)
  const [finalAnswers, setFinalAnswers] = useState({})
  const [errorMsg, setErrorMsg] = useState('')

  const handleFileSelect = (f) => {
    setFile(f)
    setStatus('selected')
    setFormData(null)
    setErrorMsg('')
  }

  const handleReset = () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setFile(null)
    setStatus('idle')
    setFormData(null)
    setDownloadUrl(null)
    setFinalAnswers({})
    setErrorMsg('')
  }

  const handleAnalyze = async () => {
    if (!file) return
    setStatus('loading')
    setErrorMsg('')
    try {
      const body = new FormData()
      body.append('pdf', file)
      const res = await fetch('/api/analyze', { method: 'POST', body })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Analysis failed.')
      setFormData(json)
      setStatus('done')
    } catch (err) {
      setErrorMsg(err.message)
      setStatus('error')
    }
  }

  const handleStartQA = () => setStatus('answering')

  const handleFillComplete = (url, answers) => {
    setDownloadUrl(url)
    setFinalAnswers(answers)
    setStatus('complete')
  }

  // 헤더는 항상 동일
  const showHero = status === 'idle'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex flex-col">
      {/* 헤더 */}
      <header className="w-full border-b border-slate-200/80 bg-white/70 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <button onClick={handleReset} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
              </svg>
            </div>
            <span className="text-base font-bold text-slate-800 tracking-tight">Form Assistant</span>
          </button>
          <span className="hidden rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600 sm:block">
            MVP Beta
          </span>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">

        {/* 히어로 (idle 상태에서만) */}
        {showHero && (
          <div className="mb-12 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-1.5 text-sm text-indigo-600">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
              AI-Powered Form Assistant
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Complex forms,{' '}
              <span className="text-indigo-600">filled by AI for you</span>
            </h1>
            <p className="mx-auto mt-5 max-w-lg text-base text-slate-500 leading-relaxed">
              Upload any PDF form and AI will analyze it, then guide you through
              each field with simple questions. Just answer and you're done.
            </p>
          </div>
        )}

        {/* 상태별 컴포넌트 */}
        <div className={`w-full flex flex-col items-center ${status === 'answering' ? 'max-w-4xl' : 'max-w-xl'}`}>

          {status === 'idle' && <UploadZone onFileSelect={handleFileSelect} />}

          {status === 'selected' && (
            <FilePreview file={file} onRemove={handleReset} onAnalyze={handleAnalyze} />
          )}

          {status === 'loading' && <AnalysisLoading fileName={file?.name} />}

          {status === 'done' && formData && (
            <FieldsPreview
              formTitle={formData.formTitle}
              fields={formData.fields}
              onStart={handleStartQA}
              onReset={handleReset}
            />
          )}

          {status === 'answering' && formData && (
            <QASession
              formTitle={formData.formTitle}
              fields={formData.fields}
              file={file}
              onComplete={handleFillComplete}
              onBack={() => setStatus('done')}
            />
          )}

          {status === 'complete' && formData && (
            <FillComplete
              downloadUrl={downloadUrl}
              answers={finalAnswers}
              fields={formData.fields}
              formTitle={formData.formTitle}
              onReset={handleReset}
            />
          )}

          {status === 'error' && (
            <div className="w-full">
              <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center">
                <p className="text-sm font-semibold text-red-700">Something went wrong</p>
                <p className="mt-1 text-sm text-red-600">{errorMsg}</p>
              </div>
              <button onClick={handleReset} className="mt-4 w-full rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                Start over
              </button>
            </div>
          )}
        </div>

        {/* 단계 안내 (idle만) */}
        {showHero && (
          <div className="mt-16 grid max-w-2xl grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              { step: '01', title: 'Upload PDF', desc: 'Drag and drop or click to upload the form you need to fill out.' },
              { step: '02', title: 'Answer Questions', desc: 'AI asks you simple questions one by one to gather the information needed.' },
              { step: '03', title: 'Download PDF', desc: 'Receive a completed PDF with all your answers automatically filled in.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-white/60 p-5 text-center shadow-sm">
                <span className="text-xs font-bold tracking-widest text-indigo-400">STEP {step}</span>
                <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="py-6 text-center text-xs text-slate-400">
        © 2026 Form Assistant · Your data is deleted immediately after analysis
      </footer>
    </div>
  )
}

export default App
