import { optimize } from 'svgo'

export function optimizeSvg(code: string): string {
  try {
    const result = optimize(code)
    return result.data
  } catch {
    return code
  }
}

export function toBase64Uri(code: string): string {
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(code)))}`
}

export function toEncodedUri(code: string): string {
  return `data:image/svg+xml,${encodeURIComponent(code)}`
}

export function toMinifiedUri(code: string): string {
  return `data:image/svg+xml,${encodeURIComponent(optimizeSvg(code))}`
}

export function byteSize(str: string): string {
  const bytes = new TextEncoder().encode(str).length
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

export type CodeFormat = 'SVG' | 'React' | 'Vue' | 'Angular' | 'Img'

export const CODE_FORMAT_OPTIONS: { label: string; value: CodeFormat }[] = [
  { label: 'SVG', value: 'SVG' },
  { label: 'React', value: 'React' },
  { label: 'Vue', value: 'Vue' },
  { label: 'Angular', value: 'Angular' },
  { label: 'HTML <img>', value: 'Img' },
]

function extractViewBox(code: string): string {
  const attrs = code.match(/<svg([^>]*)/)?.[1] ?? ''
  return attrs.match(/viewBox="([^"]*)"/)?.[1] ?? ''
}

function extractBody(code: string): string {
  return code.replace(/^[\s\S]*?<svg[^>]*>([\s\S]*)<\/svg>[\s\S]*$/, '$1').trim()
}

export function toCodeSnippet(code: string, format: CodeFormat): string {
  const inner = code.replace(/<\?xml[^>]*\?>\s*/g, '').replace(/<!--[\s\S]*?-->/g, '')

  switch (format) {
    case 'SVG': return code

    case 'React': {
      const viewBox = extractViewBox(inner)
      const body = extractBody(inner)
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
      const viewBox = extractViewBox(inner)
      const body = extractBody(inner)
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
      const viewBox = extractViewBox(inner)
      const body = extractBody(inner)
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
      const uri = toBase64Uri(optimizeSvg(code))
      return `<img src="${uri}" alt="icon" width="24" height="24" />`
    }

    default: return code
  }
}
