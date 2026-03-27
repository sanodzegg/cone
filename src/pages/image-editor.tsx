import { useState, useEffect, lazy } from "react"
import EditorDropzone from "@/components/image-editor/editor-dropzone"

const CropEditor = lazy(() => import("@/components/image-editor/crop-editor"))
import { useConvertStore } from "@/store/useConvertStore"

export default function ImageEditor() {
    const [file, setFile] = useState<File | null>(null)
    const pendingEditorFile = useConvertStore(s => s.pendingEditorFile)
    const setPendingEditorFile = useConvertStore(s => s.setPendingEditorFile)

    useEffect(() => {
        if (pendingEditorFile) {
            setFile(pendingEditorFile)
            setPendingEditorFile(null)
        }
    }, [pendingEditorFile, setPendingEditorFile])

    return (
        <section className="section py-8">
            <div className="mb-6">
                <h2 className="text-2xl font-body font-semibold text-foreground">Image Editor</h2>
                <p className="text-sm text-muted-foreground mt-1">Crop, adjust, annotate, and export your image.</p>
            </div>

            {file
                ? <CropEditor file={file} onReset={() => setFile(null)} />
                : <EditorDropzone onFile={setFile} />
            }
        </section>
    )
}
