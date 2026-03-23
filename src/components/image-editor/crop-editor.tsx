import { useRef, useState, useEffect, useCallback } from 'react'
import { Button } from '../ui/button'
import { RotateCcw, Undo2, Redo2 } from 'lucide-react'
import { SideToolbar } from './toolbar/side-toolbar'
import { BottomPanel } from './toolbar/bottom-panel'
import type { OverlayMode } from './toolbar/tab-overlay'
import ExportDialog from './export-dialog'
import { DEFAULT_ADJUSTMENTS, DEFAULT_TRANSFORM } from './toolbar/types'
import type { Adjustments, Transform } from './toolbar/types'
import { buildFilter, applyBlur, applySharpen, applyVignette } from './utils/canvas-filters'
import { canvasToImage, imageToCanvas, type ScaleInfo } from './utils/image-space'
import { DEFAULT_RESIZE, type ResizeState } from './utils/resize-presets'
import { useTextOverlays } from './layers/use-text-overlays'
import { useDrawCommands, renderCommand, type DrawTool, type DrawCommand, type Point } from './layers/use-draw-commands'
import { useEditorHistory, type EditorSnapshot } from './layers/use-editor-history'

interface Rect { x: number; y: number; w: number; h: number }
type CropHandle = 'tl' | 'tr' | 'bl' | 'br' | 'move' | null

const MIN_SIZE = 20
const HANDLE_SIZE = 10
const INSET = 12

interface Props {
  file: File
  onReset: () => void
}

export default function CropEditor({ file, onReset }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const scaleRef = useRef<ScaleInfo>({ x: 1, y: 1, offX: 0, offY: 0, dispW: 0, dispH: 0 })

  // Crop state
  const [crop, setCrop] = useState<Rect>({ x: 0, y: 0, w: 0, h: 0 })
  const cropRef = useRef<Rect>({ x: 0, y: 0, w: 0, h: 0 })
  const dragRef = useRef<{ handle: CropHandle; startX: number; startY: number; origCrop: Rect; snapshotAtStart: EditorSnapshot } | null>(null)

  // Editor state
  const [imgLoaded, setImgLoaded] = useState(false)
  const [adjustments, setAdjustments] = useState<Adjustments>(DEFAULT_ADJUSTMENTS)
  const [transform, setTransform] = useState<Transform>(DEFAULT_TRANSFORM)
  const [resize, setResize] = useState<ResizeState>(DEFAULT_RESIZE)
  const [mode, setMode] = useState<OverlayMode>('crop')
  const [drawTool, setDrawTool] = useState<DrawTool>('pen')
  const [drawColor, setDrawColor] = useState('#ffffff')
  const [drawWidth, setDrawWidth] = useState(3)
  const [bgRemoveStatus, setBgRemoveStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [bgRemoveProgress, setBgRemoveProgress] = useState(0)
  const bgRemoveCancelledRef = useRef(false)

  // Unified undo/redo history
  const history = useEditorHistory({
    crop: { x: 0, y: 0, w: 0, h: 0 },
    adjustments: DEFAULT_ADJUSTMENTS,
    transform: DEFAULT_TRANSFORM,
    drawCommands: [],
    textOverlays: [],
  })

  // Refs for read-in-callback access
  const adjustmentsRef = useRef(adjustments)
  const transformRef = useRef(transform)
  const resizeRef = useRef(resize)
  const modeRef = useRef(mode)
  const drawToolRef = useRef(drawTool)
  const drawColorRef = useRef(drawColor)
  const drawWidthRef = useRef(drawWidth)

  useEffect(() => { cropRef.current = crop }, [crop])
  useEffect(() => { adjustmentsRef.current = adjustments }, [adjustments])
  useEffect(() => { transformRef.current = transform }, [transform])
  useEffect(() => { resizeRef.current = resize }, [resize])
  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => { drawToolRef.current = drawTool }, [drawTool])
  useEffect(() => { drawColorRef.current = drawColor }, [drawColor])
  useEffect(() => { drawWidthRef.current = drawWidth }, [drawWidth])

  // Overlay layers
  const textLayer = useTextOverlays()
  const textLayerRef = useRef(textLayer)
  useEffect(() => { textLayerRef.current = textLayer }, [textLayer])

  const drawLayer = useDrawCommands()
  const drawLayerRef = useRef(drawLayer)
  useEffect(() => { drawLayerRef.current = drawLayer }, [drawLayer])
  const isDrawingRef = useRef(false)
  const textDragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number; snapshotAtStart: EditorSnapshot } | null>(null)

  const getSnapshot = useCallback((): EditorSnapshot => ({
    crop: cropRef.current,
    adjustments: adjustmentsRef.current,
    transform: transformRef.current,
    drawCommands: drawLayerRef.current.commands,
    textOverlays: textLayerRef.current.overlays,
  }), [])

  // ─── Draw pipeline ───────────────────────────────────────────────────────

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = ctxRef.current
    const img = imgRef.current
    if (!canvas || !ctx || !img) return
    const scale = scaleRef.current
    const { offX, offY, dispW, dispH } = scale
    const c = cropRef.current
    const a = adjustmentsRef.current
    const t = transformRef.current
    const cssW = canvas.width / (window.devicePixelRatio || 1)
    const cssH = canvas.height / (window.devicePixelRatio || 1)
    ctx.clearRect(0, 0, cssW, cssH)

    const cx_img = offX + dispW / 2
    const cy_img = offY + dispH / 2

    if (a.blur > 0 || a.sharpen > 0) {
      // Offscreen pipeline only when blur/sharpen are needed
      const offscreen = document.createElement('canvas')
      offscreen.width = cssW
      offscreen.height = cssH
      const octx = offscreen.getContext('2d')!
      octx.imageSmoothingEnabled = true
      octx.imageSmoothingQuality = 'high'
      octx.filter = buildFilter(a)
      octx.save()
      octx.translate(cx_img, cy_img)
      octx.rotate((t.rotation * Math.PI) / 180)
      octx.scale(t.flipH ? -1 : 1, t.flipV ? -1 : 1)
      octx.translate(-cx_img, -cy_img)
      octx.drawImage(img, offX, offY, dispW, dispH)
      octx.restore()
      octx.filter = 'none'
      const blurred = a.blur > 0 ? applyBlur(offscreen, a.blur) : offscreen
      const sharpened = a.sharpen > 0 ? applySharpen(blurred, a.sharpen) : blurred
      ctx.drawImage(sharpened, 0, 0)
    } else {
      // Draw directly to display canvas — original quality, no extra copy
      ctx.save()
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.filter = buildFilter(a)
      ctx.translate(cx_img, cy_img)
      ctx.rotate((t.rotation * Math.PI) / 180)
      ctx.scale(t.flipH ? -1 : 1, t.flipV ? -1 : 1)
      ctx.translate(-cx_img, -cy_img)
      ctx.drawImage(img, offX, offY, dispW, dispH)
      ctx.restore()
      ctx.filter = 'none'
    }

    // Vignette
    applyVignette(ctx, offX, offY, dispW, dispH, a.vignette)

    // Stage 6: text overlays (display space)
    const tl = textLayerRef.current
    for (const ov of tl.overlays) {
      const { x: cx, y: cy } = imageToCanvas(ov.x, ov.y, scale)
      const displayFontSize = ov.fontSize * scale.x
      ctx.save()
      ctx.font = `${displayFontSize}px ${ov.fontFamily}`
      ctx.fillStyle = ov.color
      ctx.textBaseline = 'top'
      if (ov.id === tl.selectedId) {
        const metrics = ctx.measureText(ov.content)
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'
        ctx.lineWidth = 1
        ctx.strokeRect(cx - 2, cy - 2, metrics.width + 4, displayFontSize + 4)
      }
      ctx.fillText(ov.content, cx, cy)
      ctx.restore()
    }

    // Stage 6b: draw commands (display space) — use currentRef to avoid stale React state
    const dl = drawLayerRef.current
    const activStroke = dl.currentRef.current
    for (const cmd of [...dl.commands, ...(activStroke ? [activStroke] : [])]) {
      renderCommand(ctx, scaleCommand(cmd, scale))
    }

    // Stage 7: crop overlay UI (only in crop mode)
    if (modeRef.current === 'crop') {
      const sx = scale.x
      const sy = scale.y
      const cropX = offX + c.x * sx
      const cropY = offY + c.y * sy
      const cropW = c.w * sx
      const cropH = c.h * sy

      ctx.fillStyle = 'rgba(0,0,0,0.45)'
      ctx.fillRect(offX, offY, dispW, cropY - offY)
      ctx.fillRect(offX, cropY + cropH, dispW, offY + dispH - cropY - cropH)
      ctx.fillRect(offX, cropY, cropX - offX, cropH)
      ctx.fillRect(cropX + cropW, cropY, offX + dispW - cropX - cropW, cropH)

      ctx.strokeStyle = 'white'
      ctx.lineWidth = 1.5
      ctx.strokeRect(cropX, cropY, cropW, cropH)

      ctx.strokeStyle = 'rgba(255,255,255,0.25)'
      ctx.lineWidth = 0.5
      for (let i = 1; i <= 2; i++) {
        ctx.beginPath(); ctx.moveTo(cropX + cropW * i / 3, cropY); ctx.lineTo(cropX + cropW * i / 3, cropY + cropH); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(cropX, cropY + cropH * i / 3); ctx.lineTo(cropX + cropW, cropY + cropH * i / 3); ctx.stroke()
      }

      ctx.fillStyle = 'white'
      const hs = HANDLE_SIZE
      for (const [hx, hy] of [
        [cropX - hs / 2, cropY - hs / 2],
        [cropX + cropW - hs / 2, cropY - hs / 2],
        [cropX - hs / 2, cropY + cropH - hs / 2],
        [cropX + cropW - hs / 2, cropY + cropH - hs / 2],
      ]) {
        ctx.beginPath(); ctx.roundRect(hx, hy, hs, hs, 2); ctx.fill()
      }
    }
  }, [])

  // ─── Canvas init ─────────────────────────────────────────────────────────

  const initCanvas = useCallback((img: HTMLImageElement) => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const maxW = container.clientWidth
    const scale = Math.min(
      (maxW - INSET * 2) / img.naturalWidth,
      (window.innerHeight * 0.7 - INSET * 2) / img.naturalHeight
    )
    const dispW = img.naturalWidth * scale
    const dispH = img.naturalHeight * scale
    const canvasW = dispW + INSET * 2
    const canvasH = dispH + INSET * 2

    const dpr = window.devicePixelRatio || 1
    canvas.width = canvasW * dpr
    canvas.height = canvasH * dpr
    canvas.style.width = `${canvasW}px`
    canvas.style.height = `${canvasH}px`
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)
    ctxRef.current = ctx

    scaleRef.current = { x: scale, y: scale, offX: INSET, offY: INSET, dispW, dispH }

    const initial: Rect = { x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight }
    cropRef.current = initial
    setCrop(initial)
    setResize(r => ({ ...r, w: img.naturalWidth, h: img.naturalHeight }))
    draw()
  }, [draw])

  useEffect(() => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { imgRef.current = img; initCanvas(img); setImgLoaded(true) }
    img.src = url
    return () => URL.revokeObjectURL(url)
  }, [file, initCanvas])

  useEffect(() => { draw() }, [crop, adjustments, transform, draw, textLayer.overlays, textLayer.selectedId, mode])
  useEffect(() => { draw() }, [drawLayer.commands, drawLayer.current, draw])

  // ─── Crop interaction ────────────────────────────────────────────────────

  const getHandle = (ex: number, ey: number): CropHandle => {
    const { offX, offY, x: sx, y: sy } = scaleRef.current
    const c = cropRef.current
    const cx = offX + c.x * sx, cy = offY + c.y * sy
    const cw = c.w * sx, ch = c.h * sy
    const hs = HANDLE_SIZE + 4
    const near = (px: number, py: number) => Math.abs(ex - px) < hs && Math.abs(ey - py) < hs
    if (near(cx, cy)) return 'tl'
    if (near(cx + cw, cy)) return 'tr'
    if (near(cx, cy + ch)) return 'bl'
    if (near(cx + cw, cy + ch)) return 'br'
    if (ex > cx && ex < cx + cw && ey > cy && ey < cy + ch) return 'move'
    return null
  }

  const canvasCoords = (e: React.MouseEvent | MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const clampCrop = (r: Rect): Rect => {
    const img = imgRef.current!
    const x = Math.max(0, Math.min(r.x, img.naturalWidth - MIN_SIZE))
    const y = Math.max(0, Math.min(r.y, img.naturalHeight - MIN_SIZE))
    const w = Math.max(MIN_SIZE, Math.min(r.w, img.naturalWidth - x))
    const h = Math.max(MIN_SIZE, Math.min(r.h, img.naturalHeight - y))
    return { x, y, w, h }
  }

  const onMouseDown = (e: React.MouseEvent) => {
    const { x, y } = canvasCoords(e)
    const currentMode = modeRef.current

    if (currentMode === 'crop') {
      const handle = getHandle(x, y)
      if (!handle) return
      dragRef.current = { handle, startX: x, startY: y, origCrop: { ...cropRef.current }, snapshotAtStart: getSnapshot() }
      return
    }
    if (currentMode === 'text') {
      const imgPos = canvasToImage(x, y, scaleRef.current)
      const tl = textLayerRef.current
      const sc = scaleRef.current
      const hit = tl.overlays.find(ov => {
        const { x: cx, y: cy } = imageToCanvas(ov.x, ov.y, sc)
        const displayFontSize = ov.fontSize * sc.x
        const approxW = ov.content.length * displayFontSize * 0.6
        return x >= cx - 4 && x <= cx + approxW + 4 && y >= cy - 4 && y <= cy + displayFontSize + 4
      })
      if (hit) {
        tl.setSelectedId(hit.id)
        textDragRef.current = { id: hit.id, startX: x, startY: y, origX: hit.x, origY: hit.y, snapshotAtStart: getSnapshot() }
      } else {
        history.push(getSnapshot())
        tl.add(imgPos.x, imgPos.y)
      }
      return
    }
    if (currentMode === 'draw') {
      const imgPos = canvasToImage(x, y, scaleRef.current)
      drawLayerRef.current.startStroke(drawToolRef.current, imgPos, drawColorRef.current, drawWidthRef.current)
      isDrawingRef.current = true
    }
  }

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!canvasRef.current) return
      const { x, y } = canvasCoords(e)
      const currentMode = modeRef.current

      if (currentMode === 'crop' && dragRef.current) {
        const { handle, startX, startY, origCrop } = dragRef.current
        const dx = (x - startX) / scaleRef.current.x
        const dy = (y - startY) / scaleRef.current.y
        let { x: cx, y: cy, w: cw, h: ch } = origCrop
        if (handle === 'move') { cx += dx; cy += dy }
        else {
          if (handle === 'tl') { cx += dx; cy += dy; cw -= dx; ch -= dy }
          if (handle === 'tr') { cy += dy; cw += dx; ch -= dy }
          if (handle === 'bl') { cx += dx; cw -= dx; ch += dy }
          if (handle === 'br') { cw += dx; ch += dy }
        }
        setCrop(clampCrop({ x: cx, y: cy, w: cw, h: ch }))
        return
      }
      if (currentMode === 'text' && textDragRef.current) {
        const td = textDragRef.current
        const sc = scaleRef.current
        const dx = (x - td.startX) / sc.x
        const dy = (y - td.startY) / sc.y
        textLayerRef.current.update(td.id, { x: td.origX + dx, y: td.origY + dy })
        return
      }
      if (currentMode === 'draw' && isDrawingRef.current) {
        const imgPos = canvasToImage(x, y, scaleRef.current)
        drawLayerRef.current.continueStroke(imgPos)
        draw()
      }
    }
    const onUp = () => {
      if (dragRef.current) {
        history.push(dragRef.current.snapshotAtStart)
      }
      dragRef.current = null
      if (textDragRef.current) {
        history.push(textDragRef.current.snapshotAtStart)
      }
      textDragRef.current = null
      if (modeRef.current === 'draw' && isDrawingRef.current) {
        isDrawingRef.current = false
        // Push snapshot before the stroke is committed
        history.push(getSnapshot())
        drawLayerRef.current.endStroke()
      }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [draw])

  const getCursor = (e: React.MouseEvent) => {
    const currentMode = modeRef.current
    if (currentMode === 'text') {
      const { x, y } = canvasCoords(e)
      const sc = scaleRef.current
      const hit = textLayerRef.current.overlays.find(ov => {
        const { x: cx, y: cy } = imageToCanvas(ov.x, ov.y, sc)
        const displayFontSize = ov.fontSize * sc.x
        const approxW = ov.content.length * displayFontSize * 0.6
        return x >= cx - 4 && x <= cx + approxW + 4 && y >= cy - 4 && y <= cy + displayFontSize + 4
      })
      return hit ? 'move' : 'text'
    }
    if (currentMode === 'draw') return 'crosshair'
    const { x, y } = canvasCoords(e)
    const handle = getHandle(x, y)
    const map: Record<string, string> = { tl: 'nwse-resize', br: 'nwse-resize', tr: 'nesw-resize', bl: 'nesw-resize', move: 'move' }
    return map[handle ?? ''] ?? 'default'
  }

  // ─── Undo / Redo ─────────────────────────────────────────────────────────

  const applySnapshot = useCallback((snap: EditorSnapshot) => {
    setCrop(snap.crop)
    cropRef.current = snap.crop
    setAdjustments(snap.adjustments)
    setTransform(snap.transform)
    drawLayer.setCommands(snap.drawCommands)
    textLayer.setOverlays(snap.textOverlays)
  }, [drawLayer, textLayer])

  const handleUndo = useCallback(() => {
    const snap = history.undo()
    if (snap) {
      history.pushRedo(getSnapshot())
      applySnapshot(snap)
    }
  }, [history, getSnapshot, applySnapshot])

  const handleRedo = useCallback(() => {
    const snap = history.redo(getSnapshot())
    if (snap) applySnapshot(snap)
  }, [history, getSnapshot, applySnapshot])

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo() }
      if ((e.key === 'z' && e.shiftKey) || e.key === 'y') { e.preventDefault(); handleRedo() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleUndo, handleRedo])

  // Push current snapshot to history without changing state (called at drag start)
  const handlePushHistory = useCallback(() => {
    history.push(getSnapshot())
  }, [history, getSnapshot])

  // Live preview setter — no history push (used during slider drag)
  const handleSetAdjustmentsLive = useCallback((a: Adjustments) => {
    setAdjustments(a)
    adjustmentsRef.current = a
  }, [])

  // History-aware setters for toolbar callbacks (called on commit / discrete action)
  const handleSetAdjustments = useCallback((a: Adjustments) => {
    history.push(getSnapshot())
    setAdjustments(a)
    adjustmentsRef.current = a
  }, [history, getSnapshot])

  const handleSetTransform = useCallback((t: Transform) => {
    history.push(getSnapshot())
    setTransform(t)
  }, [history, getSnapshot])

  const handleDeleteText = useCallback((id: string) => {
    history.push(getSnapshot())
    textLayer.remove(id)
  }, [history, getSnapshot, textLayer])

  const handleUpdateText = useCallback((id: string, patch: Parameters<typeof textLayer.update>[1]) => {
    history.push(getSnapshot())
    textLayer.update(id, patch)
  }, [history, getSnapshot, textLayer])

  // ─── BG Remove ───────────────────────────────────────────────────────────

  const handleBgRemove = async () => {
    const img = imgRef.current
    if (!img) return
    bgRemoveCancelledRef.current = false
    setBgRemoveStatus('loading')
    setBgRemoveProgress(0)
    try {
      const { removeBackground } = await import('@imgly/background-removal')
      const res = await fetch(img.src)
      const inputBlob = await res.blob()
      const resultBlob = await removeBackground(inputBlob, {
        progress: (_key: string, current: number, total: number) => {
          if (bgRemoveCancelledRef.current) return
          setBgRemoveProgress(total > 0 ? Math.round((current / total) * 100) : 0)
        },
      })
      if (bgRemoveCancelledRef.current) return
      const url = URL.createObjectURL(resultBlob)
      const newImg = new Image()
      newImg.onload = () => {
        if (bgRemoveCancelledRef.current) { URL.revokeObjectURL(url); return }
        imgRef.current = newImg
        initCanvas(newImg)
        setBgRemoveStatus('done')
        setBgRemoveProgress(100)
      }
      newImg.src = url
    } catch {
      if (!bgRemoveCancelledRef.current) setBgRemoveStatus('error')
    }
  }

  const handleBgRemoveCancel = () => {
    bgRemoveCancelledRef.current = true
    setBgRemoveStatus('idle')
    setBgRemoveProgress(0)
  }

  // ─── Export ───────────────────────────────────────────────────────────────

  const handleExport = (format: 'png' | 'jpeg' | 'webp', quality: number) => {
    const img = imgRef.current
    if (!img) return
    const c = cropRef.current
    const t = transformRef.current
    const a = adjustmentsRef.current
    const r = resizeRef.current

    const isRotated90 = t.rotation === 90 || t.rotation === 270
    const naturalOutW = isRotated90 ? Math.round(c.h) : Math.round(c.w)
    const naturalOutH = isRotated90 ? Math.round(c.w) : Math.round(c.h)
    const outW = r.enabled ? r.w : naturalOutW
    const outH = r.enabled ? r.h : naturalOutH

    // Stage 1–3: image pipeline at native resolution
    const stage1 = document.createElement('canvas')
    stage1.width = img.naturalWidth
    stage1.height = img.naturalHeight
    const ctx1 = stage1.getContext('2d')!
    ctx1.filter = buildFilter(a)
    ctx1.drawImage(img, 0, 0)
    ctx1.filter = 'none'

    const stage2 = a.blur > 0 ? applyBlur(stage1, a.blur) : stage1
    const stage3 = a.sharpen > 0 ? applySharpen(stage2, a.sharpen) : stage2

    // Stage 4: crop + rotate + flip + resize
    const out = document.createElement('canvas')
    out.width = outW
    out.height = outH
    const ctx = out.getContext('2d')!
    ctx.translate(outW / 2, outH / 2)
    ctx.rotate((t.rotation * Math.PI) / 180)
    ctx.scale(t.flipH ? -1 : 1, t.flipV ? -1 : 1)
    if (isRotated90) {
      ctx.drawImage(stage3, c.x, c.y, c.w, c.h, -outH / 2, -outW / 2, c.w, c.h)
    } else {
      ctx.drawImage(stage3, c.x, c.y, c.w, c.h, -outW / 2, -outH / 2, outW, outH)
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0)

    // Vignette
    applyVignette(ctx, 0, 0, outW, outH, a.vignette)

    // Stage 6: text overlays
    const tl = textLayerRef.current
    for (const ov of tl.overlays) {
      ctx.save()
      ctx.font = `${ov.fontSize}px ${ov.fontFamily}`
      ctx.fillStyle = ov.color
      ctx.textBaseline = 'top'
      const scaleX = outW / naturalOutW
      const scaleY = outH / naturalOutH
      ctx.fillText(ov.content, (ov.x - c.x) * scaleX, (ov.y - c.y) * scaleY)
      ctx.restore()
    }

    // Stage 7: draw commands
    const dl = drawLayerRef.current
    const exportScale: ScaleInfo = { x: outW / naturalOutW, y: outH / naturalOutH, offX: 0, offY: 0, dispW: outW, dispH: outH }
    for (const cmd of dl.commands) {
      renderCommand(ctx, scaleCommand(translateCommand(cmd, -c.x, -c.y), exportScale))
    }

    const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png'
    out.toBlob(blob => {
      if (!blob) return
      const fileName = file.name.replace(/\.[^.]+$/, `-edited.${format === 'jpeg' ? 'jpg' : format}`)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = fileName; a.click()
      URL.revokeObjectURL(url)
    }, mimeType, quality / 100)
  }

  const exportW = resize.enabled ? resize.w : Math.round(crop.w)
  const exportH = resize.enabled ? resize.h : Math.round(crop.h)

  return (
    <div className="flex gap-4 items-start">
      {/* Left: canvas + bottom panel */}
      <div className="min-w-0 space-y-3" style={{ width: 'calc(100% - 272px)' }}>
        <div ref={containerRef} className="w-full rounded-2xl overflow-hidden border border-border bg-secondary/20">
          <canvas
            ref={canvasRef}
            className="block"
            onMouseDown={onMouseDown}
            onMouseMove={e => { if (canvasRef.current) canvasRef.current.style.cursor = getCursor(e) }}
          />
        </div>

        {imgLoaded && (
          <BottomPanel
            adjustments={adjustments}
            onAdjustments={handleSetAdjustmentsLive}
            onAdjustmentsCommit={handleSetAdjustments}
            onHistoryPush={handlePushHistory}
            bgRemoveStatus={bgRemoveStatus}
            bgRemoveProgress={bgRemoveProgress}
            onBgRemove={handleBgRemove}
            onBgRemoveCancel={handleBgRemoveCancel}
          />
        )}

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {exportW} × {exportH} px
            {resize.enabled && <span className="text-primary ml-1.5">(resized)</span>}
          </p>
          <Button variant="outline" className="gap-2" onClick={onReset}>
            <RotateCcw className="size-4" />
            New Image
          </Button>
        </div>
      </div>

      {/* Right: spatial tools */}
      {imgLoaded && (
        <div className="w-64 shrink-0 space-y-3">
          <SideToolbar
            adjustments={adjustments}
            transform={transform}
            resize={resize}
            naturalW={imgRef.current?.naturalWidth ?? 0}
            naturalH={imgRef.current?.naturalHeight ?? 0}
            mode={mode}
            textOverlays={textLayer.overlays}
            selectedTextId={textLayer.selectedId}
            drawTool={drawTool}
            drawColor={drawColor}
            drawWidth={drawWidth}
            onAdjustments={handleSetAdjustments}
            onAdjustmentsLive={handleSetAdjustmentsLive}
            onHistoryPush={handlePushHistory}
            onTransform={handleSetTransform}
            onResize={setResize}
            onMode={setMode}
            onSelectText={textLayer.setSelectedId}
            onUpdateText={handleUpdateText}
            onDeleteText={handleDeleteText}
            onDrawTool={setDrawTool}
            onDrawColor={setDrawColor}
            onDrawWidth={setDrawWidth}
          />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={handleUndo} disabled={!history.canUndo} title="Undo (⌘Z)">
              <Undo2 className="size-3.5" /> Undo
            </Button>
            <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={handleRedo} disabled={!history.canRedo} title="Redo (⌘⇧Z)">
              <Redo2 className="size-3.5" /> Redo
            </Button>
            <ExportDialog onExport={handleExport} iconOnly />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Draw command coordinate helpers ─────────────────────────────────────

function translatePoint(p: Point, dx: number, dy: number): Point {
  return { x: p.x + dx, y: p.y + dy }
}

function translateCommand(cmd: DrawCommand, dx: number, dy: number): DrawCommand {
  if (cmd.type === 'path') return { ...cmd, points: cmd.points.map(p => translatePoint(p, dx, dy)) }
  if (cmd.type === 'arrow') return { ...cmd, from: translatePoint(cmd.from, dx, dy), to: translatePoint(cmd.to, dx, dy) }
  return { ...cmd, x: cmd.x + dx, y: cmd.y + dy }
}

function scaleCommand(cmd: DrawCommand, scale: ScaleInfo): DrawCommand {
  const sp = (p: Point) => imageToCanvas(p.x, p.y, scale)
  if (cmd.type === 'path') return { ...cmd, points: cmd.points.map(sp), width: cmd.width * scale.x }
  if (cmd.type === 'arrow') return { ...cmd, from: sp(cmd.from), to: sp(cmd.to), width: cmd.width * scale.x }
  const origin = sp({ x: cmd.x, y: cmd.y })
  return { ...cmd, x: origin.x, y: origin.y, w: cmd.w * scale.x, h: cmd.h * scale.y, width: cmd.width * scale.x }
}
