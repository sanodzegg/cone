// ── SVGO ──────────────────────────────────────────────────────────────────────

export async function optimizeSvg(code: string): Promise<string> {
    try {
        const { optimize } = await import('svgo')
        const result = optimize(code, { plugins: ['preset-default'] })
        return result.data
    } catch {
        return code
    }
}

// ── Validation ────────────────────────────────────────────────────────────────

// Accepts SVG with optional leading <?xml?>, comments, and whitespace
export function isValidSvg(s: string): boolean {
    return /^\s*(<\?xml[^>]*\?>\s*)?(<!DOCTYPE[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(s)
}

// ── Data URIs ─────────────────────────────────────────────────────────────────

export function toBase64Uri(code: string): string {
    return `data:image/svg+xml;base64,${btoa(new TextDecoder('latin1').decode(new TextEncoder().encode(code)))}`
}

export function toEncodedUri(code: string): string {
    return `data:image/svg+xml,${encodeURIComponent(code)}`
}

export async function toMinifiedUri(code: string): Promise<string> {
    return `data:image/svg+xml,${encodeURIComponent(await optimizeSvg(code))}`
}

// ── Prettify ──────────────────────────────────────────────────────────────────

// Indent SVG markup with 2-space indentation
export function prettifySvg(code: string): string {
    try {
        let indent = 0
        const lines: string[] = []
        // Split on tag boundaries, preserving the tags
        const tokens = code
            .replace(/>\s*</g, '>\n<')  // ensure each tag is on its own line
            .split('\n')
            .map(t => t.trim())
            .filter(Boolean)

        for (const token of tokens) {
            const isClosing = /^<\//.test(token)
            const isSelfClosing = /\/>$/.test(token) || /^<!/.test(token) || /^<\?/.test(token)
            if (isClosing) indent = Math.max(0, indent - 1)
            lines.push('  '.repeat(indent) + token)
            if (!isClosing && !isSelfClosing) indent++
        }
        return lines.join('\n')
    } catch {
        return code
    }
}

// ── SVG metadata ──────────────────────────────────────────────────────────────

export interface SvgMeta {
    width: string | null
    height: string | null
    viewBox: string | null
}

export function extractMeta(code: string): SvgMeta {
    const attrs = code.match(/<svg([\s\S]*?)>/i)?.[1] ?? ''
    const get = (attr: string) => attrs.match(new RegExp(`${attr}="([^"]*)"`, 'i'))?.[1] ?? null
    return {
        width: get('width'),
        height: get('height'),
        viewBox: get('viewBox'),
    }
}

// ── Byte size display ─────────────────────────────────────────────────────────

export function byteSize(str: string): string {
    const bytes = new TextEncoder().encode(str).length
    if (bytes < 1024) return `${bytes} B`
    return `${(bytes / 1024).toFixed(1)} KB`
}

// ── Code snippets ─────────────────────────────────────────────────────────────

export type CodeFormat = 'SVG' | 'React' | 'Vue' | 'Angular' | 'Img'

export const CODE_FORMAT_OPTIONS: { label: string; value: CodeFormat }[] = [
    { label: 'SVG', value: 'SVG' },
    { label: 'React', value: 'React' },
    { label: 'Vue', value: 'Vue' },
    { label: 'Angular', value: 'Angular' },
    { label: 'HTML <img>', value: 'Img' },
]

function extractViewBox(code: string): string {
    const attrs = code.match(/<svg([\s\S]*?)\s*>/i)?.[1] ?? ''
    return attrs.match(/viewBox="([^"]*)"/i)?.[1] ?? ''
}

function extractBody(code: string): string {
    return code.replace(/^[\s\S]*?<svg[\s\S]*?>([\s\S]*)<\/svg>[\s\S]*$/i, '$1').trim()
}

// Strip <?xml?> and comments for framework snippets
function stripBoilerplate(code: string): string {
    return code
        .replace(/<\?xml[\s\S]*?\?>\s*/gi, '')
        .replace(/<!--[\s\S]*?-->\s*/g, '')
        .trim()
}

export async function toCodeSnippet(code: string, format: CodeFormat): Promise<string> {
    const clean = stripBoilerplate(code)

    switch (format) {
        case 'SVG': return code

        case 'React': {
            const viewBox = extractViewBox(clean)
            const body = extractBody(clean)
            const vbAttr = viewBox ? `\n    viewBox="${viewBox}"` : ''
            return `import * as React from "react"

const SVGComponent = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"${vbAttr}
    {...props}
  >
    ${body.replace(/\n/g, '\n    ')}
  </svg>
)

export default SVGComponent`
        }

        case 'Vue': {
            const viewBox = extractViewBox(clean)
            const body = extractBody(clean)
            const vbAttr = viewBox ? ` viewBox="${viewBox}"` : ''
            return `<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"${vbAttr}
    v-bind="$attrs"
  >
    ${body.replace(/\n/g, '\n    ')}
  </svg>
</template>

<script setup lang="ts">
// Drop this component anywhere — attrs (class, style, etc.) pass through automatically
</script>`
        }

        case 'Angular': {
            const viewBox = extractViewBox(clean)
            const body = extractBody(clean)
            const vbAttr = viewBox ? `\n      viewBox="${viewBox}"` : ''
            return `import { Component, Input } from '@angular/core'
import { CommonModule } from '@angular/common'

@Component({
  selector: 'app-svg-icon',
  standalone: true,
  imports: [CommonModule],
  template: \`
    <svg
      xmlns="http://www.w3.org/2000/svg"${vbAttr}
      [attr.width]="width"
      [attr.height]="height"
      [attr.class]="className"
    >
      ${body.replace(/\n/g, '\n      ')}
    </svg>
  \`,
})
export class SvgIconComponent {
  @Input() width = '24'
  @Input() height = '24'
  @Input() className = ''
}`
        }

        case 'Img': {
            const opt = await optimizeSvg(code)
            return `<img src="${toBase64Uri(opt)}" alt="icon" width="24" height="24" />`
        }

        default: return code
    }
}
