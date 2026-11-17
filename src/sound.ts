export interface SoundConfiguration {
  defaultEnabled: boolean
}

// Add licensed/original audio sources per companion when ready; preview remains silent until then.
export const soundConfiguration: SoundConfiguration = {
  defaultEnabled: false,
}

export function playConfiguredSound(source?: string) {
  if (!source || typeof Audio === 'undefined') return false
  const audio = new Audio(source)
  void audio.play().catch(() => undefined)
  return true
}
