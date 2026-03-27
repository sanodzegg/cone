import { useState } from "react"
import { useConvertStore } from "@/store/useConvertStore"
import { fileKey } from "@/utils/fileUtils"
import { getEngineForFile } from "@/engines/engineRegistry"
import type { FitMode } from "@/types"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Settings } from "lucide-react"

const FIT_OPTIONS: { value: FitMode; label: string; description: string }[] = [
    { value: 'max', label: 'Max', description: 'Fit within dimensions, never upscale' },
    { value: 'crop', label: 'Crop', description: 'Fill dimensions, crop excess' },
    { value: 'scale', label: 'Scale', description: 'Force exact dimensions' },
]

export default function FileSettingsDialog({ file }: { file: File }) {
    const key = fileKey(file)
    const fileSettings = useConvertStore(s => s.fileSettings[key])
    const imageQuality = useConvertStore(s => s.imageQuality)
    const setFileSettings = useConvertStore(s => s.setFileSettings)

    const engineId = getEngineForFile(file)?.id
    const isImage = engineId === 'image'
    const isVideo = engineId === 'video'

    const [width, setWidth] = useState<string>(fileSettings?.width?.toString() ?? '')
    const [height, setHeight] = useState<string>(fileSettings?.height?.toString() ?? '')
    const [fit, setFit] = useState<FitMode>(fileSettings?.fit ?? 'max')
    const [keepMetadata, setKeepMetadata] = useState<boolean>(fileSettings?.keepMetadata ?? true)
    const [quality, setQuality] = useState<number>(fileSettings?.quality ?? imageQuality)

    const syncFromStore = () => {
        setWidth(fileSettings?.width?.toString() ?? '')
        setHeight(fileSettings?.height?.toString() ?? '')
        setFit(fileSettings?.fit ?? 'max')
        setKeepMetadata(fileSettings?.keepMetadata ?? true)
        setQuality(fileSettings?.quality ?? imageQuality)
    }

    const handleSave = () => {
        setFileSettings(file, {
            ...(isImage || isVideo ? {
                width: width ? parseInt(width) : undefined,
                height: height ? parseInt(height) : undefined,
                fit: (width || height) ? fit : undefined,
            } : {}),
            ...(isImage ? {
                keepMetadata: keepMetadata !== true ? keepMetadata : undefined,
                quality: quality !== imageQuality ? quality : undefined,
            } : {}),
        })
    }

    const hasSettings = isImage || isVideo
    const isCustomized = !!(
        fileSettings?.width ||
        fileSettings?.height ||
        (fileSettings?.quality !== undefined && fileSettings.quality !== imageQuality) ||
        fileSettings?.keepMetadata === false
    )

    if (!hasSettings) {
        return (
            <Button variant="secondary" className="group p-2.5! h-full!" disabled>
                <Settings className="group-hover:animate-spin-once size-5" />
            </Button>
        )
    }

    return (
        <Dialog onOpenChange={open => { if (open) syncFromStore() }}>
            <DialogTrigger
                render={
                    <Button variant="secondary" className="group p-2.5! h-full!">
                        <Settings className={`group-hover:animate-spin-once size-5 ${isCustomized ? 'text-yellow-500' : ''}`} />
                    </Button>
                }
            />
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className={'font-body'}>File Settings</DialogTitle>
                </DialogHeader>

                <div className="space-y-5">
                    {/* Resize — image + video */}
                    {(isImage || isVideo) && (
                        <>
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-primary">Resize</p>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <label className="text-xs text-muted-foreground mb-1 block">Width (px)</label>
                                        <Input
                                            type="number"
                                            placeholder="Auto"
                                            value={width}
                                            onChange={e => setWidth(e.target.value)}
                                            min={1}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-xs text-muted-foreground mb-1 block">Height (px)</label>
                                        <Input
                                            type="number"
                                            placeholder="Auto"
                                            value={height}
                                            onChange={e => setHeight(e.target.value)}
                                            min={1}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className={`space-y-2 ${!width && !height ? 'opacity-40 pointer-events-none' : ''}`}>
                                <p className="text-sm font-medium text-primary">Fit</p>
                                <div className="flex gap-2">
                                    {FIT_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setFit(opt.value)}
                                            title={opt.description}
                                            className={`flex-1 rounded-xl border py-2 text-xs font-medium transition-colors cursor-pointer ${
                                                fit === opt.value
                                                    ? 'border-primary bg-primary text-primary-foreground'
                                                    : 'border-accent bg-secondary/30 text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {FIT_OPTIONS.find(o => o.value === fit)?.description}
                                </p>
                            </div>
                        </>
                    )}

                    {/* Quality — image only */}
                    {isImage && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-primary">Quality</p>
                                <span className="text-sm font-medium text-primary">{quality}%</span>
                            </div>
                            <Slider
                                min={1}
                                max={100}
                                step={1}
                                value={[quality]}
                                onValueChange={v => setQuality(Array.isArray(v) ? v[0] : v)}
                                className="w-full"
                            />
                        </div>
                    )}

                    {/* Keep Metadata — image only */}
                    {isImage && (
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-primary">Keep Metadata</p>
                                <p className="text-xs text-muted-foreground">Preserve EXIF, ICC profiles, etc.</p>
                            </div>
                            <button
                                role="checkbox"
                                aria-checked={keepMetadata}
                                onClick={() => setKeepMetadata(v => !v)}
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                                    keepMetadata ? 'bg-primary' : 'bg-accent'
                                }`}
                            >
                                <span
                                    className={`pointer-events-none inline-block size-5 rounded-full bg-white shadow-lg transition-transform ${
                                        keepMetadata ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                />
                            </button>
                        </div>
                    )}

                </div>

                <DialogFooter>
                    <DialogClose render={<Button variant="outline">Cancel</Button>} />
                    <DialogClose render={<Button onClick={handleSave}>Save</Button>} />
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
