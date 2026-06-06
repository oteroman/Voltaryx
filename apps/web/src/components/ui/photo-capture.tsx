'use client'

import { useRef, useState, useCallback } from 'react'
import { Camera, X, Loader2 } from 'lucide-react'
import { cn } from '@/components/ui/cn'
import { db } from '@/lib/offline/db'
import { enqueueSync } from '@/lib/offline/db'

interface Photo {
  localId: number
  dataUrl:  string
  caption?: string
}

interface PhotoCaptureProps {
  workOrderRemoteId: string
  assetId?:          string
  onPhotosChange?:   (count: number) => void
  className?:        string
}

const MAX_SIZE_PX   = 1200
const JPEG_QUALITY  = 0.82

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img  = new Image()
    const url  = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const ratio  = Math.min(1, MAX_SIZE_PX / Math.max(img.width, img.height))
      const w      = Math.round(img.width  * ratio)
      const h      = Math.round(img.height * ratio)
      const canvas = document.createElement('canvas')
      canvas.width  = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('compress failed')), 'image/jpeg', JPEG_QUALITY)
    }
    img.onerror = reject
    img.src = url
  })
}

export function PhotoCapture({
  workOrderRemoteId, assetId, onPhotosChange, className,
}: PhotoCaptureProps) {
  const inputRef          = useRef<HTMLInputElement>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(false)

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files?.length) return
    setLoading(true)
    try {
      const added: Photo[] = []
      for (const file of Array.from(files)) {
        const blob    = await compressImage(file)
        const dataUrl = await new Promise<string>(res => {
          const reader = new FileReader()
          reader.onload = e => res(e.target!.result as string)
          reader.readAsDataURL(blob)
        })
        const localId = await db.photos.add({
          workOrderRemoteId,
          assetId:    assetId,
          blob,
          takenAt:    new Date().toISOString(),
          syncStatus: 'pending',
        })
        await enqueueSync('photo', localId, 'INSERT')
        added.push({ localId, dataUrl })
      }
      setPhotos(prev => {
        const next = [...prev, ...added]
        onPhotosChange?.(next.length)
        return next
      })
    } finally {
      setLoading(false)
    }
  }, [workOrderRemoteId, assetId, onPhotosChange])

  async function removePhoto(localId: number) {
    await db.photos.delete(localId)
    setPhotos(prev => {
      const next = prev.filter(p => p.localId !== localId)
      onPhotosChange?.(next.length)
      return next
    })
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map(photo => (
            <div key={photo.localId} className="relative aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.dataUrl}
                alt="Captura"
                className="h-full w-full rounded-md object-cover"
              />
              <button
                type="button"
                onClick={() => removePhoto(photo.localId)}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-void/80 text-ink-primary"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border-subtle py-3 text-sm text-ink-tertiary transition-colors hover:border-volt-500/30 hover:text-ink-secondary disabled:opacity-50"
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Camera size={16} />
        )}
        {loading ? 'Procesando...' : photos.length > 0 ? 'Agregar más fotos' : 'Tomar foto'}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="sr-only"
        onChange={e => handleFiles(e.target.files)}
      />
    </div>
  )
}
