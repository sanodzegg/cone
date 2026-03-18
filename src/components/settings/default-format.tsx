import { useAppStore, allFormats } from '@/store/useAppStore'
import {
    Combobox,
    ComboboxInput,
    ComboboxContent,
    ComboboxList,
    ComboboxItem,
} from '@/components/ui/combobox'

export default function DefaultFormat() {
    const defaultOutputFormat = useAppStore(s => s.defaultOutputFormat)
    const setDefaultOutputFormat = useAppStore(s => s.setDefaultOutputFormat)

    return (
        <div className="p-5 rounded-2xl border border-accent bg-secondary/30 space-y-4">
            <div>
                <p className="text-sm font-medium text-primary">Default Output Format</p>
                <p className="text-xs text-muted-foreground mt-0.5">Format applied to newly added files.</p>
            </div>
            <Combobox
                value={defaultOutputFormat}
                onValueChange={(v) => v && setDefaultOutputFormat(v as string)}
            >
                <ComboboxInput placeholder="Select format" className="w-40! h-10! [&_input]:uppercase! [&_input]:select-none! m-0!" />
                <ComboboxContent>
                    <ComboboxList>
                        {allFormats.map(fmt => (
                            <ComboboxItem key={fmt} value={fmt}>
                                {fmt.toUpperCase()}
                            </ComboboxItem>
                        ))}
                    </ComboboxList>
                </ComboboxContent>
            </Combobox>
        </div>
    )
}
