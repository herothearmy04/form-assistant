import { useState, useRef, useCallback } from 'react'

export default function UploadZone({ onFileSelect }) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const validate = (file) => {
    if (!file) return 'Please select a file.'
    if (file.type !== 'application/pdf') return 'Only PDF files are supported.'
    if (file.size > 20 * 1024 * 1024) return 'File size must be 20 MB or less.'
    return null
  }

  const handleFile = useCallback((file) => {
    const err = validate(file)
    if (err) { setError(err); return }
    setError('')
    onFileSelect(file)
  }, [onFileSelect])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }, [handleFile])

  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true) }
  const onDragLeave = () => setIsDragging(false)
  const onInputChange = (e) => handleFile(e.target.files[0])

  return (
    <div className="flex flex-col items-center w-full">
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => inputRef.current?.click()}
        className={[
          'relative w-full max-w-xl cursor-pointer rounded-2xl border-2 border-dashed px-8 py-16 text-center transition-all duration-200',
          isDragging
            ? 'border-indigo-500 bg-indigo-50 scale-[1.01]'
            : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-indigo-50/40',
        ].join(' ')}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={onInputChange}
        />

        <div className="flex flex-col items-center gap-4 pointer-events-none">
          <div className={[
            'flex h-16 w-16 items-center justify-center rounded-full transition-colors duration-200',
            isDragging ? 'bg-indigo-100' : 'bg-slate-100',
          ].join(' ')}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={['h-8 w-8 transition-colors duration-200', isDragging ? 'text-indigo-600' : 'text-slate-400'].join(' ')}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12-3-3m0 0-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          </div>

          <div>
            <p className="text-base font-semibold text-slate-700">
              {isDragging ? 'Drop your PDF here' : 'Drag & drop a PDF or click to upload'}
            </p>
            <p className="mt-1 text-sm text-slate-400">PDF format · Max 20 MB</p>
          </div>

          <span className="inline-block rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors">
            Choose File
          </span>
        </div>
      </div>

      {error && (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-red-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  )
}
