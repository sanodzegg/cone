import { useRef, useState, useEffect, useCallback } from 'react'
import { Button } from '../ui/button'
import { RotateCcw } from 'lucide-react'
import EditorToolbar, {
    type Adjustments, type Transform,
    DEFAULT_ADJUSTMENTS, DEFAULT_TRANSFORM,
} from './editor-toolbar'
import ExportDialog from './export-dialog'

interface Rect { x: number; y: number; w: number; h: number }
type Handle = 'tl' | 'tr' | 'bl' | 'br' | 'move' | null

const MIN_SIZE = 20
const HANDLE_SIZE = 10
const INSET = 12

interface Props {
    file: File
    onReset: () => void
}

export default function CropEditor({ file, onReset }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const imgRef = useRef<HTMLImageElement | null>(null)
    const scaleRef = useRef({ x: 1, y: 1, offX: 0, offY: 0, dispW: 0, dispH: 0 })

    const [crop, setCrop] = useState<Rect>({ x: 0, y: 0, w: 0, h: 0 })
    const cropRef = useRef<Rect>({ x: 0, y: 0, w: 0, h: 0 })
    const dragRef = useRef<{ handle: Handle; startX: number; startY: number; origCrop: Rect } | null>(null)

    const [imgLoaded, setImgLoaded] = useState(false)
    const [adjustments, setAdjustments] = useState<Adjustments>(DEFAULT_ADJUSTMENTS)
    const [transform, setTransform] = useState<Transform>(DEFAULT_TRANSFORM)
    const adjustmentsRef = useRef(adjustments)
    const transformRef = useRef(transform)

    useEffect(() => { cropRef.current = crop }, [crop])
    useEffect(() => { adjustmentsRef.current = adjustments }, [adjustments])
    useEffect(() => { transformRef.current = transform }, [transform])

    // Build CSS filter string from adjustments
    const buildFilter = (a: Adjustments) => {
        const exp = a.exposure >= 0
            ? `brightness(${1 + a.exposure / 100})`
            : `brightness(${1 + a.exposure / 200})`
        return `brightness(${a.brightness}%) contrast(${a.contrast}%) saturate(${a.saturation}%) ${exp}`
    }

    const draw = useCallback(() => {
        const canvas = canvasRef.current
        const img = imgRef.current
        if (!canvas || !img) return
        const ctx = canvas.getContext('2d')!
        const { offX, offY, dispW, dispH, x: sx, y: sy } = scaleRef.current
        const c = cropRef.current
        const a = adjustmentsRef.current
        const t = transformRef.current

        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // Apply adjustments via filter
        ctx.save()
        ctx.filter = buildFilter(a)

        // Apply rotation + flip around image center
        const cx_img = offX + dispW / 2
        const cy_img = offY + dispH / 2
        ctx.translate(cx_img, cy_img)
        ctx.rotate((t.rotation * Math.PI) / 180)
        ctx.scale(t.flipH ? -1 : 1, t.flipV ? -1 : 1)
        ctx.translate(-cx_img, -cy_img)

        ctx.drawImage(img, offX, offY, dispW, dispH)
        ctx.restore()

        // Overlay
        const cropX = offX + c.x * sx
        const cropY = offY + c.y * sy
        const cropW = c.w * sx
        const cropH = c.h * sy

        ctx.fillStyle = 'rgba(0,0,0,0.5)'
        ctx.fillRect(offX, offY, dispW, cropY - offY)
        ctx.fillRect(offX, cropY + cropH, dispW, offY + dispH - cropY - cropH)
        ctx.fillRect(offX, cropY, cropX - offX, cropH)
        ctx.fillRect(cropX + cropW, cropY, offX + dispW - cropX - cropW, cropH)

        // Border
        ctx.strokeStyle = 'white'
        ctx.lineWidth = 1.5
        ctx.strokeRect(cropX, cropY, cropW, cropH)

        // Rule of thirds
        ctx.strokeStyle = 'rgba(255,255,255,0.25)'
        ctx.lineWidth = 0.5
        for (let i = 1; i <= 2; i++) {
            ctx.beginPath(); ctx.moveTo(cropX + cropW * i / 3, cropY); ctx.lineTo(cropX + cropW * i / 3, cropY + cropH); ctx.stroke()
            ctx.beginPath(); ctx.moveTo(cropX, cropY + cropH * i / 3); ctx.lineTo(cropX + cropW, cropY + cropH * i / 3); ctx.stroke()
        }

        // Corner handles
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
    }, [])

    const initCanvas = useCallback((img: HTMLImageElement) => {
        const canvas = canvasRef.current
        const container = containerRef.current
        if (!canvas || !container) return

        const dpr = window.devicePixelRatio || 1
        const maxW = container.clientWidth
        const scale = Math.min((maxW - INSET * 2) / img.naturalWidth, (window.innerHeight * 0.7 - INSET * 2) / img.naturalHeight)
        const dispW = img.naturalWidth * scale
        const dispH = img.naturalHeight * scale
        const canvasW = dispW + INSET * 2
        const canvasH = dispH + INSET * 2
        canvas.width = canvasW * dpr
        canvas.height = canvasH * dpr
        canvas.style.width = `${canvasW}px`
        canvas.style.height = `${canvasH}px`
        canvas.getContext('2d')!.scale(dpr, dpr)

        const offX = INSET
        const offY = INSET
        scaleRef.current = { x: scale, y: scale, offX, offY, dispW, dispH }

        const initial: Rect = { x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight }
        cropRef.current = initial
        setCrop(initial)
        draw()
    }, [draw])

    useEffect(() => {
        const url = URL.createObjectURL(file)
        const img = new Image()
        img.onload = () => { imgRef.current = img; initCanvas(img); setImgLoaded(true) }
        img.src = url
        return () => URL.revokeObjectURL(url)
    }, [file, initCanvas])

    useEffect(() => { draw() }, [crop, adjustments, transform, draw])

    // --- Crop interaction ---
    const getHandle = (ex: number, ey: number): Handle => {
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
        const handle = getHandle(x, y)
        if (!handle) return
        dragRef.current = { handle, startX: x, startY: y, origCrop: { ...cropRef.current } }
    }

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!dragRef.current || !canvasRef.current) return
            const { x, y } = canvasCoords(e)
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
        }
        const onUp = () => { dragRef.current = null }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    }, [])

    const getCursor = (e: React.MouseEvent) => {
        const { x, y } = canvasCoords(e)
        const handle = getHandle(x, y)
        const map: Record<string, string> = { tl: 'nwse-resize', br: 'nwse-resize', tr: 'nesw-resize', bl: 'nesw-resize', move: 'move' }
        return map[handle ?? ''] ?? 'default'
    }

    // --- Export ---
    const handleExport = (format: 'png' | 'jpeg' | 'webp', quality: number) => {
        const img = imgRef.current
        if (!img) return
        const c = cropRef.current
        const t = transformRef.current
        const a = adjustmentsRef.current

        // Determine output dimensions accounting for rotation
        const isRotated90 = t.rotation === 90 || t.rotation === 270
        const outW = isRotated90 ? Math.round(c.h) : Math.round(c.w)
        const outH = isRotated90 ? Math.round(c.w) : Math.round(c.h)

        const out = document.createElement('canvas')
        out.width = outW
        out.height = outH
        const ctx = out.getContext('2d')!

        ctx.filter = buildFilter(a)
        ctx.translate(outW / 2, outH / 2)
        ctx.rotate((t.rotation * Math.PI) / 180)
        ctx.scale(t.flipH ? -1 : 1, t.flipV ? -1 : 1)
        // After rotation the crop region maps differently
        if (isRotated90) {
            ctx.drawImage(img, c.x, c.y, c.w, c.h, -outH / 2, -outW / 2, c.w, c.h)
        } else {
            ctx.drawImage(img, c.x, c.y, c.w, c.h, -outW / 2, -outH / 2, outW, outH)
        }

        const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png'
        out.toBlob(blob => {
            if (!blob) return
            const name = file.name.replace(/\.[^.]+$/, `-edited.${format === 'jpeg' ? 'jpg' : format}`)
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url; a.download = name; a.click()
            URL.revokeObjectURL(url)
        }, mimeType, quality / 100)
    }

    return (
        <div className="flex gap-4 items-start">
            {/* Canvas */}
            <div className="min-w-0 space-y-3" style={{ width: 'calc(100% - 240px)' }}>
                <div ref={containerRef} className="w-full rounded-2xl overflow-hidden border border-border bg-secondary/20">
                    <canvas
                        ref={canvasRef}
                        className="w-full block"
                        onMouseDown={onMouseDown}
                        onMouseMove={e => { if (canvasRef.current) canvasRef.current.style.cursor = getCursor(e) }}
                    />
                </div>
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        {Math.round(crop.w)} × {Math.round(crop.h)} px
                    </p>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" className="gap-2" onClick={onReset}>
                            <RotateCcw className="size-4" />
                            New Image
                        </Button>
                        <ExportDialog onExport={handleExport} />
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            {imgLoaded && (
                <div className="w-56 shrink-0">
                    <EditorToolbar
                        adjustments={adjustments}
                        transform={transform}
                        onAdjustments={setAdjustments}
                        onTransform={setTransform}
                        onResetAdjustments={() => setAdjustments(DEFAULT_ADJUSTMENTS)}
                    />
                </div>
            )}
        </div>
    )
}
