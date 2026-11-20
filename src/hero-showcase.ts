import { createAnimationController } from './creature-animation'
import { creatureRegistry, loadCreature, type CreatureConfig, type LoadedCreature } from './creature-registry'

const rotationDelay = 4500
const transitionDuration = 320

export function mountHeroShowcase(host: HTMLElement) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  host.innerHTML = `
    <section class="hero-showcase" aria-label="Pokecharm companions" aria-roledescription="carousel">
      ${[0, 1].map((slot) => `<div class="hero-showcase-backdrop" data-showcase-backdrop="${slot}"></div>`).join('')}
      <div class="hero-showcase-heading"><span>MEET YOUR COMPANION</span><span class="hero-showcase-count" data-showcase-count>01 / 04</span></div>
      <div class="hero-showcase-stage" aria-hidden="true">
        <div class="hero-showcase-ground"></div>
        ${[0, 1].map((slot) => `<div class="hero-showcase-layer ${slot === 0 ? 'is-active' : ''}" data-showcase-layer="${slot}"><div class="hero-showcase-pet"><div class="creature-sprite"></div></div></div>`).join('')}
      </div>
      <div class="hero-showcase-copy" aria-live="off">
        <h2 data-showcase-name>Spark</h2>
        <p class="hero-showcase-personality" data-showcase-personality>Bright · Energetic · Curious</p>
        <p class="hero-showcase-description" data-showcase-description></p>
      </div>
      <div class="hero-showcase-pagination" role="group" aria-label="Choose a companion">
        ${creatureRegistry.map((creature, index) => `<button type="button" data-showcase-choice="${index}" aria-label="Show ${creature.displayName}, ${creature.personality} companion" aria-pressed="${index === 0}" ${index === 0 ? 'class="is-active"' : ''}><span></span></button>`).join('')}
      </div>
    </section>`

  const showcase = host.querySelector<HTMLElement>('.hero-showcase')!
  const layers = [...host.querySelectorAll<HTMLElement>('[data-showcase-layer]')]
  const backdrops = [...host.querySelectorAll<HTMLElement>('[data-showcase-backdrop]')]
  const controllers = layers.map(() => createAnimationController())
  const sprites = layers.map((layer) => layer.querySelector<HTMLElement>('.creature-sprite')!)
  const pets = layers.map((layer) => layer.querySelector<HTMLElement>('.hero-showcase-pet')!)
  controllers.forEach((controller, index) => controller.bind(sprites[index], pets[index]))

  const count = host.querySelector<HTMLElement>('[data-showcase-count]')!
  const name = host.querySelector<HTMLElement>('[data-showcase-name]')!
  const personality = host.querySelector<HTMLElement>('[data-showcase-personality]')!
  const description = host.querySelector<HTMLElement>('[data-showcase-description]')!
  const choices = [...host.querySelectorAll<HTMLButtonElement>('[data-showcase-choice]')]
  let activeIndex = 0
  let activeSlot = 0
  let activeBackdrop = -1
  let rotationTimer = 0
  let transitionTimer = 0
  let transitioningOut: number | null = null
  let requestId = 0
  let rotations = 0
  let pointerInside = false
  let focusInside = false
  let destroyed = false

  const isPaused = () => pointerInside || focusInside || document.hidden || reducedMotion.matches

  const finishTransition = () => {
    window.clearTimeout(transitionTimer)
    transitionTimer = 0
    if (transitioningOut !== null) {
      controllers[transitioningOut].setCreature(null)
      layers[transitioningOut].classList.remove('is-active')
      transitioningOut = null
    }
    layers[activeSlot].classList.add('is-active')
  }

  const scheduleRotation = () => {
    window.clearTimeout(rotationTimer)
    rotationTimer = 0
    if (destroyed || isPaused()) return
    rotationTimer = window.setTimeout(() => {
      rotationTimer = 0
      void showCompanion((activeIndex + 1) % creatureRegistry.length, true)
    }, rotationDelay)
  }

  const applyTheme = (config: CreatureConfig) => {
    const nextBackdrop = activeBackdrop === 0 ? 1 : 0
    backdrops[nextBackdrop].style.background = config.theme.background
    showcase.style.setProperty('--showcase-primary', config.theme.primary)
    showcase.style.setProperty('--showcase-secondary', config.theme.secondary)
    showcase.style.setProperty('--showcase-accent', config.theme.accent)
    showcase.style.setProperty('--showcase-text-accent', config.theme.textAccent)
    requestAnimationFrame(() => {
      backdrops[nextBackdrop].classList.add('is-active')
      if (activeBackdrop !== -1) backdrops[activeBackdrop].classList.remove('is-active')
      activeBackdrop = nextBackdrop
    })
  }

  const showCompanion = async (nextIndex: number, automatic = false) => {
    if (destroyed || (automatic && isPaused())) return
    const request = ++requestId
    const config = creatureRegistry[nextIndex]
    let loaded: LoadedCreature
    try {
      loaded = await loadCreature(config)
    } catch (error) {
      console.error(`Could not show ${config.displayName} in the hero showcase`, error)
      scheduleRotation()
      return
    }
    if (destroyed || request !== requestId) return
    if (automatic && isPaused()) {
      scheduleRotation()
      return
    }

    finishTransition()
    const nextSlot = activeSlot === 0 ? 1 : 0
    const outgoingSlot = activeSlot
    const incoming = controllers[nextSlot]
    incoming.bind(sprites[nextSlot], pets[nextSlot])
    incoming.setCreature(loaded)
    applyTheme(config)
    if (!reducedMotion.matches && rotations > 0 && rotations % 3 === 2 && loaded.animations.happy) incoming.play('happy')

    activeIndex = nextIndex
    activeSlot = nextSlot
    count.textContent = `${String(nextIndex + 1).padStart(2, '0')} / ${String(creatureRegistry.length).padStart(2, '0')}`
    name.textContent = config.displayName
    personality.textContent = config.showcaseTraits
    description.textContent = config.showcaseDescription
    choices.forEach((choice, index) => {
      const selected = index === nextIndex
      choice.setAttribute('aria-pressed', String(selected))
      choice.classList.toggle('is-active', selected)
    })

    transitioningOut = outgoingSlot
    layers[outgoingSlot].classList.remove('is-active')
    layers[nextSlot].classList.add('is-active')
    rotations += 1
    transitionTimer = window.setTimeout(() => {
      if (request !== requestId || destroyed) return
      controllers[outgoingSlot].setCreature(null)
      transitioningOut = null
      transitionTimer = 0
      scheduleRotation()
    }, reducedMotion.matches ? 0 : transitionDuration)
  }

  const onPointerEnter = () => {
    pointerInside = true
    window.clearTimeout(rotationTimer)
    rotationTimer = 0
  }
  const onPointerLeave = () => {
    pointerInside = false
    scheduleRotation()
  }
  const onFocusIn = () => {
    focusInside = true
    window.clearTimeout(rotationTimer)
    rotationTimer = 0
  }
  const onFocusOut = (event: FocusEvent) => {
    if (event.relatedTarget instanceof Node && showcase.contains(event.relatedTarget)) return
    focusInside = false
    scheduleRotation()
  }
  const onVisibilityChange = () => scheduleRotation()
  const onMotionChange = () => scheduleRotation()

  showcase.addEventListener('pointerenter', onPointerEnter)
  showcase.addEventListener('pointerleave', onPointerLeave)
  showcase.addEventListener('focusin', onFocusIn)
  showcase.addEventListener('focusout', onFocusOut)
  document.addEventListener('visibilitychange', onVisibilityChange)
  reducedMotion.addEventListener('change', onMotionChange)
  choices.forEach((choice) => choice.addEventListener('click', () => {
    const index = Number(choice.dataset.showcaseChoice)
    window.clearTimeout(rotationTimer)
    rotationTimer = 0
    void showCompanion(index)
  }))

  void showCompanion(0).then(() => {
    if (activeIndex === 0 && !transitioningOut) scheduleRotation()
  })

  return () => {
    if (destroyed) return
    destroyed = true
    requestId += 1
    window.clearTimeout(rotationTimer)
    window.clearTimeout(transitionTimer)
    showcase.removeEventListener('pointerenter', onPointerEnter)
    showcase.removeEventListener('pointerleave', onPointerLeave)
    showcase.removeEventListener('focusin', onFocusIn)
    showcase.removeEventListener('focusout', onFocusOut)
    document.removeEventListener('visibilitychange', onVisibilityChange)
    reducedMotion.removeEventListener('change', onMotionChange)
    controllers.forEach((controller) => controller.destroy())
    host.replaceChildren()
  }
}
