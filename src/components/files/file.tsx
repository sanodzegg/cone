import { Badge } from "../ui/badge"
import {
    Combobox,
    ComboboxContent,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "@/components/ui/combobox"
import { ArrowRightIcon, Loader2, MoveRight, Pencil, X } from "lucide-react"
import { useConvertStore } from "@/store/useConvertStore"
import { fileKey, getExtension, formatBytes } from "@/utils/fileUtils"
import { getFormatsForFile, getEngineForFile } from "@/engines/engineRegistry"
import { estimateOutputSize } from "@/utils/estimateSize"
import { Button } from "../ui/button"
import FileSettingsDialog from "./file-settings-dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"
import { convertSingle } from "@/services/conversionService"
import { useNavigate } from "react-router-dom"
import { useConversionCountContext } from "@/lib/ConversionCountContext"

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'tif', 'heic', 'heif', 'avif', 'jfif', 'svg'])

export default function File({ data }: { data: File }) {
    const ext = getExtension(data)
    const formatKey = ext || null
    const colorStyle = formatKey ? {
        backgroundColor: `var(--badge-${formatKey}-bg)`,
        borderColor: `var(--badge-${formatKey}-border)`,
        color: `var(--badge-${formatKey}-text)`,
    } : {}

    const convertTo = getFormatsForFile(data)

    const targetFormat = useConvertStore(s => s.fileSettings[fileKey(data)]?.targetFormat ?? convertTo[0])
    const setTargetFormat = useConvertStore(s => s.setTargetFormat)
    const isDone = useConvertStore(s => !!s.convertedFiles[fileKey(data)])
    const failedError = useConvertStore(s => s.failedFiles[fileKey(data)] ?? null)
    const removeFile = useConvertStore(s => s.removeFile)
    const setPendingEditorFile = useConvertStore(s => s.setPendingEditorFile)
    const convertingFiles = useConvertStore(s => s.convertingFiles)
    const { quality, imageQuality, fileSettings, convertedFiles, startConversion, setConvertedFile, setFailedFile, markFileConverting, unmarkFileConverting } = useConvertStore()
    const { onConversionSuccess } = useConversionCountContext()
    const navigate = useNavigate()

    const isImage = ext ? IMAGE_EXTS.has(ext.toLowerCase()) : false

    const perFileQuality = fileSettings[fileKey(data)]?.quality
    const engineId = getEngineForFile(data)?.id
    const isConverting = convertingFiles.has(fileKey(data))
    const effectiveQuality = perFileQuality ?? (engineId === 'image' ? imageQuality : quality)
    const estimatedSize = isImage && targetFormat ? estimateOutputSize(data.size, ext, targetFormat, effectiveQuality) : null

    const handleConvertSingle = () => convertSingle(data, {
        quality, imageQuality, fileSettings, convertedFiles, startConversion, setConvertedFile, setFailedFile, markFileConverting, unmarkFileConverting, removeFile, onConversionSuccess,
    })

    const handleEditInEditor = () => {
        setPendingEditorFile(data)
        navigate('/extensions/image-editor')
    }

    if (isDone) return null;

    return (
        <div className={`flex items-center justify-start p-4 rounded-2xl border bg-secondary/30 ${failedError ? 'border-destructive/40 bg-destructive/5' : isConverting ? 'border-primary/40 bg-primary/5' : 'border-accent'}`}>
            <Badge variant={'secondary'} className="shrink-0 uppercase h-10 w-10 rounded-sm mr-2" style={colorStyle}>
                {ext}
            </Badge>
            <div className="flex flex-col min-w-0 w-100 shrink-0">
                <h3 className="text-sm font-normal text-accent-foreground font-body truncate">{data.name}</h3>
                {failedError
                    ? <p className="text-xs font-normal text-destructive">{failedError}</p>
                    : <p className="text-xs font-normal text-accent-foreground/50">
                        {formatBytes(data.size)}
                        {estimatedSize !== null && (
                            <span className="ml-1.5">
                                → <span className={estimatedSize < data.size ? 'text-green-500' : 'text-yellow-500'}>~{formatBytes(estimatedSize)}</span>
                            </span>
                        )}
                    </p>
                }
            </div>
            <div className="flex-1 flex justify-center">
                {isConverting
                    ? <Loader2 className="size-5 text-primary animate-spin" />
                    : <MoveRight size={24} className="stroke-accent" />
                }
            </div>
            <div className="flex items-center gap-2">
                <Combobox value={targetFormat} onValueChange={(v) => !isConverting && setTargetFormat(data, v ?? convertTo[0])} items={convertTo}>
                    <ComboboxInput className={'w-24! h-10! [&_input]:uppercase! [&_input]:select-none!'} readOnly />
                    <ComboboxContent>
                        <ComboboxList>
                            {(item) => (
                                <ComboboxItem className={'uppercase'} key={item} value={item}>
                                    {item}
                                </ComboboxItem>
                            )}
                        </ComboboxList>
                    </ComboboxContent>
                </Combobox>
                <Tooltip>
                    <TooltipTrigger>
                        <FileSettingsDialog file={data} />
                        <TooltipContent>
                            <p className="text-sm font-light text-accent">File Settings</p>
                        </TooltipContent>
                    </TooltipTrigger>
                </Tooltip>
                {isImage && (
                    <Tooltip>
                        <TooltipTrigger>
                            <Button variant={'secondary'} className={'group p-2.5! h-full!'} onClick={handleEditInEditor}>
                                <Pencil className="size-4" />
                            </Button>
                            <TooltipContent>
                                <p className="text-sm font-light text-accent">Edit in Image Editor</p>
                            </TooltipContent>
                        </TooltipTrigger>
                    </Tooltip>
                )}
                <Tooltip>
                    <TooltipTrigger>
                        <Button variant={'secondary'} className={'group p-2.5! h-full!'} onClick={handleConvertSingle}>
                            <ArrowRightIcon className="transition-transform group-hover:translate-x-0.5 size-5" />
                        </Button>
                        <TooltipContent>
                            <p className="text-sm font-light text-accent">Convert Single</p>
                        </TooltipContent>
                    </TooltipTrigger>
                </Tooltip>
                {failedError && (
                    <Button variant="destructive" size="icon" onClick={() => removeFile(data)}>
                        <X className="size-4" />
                    </Button>
                )}
            </div>
        </div>
    )
}
