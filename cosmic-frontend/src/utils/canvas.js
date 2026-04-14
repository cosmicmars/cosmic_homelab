export function drawSmoothArea(canvas, color, dataPoints = []) {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  const w = rect.width
  const h = rect.height
  ctx.clearRect(0, 0, w, h)

  let points
  if (dataPoints && dataPoints.length > 0) {
    const maxVal = Math.max(...dataPoints, 1)
    points = dataPoints.map(v => (v / maxVal) * 0.8 + 0.1)
  } else {
    points = Array(16).fill(0.2)
  }

  const grad = ctx.createLinearGradient(0, 0, 0, h)
  grad.addColorStop(0, color + 'aa')
  grad.addColorStop(1, color + '05')

  ctx.beginPath()
  points.forEach((p, i) => {
    const x = (i / (points.length - 1)) * w
    const y = h - p * h
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  })
  ctx.lineTo(w, h)
  ctx.lineTo(0, h)
  ctx.closePath()

  ctx.fillStyle = grad
  ctx.fill()
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.stroke()
}