import { Import } from "lucide-react"
import { Button } from "../ui/button"
import { useRef } from "react"
import { Badge } from "../ui/badge"

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']
const ACCEPTED_EXT = ['PNG', 'JPG', 'WEBP', 'GIF', 'SVG']

interface Props {
    onFile: (file: File) => void
}

export default function EditorDropzone({ onFile }: Props) {
    const inputRef = useRef<HTMLInputElement>(null)
    const wrapperRef = useRef<HTMLDivElement>(null)

    const handleFiles = (files: FileList | null) => {
        const file = Array.from(files ?? []).find(f => ACCEPTED.includes(f.type))
        if (file) onFile(file)
    }

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        handleFiles(e.dataTransfer.files)
        wrapperRef.current?.classList.remove('dragenter')
    }

    return (
        <form>
            <input
                ref={inputRef}
                accept={ACCEPTED.join(',')}
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
                <Button onClick={() => inputRef.current?.click()} variant="outline" className="w-20 h-20 border-border hover:border-primary transition-colors">
                    <Import className="size-10 stroke-primary" />
                </Button>
                <div className="text-center">
                    <h2 className="text-2xl font-body font-semibold text-foreground">Drop an image here</h2>
                    <p className="text-sm text-muted-foreground mt-1">Crop and export your image</p>
                </div>
                <div className="flex items-center justify-center flex-wrap gap-2">
                    {ACCEPTED_EXT.map(ext => (
                        <Badge variant="secondary" key={ext} className="rounded-sm p-3 text-sm font-light text-primary">{ext}</Badge>
                    ))}
                </div>
                <Button onClick={() => inputRef.current?.click()} className="bg-primary h-12 w-60 text-lg" variant="default">
                    Browse Image
                </Button>
            </div>
        </form>
    )
}
