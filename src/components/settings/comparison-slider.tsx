import { useRef, useState, useCallback, useEffect } from 'react'
import presentationImg from '@/assets/presentation.jpg'
import presentationImgLight from '@/assets/presentation-light.jpg'
import { useTheme } from '../theme/theme-provider'

interface Props {
  quality: number
}

export default function ComparisonSlider({ quality }: Props) {
  const [loaded, setLoaded] = useState(false)
  const [compressedSrc, setCompressedSrc] = useState<string | null>(null)
  const [encoding, setEncoding] = useState(false)
  const [position, setPosition] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)
  const sourceBufferRef = useRef<ArrayBuffer | null>(null)
  const dragging = useRef(false)

  const { theme } = useTheme()
  const presentationImage = theme === 'dark' ? presentationImg : presentationImgLight

  async function encode(buffer: ArrayBuffer, q: number) {
    setEncoding(true)
    try {
      const result = await window.electron.convert(buffer, 'jpeg', q)
      const blob = new Blob([result.buffer as ArrayBuffer], { type: 'image/jpeg' })
      const url = URL.createObjectURL(blob)
      setCompressedSrc(prev => {
        if (prev) URL.revokeObjectURL(prev)
        return url
      })
    } catch (e) {
      console.error('[ComparisonSlider] encode failed:', e)
    } finally {
      setEncoding(false)
    }
  }

  useEffect(() => {
    if (!sourceBufferRef.current) return
    const timer = setTimeout(() => encode(sourceBufferRef.current!, quality), 300)
    return () => clearTimeout(timer)
  }, [quality])

  async function onImgLoad({ currentTarget }: React.SyntheticEvent<HTMLImageElement>) {
    setLoaded(true)
    try {
      const res = await fetch(currentTarget.src)
      const buffer = await res.arrayBuffer()
      sourceBufferRef.current = buffer
      await encode(buffer, quality)
    } catch (e) {
      console.error('[ComparisonSlider] fetch failed:', e)
    }
  }

  const updatePosition = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setPosition(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)))
  }, [])

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true
    e.preventDefault()
    const onMove = (e: MouseEvent) => { if (dragging.current) updatePosition(e.clientX) }
    const onUp = () => {
      dragging.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const onTouchStart = (e: React.TouchEvent) => {
    const onMove = (e: TouchEvent) => updatePosition(e.touches[0].clientX)
    const onEnd = () => {
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }
    window.addEventListener('touchmove', onMove)
    window.addEventListener('touchend', onEnd)
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-xl overflow-hidden select-none cursor-col-resize"
      style={{ aspectRatio: '16/7' }}
      onMouseDown={onMouseDown}
    >
      {/* Compressed (right side) — blurred while encoding, blurred original as placeholder before first encode */}
      {compressedSrc ? (
        <img
          src={compressedSrc}
          alt="compressed"
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover transition-[filter] duration-300"
          style={{ filter: encoding ? 'blur(6px)' : 'none' }}
        />
      ) : (
        <img
          src={presentationImage}
          alt="placeholder"
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: 'blur(12px)', transform: 'scale(1.05)' }}
        />
      )}

      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
        <img
          src={presentationImage}
          alt="original"
          draggable={false}
          onLoad={onImgLoad}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
          style={{ opacity: loaded ? 1 : 0 }}
        />
      </div>

      {loaded && (
        <div
          className="absolute top-0 bottom-0 w-8 2xl:w-10 -translate-x-1/2 flex items-center justify-center cursor-col-resize"
          style={{ left: `${position}%` }}
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
        >
          <div className="w-px h-full bg-white/70 shadow-[0_0_6px_rgba(0,0,0,0.5)]" />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-8 h-8 2xl:w-10 2xl:h-10 rounded-full bg-white shadow-lg flex items-center justify-center cursor-col-resize"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="2xl:scale-125">
              <path d="M5 4L2 8L5 12" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M11 4L14 8L11 12" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      )}

      {loaded && (
        <>
          <span className="absolute bottom-2 left-3 text-[10px] 2xl:text-xs font-semibold text-white/90 bg-black/40 px-1.5 2xl:px-2 py-0.5 rounded pointer-events-none">Original</span>
          <span className="absolute bottom-2 right-3 text-[10px] 2xl:text-xs font-semibold text-white/90 bg-black/40 px-1.5 2xl:px-2 py-0.5 rounded pointer-events-none">Quality {quality}%</span>
        </>
      )}
    </div>
  )
}
