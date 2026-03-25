import { Import } from "lucide-react"
import { Button } from "../ui/button"
import { useRef, useState } from "react"

interface Props {
    onSvg: (code: string) => void
}

export default function SvgDropzone({ onSvg }: Props) {
    const inputRef = useRef<HTMLInputElement>(null)
    const wrapperRef = useRef<HTMLDivElement>(null)
    const [pasteValue, setPasteValue] = useState('')

    const handleFiles = (files: FileList | null) => {
        const file = Array.from(files ?? []).find(f => f.type === 'image/svg+xml' || f.name.endsWith('.svg'))
        if (!file) return
        const reader = new FileReader()
        reader.onload = e => {
            const text = e.target?.result as string
            if (text) onSvg(text)
        }
        reader.readAsText(file)
    }

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        handleFiles(e.dataTransfer.files)
        wrapperRef.current?.classList.remove('dragenter')
    }

    const isValidSvg = (s: string) => /<svg[\s>]/i.test(s)

    const handlePaste = () => {
        const trimmed = pasteValue.trim()
        if (isValidSvg(trimmed)) onSvg(trimmed)
    }

    return (
        <div className="flex flex-col gap-4">
            <form>
                <input
                    ref={inputRef}
                    accept=".svg,image/svg+xml"
                    onChange={e => { handleFiles(e.target.files); e.target.value = '' }}
                    className="sr-only"
                    type="file"
                />
                <div
                    ref={wrapperRef}
                    onDrop={handleDrop}
                    onDragOver={e => e.preventDefault()}
                    onDragEnter={() => wrapperRef.current?.classList.add('dragenter')}
                    onDragLeave={() => wrapperRef.current?.classList.remove('dragenter')}
                    className="flex flex-col items-center justify-center py-10 w-full h-72 border border-border hover:border-primary rounded-3xl border-dashed transition-colors cursor-pointer gap-4 [&.dragenter]:bg-accent"
                >
                    <Button onClick={() => inputRef.current?.click()} variant="outline" className="w-16 h-16 border-border hover:border-primary transition-colors">
                        <Import className="size-8 stroke-primary" />
                    </Button>
                    <div className="text-center">
                        <h2 className="text-xl font-body font-semibold text-foreground">Drop an SVG file here</h2>
                        <p className="text-sm text-muted-foreground mt-1">or browse to upload</p>
                    </div>
                    <Button onClick={() => inputRef.current?.click()} className="bg-primary h-10 w-48" variant="default">
                        Browse SVG
                    </Button>
                </div>
            </form>

            <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">Or paste SVG code</p>
                <textarea
                    value={pasteValue}
                    onChange={e => setPasteValue(e.target.value)}
                    placeholder="<svg xmlns=..."
                    rows={5}
                    className="w-full rounded-xl border border-border bg-background text-sm text-foreground font-mono p-3 resize-none focus:outline-none focus:border-primary transition-colors"
                />
                <Button onClick={handlePaste} disabled={!isValidSvg(pasteValue.trim())} className="self-end">
                    Load SVG
                </Button>
            </div>
        </div>
    )
}
