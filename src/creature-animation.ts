import type { CreatureAnimationName, CreatureAnimationDefinition, LoadedCreature } from './creature-registry'

export const animationStates = ['idle', 'jump', 'attack', 'hurt', 'sleep', 'happy'] as const
export type AnimationState = CreatureAnimationName

export function createAnimationController() {
  let current: AnimationState = 'idle'
  let creature: LoadedCreature | null = null
  let element: HTMLElement | null = null
  let wrapper: HTMLElement | null = null
  let frameTimer = 0
  let animationStartedAt = 0
  let onChange: (state: AnimationState) => void = () => {}
  let scale = 1

  const stop = () => {
    window.clearTimeout(frameTimer)
    frameTimer = 0
  }

  const activeDefinition = (): CreatureAnimationDefinition | undefined => creature?.animations[current]

  const resolveAnimation = (requested: AnimationState): AnimationState => {
    if (!creature || creature.animations[requested]) return requested
    if (creature.animations.idle) return 'idle'
    return (Object.keys(creature.animations)[0] as AnimationState | undefined) ?? 'idle'
  }

  const draw = (frameIndex: number) => {
    if (!creature || !element || !wrapper) return
    const definition = activeDefinition()
    if (!definition) return
    const rect = definition.rects?.[frameIndex]
    const x = rect?.[0] ?? frameIndex * creature.cell[0]
    const y = rect?.[1] ?? definition.y
    element.dataset.animation = current
    element.setAttribute('aria-label', `Companion animation: ${current}`)
    element.style.width = `${creature.cell[0] * scale}px`
    element.style.height = `${creature.cell[1] * scale}px`
    element.style.backgroundImage = `url('${creature.spriteSheetPath}')`
    element.style.backgroundSize = `${creature.image_size[0] * scale}px ${creature.image_size[1] * scale}px`
    element.style.backgroundPosition = `${-x * scale}px ${-y * scale}px`
    element.style.imageRendering = 'pixelated'
    wrapper.style.width = `${creature.cell[0] * scale}px`
    wrapper.style.height = `${creature.cell[1] * scale}px`
    wrapper.style.setProperty('--pet-anchor-x', `${creature.anchor.x * scale}px`)
    wrapper.style.setProperty('--pet-anchor-y', `${creature.anchor.y * scale}px`)
    wrapper.style.setProperty('--pet-anchor-x-offset', `${-creature.anchor.x * scale}px`)
    wrapper.style.setProperty('--pet-anchor-y-offset', `${-creature.anchor.y * scale}px`)
  }

  const play = (requested: AnimationState) => {
    stop()
    current = resolveAnimation(requested)
    animationStartedAt = performance.now()
    onChange(current)
    if (element) {
      element.dataset.animation = current
      element.setAttribute('aria-label', `Companion animation: ${current}`)
    }
    if (!creature || !element || !wrapper) return
    draw(0)
    frameTimer = window.setTimeout(tick, activeDefinition()?.frame_ms ?? 143)
  }

  const tick = () => {
    frameTimer = 0
    const definition = activeDefinition()
    if (!creature || !element || !wrapper || !definition) {
      play('idle')
      return
    }
    const time = performance.now()
    const elapsed = time - animationStartedAt
    const duration = definition.duration_ms || definition.frames * definition.frame_ms
    if (!definition.loop && elapsed >= duration) {
      play('idle')
      return
    }
    let frameIndex = Math.floor(elapsed / definition.frame_ms)
    if (frameIndex >= definition.frames) {
      if (!definition.loop) {
        play('idle')
        return
      }
      animationStartedAt += Math.floor(elapsed / duration) * duration
      frameIndex = Math.floor((time - animationStartedAt) / definition.frame_ms)
    }
    draw(definition.loop ? frameIndex % definition.frames : Math.min(frameIndex, definition.frames - 1))
    frameTimer = window.setTimeout(tick, definition.frame_ms)
  }

  return {
    bind(nextElement: HTMLElement, nextWrapper: HTMLElement) {
      element = nextElement
      wrapper = nextWrapper
      if (creature) {
        scale = creature.displayHeight / creature.cell[1]
        const definition = activeDefinition()
        const elapsed = performance.now() - animationStartedAt
        const frameIndex = definition
          ? Math.floor(elapsed / definition.frame_ms) % definition.frames
          : 0
        onChange(current)
        draw(frameIndex)
        if (!frameTimer) frameTimer = window.setTimeout(tick, definition?.frame_ms ?? 143)
      }
    },
    setCreature(nextCreature: LoadedCreature | null) {
      stop()
      creature = nextCreature
      current = resolveAnimation('idle')
      animationStartedAt = performance.now()
      onChange(current)
      if (!creature) {
        if (element) element.removeAttribute('style')
        if (wrapper) wrapper.removeAttribute('style')
        element = null
        wrapper = null
        return
      }
      scale = creature.displayHeight / creature.cell[1]
      if (element && wrapper) {
        draw(0)
        play(current)
      }
    },
    onStateChange(callback: (state: AnimationState) => void) {
      onChange = callback
      callback(current)
    },
    play,
    get current() { return current },
    get creature() { return creature },
    destroy() {
      stop()
      element = null
      wrapper = null
      creature = null
    },
  }
}
