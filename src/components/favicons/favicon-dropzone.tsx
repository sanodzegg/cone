import { Import } from "lucide-react"
import { Button } from "../ui/button"
import { useRef } from "react"
import { Badge } from "../ui/badge"

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif']
const ACCEPTED_EXT = ['PNG', 'JPG', 'WEBP', 'SVG', 'GIF']

interface Props {
    onFile: (file: File) => void
}

export default function FaviconDropzone({ onFile }: Props) {
    const inputRef = useRef<HTMLInputElement>(null)
    const wrapperRef = useRef<HTMLDivElement>(null)

    const handleClickRedirection = () => inputRef.current?.click()
    const handleDragEnter = () => wrapperRef.current?.classList.add('dragenter')
    const handleDragEnd = () => wrapperRef.current?.classList.remove('dragenter')
    const preventDragOver = (e: React.DragEvent) => e.preventDefault()

    const handleFiles = (files: FileList | null) => {
        const file = Array.from(files ?? []).find(f => ACCEPTED.includes(f.type))
        if (file) onFile(file)
    }

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        handleFiles(e.dataTransfer.files)
        wrapperRef.current?.classList.remove('dragenter')
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleFiles(e.target.files)
        e.target.value = ''
    }

    return (
        <form>
            <input
                ref={inputRef}
                accept={ACCEPTED.join(',')}
                onChange={handleInputChange}
                className="sr-only"
                type="file"
                name="faviconFile"
            />
            <div
                ref={wrapperRef}
                onDrop={handleDrop}
                onDragOver={preventDragOver}
                onDragEnter={handleDragEnter}
                onDragEnd={handleDragEnd}
                className="flex flex-col items-center justify-center py-10 w-full h-90 border border-border hover:border-primary rounded-3xl border-dashed transition-colors cursor-pointer gap-4 [&.dragenter]:bg-accent"
            >
                <Button onClick={handleClickRedirection} variant="outline" className="w-20 h-20 border-border hover:border-primary transition-colors">
                    <Import className="size-10 stroke-primary" />
                </Button>

                <div className="text-center">
                    <h2 className="text-2xl font-body font-semibold text-foreground">Drop an image here</h2>
                    <p className="text-sm text-muted-foreground mt-1">You'll get .ico, every PNG size, and macOS .icns</p>
                </div>

                <div className="flex items-center justify-center flex-wrap gap-2">
                    {ACCEPTED_EXT.map((ext) => (
                        <Badge variant="secondary" key={ext} className="rounded-sm p-3 text-sm font-light text-primary">{ext}</Badge>
                    ))}
                </div>

                <Button onClick={handleClickRedirection} className="bg-primary h-12 w-60 text-lg" variant="default">
                    Browse Image
                </Button>
            </div>
        </form>
    )
}
