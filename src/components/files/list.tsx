import File from "./file"
import { Button } from "../ui/button"
import { useConvertStore } from "@/store/useConvertStore"
import { fileKey } from "@/utils/fileUtils"
import { convertAll } from "@/services/conversionService"
import { useConversionCountContext } from "@/lib/ConversionCountContext"

export default function FileList() {
    const { files, fileSettings, quality, imageQuality, convertedCount, convertingTotal, convertedFiles, failedFiles, setConvertedFile, setFailedFile, markFileConverting, unmarkFileConverting, startConversion, removeFile } = useConvertStore()
    const { onConversionSuccess } = useConversionCountContext()

    const failedCount = Object.keys(failedFiles).length
    const isConverting = convertingTotal > 0 && (convertedCount + failedCount) < convertingTotal
    const allDone = files.length > 0 && files.every(f => !!convertedFiles[fileKey(f)])

    const handleConvertAll = async () => {
        await convertAll(files, {
            quality,
            imageQuality,
            fileSettings,
            convertedFiles,
            startConversion,
            setConvertedFile,
            setFailedFile,
            markFileConverting,
            unmarkFileConverting,
            removeFile,
            onConversionSuccess,
        })
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
