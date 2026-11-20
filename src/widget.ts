import { createCompanionState } from './companion-state'
import { getCompanionArt } from './companions'
import { animationStates, createAnimationController, type AnimationState } from './creature-animation'
import { createCursorChaseController } from './cursor-chase'
import { chooseCompanionMessage, getCompanionMessage, type CompanionAction } from './dialogue'
import { getCreatureForCompanion, loadCreature, type LoadedCreature } from './creature-registry'
import { createPokeballController } from './pokeball-controller'

const animationActions: Record<Exclude<AnimationState, 'run' | 'walk'>, CompanionAction> = {
  idle: 'idle',
  jump: 'jump',
  attack: 'attack',
  hurt: 'hurt',
  sleep: 'sleep',
  happy: 'happy',
}

export function mountCompanionPreview(root: HTMLElement) {
  const model = createCompanionState()
  const { state } = model
  let idleTimer = 0
  let blinkTimer = 0
  let messageTimer = 0
  let repeatClickTimer = 0
  let lastPatAt = 0
  let hurtCooldownUntil = 0
  let informationOpen = false
  let quietCycles = 0
  let activeCreature: LoadedCreature | null = null
  let ballController: ReturnType<typeof createPokeballController> | null = null
  let ballBusy = false
  let companionCaptured = false
  let creatureRequest = 0
  const animation = createAnimationController()
  const chase = createCursorChaseController((state) => animation.play(state))

  state.dialogue = getCompanionMessage(state.companion.id, 'idle')

  const messageFor = (action: CompanionAction) => activeCreature?.companionId === state.companion.id
    ? chooseCompanionMessage(activeCreature.dialogue, action)
    : getCompanionMessage(state.companion.id, action)

  const setMessage = (action: CompanionAction, duration = 2000) => {
    window.clearTimeout(messageTimer)
    state.dialogue = messageFor(action)
    const speech = root.querySelector<HTMLElement>('.companion-speech')
    const dialogue = speech?.querySelector<HTMLElement>('p')
    if (dialogue) dialogue.textContent = state.dialogue
    if (!speech) return
    const style = action === 'idle' || action === 'sleep' ? 'thought' : 'speech'
    speech.dataset.style = style
    speech.classList.add('is-visible')
    chase.refreshPosition()
    messageTimer = window.setTimeout(() => {
      speech.classList.remove('is-visible')
      state.dialogue = messageFor('idle')
    }, duration)
  }

  const playEvent = (action: CompanionAction, selectedAnimation: AnimationState, pause = 1050) => {
    chase.pauseFor(pause)
    animation.play(selectedAnimation)
    setMessage(action)
    quietCycles = 0
    scheduleIdle()
  }

  const render = () => {
    ballController?.destroy()
    ballController = null
    ballBusy = false
    companionCaptured = false
    const creature = getCreatureForCompanion(state.companion.id)
    const loadedCreature = activeCreature?.companionId === state.companion.id ? activeCreature : null
    const theme = loadedCreature?.theme ?? creature?.theme
    const themeStyle = theme
      ? `--companion-primary:${theme.primary};--companion-secondary:${theme.secondary};--companion-background:${theme.background};--companion-accent:${theme.accent};--companion-text-accent:${theme.textAccent}`
      : ''
    const companionArt = loadedCreature
      ? `<button class="companion-art" type="button" aria-label="Pat ${escapeHtml(state.name)}"><span class="creature-sprite" data-animation="${animation.current}" aria-label="Companion animation: ${animation.current}"></span></button>`
      : creature
        ? `<div class="creature-loading" role="status">Loading ${escapeHtml(creature.displayName)}…</div>`
        : `<button class="companion-art companion-placeholder" type="button" aria-label="Pat ${escapeHtml(state.name)}" style="width:75px;height:75px;--pet-anchor-x:37.5px;--pet-anchor-y:67.5px;--pet-anchor-x-offset:-37.5px;--pet-anchor-y-offset:-67.5px">${getCompanionArt(state.companion)}</button>`
    root.innerHTML = `
      <section class="demo-card" aria-label="Interactive companion playground" style="${themeStyle}">
        <div class="playground-heading"><div><span class="mini-label">POKECHARM PLAYGROUND</span><h3>Spend a little time together</h3></div><div class="playground-tools"><button class="companion-info-toggle" type="button" aria-label="Companion information" aria-expanded="${informationOpen}" aria-controls="companion-info">i</button><aside class="companion-info-panel" id="companion-info" role="dialog" aria-label="Companion information" ${informationOpen ? '' : 'hidden'}><button class="companion-info-close" type="button" aria-label="Close companion information">×</button><span class="mini-label">YOUR COMPANION</span><h4>${escapeHtml(state.name)}</h4><p class="info-personality">${escapeHtml(creature?.personality ?? state.companion.label)} · ${escapeHtml(creature?.displayName ?? state.companion.defaultName)}</p><p class="info-instructions">Click once to give a gentle pat. A quick second click gets a surprised reaction. Choose an animation below.</p></aside></div></div>
        <div class="playground-stage">
          <div class="companion-speech" data-style="speech" role="status" aria-live="polite"><span class="companion-speech-trail" aria-hidden="true"><i></i><i></i><i></i></span><p>${escapeHtml(state.dialogue)}</p></div>
          ${companionArt}
          <div class="stage-ground" aria-hidden="true"></div>
        </div>
        <div class="demo-controls">
          <div class="demo-control-heading"><div><span class="mini-label">YOUR COMPANION</span><h3>${escapeHtml(state.name)}</h3></div></div>
          <div class="animation-picker" aria-label="Preview companion animations"><span>ANIMATIONS</span>${animationStates.map((name) => `<button type="button" data-animation-choice="${name}" aria-pressed="${animation.current === name}" ${creature && (!loadedCreature || !loadedCreature.animations[name]) ? 'disabled' : ''}>${name}</button>`).join('')}</div>
          <div class="settings-row"><label class="name-field">Name your companion<input aria-label="Companion name" maxlength="18" value="${escapeHtml(state.name)}"></label></div>
        </div>
      </section>`

    const sprite = root.querySelector<HTMLElement>('.creature-sprite')
    const pet = root.querySelector<HTMLElement>('.companion-art')
    if (sprite && pet && loadedCreature) animation.bind(sprite, pet)
    const playground = root.querySelector<HTMLElement>('.playground-stage')
    if (playground && pet) chase.attach(playground, pet, loadedCreature?.behavior)
    else chase.detach()
    const dialogue = root.querySelector<HTMLElement>('.companion-speech')
    if (playground && pet && dialogue && loadedCreature) {
      const companion = loadedCreature
      const storageKey = `pokecharm:playground-capture:${encodeURIComponent(window.location.origin)}:${encodeURIComponent(companion.id)}`
      const mountedBall = createPokeballController(playground, pet, dialogue, {
        idleUrl: '/assets/pokeball/pokecharm-orb-idle.png',
        sheetUrl: '/assets/pokeball/pokecharm-orb-sheet.png',
        storageKey,
        position: { horizontal: 'left', vertical: 'bottom', edgeOffset: 24 },
        getCompanionBounds: () => {
          const scale = pet.offsetHeight / companion.cell[1]
          const anchorX = companion.anchor.x * scale
          const anchorY = companion.anchor.y * scale
          const homeX = playground.clientWidth / 2
          const homeY = playground.clientHeight - 54
          const flipped = getComputedStyle(pet).getPropertyValue('--pet-facing').trim() === '-1'
          return {
            left: homeX + (flipped ? anchorX - companion.visualBounds.right * scale : companion.visualBounds.left * scale - anchorX),
            top: homeY + companion.visualBounds.top * scale - anchorY,
            right: homeX + (flipped ? anchorX - companion.visualBounds.left * scale : companion.visualBounds.right * scale - anchorX),
            bottom: homeY + companion.visualBounds.bottom * scale - anchorY,
          }
        },
        onBusyChange: (busy) => {
          ballBusy = busy
          chase.setPaused(busy)
          window.clearTimeout(idleTimer)
          if (!busy) scheduleIdle()
        },
        onCapturedChange: (captured) => {
          companionCaptured = captured
          pet.classList.toggle('is-pokecharm-captured', captured)
          dialogue.classList.toggle('is-pokecharm-captured', captured)
        },
        onRelease: (ballPosition) => {
          const stageBounds = playground.getBoundingClientRect()
          chase.moveTo(stageBounds.left + ballPosition.x - 66, stageBounds.top + ballPosition.y)
          animation.play('jump')
          setMessage('happy')
        },
      })
      ballController = mountedBall
      void mountedBall.ready.catch((error: unknown) => {
        if (ballController !== mountedBall) return
        console.warn('Pokecharm playground Pokéball assets could not be loaded', error)
        mountedBall.destroy()
        ballController = null
      })
    }
    animation.onStateChange((current) => {
      root.querySelectorAll<HTMLButtonElement>('[data-animation-choice]').forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.animationChoice === current))
      })
    })

    root.querySelector<HTMLButtonElement>('.companion-info-toggle')?.addEventListener('click', () => {
      informationOpen = !informationOpen
      const toggle = root.querySelector<HTMLButtonElement>('.companion-info-toggle')
      const panel = root.querySelector<HTMLElement>('.companion-info-panel')
      if (toggle) toggle.setAttribute('aria-expanded', String(informationOpen))
      if (panel) panel.hidden = !informationOpen
    })
    root.querySelector<HTMLButtonElement>('.companion-info-close')?.addEventListener('click', () => {
      informationOpen = false
      const toggle = root.querySelector<HTMLButtonElement>('.companion-info-toggle')
      const panel = root.querySelector<HTMLElement>('.companion-info-panel')
      if (panel) panel.hidden = true
      if (toggle) {
        toggle.setAttribute('aria-expanded', 'false')
        toggle.focus()
      }
    })
    root.querySelector<HTMLButtonElement>('.companion-art')?.addEventListener('click', () => {
      if (ballBusy || companionCaptured) return
      const now = Date.now()
      if (now < hurtCooldownUntil) return
      if (now - lastPatAt <= 1100 && lastPatAt > 0) {
        lastPatAt = 0
        hurtCooldownUntil = now + 1100
        window.clearTimeout(repeatClickTimer)
        playEvent('hurt', 'hurt', 850)
        repeatClickTimer = window.setTimeout(() => {
          hurtCooldownUntil = 0
        }, 1100)
        return
      }
      lastPatAt = now
      playEvent('pat', 'happy', 1000)
    })
    root.querySelectorAll<HTMLButtonElement>('[data-animation-choice]').forEach((button) => {
      button.addEventListener('click', () => {
        const choice = button.dataset.animationChoice as Exclude<AnimationState, 'run' | 'walk'>
        playEvent(animationActions[choice], choice, choice === 'idle' || choice === 'sleep' ? 2500 : 1050)
      })
    })
    root.querySelector<HTMLInputElement>('.name-field input')?.addEventListener('change', (event) => {
      model.rename((event.currentTarget as HTMLInputElement).value)
      render()
    })
  }

  const scheduleIdle = () => {
    window.clearTimeout(idleTimer)
    idleTimer = window.setTimeout(() => {
      state.mood = 'curious'
      if (animation.current === 'sleep') {
        scheduleIdle()
        return
      }
      quietCycles += 1
      if (quietCycles >= 3) {
        quietCycles = 0
        animation.play('sleep')
        setMessage('sleep')
      } else {
        setMessage('idle')
      }
      scheduleIdle()
    }, 25000 + Math.random() * 15000)
  }

  const scheduleBlink = () => {
    window.clearTimeout(blinkTimer)
    blinkTimer = window.setTimeout(() => {
      const stage = root.querySelector<HTMLElement>('.playground-stage')
      stage?.classList.add('blink')
      window.setTimeout(() => stage?.classList.remove('blink'), 180)
      scheduleBlink()
    }, 3000 + Math.random() * 5000)
  }

  const activateCompanion = (id: string, greet = true) => {
    model.choose(id)
    const request = ++creatureRequest
    window.clearTimeout(repeatClickTimer)
    lastPatAt = 0
    hurtCooldownUntil = 0
    activeCreature = null
    chase.reset()
    chase.detach()
    animation.setCreature(null)
    render()
    if (greet) setMessage('greeting')
    const creature = getCreatureForCompanion(state.companion.id)
    if (!creature) return
    void loadCreature(creature).then((loaded) => {
      if (request !== creatureRequest || state.companion.id !== loaded.companionId) return
      activeCreature = loaded
      animation.setCreature(loaded)
      render()
    }).catch((error: unknown) => {
      if (request !== creatureRequest) return
      state.dialogue = `I couldn’t load ${creature.displayName} just now.`
      console.error(error)
      render()
    })
  }

  render()
  const initialCreature = getCreatureForCompanion(state.companion.id)
  if (initialCreature) {
    const request = ++creatureRequest
    void loadCreature(initialCreature).then((loaded) => {
      if (request !== creatureRequest || state.companion.id !== loaded.companionId) return
      activeCreature = loaded
      animation.setCreature(loaded)
      render()
    }).catch((error: unknown) => {
      if (request !== creatureRequest) return
      state.dialogue = `I couldn’t load ${initialCreature.displayName} just now.`
      console.error(error)
      render()
    })
  }
  scheduleIdle()
  scheduleBlink()
  return {
    choose: (id: string) => activateCompanion(id),
    destroy: () => {
      ballController?.destroy()
      ballController = null
      window.clearTimeout(idleTimer)
      window.clearTimeout(blinkTimer)
      window.clearTimeout(messageTimer)
      window.clearTimeout(repeatClickTimer)
      chase.destroy()
      animation.destroy()
    },
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character)
}
