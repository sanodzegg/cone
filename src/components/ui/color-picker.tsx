import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { HexAlphaColorPicker } from 'react-colorful'
import { cn } from '@/lib/utils'

const PRESETS = [
    '#000000', '#ffffff', '#ef4444', '#f97316',
    '#eab308', '#22c55e', '#3b82f6', '#8b5cf6',
    '#ec4899', '#14b8a6', '#f59e0b', '#6366f1',
]

function hexToRgba(hex: string): { r: number; g: number; b: number; a: number } {
    const full = hex.replace('#', '')
    const len = full.length
    let r = 0, g = 0, b = 0, a = 255
    if (len === 3 || len === 4) {
        r = parseInt(full[0] + full[0], 16)
        g = parseInt(full[1] + full[1], 16)
        b = parseInt(full[2] + full[2], 16)
        if (len === 4) a = parseInt(full[3] + full[3], 16)
    } else if (len === 6 || len === 8) {
        r = parseInt(full.slice(0, 2), 16)
        g = parseInt(full.slice(2, 4), 16)
        b = parseInt(full.slice(4, 6), 16)
        if (len === 8) a = parseInt(full.slice(6, 8), 16)
    }
    return { r, g, b, a }
}

function rgbaToHex(r: number, g: number, b: number, a: number): string {
    const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
    return `#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(a)}`
}

export interface ColorPickerProps {
    value: string
    onChange: (color: string) => void
    className?: string
}

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
    const [open, setOpen] = useState(false)
    const [pos, setPos] = useState({ top: 0, left: 0 })
    const [hexInput, setHexInput] = useState(value.slice(0, 7))
    const [alphaInput, setAlphaInput] = useState(() => {
        const { a } = hexToRgba(value)
        return Math.round((a / 255) * 100).toString()
    })
    const popoverRef = useRef<HTMLDivElement>(null)
    const triggerRef = useRef<HTMLButtonElement>(null)

    useEffect(() => {
        setHexInput(value.slice(0, 7))
        const { a } = hexToRgba(value)
        setAlphaInput(Math.round((a / 255) * 100).toString())
    }, [value])

    useEffect(() => {
        if (!open) return
        function handleClick(e: MouseEvent) {
            if (
                popoverRef.current &&
                !popoverRef.current.contains(e.target as Node) &&
                !triggerRef.current?.contains(e.target as Node)
            ) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [open])

    const handleOpen = () => {
        if (!triggerRef.current) return
        const rect = triggerRef.current.getBoundingClientRect()
        setPos({ top: rect.bottom + 8, left: rect.left })
        setOpen(v => !v)
    }

    const handleHexInput = useCallback((raw: string) => {
        setHexInput(raw)
        const hex = raw.startsWith('#') ? raw : `#${raw}`
        if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
            const { a } = hexToRgba(value)
            const aHex = Math.round((a / 255) * 255).toString(16).padStart(2, '0')
            onChange(`${hex}${aHex}`)
        }
    }, [value, onChange])

    const handleAlphaInput = useCallback((raw: string) => {
        setAlphaInput(raw)
        const num = parseInt(raw)
        if (!isNaN(num) && num >= 0 && num <= 100) {
            const { r, g, b } = hexToRgba(value)
            const a = Math.round((num / 100) * 255)
            onChange(rgbaToHex(r, g, b, a))
        }
    }, [value, onChange])

    const { a } = hexToRgba(value)
    const opacity = a / 255

    return (
        <div className={cn('relative inline-block', className)}>
            <button
                ref={triggerRef}
                onClick={handleOpen}
                className="size-7 rounded-md border border-border shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{
                    background: `linear-gradient(${value}, ${value}),
                        repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 0 0 / 6px 6px`
                }}
            />

            {open && createPortal(
                <div
                    ref={popoverRef}
                    className="fixed z-9999 w-56 rounded-xl border border-border bg-popover shadow-lg p-3 flex flex-col gap-3"
                    data-color-picker
                    style={{ top: pos.top, left: pos.left }}
                >
                    <HexAlphaColorPicker
                        color={value}
                        onChange={onChange}
                        style={{ width: '100%', height: '160px' }}
                    />

                    <div className="flex gap-2">
                        <div className="flex flex-col gap-1 flex-1">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Hex</span>
                            <input
                                value={hexInput}
                                onChange={e => handleHexInput(e.target.value)}
                                className="h-7 w-full rounded-md border border-input bg-transparent px-2 text-xs font-mono outline-none focus-visible:border-ring"
                                maxLength={7}
                                spellCheck={false}
                            />
                        </div>
                        <div className="flex flex-col gap-1 w-14">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Alpha</span>
                            <div className="relative">
                                <input
                                    value={alphaInput}
                                    onChange={e => handleAlphaInput(e.target.value)}
                                    className="h-7 w-full rounded-md border border-input bg-transparent px-2 pr-5 text-xs font-mono outline-none focus-visible:border-ring"
                                    maxLength={3}
                                />
                                <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-1">
                        {(['R', 'G', 'B', 'A'] as const).map((ch) => {
                            const { r, g, b } = hexToRgba(value)
                            const vals: Record<string, number> = { R: r, G: g, B: b, A: Math.round(opacity * 100) }
                            return (
                                <div key={ch} className="flex-1 flex flex-col items-center gap-0.5">
                                    <span className="text-[10px] text-muted-foreground">{ch}</span>
                                    <span className="text-xs tabular-nums">{vals[ch]}</span>
                                </div>
                            )
                        })}
                    </div>

                    <div className="grid grid-cols-6 gap-1.5">
                        {PRESETS.map(preset => (
                            <button
                                key={preset}
                                onClick={() => onChange(preset + 'ff')}
                                className="size-6 rounded-md border border-border hover:scale-110 transition-transform focus:outline-none"
                                style={{ background: preset }}
                            />
                        ))}
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}
