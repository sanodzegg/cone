import { Button } from '../ui/button'
import { Slider } from '../ui/slider'
import { FlipHorizontal, FlipVertical, RotateCcw, RotateCw } from 'lucide-react'

export interface Adjustments {
    brightness: number   // 0–200, 100 = neutral
    contrast: number     // 0–200, 100 = neutral
    saturation: number   // 0–200, 100 = neutral
    exposure: number     // -100–100, 0 = neutral
}

export interface Transform {
    rotation: number     // 0, 90, 180, 270
    flipH: boolean
    flipV: boolean
}

export const DEFAULT_ADJUSTMENTS: Adjustments = {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    exposure: 0,
}

export const DEFAULT_TRANSFORM: Transform = {
    rotation: 0,
    flipH: false,
    flipV: false,
}

interface SliderRowProps {
    label: string
    value: number
    min: number
    max: number
    neutral: number
    onChange: (v: number) => void
}

function SliderRow({ label, value, min, max, neutral, onChange }: SliderRowProps) {
    const isChanged = value !== neutral
    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between">
                <span className={`text-xs font-medium ${isChanged ? 'text-primary' : 'text-muted-foreground'}`}>{label}</span>
                <span className={`text-xs tabular-nums ${isChanged ? 'text-primary' : 'text-muted-foreground'}`}>
                    {value > neutral ? `+${value - neutral}` : value - neutral}
                </span>
            </div>
            <Slider
                min={min}
                max={max}
                step={1}
                value={[value]}
                onValueChange={v => onChange(Array.isArray(v) ? v[0] : v)}
            />
        </div>
    )
}

interface Props {
    adjustments: Adjustments
    transform: Transform
    onAdjustments: (a: Adjustments) => void
    onTransform: (t: Transform) => void
    onResetAdjustments: () => void
}

export default function EditorToolbar({ adjustments, transform, onAdjustments, onTransform, onResetAdjustments }: Props) {
    const set = (key: keyof Adjustments) => (v: number) =>
        onAdjustments({ ...adjustments, [key]: v })

    const rotateLeft = () =>
        onTransform({ ...transform, rotation: (transform.rotation - 90 + 360) % 360 })

    const rotateRight = () =>
        onTransform({ ...transform, rotation: (transform.rotation + 90) % 360 })

    const isAdjusted = JSON.stringify(adjustments) !== JSON.stringify(DEFAULT_ADJUSTMENTS)

    return (
        <div className="rounded-2xl border border-border bg-secondary/20 p-4 space-y-5">
            {/* Transform */}
            <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Transform</p>
                <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={rotateLeft}>
                        <RotateCcw className="size-3.5" /> CCW
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={rotateRight}>
                        <RotateCw className="size-3.5" /> CW
                    </Button>
                    <Button
                        variant={transform.flipH ? 'default' : 'outline'}
                        size="sm"
                        className="gap-1.5"
                        onClick={() => onTransform({ ...transform, flipH: !transform.flipH })}
                    >
                        <FlipHorizontal className="size-3.5" /> Flip H
                    </Button>
                    <Button
                        variant={transform.flipV ? 'default' : 'outline'}
                        size="sm"
                        className="gap-1.5"
                        onClick={() => onTransform({ ...transform, flipV: !transform.flipV })}
                    >
                        <FlipVertical className="size-3.5" /> Flip V
                    </Button>
                </div>
            </div>

            {/* Adjustments */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">Adjustments</p>
                    {isAdjusted && (
                        <button onClick={onResetAdjustments} className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2">
                            Reset
                        </button>
                    )}
                </div>
                <SliderRow label="Brightness" value={adjustments.brightness} min={0} max={200} neutral={100} onChange={set('brightness')} />
                <SliderRow label="Contrast"   value={adjustments.contrast}   min={0} max={200} neutral={100} onChange={set('contrast')} />
                <SliderRow label="Saturation" value={adjustments.saturation} min={0} max={200} neutral={100} onChange={set('saturation')} />
                <SliderRow label="Exposure"   value={adjustments.exposure}   min={-100} max={100} neutral={0} onChange={set('exposure')} />
            </div>
        </div>
    )
}
