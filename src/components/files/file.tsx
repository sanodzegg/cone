import { Badge } from "../ui/badge"
import {
    Combobox,
    ComboboxContent,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "@/components/ui/combobox"
import { MoveRight, X } from "lucide-react"
import { useAppStore, fileKey, allFormats } from "@/store/useAppStore"
import { Button } from "../ui/button"

export default function File({ data }: { data: File }) {
    const ext = data.type.replace('image/', '').replace('jpeg', 'jpg')
    const formatKey = ['jpg', 'png', 'webp', 'avif', 'gif', 'tiff'].includes(ext) ? ext : null
    const colorStyle = formatKey ? {
        backgroundColor: `var(--badge-${formatKey}-bg)`,
        borderColor: `var(--badge-${formatKey}-border)`,
        color: `var(--badge-${formatKey}-text)`,
    } : {}

    const convertedBytes = data.size < 1024 * 1024
        ? (data.size / 1024).toFixed(1) + 'KB'
        : (data.size / 1024 / 1024).toFixed(1) + 'MB';

    const convertTo = allFormats.filter(f => f !== ext)

    const targetFormat = useAppStore(s => s.targetFormats[fileKey(data)])
    const setTargetFormat = useAppStore(s => s.setTargetFormat)
    const isDone = useAppStore(s => !!s.convertedFiles[fileKey(data)])
    const removeFile = useAppStore(s => s.removeFile)

    if (isDone) return null;
    
    return (
        <div className="flex items-center justify-start p-4 rounded-2xl border border-accent bg-secondary/30">
            <Badge variant={'secondary'} className="shrink-0 uppercase h-10 w-10 rounded-sm mr-2" style={colorStyle}>
                {ext}
            </Badge>
            <div className="flex flex-col">
                <h3 className="text-sm font-normal text-accent-foreground font-body">{data.name}</h3>
                <p className="text-xs font-normal text-accent-foreground/50">{convertedBytes}</p>
            </div>
            <MoveRight size={24} className="stroke-accent ml-auto -mr-20" />
            <div className="ml-auto">
                {isDone ? (
                    <Button variant="destructive" size="icon" onClick={() => removeFile(data)}>
                        <X className="size-4" />
                    </Button>
                ) : (
                    <Combobox value={targetFormat} onValueChange={(v) => setTargetFormat(data, v ?? convertTo[0])} items={convertTo}>
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
                )}
            </div>
        </div>
    )
}
