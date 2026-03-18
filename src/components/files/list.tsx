import File from "./file"
import { Button } from "../ui/button"
import { useAppStore, fileKey } from "@/store/useAppStore"

export default function FileList() {
    const { files, targetFormats, quality, convertedCount, convertingTotal, convertedFiles, setConvertedFile, setFailedFile, setCurrentFileName, startConversion, removeFile } = useAppStore()

    const isConverting = convertingTotal > 0 && convertedCount < convertingTotal
    const allDone = files.length > 0 && files.every(f => !!convertedFiles[fileKey(f)])

    const handleConvertAll = async () => {
        const pending = files.filter(f => !convertedFiles[fileKey(f)])
        startConversion(pending)
        await Promise.allSettled(pending.map(async (f) => {
            try {
                const targetFormat = targetFormats[fileKey(f)]
                setCurrentFileName(f.name)
                const buffer = await f.arrayBuffer()
                const result = await window.electron.convert(buffer, targetFormat, quality)
                const blob = new Blob([result.buffer as ArrayBuffer], { type: `image/${targetFormat}` })
                setConvertedFile(f, blob)
                removeFile(f)
            } catch (err) {
                setFailedFile(f, err instanceof Error ? err.message : 'Unknown error')
            }
        }))
        setCurrentFileName('')
    }

    if (files.length === 0 || allDone) return null

    return (
        <section className="py-6">
            <div className="mb-6 flex items-center justify-between">
                <h3 className="font-medium text-primary/60 font-body text-base">Added ({files.length})</h3>
                <Button onClick={handleConvertAll} disabled={isConverting} variant={'secondary'} className={'font-normal'}>
                    Convert All
                </Button>
            </div>
            <ul className="space-y-2.5">
                {files.map((file, i) => (
                    <li key={`${file.lastModified}${i}${file.size}`}>
                        <File data={file} />
                    </li>
                ))}
            </ul>
        </section>
    )
}
