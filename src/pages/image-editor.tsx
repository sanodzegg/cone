import { useState } from "react"
import EditorDropzone from "@/components/image-editor/editor-dropzone"
import CropEditor from "@/components/image-editor/crop-editor"

export default function ImageEditor() {
    const [file, setFile] = useState<File | null>(null)

    return (
        <section className="section py-8">
            <div className="mb-6">
                <h2 className="text-2xl font-body font-semibold text-foreground">Image Editor</h2>
                <p className="text-sm text-muted-foreground mt-1">Crop your image and export it.</p>
            </div>

            {file
                ? <CropEditor file={file} onReset={() => setFile(null)} />
                : <EditorDropzone onFile={setFile} />
            }
        </section>
    )
}
