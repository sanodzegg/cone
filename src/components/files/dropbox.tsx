import { Import } from "lucide-react";
import { Button } from "../ui/button";
import { useRef } from "react";
import { useAppStore } from "@/store/useAppStore";
import { Badge } from "../ui/badge";

export default function Dropbox() {
    const formats = ['JPG', 'PNG', 'WEBP', 'AVIF', 'GIF', 'TIFF'];

    const inputRef = useRef<HTMLInputElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const handleClickRedirection = () => inputRef.current && inputRef.current.click();
    const handleDragEnter = () => wrapperRef.current && wrapperRef.current.classList.add('dragenter');
    const handleDragEnd = () => wrapperRef.current && wrapperRef.current.classList.remove('dragenter');
    const preventDragOver = (e: React.DragEvent) => e.preventDefault();

    const { receiveFiles } = useAppStore();
    const handleFiles = (files: FileList | null) => receiveFiles(Array.from(files ?? []));

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        handleFiles(e.dataTransfer.files);
        wrapperRef.current && wrapperRef.current.classList.remove('dragenter')
    }
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleFiles(e.target.files)
        e.target.value = ''
    }

    return (
        <form>
            <input ref={inputRef} multiple onChange={handleInputChange} className="sr-only" type="file" name="userFiles" id="userFiles" />
            <div ref={wrapperRef} onDrop={handleDrop} onDragOver={preventDragOver} onDragEnter={handleDragEnter} onDragEnd={handleDragEnd} className="flex flex-col items-center justify-center py-10 w-full h-80 border border-border hover:border-primary rounded-3xl border-dashed transition-colors cursor-pointer gap-4 [&.dragenter]:bg-accent">
                <Button onClick={handleClickRedirection} variant="outline" className="w-20 h-20 border-border hover:border-primary transition-colors">
                    <Import className="size-10 stroke-primary" />
                </Button>

                <div className="text-center">
                    <h2 className="text-2xl font-body font-semibold text-foreground">Drop images here</h2>
                    <p className="text-sm text-muted-foreground mt-1">or browse from your computer</p>
                </div>

                <div className="flex items-center justify-center gap-x-2 mb-4">
                    {formats.map((format, index) => (
                        <Badge variant={'secondary'} key={index} className={'rounded-sm p-3 text-sm font-light text-primary'}>{format}</Badge>
                    ))}
                </div>
                <Button onClick={handleClickRedirection} className={'bg-primary h-12 w-60 text-lg'} variant={'default'}>Browse Files</Button>
            </div>
        </form>
    )
}