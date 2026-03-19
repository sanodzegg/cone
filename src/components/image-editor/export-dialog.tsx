import { useState } from 'react'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '../ui/button'
import { Slider } from '../ui/slider'
import { Download } from 'lucide-react'

const FORMATS = ['png', 'jpeg', 'webp'] as const
type Format = typeof FORMATS[number]

interface Props {
    onExport: (format: Format, quality: number) => void
}

export default function ExportDialog({ onExport }: Props) {
    const [format, setFormat] = useState<Format>('png')
    const [quality, setQuality] = useState(90)
    const isLossy = format !== 'png'

    return (
        <Dialog>
            <DialogTrigger render={
                <Button className="gap-2">
                    <Download className="size-4" />
                    Export
                </Button>
            } />
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="font-body">Export Image</DialogTitle>
                </DialogHeader>

                <div className="space-y-5">
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-primary">Format</p>
                        <div className="flex gap-2">
                            {FORMATS.map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFormat(f)}
                                    className={`flex-1 rounded-xl border py-2 text-xs font-medium uppercase transition-colors cursor-pointer ${
                                        format === f
                                            ? 'border-primary bg-primary text-primary-foreground'
                                            : 'border-accent bg-secondary/30 text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>

                    {isLossy && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-primary">Quality</p>
                                <span className="text-sm font-medium text-primary">{quality}%</span>
                            </div>
                            <Slider
                                min={1} max={100} step={1}
                                value={[quality]}
                                onValueChange={v => setQuality(Array.isArray(v) ? v[0] : v)}
                            />
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <DialogClose render={<Button variant="outline">Cancel</Button>} />
                    <DialogClose render={
                        <Button onClick={() => onExport(format, quality)} className="gap-2">
                            <Download className="size-4" />
                            Download
                        </Button>
                    } />
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
