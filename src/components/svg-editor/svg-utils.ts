// ── SVGO ──────────────────────────────────────────────────────────────────────

export async function optimizeSvg(code: string): Promise<string> {
    try {
        const { optimize } = await import('svgo/browser')
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

// ── Element color picking ─────────────────────────────────────────────────────

const SKIP_COLORS = new Set(['none', 'currentcolor', 'inherit', 'transparent', ''])

function isColorable(value: string): boolean {
    return !SKIP_COLORS.has(value.trim().toLowerCase())
}

// Walk all elements in depth-first order, assign an index to those with a
// colorable fill or stroke attribute. Returns the index counter after walking.
function walkColorable(el: Element, idx: { n: number }, fn: (el: Element, i: number, attr: string) => void) {
    const fill = el.getAttribute('fill')
    const stroke = el.getAttribute('stroke')
    if (fill && isColorable(fill)) { fn(el, idx.n++, 'fill') }
    else if (stroke && isColorable(stroke)) { fn(el, idx.n++, 'stroke') }
    for (const child of Array.from(el.children)) {
        walkColorable(child, idx, fn)
    }
}

// Inject data-svg-idx on colorable elements so the preview DOM can be linked back.
// If selectedIdx is provided, also bake the selection stroke onto that element.
export function injectColorIdx(code: string, selectedIdx: number | null = null): string {
    try {
        const parser = new DOMParser()
        const doc = parser.parseFromString(code, 'image/svg+xml')
        const svgEl = doc.documentElement
        if (svgEl.tagName === 'parsererror') return code
        const idx = { n: 0 }
        walkChildren(svgEl, idx, (el, i) => {
            el.setAttribute('data-svg-idx', String(i))
            if (i === selectedIdx) {
                const outline = el.cloneNode(false) as Element
                // Remove fill so only the stroke shows; clear style/visibility attrs that might hide it
                outline.setAttribute('fill', 'none')
                outline.setAttribute('stroke', '#a855f7')
                outline.setAttribute('stroke-width', '6')
                outline.setAttribute('vector-effect', 'non-scaling-stroke')
                outline.removeAttribute('data-svg-idx')
                outline.removeAttribute('style')
                outline.removeAttribute('display')
                outline.removeAttribute('visibility')
                outline.removeAttribute('opacity')
                // Wrap in a group: outline behind, original on top
                const group = el.ownerDocument!.createElementNS('http://www.w3.org/2000/svg', 'g')
                el.parentNode!.insertBefore(group, el)
                group.appendChild(outline)
                group.appendChild(el)
            }
        })
        return new XMLSerializer().serializeToString(doc)
    } catch {
        return code
    }
}

export interface ElementColorInfo {
    color: string
    attrName: 'fill' | 'stroke'
}

// Walk only children of the svg root (not the root itself)
function walkChildren(svgEl: Element, idx: { n: number }, fn: (el: Element, i: number, attr: string) => void) {
    for (const child of Array.from(svgEl.children)) {
        walkColorable(child, idx, fn)
    }
}

// Return the color + attribute for the nth colorable element
export function getElementColor(code: string, idx: number): ElementColorInfo | null {
    try {
        const parser = new DOMParser()
        const doc = parser.parseFromString(code, 'image/svg+xml')
        const svgEl = doc.documentElement
        if (svgEl.tagName === 'parsererror') return null
        let result: ElementColorInfo | null = null
        const counter = { n: 0 }
        walkChildren(svgEl, counter, (el, i, attr) => {
            if (i === idx) {
                const color = el.getAttribute(attr) ?? ''
                result = { color, attrName: attr as 'fill' | 'stroke' }
            }
        })
        return result
    } catch {
        return null
    }
}

// Patch the nth colorable element's color and return the new SVG source.
// Uses targeted string replacement to preserve the original formatting.
export function patchElementColor(code: string, idx: number, newColor: string): string {
    try {
        const parser = new DOMParser()
        const doc = parser.parseFromString(code, 'image/svg+xml')
        const svgEl = doc.documentElement
        if (svgEl.tagName === 'parsererror') return code

        let oldColor = ''
        let attrName = ''
        const counter = { n: 0 }
        walkChildren(svgEl, counter, (el, i, attr) => {
            if (i === idx) {
                oldColor = el.getAttribute(attr) ?? ''
                attrName = attr
            }
        })
        if (!attrName || !oldColor) return code

        // Match both double- and single-quoted attribute values, not preceded by word/hyphen chars
        const pattern = new RegExp(`(?<![\\w-])(${attrName}=)(["'])${escapeRegex(oldColor)}\\2`, 'g')
        let occurrence = 0
        const preCounter = { n: 0 }
        let targetOccurrence = 0
        walkChildren(svgEl, preCounter, (el, i, attr) => {
            const val = el.getAttribute(attr) ?? ''
            if (i < idx && attr === attrName && val === oldColor) targetOccurrence++
        })
        return code.replace(pattern, (_match, attrPart, quote) => {
            if (occurrence++ === targetOccurrence) return `${attrPart}${quote}${newColor}${quote}`
            return _match
        })
    } catch {
        return code
    }
}

function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
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
