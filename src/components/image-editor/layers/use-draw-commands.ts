import { useState, useRef, useCallback } from 'react'

export type DrawTool = 'pen' | 'arrow' | 'rect'

export interface Point { x: number; y: number }

export type DrawCommand =
  | { type: 'path';  points: Point[]; color: string; width: number }
  | { type: 'arrow'; from: Point; to: Point; color: string; width: number }
  | { type: 'rect';  x: number; y: number; w: number; h: number; color: string; width: number }

export function useDrawCommands() {
  const [commands, setCommands_internal] = useState<DrawCommand[]>([])
  // Active stroke lives in a ref - never stale in mousemove callbacks
  const currentRef = useRef<DrawCommand | null>(null)
  const [currentSnapshot, setCurrentSnapshot] = useState<DrawCommand | null>(null)

  const startStroke = useCallback((tool: DrawTool, point: Point, color: string, width: number) => {
    let cmd: DrawCommand
    if (tool === 'pen')   cmd = { type: 'path', points: [point], color, width }
    else if (tool === 'arrow') cmd = { type: 'arrow', from: point, to: point, color, width }
    else                  cmd = { type: 'rect', x: point.x, y: point.y, w: 0, h: 0, color, width }
    currentRef.current = cmd
    setCurrentSnapshot(cmd)
  }, [])

  const continueStroke = useCallback((point: Point) => {
    const prev = currentRef.current
    if (!prev) return
    let next: DrawCommand
    if (prev.type === 'path')  next = { ...prev, points: [...prev.points, point] }
    else if (prev.type === 'arrow') next = { ...prev, to: point }
    else next = { ...prev, w: point.x - prev.x, h: point.y - prev.y }
    currentRef.current = next
    // snapshot update for react render (draw() reads currentRef directly)
    setCurrentSnapshot(next)
  }, [])

  const endStroke = useCallback(() => {
    const cmd = currentRef.current
    if (cmd) setCommands_internal(prev => [...prev, cmd])
    currentRef.current = null
    setCurrentSnapshot(null)
  }, [])

  const undo = useCallback(() => {
    setCommands_internal(prev => prev.slice(0, -1))
  }, [])

  const clear = useCallback(() => {
    setCommands_internal([])
    currentRef.current = null
    setCurrentSnapshot(null)
  }, [])

  const setCommands = useCallback((cmds: DrawCommand[]) => {
    setCommands_internal(cmds)
    currentRef.current = null
    setCurrentSnapshot(null)
  }, [])

  return {
    commands,
    current: currentSnapshot,
    currentRef,
    canUndo: commands.length > 0,
    startStroke,
    continueStroke,
    endStroke,
    undo,
    clear,
    setCommands,
  }
}

// Render a single draw command onto a canvas context
// coords are already in display/export space
export function renderCommand(ctx: CanvasRenderingContext2D, cmd: DrawCommand) {
  ctx.save()
  ctx.strokeStyle = cmd.color
  ctx.lineWidth = cmd.width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  if (cmd.type === 'path' && cmd.points.length > 1) {
    ctx.beginPath()
    ctx.moveTo(cmd.points[0].x, cmd.points[0].y)
    for (let i = 1; i < cmd.points.length - 1; i++) {
      const mx = (cmd.points[i].x + cmd.points[i + 1].x) / 2
      const my = (cmd.points[i].y + cmd.points[i + 1].y) / 2
      ctx.quadraticCurveTo(cmd.points[i].x, cmd.points[i].y, mx, my)
    }
    ctx.lineTo(cmd.points[cmd.points.length - 1].x, cmd.points[cmd.points.length - 1].y)
    ctx.stroke()
  }

  if (cmd.type === 'arrow') {
    const { from, to } = cmd
    const dx = to.x - from.x
    const dy = to.y - from.y
    const angle = Math.atan2(dy, dx)
    const headLen = Math.max(12, cmd.width * 4)

    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(to.x, to.y)
    ctx.lineTo(to.x - headLen * Math.cos(angle - Math.PI / 6), to.y - headLen * Math.sin(angle - Math.PI / 6))
    ctx.moveTo(to.x, to.y)
    ctx.lineTo(to.x - headLen * Math.cos(angle + Math.PI / 6), to.y - headLen * Math.sin(angle + Math.PI / 6))
    ctx.stroke()
  }

  if (cmd.type === 'rect') {
    ctx.strokeRect(cmd.x, cmd.y, cmd.w, cmd.h)
  }

  ctx.restore()
}
