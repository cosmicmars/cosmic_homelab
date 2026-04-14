import { ref, onMounted, provide, inject } from 'vue'

const toastSymbol = Symbol('toast')

export function createToastContainer() {
  const containerRef = ref(null)

  const show = (message, type = 'info', duration = 4000) => {
    containerRef.value?.add(message, type, duration)
  }

  const info = (message, duration) => show(message, 'info', duration)
  const success = (message, duration) => show(message, 'success', duration)
  const warning = (message, duration) => show(message, 'warning', duration)
  const error = (message, duration) => show(message, 'error', duration)

  return {
    containerRef,
    show,
    info,
    success,
    warning,
    error
  }
}

export function provideToast() {
  const toast = createToastContainer()
  provide(toastSymbol, toast)
  return toast
}

export function useToast() {
  const toast = inject(toastSymbol)
  if (!toast) {
    throw new Error('useToast must be used within a component that provides ToastContainer')
  }
  return toast
}