'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { RotateCcw } from 'lucide-react'
import { cn } from '@/components/ui/cn'

interface SignaturePadProps {
  onSign:    (dataUrl: string) => void
  className?: string
}

export function SignaturePad({ onSign, className }: SignaturePadProps) {
  const canvasRef     = useRef<HTMLCanvasElement>(null)
  const drawing       = useRef(false)
  const lastPos       = useRef<{ x: number; y: number } | null>(null)
  const [hasStrokes, setHasStrokes] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    canvas.width  = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#080A0D'
    ctx.lineWidth   = 2.5
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'
  }, [])

  function getPos(e: React.Touch | React.MouseEvent) {
    const canvas = canvasRef.current!
    const rect   = canvas.getBoundingClientRect()
    const scaleX = canvas.width  / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: ('clientX' in e ? e.clientX : (e as React.Touch).clientX) - rect.left,
      y: ('clientY' in e ? e.clientY : (e as React.Touch).clientY) - rect.top,
    }
  }

  function startStroke(pos: { x: number; y: number }) {
    drawing.current = true
    lastPos.current = pos
    setHasStrokes(true)
    const ctx = canvasRef.current!.getContext('2d')!
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }

  function moveStroke(pos: { x: number; y: number }) {
    if (!drawing.current || !lastPos.current) return
    const ctx = canvasRef.current!.getContext('2d')!
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPos.current = pos
  }

  function endStroke() {
    if (!drawing.current) return
    drawing.current = false
    onSign(canvasRef.current!.toDataURL('image/png'))
  }

  const clear = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasStrokes(false)
  }, [])

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="relative overflow-hidden rounded-xl border-2 border-border-subtle bg-white">
        <canvas
          ref={canvasRef}
          className="h-52 w-full touch-none"
          onMouseDown={e  => startStroke(getPos(e))}
          onMouseMove={e  => moveStroke(getPos(e))}
          onMouseUp={endStroke}
          onMouseLeave={endStroke}
          onTouchStart={e => { e.preventDefault(); startStroke(getPos(e.touches[0])) }}
          onTouchMove={e  => { e.preventDefault(); moveStroke(getPos(e.touches[0])) }}
          onTouchEnd={endStroke}
        />
        {!hasStrokes && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-gray-400">
            Firme aquí
          </p>
        )}
      </div>
      {hasStrokes && (
        <button
          type="button"
          onClick={clear}
          className="flex items-center gap-1.5 self-end text-sm text-ink-tertiary hover:text-ink-secondary"
        >
          <RotateCcw size={13} />
          Borrar
        </button>
      )}
    </div>
  )
}
