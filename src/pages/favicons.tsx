import { useState, lazy } from "react"
import FaviconDropzone from "@/components/favicons/favicon-dropzone"
import type { FaviconResult } from "@/components/favicons/favicon-results"

const FaviconResults = lazy(() => import("@/components/favicons/favicon-results"))
import { useConversionCountContext } from "@/lib/ConversionCountContext"
import { useAuth } from "@/lib/useAuth"
import { spendTokens, isAtLimit, isTrialExhausted } from "@/lib/useConversionCount"

type State =
    | { status: 'idle' }
    | { status: 'converting' }
    | { status: 'done'; result: FaviconResult; file: File }
    | { status: 'error'; message: string }

export default function FaviconConversion() {
    const [state, setState] = useState<State>({ status: 'idle' })
    const { onConversionSuccess } = useConversionCountContext()
    const { plan } = useAuth()
    const atLimit = isAtLimit('image', plan)

    const handleFile = async (file: File) => {
        // Generating a favicon set is one image conversion - reserve a token up front and
        // refund it if the generation fails, mirroring the homepage converter.
        const [refund, reserved] = spendTokens('image', plan)
        if (!reserved) {
            setState({
                status: 'error',
                message: plan === 'limited' || isTrialExhausted()
                    ? 'Daily limit reached. Try again tomorrow or upgrade to Pro.'
                    : 'Conversion limit reached. Upgrade to continue.',
            })
            return
        }

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
            refund()
            setState({ status: 'error', message: e instanceof Error ? e.message : 'Conversion failed' })
        }
    }

    const reset = () => setState({ status: 'idle' })

    return (
        <section className="section py-8">
            <div className="mb-6">
                <h2 className="text-2xl font-body font-semibold text-foreground">Favicon Generator</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Upload any image and get the complete icon set - .ico, PNGs from 16 to 1024px, and macOS .icns.
                </p>
            </div>

            {state.status === 'idle' && (
                <FaviconDropzone onFile={handleFile} atLimit={atLimit} />
            )}

            {state.status === 'converting' && (
                <div className="flex flex-col items-center justify-center h-72 border border-border rounded-3xl border-dashed gap-4">
                    <div className="size-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <p className="text-sm text-muted-foreground">Generating icons…</p>
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
