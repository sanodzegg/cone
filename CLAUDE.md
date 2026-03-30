# Cone — Project Reference

Internal planning document. Used as context for AI-assisted development sessions.

---

## What is Cone

Cone is a **local-first Electron desktop app** for file conversion and media tooling. All processing runs on-device — no uploads, no cloud, no server required. Currently macOS + Windows.

Current version: **1.4.0**

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Electron 41 |
| Frontend | React 19 + TypeScript + Vite 7 |
| Styling | Tailwind CSS v4 + shadcn/ui (Base UI) |
| State | Zustand 5 with slices + `persist` middleware |
| Image processing | Sharp |
| Video/audio | FFmpeg (ffmpeg-static + fluent-ffmpeg) |
| PDF | pdf-lib, pdfkit, pdf-parse, mammoth |
| Browser automation | Playwright Core (for screenshot + website PDF) |
| Auth + DB | Supabase (`@supabase/supabase-js`) |
| Routing | React Router DOM v7 |
| Package manager | pnpm |
| Build/distribution | electron-builder |

---

## App Structure

```
src/
  pages/           — one file per route/feature
  components/      — UI components, grouped by feature
    files/         — homepage file list, conversion cards
    bulk-converter/
    settings/
    favicons/
    image-editor/
    ui/            — shared primitives (button, input, dialog, etc.)
  engines/         — conversion engines (image, video, audio, document)
  services/        — conversionService.ts (orchestrates all conversions)
  lib/             — supabase.ts, useAuth.ts, useSettingsSync.ts, useConversionCount.ts, ConversionCountContext.tsx
  store/
    useConvertStore.ts
    slices/        — fileSlice, conversionSlice, settingsSlice
  types/           — shared TypeScript interfaces
  utils/           — fileUtils, estimateSize, etc.

electron/
  main.js          — Electron main process entry
  preload.js       — contextBridge IPC bindings
  convert.js       — Sharp image conversion handlers
  bulk-convert.js  — Bulk folder conversion + watch mode
  video-tools.js   — FFmpeg video handlers
  pdf-tools.js     — PDF merge/manipulation
  website-pdf.js   — Playwright website-to-PDF
  screenshot.js    — Playwright screenshot capture
```

---

## Features

### Homepage — File Converter
- Drag & drop or file picker for images, video, audio, documents
- Per-file format selector (combobox)
- Per-file settings dialog: resize (w/h/fit), quality override, keep metadata (image only)
- Estimated output size shown inline before conversion (image only, heuristic ratios)
- Per-file convert button + "Convert All"
- Active conversion shown with spinner + primary highlight on the converting row
- Converted files shown in results section with download + bulk ZIP download
- Bulk ZIP download shows spinner + disabled state while zipping (`isZipping` state)
- Conversion stats: count, % saved, output size, progress bar
- Suspicious savings tooltip (explains same-format re-encode or unusually high savings)
- Duplicate file detection in dropbox — shows "N duplicate file(s) skipped" for 3s, computed client-side by comparing `name-size-lastModified` keys against existing store files
- Drag highlight only clears on true zone exit — `dragLeave` checks `relatedTarget` to ignore child element transitions
- Settings icon on file row is yellow only when file has meaningful customization: width/height set, quality differs from default, or keepMetadata is explicitly false. Opening and saving without changes does not mark as customized.
- `isConverting` in file list checks `convertingFiles.size > 0` (not count comparison) — reliable during single-file conversions which reset `convertingTotal` to 1
- `startConversion` clears `convertedFiles: {}` — prevents previous batch results bleeding into a new batch
- `convertFile` in `conversionService.ts` guards with `convertingFiles.has(fileKey(file))` at the top — prevents double-conversion race when Convert All is triggered mid-conversion
- `IMAGE_EXTS` in `file.tsx` derives from `IMAGE_INPUT_EXTENSIONS` exported by `imageEngine.ts` — stays in sync automatically
- `TooltipContent` must be a sibling of `TooltipTrigger`, not nested inside it — affects all tooltip buttons in the file row
- File settings dialog syncs local state from store on open (`syncFromStore()` called in `onOpenChange`) — prevents stale state from cancelled sessions

### Bulk Converter
- Pick a folder → recursively scans for images
- Settings: output format, quality, output location (alongside / subfolder / custom folder), delete originals toggle
- Progress bar during conversion
- Watch folder mode (live converts new files as they're added)
- Results list with per-file status, retry on failure
- Scroll anchors to top in watch mode as new results prepend
- Same-format warning (files that would be skipped)

### Image Editor (extension)
- Canvas-based editor with toolbar tabs: Adjust, Effects, Transform, Canvas, Overlay, Background Remove
- Undo/redo history
- Export dialog with format + quality selection
- Files can be sent here from the homepage via "Edit in Editor" button

### Favicon Generator
- Upload any image → generates full icon set
- Output: favicon.ico (all sizes embedded) + PNG at 16, 32, 48, 64, 128, 256, 512, 1024px
- Also generates macOS `icns/` folder with iconutil-compatible filenames + README
- Per-size preview images shown before download
- Download individual sizes or ZIP of everything

### Website PDF
- Enter URL → renders via Playwright → save as PDF
- Controls: paper format, orientation, margins, print background, viewport width, wait-until strategy, extra wait time
- Wait Until options: DOM ready (fastest), Load event (balanced), Network idle (thorough) — each with description
- Viewport presets: Mobile (390px), Tablet (768px), Desktop (1440px), Wide (1920px)
- Countdown shown when waiting for timed load

### Website Screenshot
- Enter URL → full-page screenshot via Playwright
- Format: PNG / JPG / WebP
- Same viewport presets as PDF
- User agent presets: Default, Chrome, Safari, Mobile (iPhone), Bot
- Live preview in-app after capture
- Browser engine download/status indicator

### SVG Editor
- Upload via drag & drop or file picker, or paste SVG code (auto-loads on valid paste)
- Left panel: CodeMirror 6 editor with XML syntax highlighting, line numbers, undo/redo history
- Right panel: tabbed — Preview, Code, Data URI
- Editor toolbar: Prettify button, Optimize button (shows `−N%` savings, one-way action via SVGO, undoable with Ctrl+Z), Download icon, Copy icon, file size label
- Preview tab: metadata bar (viewBox, width×height) + background picker (transparent/white/black/gray)
- Preview uses `preparePreview` — strips `<?xml?>` + comments, removes fixed width/height from `<svg>`, adds `preserveAspectRatio="xMidYMid meet"`
- `.svg-preview svg` CSS in `index.css` uses `max-width/max-height: calc(100% - 48px)` + `overflow: visible` to handle content outside viewBox
- Code tab: format selector (SVG, React, Vue, Angular, HTML `<img>`) with copy button
- Data URI tab: Base64, encodeURIComponent, Minified (encodeURIComponent + SVGO) with byte sizes and copy buttons
- `isValidSvg` accepts optional `<?xml?>`, `<!DOCTYPE>`, leading comments, then `<svg`
- Files: `src/pages/svg-editor.tsx`, `src/components/svg-editor/SvgCodeEditor.tsx`, `src/components/svg-editor/svg-utils.ts`, `src/components/svg-editor/svg-dropzone.tsx`

### PDF Merge
- Pick multiple PDFs → merge into one → save
- Drag-to-reorder file list, per-file remove, file size shown inline
- Filename truncated with tooltip showing full name (TooltipTrigger needs `flex-1 min-w-0` to participate in flex layout)

### Settings
- Image quality default (slider with live comparison preview)
- Default output format per engine type (image / video / audio / document)
- Settings sync to Supabase when signed in — applied on sign in across devices
- Settings conflict dialog shown when local and account settings differ on sign in

### Pricing
- Three-tier pricing page at `/pricing`
- Trial (free, limited), Pro (monthly/annual toggle), Lifetime (one-time)
- Prices are placeholder — not yet finalized

### Account
- Email/password auth via Supabase at `/account`
- Shows signed-in email + sign out when authenticated
- Account link in extensions sheet (bottom, fixed) shows email when signed in

---

## State Management

Three Zustand slices combined in `useConvertStore`:

**fileSlice** — `files[]`, `receiveFiles`, `removeFile`

**conversionSlice** — `fileSettings`, `convertedFiles`, `failedFiles`, `convertedCount`, `convertingTotal`, `totalInputSize`, `totalOutputSize`, `currentFileName`

**settingsSlice** (persisted to disk) — `quality`, `imageQuality`, `defaultImageFormat`, `defaultDocumentFormat`, `defaultVideoFormat`, `defaultOutputFolder`, `pendingEditorFile`

Persisted keys: `quality`, `imageQuality`, `defaultImageFormat`, `defaultDocumentFormat`, `defaultVideoFormat`, `defaultOutputFolder`. File objects are excluded from persistence (not serializable).

---

## Conversion Engines

| Engine | Input formats | Quality used? |
|---|---|---|
| image | jpg, jpeg, png, webp, avif, heic, heif, gif, tiff, tif, svg, bmp, jfif | Yes — `imageQuality` default |
| video | mp4, mov, avi, mkv, webm | No — format re-encode only |
| audio | mp3, aac, flac, wav, ogg, aiff, m4a + more | No |
| document | docx, pdf, txt + more | No |

Video conversion is container/codec re-encode only (e.g. mp4 → webm). Quality setting has no effect and is not passed to FFmpeg.

IPC pattern: renderer calls `window.electron.*` → preload bridges to `ipcRenderer.invoke` → main process handler returns result.

---

## Auth + Payments (implemented)

### Supabase
- Project: `otdahhtxvwchkxwehvsq`
- Auth: email/password (Google + GitHub OAuth planned, not yet implemented)
- `src/lib/supabase.ts` — client initialized with `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` from `.env`
- `src/lib/useAuth.ts` — session listener, exposes `user`, `plan`, `loading`

### Database tables
- `users` — `id`, `email`, `plan` ('trial'|'monthly'|'annual'|'lifetime'), `paid_at`, `license_key`, `subscription_end`, `created_at`
- `settings` — `user_id`, `image_quality`, `default_image_format`, `default_document_format`, `default_video_format`, `default_output_folder`, `updated_at`
- `conversion_counts` — `user_id`, `image_count`, `document_count`, `video_count`, `updated_at`

All tables have RLS enabled. Trigger `on_auth_user_created` auto-inserts into `users` + `conversion_counts` on signup.

### Settings sync (`src/lib/useSettingsSync.ts`)
- On sign in: fetches remote settings, compares to local
- If identical → applies remote silently
- If different → shows `SettingsConflictDialog` — user picks local or account settings
- On any setting change while signed in → Zustand `subscribe` fires upsert to Supabase
- Signed out → local Zustand persist only

### Conversion counting (`src/lib/useConversionCount.ts`)
- Counts stored in `localStorage` key `cone_conversion_counts` as `{ image, document, video }`
- On sign in + online: fetches server counts, merges by taking the higher of each (local wins for trial users)
- After each successful conversion: `incrementLocalCount(engine)` + `syncCountToServer(engine)`
- Wired via `ConversionCountContext` — `onConversionSuccess(engineId)` passed through context
- Connected in: homepage file converter, bulk converter, favicon generator

### Trial limits
- Image: 100 | Document: 50 | Video: 10
- `isAtLimit(engine, plan)` — returns true only for `plan === 'trial'` at/over limit
- Limit enforcement UI (upgrade prompt + navigate to `/pricing`) — not yet implemented

### Plans
| Plan | Access |
|---|---|
| trial | Limited conversions (500 img / 500 doc / 100 vid), no reset |
| monthly | Unlimited, active while subscribed |
| annual | Unlimited, active while subscribed |
| lifetime | Unlimited forever |

### Payments
- Payment provider not yet integrated (Stripe not available in Georgia — researching Paddle/alternatives)
- Pricing page built at `/pricing` with placeholder prices

---

## Lazy Loading Architecture

All route-level pages are loaded via `React.lazy` in `src/router.tsx`, wrapped in a single top-level `<Suspense>`. This covers all lazy children — no need for nested `<Suspense>` boundaries in individual pages.

Heavy components also lazy-loaded:
- `SvgCodeEditor` (CodeMirror ~120KB) — lazy in `svg-editor.tsx`
- `CropEditor` — lazy in `image-editor.tsx`
- `FaviconResults` — lazy in `favicons.tsx` (type imported separately with `import type`)

Heavy libraries dynamically imported at call-site:
- `JSZip` — dynamic import inside `downloadAll` in `converted.tsx` and `favicon-results.tsx`
- `svgo` — dynamic import inside `optimizeSvg` in `svg-utils.ts` — must import from `svgo/browser` (not `svgo`) to avoid pulling in Node built-ins (`os`, `fs`, `path`) via `svgo-node.js`

Because `optimizeSvg` is async, `toMinifiedUri` and `toCodeSnippet` are also async. In `svg-editor.tsx`, any value derived from these uses `useEffect` + `useState` instead of `useMemo`.

Named export lazy pattern: `lazy(() => import('...').then(m => ({ default: m.NamedExport })))`

---

## Dev Notes

- No responsive breakpoints — desktop-only app, no `sm:`/`md:`/`lg:` classes
- Icon colors use full opacity only — no `/40` or similar opacity variants on icon colors
- Commit messages: single line, no body, no bullet points, no co-author trailer
- shadcn components: never overwrite existing files on install
- `TooltipTrigger` renders as an inline element by default — add `flex-1 min-w-0` directly to it (not a child span) when truncation inside a flex row is needed
- Vite build uses `manualChunks` to split `@supabase` → `supabase`, `@base-ui`+`@floating-ui` → `ui-vendor`, `react`+`react-dom`+`react-router` → `react-vendor`. App entry chunk is ~68 KB.
