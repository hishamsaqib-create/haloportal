'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { STLViewer } from '@/components/shared/stl-viewer'

interface CaseFile {
  id: string
  caseId: string
  fileName: string
  fileType: string
  fileUrl: string
  fileSize: number | null
  description: string | null
  sharedWithDentist: boolean
  createdAt: string
  case: {
    id: string
    caseNumber: string
    department: string
    status: string
    patient: { initials: string | null; reference: string | null } | null
  }
  uploadedBy: { name: string } | null
}

interface CaseOption {
  id: string
  caseNumber: string
  patient: { firstName: string | null; lastName: string | null; initials: string | null } | null
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return '\u2014'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const FILE_TYPE_ICONS: Record<string, { bg: string; color: string; label: string }> = {
  stl: { bg: 'bg-purple-100', color: 'text-purple-700', label: 'STL' },
  html: { bg: 'bg-blue-100', color: 'text-blue-700', label: 'HTML' },
  pdf: { bg: 'bg-red-100', color: 'text-red-700', label: 'PDF' },
  image: { bg: 'bg-green-100', color: 'text-green-700', label: 'IMG' },
  other: { bg: 'bg-gray-100', color: 'text-gray-700', label: 'FILE' },
}

export default function DentistFilesPage() {
  const [files, setFiles] = useState<CaseFile[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState<CaseFile | null>(null)
  const [filterType, setFilterType] = useState<string>('all')

  // Upload state
  const [cases, setCases] = useState<CaseOption[]>([])
  const [selectedCaseId, setSelectedCaseId] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState('')
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadFiles = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/portal/dentist/files')
      if (res.ok) {
        const data = await res.json()
        setFiles(data.data || [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  const loadCases = useCallback(async () => {
    try {
      const res = await fetch('/api/portal/dentist/cases?limit=100')
      if (res.ok) {
        const data = await res.json()
        setCases(data.data || [])
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    loadFiles()
    loadCases()
  }, [loadFiles, loadCases])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !selectedCaseId) return

    setUploading(true)
    setUploadError('')
    setUploadSuccess('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('caseId', selectedCaseId)

      const res = await fetch('/api/portal/dentist/files', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Upload failed')
      }

      setUploadSuccess(`"${file.name}" uploaded successfully`)
      setTimeout(() => setUploadSuccess(''), 4000)
      loadFiles()
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to upload file')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const filteredFiles = filterType === 'all' ? files : files.filter(f => f.fileType === filterType)
  const stlFiles = files.filter(f => f.fileType === 'stl')
  const htmlFiles = files.filter(f => f.fileType === 'html')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">3D Files & Designs</h1>
        <p className="mt-1 text-sm text-gray-500">
          View STL files and design previews shared by the lab, or upload files to your cases.
        </p>
      </div>

      {/* Upload Section */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Upload File</h2>
          <p className="text-xs text-gray-500 mt-0.5">Upload STL, PDF, images or other files to a case</p>
        </div>
        <div className="px-6 py-4 bg-gray-50/50">
          <div className="flex items-end gap-4">
            <div className="flex-1 max-w-xs">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Select Case</label>
              <select
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-gray-400"
              >
                <option value="">Choose a case...</option>
                {cases.map(c => {
                  const patientName = c.patient
                    ? [c.patient.firstName, c.patient.lastName].filter(Boolean).join(' ') || c.patient.initials || ''
                    : ''
                  return (
                    <option key={c.id} value={c.id}>
                      {c.caseNumber}{patientName ? ` — ${patientName}` : ''}
                    </option>
                  )
                })}
              </select>
            </div>
            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleUpload}
                accept=".stl,.html,.htm,.pdf,.jpg,.jpeg,.png,.gif,.webp"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={uploading || !selectedCaseId}
              />
              <button
                disabled={uploading || !selectedCaseId}
                className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {uploading ? 'Uploading...' : 'Choose File & Upload'}
              </button>
            </div>
          </div>
          {!selectedCaseId && (
            <p className="mt-2 text-xs text-gray-400">Select a case first to upload a file</p>
          )}
          {uploadSuccess && (
            <p className="mt-2 text-xs font-medium text-green-600">{uploadSuccess}</p>
          )}
          {uploadError && (
            <p className="mt-2 text-xs font-medium text-red-600">{uploadError}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-2xl font-bold text-gray-900">{files.length}</p>
          <p className="text-xs text-gray-500">Total Files</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-2xl font-bold text-purple-600">{stlFiles.length}</p>
          <p className="text-xs text-gray-500">3D Models (STL)</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-2xl font-bold text-blue-600">{htmlFiles.length}</p>
          <p className="text-xs text-gray-500">Design Previews</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-2xl font-bold text-gray-600">{files.filter(f => f.fileType !== 'stl' && f.fileType !== 'html').length}</p>
          <p className="text-xs text-gray-500">Other Files</p>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-4 flex items-center gap-2">
        {['all', 'stl', 'html', 'pdf', 'image'].map(type => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filterType === type
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {type === 'all' ? 'All' : type.toUpperCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-16 text-center">
          <svg className="h-8 w-8 animate-spin text-gray-400 mx-auto" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="mt-3 text-sm text-gray-500">Loading files...</p>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-16 text-center">
          <svg className="h-12 w-12 text-gray-300 mx-auto" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
          </svg>
          <h3 className="mt-4 text-sm font-semibold text-gray-900">No files yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            {filterType === 'all'
              ? 'Upload files above, or wait for the lab to share STL files and design previews with you.'
              : `No ${filterType.toUpperCase()} files shared yet.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFiles.map(file => {
            const typeInfo = FILE_TYPE_ICONS[file.fileType] || FILE_TYPE_ICONS.other
            return (
              <div
                key={file.id}
                className={`rounded-xl border bg-white overflow-hidden transition-all ${
                  selectedFile?.id === file.id ? 'border-gray-900 ring-1 ring-gray-900' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* File header */}
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${typeInfo.bg}`}>
                      <span className={`text-xs font-bold ${typeInfo.color}`}>{typeInfo.label}</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{file.fileName}</h3>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-gray-500">
                          Case {file.case.caseNumber}
                        </span>
                        {file.case.patient && (
                          <span className="text-xs text-gray-400">
                            Patient: {file.case.patient.initials || file.case.patient.reference}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">{formatBytes(file.fileSize)}</span>
                        <span className="text-xs text-gray-400">{formatDate(file.createdAt)}</span>
                      </div>
                      {file.description && (
                        <p className="text-xs text-gray-500 mt-1">{file.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {file.fileType === 'stl' && (
                      <button
                        onClick={() => setSelectedFile(selectedFile?.id === file.id ? null : file)}
                        className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                          selectedFile?.id === file.id
                            ? 'bg-gray-900 text-white'
                            : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                        }`}
                      >
                        {selectedFile?.id === file.id ? 'Close Viewer' : 'View 3D'}
                      </button>
                    )}
                    {file.fileType === 'html' && (
                      <button
                        onClick={() => window.open(file.fileUrl, '_blank')}
                        className="rounded-lg bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                      >
                        Open Preview
                      </button>
                    )}
                    <a
                      href={file.fileUrl}
                      download={file.fileName}
                      className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                      Download
                    </a>
                  </div>
                </div>

                {/* STL Viewer */}
                {selectedFile?.id === file.id && file.fileType === 'stl' && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50">
                    <STLViewer
                      url={file.fileUrl}
                      fileName={file.fileName}
                      className="h-[500px]"
                    />
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        Rotate, zoom and pan to inspect the model. If you&apos;re happy with the design, let the lab know to proceed with printing.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
