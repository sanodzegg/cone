import { useState, useEffect, useCallback, useRef } from 'react'
import { FolderOpen, Play, RotateCcw, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

interface RenameRules {
  find: string
  replace: string
  caseSensitive: boolean
  prefix: string
  suffix: string
  caseMode: 'none' | 'lower' | 'upper'
  sequential: boolean
  startAt: number
  padding: number
  seqSeparator: string
  seqPosition: 'prefix' | 'suffix'
}

interface ScannedFile { name: string; dir: string }
interface PreviewItem { original: string; newName: string; dir: string; changed: boolean }
interface ResultItem { ok: boolean; original: string; newName?: string; error?: string }

const defaultRules: RenameRules = {
  find: '', replace: '', caseSensitive: false,
  prefix: '', suffix: '',
  caseMode: 'none',
  sequential: false, startAt: 1, padding: 1, seqSeparator: '_', seqPosition: 'suffix',
}

export default function BatchRename() {
  const [folderPath, setFolderPath] = useState<string | null>(null)
  const [files, setFiles] = useState<ScannedFile[]>([])
  const [rules, setRules] = useState<RenameRules>(defaultRules)
  const [preview, setPreview] = useState<PreviewItem[]>([])
  const [results, setResults] = useState<ResultItem[] | null>(null)
  const [applying, setApplying] = useState(false)

  const set = <K extends keyof RenameRules>(key: K, value: RenameRules[K]) =>
    setRules(r => ({ ...r, [key]: value }))

  const loadFolder = async (p: string) => {
    setFolderPath(p)
    setResults(null)
    const scanned = await window.electron.batchRenameScan({ folderPath: p })
    setFiles(scanned)
  }

  const pickFolder = async () => {
    const p = await window.electron.batchRenamePickFolder()
    if (!p) return
    loadFolder(p)
  }

  const buildPreview = useCallback(async () => {
    if (!files.length) return
    const result = await window.electron.batchRenamePreview({ files, rules })
    setPreview(result)
  }, [files, rules])

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(buildPreview, 150)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [buildPreview])

  const apply = async () => {
    if (!preview.length) return
    setApplying(true)
    const res = await window.electron.batchRenameApply({ preview })
    setResults(res)
    setApplying(false)
    if (folderPath) {
      const scanned = await window.electron.batchRenameScan({ folderPath })
      setFiles(scanned)
      setRules(defaultRules)
    }
  }

  const reset = () => {
    setFolderPath(null)
    setFiles([])
    setPreview([])
    setResults(null)
    setRules(defaultRules)
  }

  const changedCount = preview.filter(p => p.changed).length

  return (
    <section className="section py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-body font-semibold text-foreground">Batch Rename</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Rename files in a folder using patterns, prefixes, and sequences.
          </p>
        </div>
        {folderPath && (
          <Button variant="outline" size="sm" onClick={reset} className="gap-1.5 shrink-0">
            <RotateCcw className="size-3.5" />
            Reset
          </Button>
        )}
      </div>

      <div className="flex gap-6">
        {/* Left: folder + rules */}
        <div className="w-64 shrink-0 space-y-5">

          {/* Folder drop zone */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Folder</Label>
            <div
              onClick={pickFolder}
              className="w-full rounded-xl border border-dashed border-border p-4 flex flex-col items-center gap-2 text-center transition-colors cursor-pointer hover:border-primary/50 hover:bg-accent/50"
            >
              <FolderOpen className="size-5 text-muted-foreground" />
              {folderPath ? (
                <>
                  <p className="text-xs text-foreground font-medium truncate w-full">{folderPath.split('/').pop()}</p>
                  <p className="text-[10px] text-muted-foreground">{files.length} file{files.length !== 1 ? 's' : ''} found · click to change</p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Click to pick a folder</p>
              )}
            </div>
          </div>

          {/* Find & Replace */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Find & Replace</Label>
            <Input placeholder="Find" value={rules.find} onChange={e => set('find', e.target.value)} className="h-8 text-sm" />
            <Input placeholder="Replace with" value={rules.replace} onChange={e => set('replace', e.target.value)} className="h-8 text-sm" />
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={rules.caseSensitive} onCheckedChange={v => set('caseSensitive', !!v)} />
              <span className="text-xs text-muted-foreground">Case sensitive</span>
            </label>
          </div>

          {/* Add Text */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Add Text</Label>
            <Input placeholder="Prefix" value={rules.prefix} onChange={e => set('prefix', e.target.value)} className="h-8 text-sm" />
            <Input placeholder="Suffix" value={rules.suffix} onChange={e => set('suffix', e.target.value)} className="h-8 text-sm" />
          </div>

          {/* Case */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Case</Label>
            <div className="flex gap-1">
              {(['none', 'lower', 'upper'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => set('caseMode', m)}
                  className={cn(
                    "flex-1 text-xs py-1.5 rounded-md border transition-colors cursor-pointer",
                    rules.caseMode === m ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"
                  )}
                >
                  {m === 'none' ? 'None' : m === 'lower' ? 'lower' : 'UPPER'}
                </button>
              ))}
            </div>
          </div>

          {/* Sequential */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={rules.sequential} onCheckedChange={v => set('sequential', !!v)} />
              <span className="text-xs text-muted-foreground">Sequential numbering</span>
            </label>
            {rules.sequential && (
              <div className="space-y-2 pl-6">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-[10px] text-muted-foreground mb-1 block">Start at</Label>
                    <Input type="number" value={rules.startAt} min={0} onChange={e => set('startAt', Number(e.target.value))} className="h-8 text-sm" />
                  </div>
                  <div className="flex-1">
                    <Label className="text-[10px] text-muted-foreground mb-1 block">Padding</Label>
                    <Input type="number" value={rules.padding} min={1} max={6} onChange={e => set('padding', Number(e.target.value))} className="h-8 text-sm" />
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground mb-1 block">Separator</Label>
                  <Input value={rules.seqSeparator} onChange={e => set('seqSeparator', e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="flex gap-1">
                  {(['prefix', 'suffix'] as const).map(pos => (
                    <button
                      key={pos}
                      onClick={() => set('seqPosition', pos)}
                      className={cn(
                        "flex-1 text-xs py-1.5 rounded-md border transition-colors cursor-pointer",
                        rules.seqPosition === pos ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"
                      )}
                    >
                      {pos === 'prefix' ? '01_name' : 'name_01'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {files.length > 0 && (
            <Button onClick={apply} disabled={applying || changedCount === 0} className="w-full gap-1.5" size="sm">
              <Play className="size-3.5" />
              {applying ? 'Renaming…' : `Rename ${changedCount} file${changedCount !== 1 ? 's' : ''}`}
            </Button>
          )}
        </div>

        {/* Right: preview / results */}
        <div className="flex-1 min-w-0">
          {results ? (
            <>
              <p className="text-sm text-muted-foreground mb-3">
                {results.filter(r => r.ok).length} renamed · {results.filter(r => !r.ok).length} failed
              </p>
              <div className="space-y-0">
                {results.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm py-1.5 border-b border-border/50 last:border-0">
                    {r.ok
                      ? <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                      : <XCircle className="size-4 text-destructive shrink-0" />
                    }
                    <span className="text-muted-foreground truncate">{r.original}</span>
                    {r.newName && r.newName !== r.original && (
                      <>
                        <span className="text-muted-foreground shrink-0">→</span>
                        <span className="truncate font-medium">{r.newName}</span>
                      </>
                    )}
                    {r.error && <span className="text-destructive text-xs ml-auto shrink-0">{r.error}</span>}
                  </div>
                ))}
              </div>
            </>
          ) : preview.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground mb-3">
                Preview — {changedCount} of {preview.length} will be renamed
              </p>
              <div className="space-y-0">
                {preview.map((item, i) => (
                  <div key={i} className={cn(
                    "flex items-center gap-2 text-sm py-1.5 border-b border-border/50 last:border-0",
                    !item.changed && "opacity-40"
                  )}>
                    <span className="text-muted-foreground truncate flex-1 min-w-0">{item.original}</span>
                    {item.changed && (
                      <>
                        <span className="text-muted-foreground shrink-0">→</span>
                        <span className="truncate flex-1 min-w-0 font-medium text-primary">{item.newName}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-6 flex flex-col items-center justify-center gap-3 text-center h-64">
              <FolderOpen className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {folderPath ? 'No files found in folder' : 'Pick a folder to get started'}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
