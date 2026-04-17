import * as pdfjsLib from 'pdfjs-dist'
import PdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorkerUrl

export { pdfjsLib }
