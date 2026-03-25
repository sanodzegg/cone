import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { RemoteSettings } from '@/lib/useSettingsSync'

interface Props {
    remote: RemoteSettings
    local: RemoteSettings
    onApplyRemote: () => void
    onKeepLocal: () => void
}

export function SettingsConflictDialog({ remote, local, onApplyRemote, onKeepLocal }: Props) {
    function SettingsBlock({ s }: { s: RemoteSettings }) {
        return (
            <>
                <p className="text-muted-foreground">Image quality: <span className="text-foreground">{s.image_quality}%</span></p>
                <p className="text-muted-foreground">Image format: <span className="text-foreground">{s.default_image_format}</span></p>
                <p className="text-muted-foreground">Video format: <span className="text-foreground">{s.default_video_format}</span></p>
                <p className="text-muted-foreground">Document format: <span className="text-foreground">{s.default_document_format}</span></p>
            </>
        )
    }

    return (
        <Dialog open>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className={'font-body'}>Settings conflict</DialogTitle>
                    <DialogDescription>
                        Your account has different settings than what's saved locally. Which would you like to use?
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-3 mt-2 mb-4">
                    <div className="rounded-xl border border-border p-3 space-y-1 text-sm">
                        <p className="font-medium text-primary mb-2">Local settings</p>
                        <SettingsBlock s={local} />
                    </div>
                    <div className="rounded-xl border border-border p-3 space-y-1 text-sm">
                        <p className="font-medium text-primary mb-2">Account settings</p>
                        <SettingsBlock s={remote} />
                    </div>
                </div>
                <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={onKeepLocal}>Keep local</Button>
                    <Button onClick={onApplyRemote}>Use account settings</Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
