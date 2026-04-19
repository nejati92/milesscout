import { useEffect, useRef } from 'react'

interface Props {
  stream: MediaStream
  height?: number
}

export function WaveformVisualizer({ stream, height = 48 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const audioCtx = new AudioContext()
    const source = audioCtx.createMediaStreamSource(stream)
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.82
    source.connect(analyser)

    const bars: number[] = []
    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    let raf: number
    let frame = 0

    // Size canvas to its CSS container once
    canvas.width = canvas.offsetWidth || 300
    canvas.height = height

    function draw() {
      raf = requestAnimationFrame(draw)
      analyser.getByteTimeDomainData(dataArray)

      // RMS amplitude
      let sum = 0
      for (let i = 0; i < dataArray.length; i++) {
        const v = (dataArray[i] - 128) / 128
        sum += v * v
      }
      const rms = Math.sqrt(sum / dataArray.length)

      // Push a new sample every 3 frames (~20fps at 60fps)
      frame++
      if (frame % 3 === 0) {
        bars.push(Math.min(1, rms * 6))
        const W = canvas.width
        const maxBars = Math.floor(W / 5)
        while (bars.length > maxBars) bars.shift()
      }

      const ctx = canvas.getContext('2d')!
      const W = canvas.width
      const H = canvas.height
      ctx.clearRect(0, 0, W, H)

      const barW = 3
      const gap = 2
      const step = barW + gap
      const cy = H / 2

      // Gradient: indigo → violet → indigo
      const grad = ctx.createLinearGradient(0, cy - H * 0.5, 0, cy + H * 0.5)
      grad.addColorStop(0,   'rgba(99, 102, 241, 0.8)')  // indigo-500
      grad.addColorStop(0.5, 'rgba(167, 139, 250, 1)')   // violet-400
      grad.addColorStop(1,   'rgba(99, 102, 241, 0.8)')

      // Draw bars
      for (let i = 0; i < bars.length; i++) {
        const amp = bars[i]
        const bh = Math.max(2, amp * H * 0.88)
        const x = i * step
        ctx.fillStyle = grad
        ctx.beginPath()
        // Manual rounded rect for compatibility
        const r = Math.min(barW / 2, bh / 2)
        ctx.moveTo(x + r, cy - bh / 2)
        ctx.lineTo(x + barW - r, cy - bh / 2)
        ctx.arcTo(x + barW, cy - bh / 2, x + barW, cy - bh / 2 + r, r)
        ctx.lineTo(x + barW, cy + bh / 2 - r)
        ctx.arcTo(x + barW, cy + bh / 2, x + barW - r, cy + bh / 2, r)
        ctx.lineTo(x + r, cy + bh / 2)
        ctx.arcTo(x, cy + bh / 2, x, cy + bh / 2 - r, r)
        ctx.lineTo(x, cy - bh / 2 + r)
        ctx.arcTo(x, cy - bh / 2, x + r, cy - bh / 2, r)
        ctx.closePath()
        ctx.fill()
      }

      // Trailing dots for empty space
      const filledX = bars.length * step
      ctx.fillStyle = 'rgba(129, 140, 248, 0.18)'
      for (let x = filledX + step; x < W - step; x += step * 2) {
        ctx.beginPath()
        ctx.arc(x + barW / 2, cy, 1.5, 0, Math.PI * 2)
        ctx.fill()
      }

      // Playhead cursor
      const px = filledX + barW / 2
      if (px < W) {
        ctx.strokeStyle = 'rgba(167, 139, 250, 0.55)'
        ctx.lineWidth = 1.5
        ctx.setLineDash([])
        ctx.beginPath()
        ctx.moveTo(px, cy - H * 0.38)
        ctx.lineTo(px, cy + H * 0.38)
        ctx.stroke()
      }
    }

    draw()

    return () => {
      cancelAnimationFrame(raf)
      source.disconnect()
      audioCtx.close().catch(() => {})
    }
  }, [stream, height])

  return (
    <canvas
      ref={canvasRef}
      className="flex-1 min-w-0 block"
      style={{ height: `${height}px` }}
    />
  )
}
