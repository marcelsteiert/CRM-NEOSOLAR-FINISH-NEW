import { useState, useEffect, useCallback } from 'react'
import {
  X, Download, ZoomIn, ZoomOut, RotateCw, ChevronLeft, ChevronRight,
  FileText, File, Maximize2, Minimize2,
} from 'lucide-react'
import { formatFileSize } from '@/hooks/useDocuments'

export interface ViewerFile {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  downloadUrl: string | null
  createdAt: string
}

interface FileViewerProps {
  file: ViewerFile
  files?: ViewerFile[]
  onClose: () => void
  onNavigate?: (file: ViewerFile) => void
}

export default function FileViewer({ file, files = [], onClose, onNavigate }: FileViewerProps) {
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  const isImage = file.mimeType.startsWith('image/')
  const isPdf = file.mimeType === 'application/pdf'
  const isViewable = isImage || isPdf

  const currentIndex = files.findIndex((f) => f.id === file.id)
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < files.length - 1

  const handlePrev = useCallback(() => {
    if (hasPrev && onNavigate) {
      setZoom(1)
      setRotation(0)
      setImageLoaded(false)
      setImageError(false)
      onNavigate(files[currentIndex - 1])
    }
  }, [hasPrev, onNavigate, files, currentIndex])

  const handleNext = useCallback(() => {
    if (hasNext && onNavigate) {
      setZoom(1)
      setRotation(0)
      setImageLoaded(false)
      setImageError(false)
      onNavigate(files[currentIndex + 1])
    }
  }, [hasNext, onNavigate, files, currentIndex])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') handlePrev()
      if (e.key === 'ArrowRight') handleNext()
      if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(z + 0.25, 5))
      if (e.key === '-') setZoom((z) => Math.max(z - 0.25, 0.25))
      if (e.key === 'r') setRotation((r) => (r + 90) % 360)
      if (e.key === 'f') setFullscreen((f) => !f)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, handlePrev, handleNext])

  const zoomIn = () => setZoom((z) => Math.min(z + 0.25, 5))
  const zoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.25))
  const rotate = () => setRotation((r) => (r + 90) % 360)

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col"
      style={{ background: 'rgba(0, 0, 0, 0.92)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* ── Top Bar ── */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 shrink-0"
        style={{ background: 'rgba(11, 15, 21, 0.95)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* File info */}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-text truncate">{file.fileName}</p>
          <div className="flex items-center gap-2 text-[10px] text-text-dim">
            <span>{formatFileSize(file.fileSize)}</span>
            <span>·</span>
            <span>{new Date(file.createdAt).toLocaleDateString('de-CH')}</span>
            {files.length > 1 && (
              <>
                <span>·</span>
                <span>{currentIndex + 1} / {files.length}</span>
              </>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          {isImage && (
            <>
              <button
                type="button"
                onClick={zoomOut}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-text-dim hover:text-text hover:bg-white/5 transition-colors"
                title="Verkleinern (–)"
              >
                <ZoomOut size={16} strokeWidth={1.8} />
              </button>
              <span className="text-[10px] text-text-dim tabular-nums w-10 text-center">{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                onClick={zoomIn}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-text-dim hover:text-text hover:bg-white/5 transition-colors"
                title="Vergrössern (+)"
              >
                <ZoomIn size={16} strokeWidth={1.8} />
              </button>
              <button
                type="button"
                onClick={rotate}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-text-dim hover:text-text hover:bg-white/5 transition-colors"
                title="Drehen (R)"
              >
                <RotateCw size={16} strokeWidth={1.8} />
              </button>
              <div className="w-px h-5 bg-white/10 mx-1" />
            </>
          )}

          <button
            type="button"
            onClick={() => setFullscreen((f) => !f)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-dim hover:text-text hover:bg-white/5 transition-colors"
            title="Vollbild (F)"
          >
            {fullscreen ? <Minimize2 size={16} strokeWidth={1.8} /> : <Maximize2 size={16} strokeWidth={1.8} />}
          </button>

          {file.downloadUrl && (
            <a
              href={file.downloadUrl}
              download={file.fileName}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-text-dim hover:text-amber hover:bg-amber/5 transition-colors"
              title="Herunterladen"
            >
              <Download size={16} strokeWidth={1.8} />
            </a>
          )}

          <div className="w-px h-5 bg-white/10 mx-1" />
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-dim hover:text-text hover:bg-white/5 transition-colors"
            title="Schliessen (Esc)"
          >
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 min-h-0 relative flex items-center justify-center overflow-hidden">
        {/* Navigation arrows */}
        {files.length > 1 && hasPrev && (
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-3 z-10 w-10 h-10 rounded-full flex items-center justify-center text-text-dim hover:text-text transition-colors"
            style={{ background: 'rgba(11, 15, 21, 0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
            title="Vorherige Datei (←)"
          >
            <ChevronLeft size={20} strokeWidth={1.8} />
          </button>
        )}
        {files.length > 1 && hasNext && (
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-3 z-10 w-10 h-10 rounded-full flex items-center justify-center text-text-dim hover:text-text transition-colors"
            style={{ background: 'rgba(11, 15, 21, 0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
            title="Nächste Datei (→)"
          >
            <ChevronRight size={20} strokeWidth={1.8} />
          </button>
        )}

        {/* Image viewer */}
        {isImage && file.downloadUrl && (
          <div
            className="w-full h-full flex items-center justify-center p-4"
            style={{ cursor: zoom > 1 ? 'grab' : 'default' }}
          >
            {!imageLoaded && !imageError && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-amber/30 border-t-amber rounded-full animate-spin" />
              </div>
            )}
            {imageError && (
              <div className="text-center">
                <File size={48} className="text-text-dim mx-auto mb-3" strokeWidth={1} />
                <p className="text-[13px] text-text-sec">Bild konnte nicht geladen werden</p>
              </div>
            )}
            <img
              src={file.downloadUrl}
              alt={file.fileName}
              className="transition-transform duration-200"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                maxWidth: fullscreen ? 'none' : '100%',
                maxHeight: fullscreen ? 'none' : '100%',
                objectFit: 'contain',
                display: imageLoaded ? 'block' : 'none',
              }}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              draggable={false}
            />
          </div>
        )}

        {/* PDF viewer */}
        {isPdf && file.downloadUrl && (
          <iframe
            src={file.downloadUrl}
            className="w-full h-full border-0"
            style={{
              maxWidth: fullscreen ? '100%' : '900px',
              margin: '0 auto',
              background: '#fff',
              borderRadius: fullscreen ? 0 : '8px',
            }}
            title={file.fileName}
          />
        )}

        {/* Non-viewable file */}
        {!isViewable && (
          <div className="text-center p-8">
            <div
              className="w-20 h-20 rounded-2xl mx-auto mb-5 flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <FileText size={36} className="text-text-dim" strokeWidth={1.2} />
            </div>
            <p className="text-[15px] font-semibold text-text mb-1">{file.fileName}</p>
            <p className="text-[12px] text-text-dim mb-1">{file.mimeType} · {formatFileSize(file.fileSize)}</p>
            <p className="text-[11px] text-text-dim mb-5">Vorschau fuer diesen Dateityp nicht verfuegbar</p>
            {file.downloadUrl && (
              <a
                href={file.downloadUrl}
                download={file.fileName}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[12px] font-semibold transition-all"
                style={{
                  background: 'color-mix(in srgb, #F59E0B 15%, transparent)',
                  color: '#F59E0B',
                  border: '1px solid color-mix(in srgb, #F59E0B 25%, transparent)',
                }}
              >
                <Download size={14} strokeWidth={1.8} />
                Herunterladen
              </a>
            )}
          </div>
        )}
      </div>

      {/* ── Thumbnail strip (wenn mehrere Dateien) ── */}
      {files.length > 1 && (
        <div
          className="flex items-center gap-2 px-4 py-2.5 overflow-x-auto shrink-0"
          style={{ background: 'rgba(11, 15, 21, 0.95)', borderTop: '1px solid rgba(255,255,255,0.08)' }}
        >
          {files.map((f) => {
            const isActive = f.id === file.id
            const isImg = f.mimeType.startsWith('image/')
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  if (onNavigate) {
                    setZoom(1)
                    setRotation(0)
                    setImageLoaded(false)
                    setImageError(false)
                    onNavigate(f)
                  }
                }}
                className="shrink-0 w-14 h-14 rounded-lg overflow-hidden transition-all"
                style={{
                  border: isActive
                    ? '2px solid #F59E0B'
                    : '2px solid rgba(255,255,255,0.06)',
                  opacity: isActive ? 1 : 0.5,
                }}
                title={f.fileName}
              >
                {isImg && f.downloadUrl ? (
                  <img
                    src={f.downloadUrl}
                    alt={f.fileName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <FileText size={16} className="text-text-dim" strokeWidth={1.5} />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
