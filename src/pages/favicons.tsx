import { useState } from "react"
import FaviconDropzone from "@/components/favicons/favicon-dropzone"
import FaviconResults, { type FaviconResult } from "@/components/favicons/favicon-results"
import { useConversionCountContext } from "@/lib/ConversionCountContext"

type State =
    | { status: 'idle' }
    | { status: 'converting' }
    | { status: 'done'; result: FaviconResult; file: File }
    | { status: 'error'; message: string }

export default function FaviconConversion() {
    const [state, setState] = useState<State>({ status: 'idle' })
    const { onConversionSuccess } = useConversionCountContext()

    const handleFile = async (file: File) => {
        setState({ status: 'converting' })
        try {
            const buffer = await file.arrayBuffer()
            const raw = await window.electron.convertFavicon(buffer)
            const result: FaviconResult = {
                ico: raw.ico,
                pngs: raw.pngs,
            }
            setState({ status: 'done', result, file })
            onConversionSuccess('image')
        } catch (e) {
            setState({ status: 'error', message: e instanceof Error ? e.message : 'Conversion failed' })
        }
    }

    const reset = () => setState({ status: 'idle' })

    return (
        <section className="section py-8">
            <div className="mb-6">
                <h2 className="text-2xl font-body font-semibold text-foreground">Favicon Generator</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Upload any image and get a complete icon set — .ico + PNG at 16, 32, 48, 128, 256, 512 and 1024px.
                </p>
            </div>

            {state.status === 'idle' && (
                <FaviconDropzone onFile={handleFile} />
            )}

            {state.status === 'converting' && (
                <div className="flex flex-col items-center justify-center h-72 border border-border rounded-3xl border-dashed gap-4">
                    <div className="size-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <p className="text-sm text-muted-foreground">Generating icons...</p>
                </div>
            )}

            {state.status === 'error' && (
                <div className="flex flex-col items-center justify-center h-72 border border-destructive/40 bg-destructive/5 rounded-3xl gap-3">
                    <p className="text-sm text-destructive">{state.message}</p>
                    <button onClick={reset} className="text-xs text-muted-foreground underline underline-offset-2">Try again</button>
                </div>
            )}

            {state.status === 'done' && (
                <FaviconResults result={state.result} sourceFile={state.file} onReset={reset} />
            )}
        </section>
    )
}
