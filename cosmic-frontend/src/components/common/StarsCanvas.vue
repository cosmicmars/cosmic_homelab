<template>
  <canvas ref="canvas" id="starsCanvas"></canvas>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const canvas = ref(null)

let ctx = null
let width = 0
let height = 0
let stars = []
let animationFrame = null

const STAR_COUNT = 200

function initStars() {
  stars = []
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2 + 1,
      speed: Math.random() * 0.5 + 0.2,
      brightness: Math.random() * 0.7 + 0.3
    })
  }
}

function resizeCanvas() {
  if (!canvas.value) return
  width = window.innerWidth
  height = window.innerHeight
  canvas.value.width = width
  canvas.value.height = height
  initStars()
}

function drawStars() {
  if (!ctx) return
  ctx.clearRect(0, 0, width, height)
  for (let star of stars) {
    ctx.beginPath()
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`
    ctx.fill()
  }
}

function updateStars() {
  for (let star of stars) {
    star.y -= star.speed
    if (star.y + star.radius < 0) {
      star.y = height + star.radius
      star.x = Math.random() * width
    }
  }
}

function animate() {
  updateStars()
  drawStars()
  animationFrame = requestAnimationFrame(animate)
}

onMounted(() => {
  if (!canvas.value) return
  ctx = canvas.value.getContext('2d')
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)
  animate()
})

onUnmounted(() => {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
  }
  window.removeEventListener('resize', resizeCanvas)
})
</script>

<style scoped>
#starsCanvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}
</style>