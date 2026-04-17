import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import type { AnnotationTool } from './annotation-toolbar'

// ─── Annotation types (percentage-based coords, 0.0–1.0) ────────────────────

export type HighlightAnnotation = {
  kind: 'highlight'
  id: string
  x: number; y: number; w: number; h: number
  color: string
  opacity: number
}

export type TextAnnotation = {
  kind: 'text'
  id: string
  x: number; y: number
  text: string
  color: string
  fontSize: number  // percentage of page height
}

export type DrawAnnotation = {
  kind: 'draw'
  id: string
  points: { x: number; y: number }[]
  color: string
  strokeWidth: number  // percentage of page width
}

export type ArrowAnnotation = {
  kind: 'arrow'
  id: string
  x1: number; y1: number; x2: number; y2: number
  color: string
  strokeWidth: number
}

export type Annotation = HighlightAnnotation | TextAnnotation | DrawAnnotation | ArrowAnnotation

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2)
}

// ─── Draw all annotations onto a canvas context ──────────────────────────────

export function renderAnnotations(
  ctx: CanvasRenderingContext2D,
  annotations: Annotation[],
  width: number,
  height: number
) {
  for (const ann of annotations) {
    if (ann.kind === 'highlight') {
      ctx.save()
      ctx.globalAlpha = ann.opacity
      ctx.fillStyle = ann.color
      ctx.fillRect(ann.x * width, ann.y * height, ann.w * width, ann.h * height)
      ctx.restore()
    } else if (ann.kind === 'draw') {
      if (ann.points.length < 2) continue
      ctx.save()
      ctx.strokeStyle = ann.color
      ctx.lineWidth = ann.strokeWidth * width
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(ann.points[0].x * width, ann.points[0].y * height)
      for (let i = 1; i < ann.points.length; i++) {
        ctx.lineTo(ann.points[i].x * width, ann.points[i].y * height)
      }
      ctx.stroke()
      ctx.restore()
    } else if (ann.kind === 'arrow') {
      const x1 = ann.x1 * width, y1 = ann.y1 * height
      const x2 = ann.x2 * width, y2 = ann.y2 * height
      const lw = ann.strokeWidth * width
      const headLen = Math.max(lw * 4, 12)
      const angle = Math.atan2(y2 - y1, x2 - x1)
      ctx.save()
      ctx.strokeStyle = ann.color
      ctx.fillStyle = ann.color
      ctx.lineWidth = lw
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
      // arrowhead
      ctx.beginPath()
      ctx.moveTo(x2, y2)
      ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6))
      ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6))
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    } else if (ann.kind === 'text') {
      const fs = ann.fontSize * height
      ctx.save()
      ctx.font = `${fs}px sans-serif`
      ctx.fillStyle = ann.color
      ctx.fillText(ann.text, ann.x * width, ann.y * height)
      ctx.restore()
    }
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export interface AnnotationCanvasHandle {
  redraw: () => void
}

interface Props {
  width: number
  height: number
  annotations: Annotation[]
  tool: AnnotationTool
  color: string
  strokeWidth: number
  onChange: (annotations: Annotation[]) => void
}

const AnnotationCanvas = forwardRef<AnnotationCanvasHandle, Props>(function AnnotationCanvas(
  { width, height, annotations, tool, color, strokeWidth, onChange },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const currentAnnotation = useRef<Annotation | null>(null)

  function getRelative(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    }
  }

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    renderAnnotations(ctx, annotations, canvas.width, canvas.height)
    if (currentAnnotation.current) {
      renderAnnotations(ctx, [currentAnnotation.current], canvas.width, canvas.height)
    }
  }, [annotations])

  useImperativeHandle(ref, () => ({ redraw }), [redraw])

  useEffect(() => { redraw() }, [redraw])

  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    if (tool === 'select') return
    const pos = getRelative(e)
    drawing.current = true

    if (tool === 'highlight') {
      currentAnnotation.current = {
        kind: 'highlight', id: uid(),
        x: pos.x, y: pos.y, w: 0, h: 0,
        color, opacity: 0.35,
      }
    } else if (tool === 'draw') {
      currentAnnotation.current = {
        kind: 'draw', id: uid(),
        points: [pos],
        color,
        strokeWidth: strokeWidth / 1000,
      }
    } else if (tool === 'arrow') {
      currentAnnotation.current = {
        kind: 'arrow', id: uid(),
        x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y,
        color,
        strokeWidth: strokeWidth / 1000,
      }
    } else if (tool === 'text') {
      drawing.current = false
      const input = document.createElement('input')
      input.style.cssText = `
        position: fixed;
        top: -9999px;
        opacity: 0;
      `
      document.body.appendChild(input)
      input.focus()
      input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' && input.value.trim()) {
          const ann: TextAnnotation = {
            kind: 'text', id: uid(),
            x: pos.x, y: pos.y,
            text: input.value.trim(),
            color,
            fontSize: 0.03,
          }
          onChange([...annotations, ann])
          document.body.removeChild(input)
        } else if (ev.key === 'Escape') {
          document.body.removeChild(input)
        }
      })
      // Show a native prompt as fallback UX — invisible input above is for keyboard capture
      const text = window.prompt('Enter annotation text:')
      if (text && text.trim()) {
        const ann: TextAnnotation = {
          kind: 'text', id: uid(),
          x: pos.x, y: pos.y,
          text: text.trim(),
          color,
          fontSize: 0.03,
        }
        onChange([...annotations, ann])
      }
      try { document.body.removeChild(input) } catch {}
    }
  }

  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!drawing.current || !currentAnnotation.current) return
    const pos = getRelative(e)

    if (currentAnnotation.current.kind === 'highlight') {
      const startX = (currentAnnotation.current as HighlightAnnotation).x
      const startY = (currentAnnotation.current as HighlightAnnotation).y
      currentAnnotation.current = {
        ...currentAnnotation.current as HighlightAnnotation,
        w: pos.x - startX,
        h: pos.y - startY,
      }
    } else if (currentAnnotation.current.kind === 'draw') {
      currentAnnotation.current = {
        ...currentAnnotation.current as DrawAnnotation,
        points: [...(currentAnnotation.current as DrawAnnotation).points, pos],
      }
    } else if (currentAnnotation.current.kind === 'arrow') {
      currentAnnotation.current = {
        ...currentAnnotation.current as ArrowAnnotation,
        x2: pos.x, y2: pos.y,
      }
    }

    redraw()
  }

  function onMouseUp() {
    if (!drawing.current || !currentAnnotation.current) return
    drawing.current = false

    // Discard tiny gestures
    const ann = currentAnnotation.current
    let discard = false
    if (ann.kind === 'highlight') discard = Math.abs(ann.w) < 0.005 || Math.abs(ann.h) < 0.005
    else if (ann.kind === 'draw') discard = ann.points.length < 3
    else if (ann.kind === 'arrow') {
      const dx = ann.x2 - ann.x1, dy = ann.y2 - ann.y1
      discard = Math.sqrt(dx * dx + dy * dy) < 0.02
    }

    if (!discard) onChange([...annotations, ann])
    currentAnnotation.current = null
    redraw()
  }

  const cursor =
    tool === 'select' ? 'default' :
    tool === 'text' ? 'text' :
    tool === 'draw' ? 'crosshair' :
    'crosshair'

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      style={{
        position: 'absolute',
        top: 0, left: 0,
        width: '100%',
        height: '100%',
        cursor,
        touchAction: 'none',
      }}
    />
  )
})

export default AnnotationCanvas
