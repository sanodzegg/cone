import { Button } from "../ui/button"
import { Download } from "lucide-react"
import JSZip from "jszip"
import icnsReadme from "./icns-readme.txt?raw"

const FAVICON_SIZES = [16, 32, 48, 64, 128, 256, 512, 1024]

export interface FaviconResult {
    ico: ArrayBuffer
    pngs: { size: number; buf: ArrayBuffer }[]
}

interface Props {
    result: FaviconResult
    sourceFile: File
    onReset: () => void
}

function downloadBlob(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
}

export default function FaviconResults({ result, sourceFile, onReset }: Props) {
    const baseName = sourceFile.name.replace(/\.[^.]+$/, '')

    const downloadIco = () => {
        downloadBlob(new Blob([result.ico], { type: 'image/x-icon' }), 'favicon.ico')
    }

    const downloadPng = (size: number, buf: ArrayBuffer) => {
        downloadBlob(new Blob([buf], { type: 'image/png' }), `icon-${size}x${size}.png`)
    }

    // iconutil requires specific filenames: 1x and @2x pairs
    // e.g. icon_16x16.png (16px) + icon_16x16@2x.png (32px file renamed)
    const ICNS_FILES: { name: string; size: number }[] = [
        { name: 'icon_16x16.png', size: 16 },
        { name: 'icon_16x16@2x.png', size: 32 },
        { name: 'icon_32x32.png', size: 32 },
        { name: 'icon_32x32@2x.png', size: 64 },
        { name: 'icon_128x128.png', size: 128 },
        { name: 'icon_128x128@2x.png', size: 256 },
        { name: 'icon_256x256.png', size: 256 },
        { name: 'icon_256x256@2x.png', size: 512 },
        { name: 'icon_512x512.png', size: 512 },
        { name: 'icon_512x512@2x.png', size: 1024 },
    ]

    const downloadAll = async () => {
        const zip = new JSZip()
        zip.file('favicon.ico', result.ico)

        for (const { size, buf } of result.pngs) {
            zip.file(`icon-${size}x${size}.png`, buf)
        }

        // icns/ subfolder — rename files exactly as iconutil expects
        const bySize = Object.fromEntries(result.pngs.map(({ size, buf }) => [size, buf]))
        const icns = zip.folder('icns')!
        for (const { name, size } of ICNS_FILES) {
            if (bySize[size]) icns.file(name, bySize[size])
        }

        icns.file('README.txt', icnsReadme)

        const blob = await zip.generateAsync({ type: 'blob' })
        downloadBlob(blob, `${baseName}-icons.zip`)
    }

    return (
        <section className="py-6 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-medium text-primary font-body text-base">
                    Generated Icons
                </h3>
                <div className="flex items-center gap-2">
                    <Button variant="secondary" className="gap-2" onClick={downloadAll}>
                        <Download className="size-4" />
                        Download All
                    </Button>
                    <Button variant="outline" onClick={onReset}>
                        Convert Another
                    </Button>
                </div>
            </div>

            {/* ICO file */}
            <div className="flex items-center justify-between p-4 rounded-2xl border border-accent bg-secondary/30">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-sm bg-primary/10 border border-primary/20 shrink-0">
                        <span className="text-xs font-bold text-primary">ICO</span>
                    </div>
                    <div>
                        <p className="text-sm text-accent-foreground font-body">favicon.ico</p>
                        <p className="text-xs text-muted-foreground">Contains all {FAVICON_SIZES.length} sizes</p>
                    </div>
                </div>
                <Button variant="secondary" className="text-xs text-primary shrink-0" onClick={downloadIco}>
                    <Download className="size-3.5 mr-1" />
                    Download
                </Button>
            </div>

            {/* PNG sizes */}
            <ul className="space-y-2.5">
                {result.pngs.map(({ size, buf }) => {
                    const url = URL.createObjectURL(new Blob([buf], { type: 'image/png' }))
                    return (
                        <li key={size} className="flex items-center justify-between p-4 rounded-2xl border border-accent bg-secondary/30">
                            <div className="flex items-center gap-3">
                                <img
                                    src={url}
                                    alt={`${size}x${size}`}
                                    className="rounded-sm border border-accent object-cover shrink-0 w-10 h-10"
                                />
                                <div>
                                    <p className="text-sm text-accent-foreground font-body">icon-{size}x{size}.png</p>
                                    <p className="text-xs text-muted-foreground">{size} × {size} px</p>
                                </div>
                            </div>
                            <Button variant="secondary" className="text-xs text-primary shrink-0" onClick={() => downloadPng(size, buf)}>
                                <Download className="size-3.5 mr-1" />
                                Download
                            </Button>
                        </li>
                    )
                })}
            </ul>
        </section>
    )
}
