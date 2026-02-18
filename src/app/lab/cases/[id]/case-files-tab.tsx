'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface CaseFileData {
  id: string
  fileName: string
  fileType: string
  fileUrl: string
  fileSize: number | null
  description: string | null
  sharedWithDentist: boolean
  createdAt: string | Date
  uploadedBy: { name: string } | null
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const FILE_TYPE_BADGES: Record<string, { bg: string; text: string }> = {
  stl: { bg: 'bg-purple-50', text: 'text-purple-700' },
  html: { bg: 'bg-blue-50', text: 'text-blue-700' },
  pdf: { bg: 'bg-red-50', text: 'text-red-700' },
  image: { bg: 'bg-green-50', text: 'text-green-700' },
  other: { bg: 'bg-gray-50', text: 'text-gray-700' },
}

export function CaseFilesTab({ caseId, initialFiles }: { caseId: string; initialFiles: CaseFileData[] }) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<CaseFileData[]>(initialFiles)
  const [uploading, setUploading] = useState(false)
  const [shareWithDentist, setShareWithDentist] = useState(true)
  const [description, setDescription] = useState('')

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('sharedWithDentist', String(shareWithDentist))
      if (description.trim()) formData.append('description', description.trim())

      const res = await fetch(`/api/cases/${caseId}/files`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) throw new Error('Upload failed')

      const data = await res.json()
      setFiles((prev) => [data.data, ...prev])
      setDescription('')
      toast.success('File uploaded')
      router.refresh()
    } catch {
      toast.error('Failed to upload file')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function toggleShare(fileId: string, currentlyShared: boolean) {
    try {
      const res = await fetch(`/api/cases/${caseId}/files/${fileId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sharedWithDentist: !currentlyShared }),
      })
      if (!res.ok) throw new Error('Failed to update')
      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, sharedWithDentist: !currentlyShared } : f))
      )
      toast.success(currentlyShared ? 'Unshared from dentist' : 'Shared with dentist')
    } catch {
      toast.error('Failed to update sharing')
    }
  }

  async function deleteFile(fileId: string) {
    if (!confirm('Delete this file?')) return
    try {
      const res = await fetch(`/api/cases/${caseId}/files/${fileId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      setFiles((prev) => prev.filter((f) => f.id !== fileId))
      toast.success('File deleted')
      router.refresh()
    } catch {
      toast.error('Failed to delete file')
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <h3 className="text-sm font-semibold text-gray-900">Files & 3D Models</h3>
      </div>

      {/* Upload area */}
      <div className="border-b border-gray-100 px-6 py-4 bg-gray-50/50">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Upload File (STL, HTML, PDF, images)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description (e.g. Upper arch STL)"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-gray-400"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={shareWithDentist}
              onChange={(e) => setShareWithDentist(e.target.checked)}
              className="rounded border-gray-300 text-brand-600"
            />
            Share with dentist
          </label>
          <div className="relative">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleUpload}
              accept=".stl,.html,.htm,.pdf,.jpg,.jpeg,.png,.gif,.webp"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={uploading}
            />
            <button
              disabled={uploading}
              className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50 whitespace-nowrap"
            >
              {uploading ? 'Uploading...' : 'Choose File'}
            </button>
          </div>
        </div>
      </div>

      {/* File list */}
      {files.length === 0 ? (
        <div className="px-6 py-12 text-center text-sm text-gray-500">
          No files uploaded yet. Upload STL, HTML, or other files to share with the dentist.
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {files.map((file) => {
            const badge = FILE_TYPE_BADGES[file.fileType] || FILE_TYPE_BADGES.other
            return (
              <div key={file.id} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${badge.bg} ${badge.text}`}>
                    {file.fileType}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.fileName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-gray-400">{formatBytes(file.fileSize)}</span>
                      <span className="text-[11px] text-gray-400">{formatDate(file.createdAt)}</span>
                      {file.uploadedBy && (
                        <span className="text-[11px] text-gray-400">by {file.uploadedBy.name}</span>
                      )}
                      {file.description && (
                        <span className="text-[11px] text-gray-500 italic">{file.description}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleShare(file.id, file.sharedWithDentist)}
                    className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors ${
                      file.sharedWithDentist
                        ? 'bg-green-50 text-green-700 hover:bg-green-100'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                    title={file.sharedWithDentist ? 'Visible to dentist' : 'Not shared'}
                  >
                    {file.sharedWithDentist ? 'Shared' : 'Not shared'}
                  </button>
                  {file.fileType === 'stl' && (
                    <a
                      href={file.fileUrl}
                      download={file.fileName}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-gray-600 hover:bg-gray-50"
                    >
                      Download
                    </a>
                  )}
                  {file.fileType === 'html' && (
                    <button
                      onClick={() => window.open(file.fileUrl, '_blank')}
                      className="rounded-lg bg-blue-50 px-3 py-1.5 text-[11px] font-medium text-blue-700 hover:bg-blue-100"
                    >
                      Open
                    </button>
                  )}
                  <button
                    onClick={() => deleteFile(file.id)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    title="Delete file"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
