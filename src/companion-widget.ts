import { createAnimationController, type AnimationState } from './creature-animation'
import type { CompanionAction } from './dialogue'
import { chooseCompanionMessage } from './dialogue'
import { creatureRegistry, loadCreature, type CreatureTheme, type LoadedCreature } from './creature-registry'
import { createCursorChaseController } from './cursor-chase'
import type { ChaseDirection } from './cursor-chase'
import { createPokeballController } from './pokeball-controller'

export type CompanionWidgetPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'

export interface CompanionWidgetConfig {
  companion: string
  /** Public base URL containing the /assets/creatures directory. */
  assetBase?: string
  name?: string
  size?: { desktop?: number; mobile?: number }
  /** Render inside the supplied host instead of at a viewport corner. */
  viewportStage?: boolean
  position?: CompanionWidgetPosition
  edgeOffset?: number
  zIndex?: number
  theme?: Partial<CreatureTheme>
  clickToMove?: boolean
  scrollReactions?: boolean
  /** Optional legacy mode. Disabled by default. */
  followCursor?: boolean
  installationId?: string
  onAction?: (action: 'pat' | 'hurt') => void
  onStatus?: (status: CompanionWidgetStatus) => void
}

export interface CompanionWidgetStatus {
  state: 'loading' | 'ready' | 'error'
  message: string
}

export const defaultCompanionWidgetConfig = {
  size: { desktop: 96, mobile: 72 },
  position: 'bottom-right' as CompanionWidgetPosition,
  edgeOffset: 24,
  zIndex: 2147483000,
}

const behaviourPriority = {
  idle: 0,
  sleep: 1,
  autonomousJump: 2,
  movement: 4,
  visitorReaction: 5,
  secretJump: 6,
  wake: 7,
} as const

export function mountCompanionWidget(
  host: HTMLElement,
  config: CompanionWidgetConfig,
  shadowStyles = '',
) {
  const registryCreature = creatureRegistry.find((item) => item.id === config.companion || item.companionId === config.companion)
  if (!registryCreature) throw new Error(`Unknown Pokecharm companion: ${config.companion}`)
  const resolveAsset = (path: string) => config.assetBase
    ? new URL(path.replace(/^\//, ''), config.assetBase.endsWith('/') ? config.assetBase : `${config.assetBase}/`).href
    : path
  const creature = {
    ...registryCreature,
    spriteSheetPath: resolveAsset(registryCreature.spriteSheetPath),
    atlasPath: resolveAsset(registryCreature.atlasPath),
  }

  const size = { ...defaultCompanionWidgetConfig.size, ...config.size }
  const theme = { ...creature.theme, ...config.theme }
  const position = config.position ?? defaultCompanionWidgetConfig.position
  const clickToMove = config.clickToMove ?? true
  const scrollReactions = config.scrollReactions ?? true
  const followCursor = config.followCursor ?? false
  const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  style.textContent = shadowStyles
  shadow.replaceChildren(style)
  host.dataset.position = position
  host.dataset.followCursor = String(followCursor)
  host.dataset.viewportStage = String(config.viewportStage ?? true)
  host.style.setProperty('--embed-size', `${size.desktop}px`)
  host.style.setProperty('--embed-mobile-size', `${size.mobile}px`)
  host.style.setProperty('--embed-edge-offset', `${config.edgeOffset ?? defaultCompanionWidgetConfig.edgeOffset}px`)
  host.style.setProperty('--embed-z-index', String(config.zIndex ?? defaultCompanionWidgetConfig.zIndex))
  host.style.setProperty('--embed-accent', theme.accent)
  host.style.setProperty('--embed-secondary', theme.secondary)
  host.style.setProperty('--embed-text-accent', theme.textAccent)
  style.insertAdjacentHTML('afterend', `<div class="pokecharm-embedded-stage"><button class="pokecharm-embedded-art companion-art" type="button" aria-label="Pat companion"><span class="creature-sprite"></span></button><div class="companion-speech pokecharm-embedded-dialogue" data-style="speech" role="status" aria-live="polite"><span class="companion-speech-trail" aria-hidden="true"><i></i><i></i><i></i></span><p></p></div></div>`)

  const stage = shadow.querySelector<HTMLElement>('.pokecharm-embedded-stage')!
  const pet = shadow.querySelector<HTMLElement>('.pokecharm-embedded-art')!
  const sprite = shadow.querySelector<HTMLElement>('.creature-sprite')!
  const dialogue = shadow.querySelector<HTMLElement>('.companion-speech')!
  const controller = createAnimationController()
  let ballController: ReturnType<typeof createPokeballController> | null = null
  let ballBusy = false
  let companionCaptured = false
  const chase = createCursorChaseController((state) => playMovement(state))
  chase.setRestFacesTowardContent(true)
  controller.bind(sprite, pet)
  pet.setAttribute('aria-label', `Pat ${config.name?.trim() || creature.displayName}`)

  let loadedCreature: LoadedCreature | null = null
  let loadedDisplayHeight = size.desktop
  let messageTimer = 0
  let thoughtTimer = 0
  let sleepTimer = 0
  let autonomousJumpTimer = 0
  let wakeTimer = 0
  let clickSequenceTimer = 0
  let priorityTimer = 0
  let currentPriority = 0
  let priorityUntil = 0
  let sleepDeadline = 0
  let clickSequenceStartedAt = 0
  let clickSequenceCount = 0
  let lastJumpAt = 0
  let lastScrollX = window.scrollX
  let lastScrollY = window.scrollY
  let lastScrollDirection: ChaseDirection | null = null
  let scrollReturnTimer = 0
  let sleeping = false
  let waking = false
  let pendingWakeAction: (() => void) | null = null
  let pendingWakeActionPriority: number = behaviourPriority.idle
  let pendingClickDestination: { x: number; y: number } | null = null
  let pendingScrollDirection: ChaseDirection | null = null
  let scrollStopDeadline = 0
  let destroyed = false

  const status = (value: CompanionWidgetStatus) => {
    config.onStatus?.(value)
    window.dispatchEvent(new CustomEvent('pokecharm:status', { detail: { ...value, companion: creature.id, installationId: config.installationId } }))
  }

  const getDisplayHeight = (loaded: LoadedCreature) => {
    const boxSize = window.matchMedia('(max-width: 640px)').matches ? size.mobile : size.desktop
    return Math.min(boxSize, boxSize * loaded.cell[1] / loaded.cell[0])
  }

  const say = (message: string, styleName: 'speech' | 'thought', duration = 2000) => {
    window.clearTimeout(messageTimer)
    dialogue.dataset.style = styleName
    dialogue.querySelector('p')!.textContent = message
    dialogue.classList.add('is-visible')
    chase.refreshPosition()
    messageTimer = window.setTimeout(() => dialogue.classList.remove('is-visible'), duration)
  }

  const sayAction = (action: CompanionAction, styleName: 'speech' | 'thought', duration = 2000) => {
    if (!loadedCreature) return
    say(chooseCompanionMessage(loadedCreature.dialogue, action), styleName, duration)
  }

  const setCompanionCaptured = (captured: boolean) => {
    companionCaptured = captured
    pet.classList.toggle('is-pokecharm-captured', captured)
    dialogue.classList.toggle('is-pokecharm-captured', captured)
  }

  const setBallBusy = (busy: boolean) => {
    if (destroyed || ballBusy === busy) return
    ballBusy = busy
    if (busy) {
      window.clearTimeout(sleepTimer)
      window.clearTimeout(autonomousJumpTimer)
      window.clearTimeout(thoughtTimer)
      window.clearTimeout(wakeTimer)
      sleepTimer = 0
      autonomousJumpTimer = 0
      thoughtTimer = 0
      wakeTimer = 0
      sleeping = false
      waking = false
      pendingWakeAction = null
      pendingWakeActionPriority = behaviourPriority.idle
      clearPriority()
      dialogue.classList.remove('is-visible')
      window.clearTimeout(messageTimer)
      messageTimer = 0
      chase.setPaused(true)
      controller.play('idle')
      return
    }
    if (companionCaptured) {
      ballBusy = true
      return
    }
    chase.setPaused(false)
    controller.play('idle')
    const sleepRange = creature.autonomy.sleepAfterMs
    sleepDeadline = Date.now() + randomBetween(sleepRange.min, sleepRange.max)
    scheduleThought()
    armSleepTimer()
    scheduleAutonomousJump()
  }

  const playEvent = (action: CompanionAction, animationState: AnimationState, priority: number) => {
    if (!loadedCreature || destroyed || ballBusy || companionCaptured) return false
    const now = Date.now()
    if (now < priorityUntil && priority < currentPriority) return false

    window.clearTimeout(priorityTimer)
    priorityTimer = 0
    currentPriority = priority
    if (animationState === 'jump') lastJumpAt = now
    controller.play(animationState)
    sayAction(action, action === 'idle' || action === 'sleep' ? 'thought' : 'speech')

    const definition = loadedCreature.animations[animationState]
    if (animationState === 'sleep' && definition?.loop) {
      priorityUntil = Number.POSITIVE_INFINITY
      return true
    }

    if (definition && !definition.loop) {
      priorityUntil = now + definition.duration_ms
      priorityTimer = window.setTimeout(() => {
        completePriority()
      }, definition.duration_ms)
    } else {
      priorityUntil = now + 700
      priorityTimer = window.setTimeout(() => {
        completePriority()
      }, 700)
    }
    return true
  }

  function playMovement(state: 'idle' | 'run') {
    if (!loadedCreature || destroyed || ballBusy || companionCaptured) return
    if (sleeping || waking || Date.now() < priorityUntil && currentPriority > behaviourPriority.movement) return
    controller.play(state)
  }

  const clearPriority = () => {
    window.clearTimeout(priorityTimer)
    priorityTimer = 0
    currentPriority = behaviourPriority.idle
    priorityUntil = 0
  }

  function completePriority() {
    clearPriority()
    chase.refreshMovement()
  }

  const sessionId = getSessionId()
  const sessionGreetingKey = `pokecharm:greeted:${creature.id}:${sessionId}`
  const greetOnce = () => {
    if (sessionStorageGet(sessionGreetingKey)) return
    sessionStorageSet(sessionGreetingKey, 'yes')
    playEvent('greeting', 'happy', behaviourPriority.visitorReaction)
  }

  const scheduleThought = () => {
    window.clearTimeout(thoughtTimer)
    if (destroyed || sleeping || waking || ballBusy || companionCaptured) return
    thoughtTimer = window.setTimeout(() => {
      thoughtTimer = 0
      if (!sleeping && Date.now() >= priorityUntil) sayAction('idle', 'thought')
      scheduleThought()
    }, randomBetween(22000, 42000))
  }

  const armSleepTimer = () => {
    window.clearTimeout(sleepTimer)
    sleepTimer = 0
    if (destroyed || sleeping || waking || ballBusy || companionCaptured || !loadedCreature) return
    const delay = Math.max(0, sleepDeadline - Date.now())
    sleepTimer = window.setTimeout(onSleepDeadline, delay)
  }

  function enterSleep() {
    if (destroyed || sleeping || ballBusy || companionCaptured || !loadedCreature) return
    window.clearTimeout(sleepTimer)
    sleepTimer = 0
    window.clearTimeout(autonomousJumpTimer)
    autonomousJumpTimer = 0
    window.clearTimeout(thoughtTimer)
    thoughtTimer = 0
    window.clearTimeout(wakeTimer)
    wakeTimer = 0
    waking = false
    pendingWakeAction = null
    sleeping = true
    clearPriority()
    currentPriority = behaviourPriority.sleep
    priorityUntil = Number.POSITIVE_INFINITY
    controller.play('sleep')
    sayAction('sleep', 'thought')
  }

  function onSleepDeadline() {
    sleepTimer = 0
    if (destroyed || sleeping || waking || ballBusy || companionCaptured || !loadedCreature) return
    if (Date.now() < sleepDeadline) {
      armSleepTimer()
      return
    }
    if (currentPriority > behaviourPriority.sleep) {
      sleepTimer = window.setTimeout(onSleepDeadline, 160)
      return
    }
    if (chase.isMoving) {
      sleepTimer = window.setTimeout(onSleepDeadline, 160)
      return
    }
    enterSleep()
  }

  const scheduleAutonomousJump = (delay = randomBetween(creature.autonomy.autonomousJump.minDelayMs, creature.autonomy.autonomousJump.maxDelayMs)) => {
    window.clearTimeout(autonomousJumpTimer)
    autonomousJumpTimer = 0
    if (destroyed || sleeping || waking || ballBusy || companionCaptured || !loadedCreature) return
    autonomousJumpTimer = window.setTimeout(attemptAutonomousJump, delay)
  }

  function attemptAutonomousJump() {
    autonomousJumpTimer = 0
    if (destroyed || sleeping || waking || ballBusy || companionCaptured || !loadedCreature) return
    const config = creature.autonomy.autonomousJump
    const cooldownRemaining = lastJumpAt + config.cooldownMs - Date.now()
    if (cooldownRemaining > 0) {
      scheduleAutonomousJump(cooldownRemaining + randomBetween(250, 750))
      return
    }
    if (currentPriority > behaviourPriority.idle || chase.isMoving || controller.current !== 'idle') {
      scheduleAutonomousJump(randomBetween(700, 1300))
      return
    }
    if (Math.random() < config.chance) playEvent('jump', 'jump', behaviourPriority.autonomousJump)
    scheduleAutonomousJump()
  }

  const finishWake = () => {
    wakeTimer = 0
    if (destroyed) return
    waking = false
    clearPriority()
    const action = pendingWakeAction
    pendingWakeAction = null
    pendingWakeActionPriority = behaviourPriority.idle
    if (action) action()
    else {
      controller.play('idle')
      sayAction('happy', 'thought')
    }
    if (pendingClickDestination) {
      const destination = pendingClickDestination
      pendingClickDestination = null
      prepareForVisitorMovement()
      chase.moveTo(destination.x, destination.y)
    }
    if (pendingScrollDirection) {
      const direction = pendingScrollDirection
      pendingScrollDirection = null
      performScrollReaction(direction)
    }
    scheduleThought()
    armSleepTimer()
    scheduleAutonomousJump()
  }

  const queueWakeAction = (action: () => void, priority: number) => {
    if (priority < pendingWakeActionPriority) return
    pendingWakeAction = action
    pendingWakeActionPriority = priority
  }

  const beginWake = (action?: () => void, priority: number = behaviourPriority.visitorReaction) => {
    if (!loadedCreature) {
      action?.()
      return
    }
    if (action) queueWakeAction(action, priority)
    if (waking) return
    sleeping = false
    waking = true
    window.clearTimeout(sleepTimer)
    sleepTimer = 0
    window.clearTimeout(autonomousJumpTimer)
    autonomousJumpTimer = 0
    clearPriority()
    currentPriority = behaviourPriority.wake
    const wakeAnimation: AnimationState = loadedCreature.animations.happy ? 'happy' : 'idle'
    controller.play(wakeAnimation)
    const definition = loadedCreature.animations[wakeAnimation]
    const duration = definition && !definition.loop ? definition.duration_ms : 180
    priorityUntil = Date.now() + duration
    window.clearTimeout(wakeTimer)
    wakeTimer = window.setTimeout(finishWake, duration)
  }

  const runAfterWake = (action: () => void, priority: number = behaviourPriority.visitorReaction) => {
    if (sleeping) beginWake(action, priority)
    else if (waking) queueWakeAction(action, priority)
    else action()
  }

  const registerActivity = (action?: () => void, actionPriority: number = behaviourPriority.visitorReaction) => {
    if (destroyed || ballBusy || companionCaptured || !loadedCreature) return
    const sleepRange = creature.autonomy.sleepAfterMs
    sleepDeadline = Date.now() + randomBetween(sleepRange.min, sleepRange.max)
    if (sleeping) {
      beginWake(action, actionPriority)
      return
    }
    if (waking) {
      if (action) queueWakeAction(action, actionPriority)
      return
    }
    if (currentPriority > behaviourPriority.idle && currentPriority < behaviourPriority.visitorReaction) {
      clearPriority()
      controller.play('idle')
      chase.refreshMovement()
    }
    armSleepTimer()
    action?.()
  }

  const resetClickSequence = () => {
    clickSequenceTimer = 0
    clickSequenceCount = 0
    clickSequenceStartedAt = 0
  }

  const prepareForVisitorMovement = () => {
    if (currentPriority < behaviourPriority.movement) {
      clearPriority()
      controller.play('idle')
    }
  }

  const moveToVisitorDestination = (x: number, y: number) => {
    if (ballBusy || companionCaptured) return
    if (sleeping || waking) {
      pendingClickDestination = { x, y }
      return
    }
    prepareForVisitorMovement()
    chase.moveTo(x, y)
  }

  function performScrollReaction(direction: ChaseDirection) {
    if (ballBusy || companionCaptured) return
    prepareForVisitorMovement()
    chase.nudge(direction, 84)
    armScrollReturn()
  }

  const onPetClick = () => {
    if (ballBusy || companionCaptured) return
    const now = Date.now()
    const sequenceWindow = creature.autonomy.clickSequenceWindowMs
    if (!clickSequenceCount || now - clickSequenceStartedAt > sequenceWindow) {
      window.clearTimeout(clickSequenceTimer)
      clickSequenceStartedAt = now
      clickSequenceCount = 1
      clickSequenceTimer = window.setTimeout(resetClickSequence, sequenceWindow)
    } else {
      clickSequenceCount += 1
    }

    let reaction: () => void
    let reactionPriority: number = behaviourPriority.visitorReaction
    if (clickSequenceCount === 1) {
      reaction = () => {
        playEvent('pat', 'happy', behaviourPriority.visitorReaction)
        config.onAction?.('pat')
      }
    } else if (clickSequenceCount === 2) {
      reaction = () => {
        playEvent('hurt', 'hurt', behaviourPriority.visitorReaction)
        config.onAction?.('hurt')
      }
    } else {
      window.clearTimeout(clickSequenceTimer)
      resetClickSequence()
      reactionPriority = behaviourPriority.secretJump
      reaction = () => playEvent('jump', 'jump', behaviourPriority.secretJump)
    }
    registerActivity(reaction, reactionPriority)
  }

  const onDocumentPointerMove = (event: PointerEvent) => {
    if (!followCursor || sleeping || waking || ballBusy || companionCaptured || currentPriority > behaviourPriority.idle || event.pointerType === 'touch') return
    stage.dispatchEvent(new PointerEvent('pointermove', {
      clientX: event.clientX,
      clientY: event.clientY,
      pointerType: event.pointerType,
      bubbles: false,
    }))
  }
  const onDocumentPointerOut = (event: PointerEvent) => {
    if (!followCursor || sleeping || waking || ballBusy || companionCaptured || currentPriority > behaviourPriority.idle || event.relatedTarget !== null) return
    stage.dispatchEvent(new PointerEvent('pointerleave', { pointerType: event.pointerType, bubbles: false }))
  }
  const isInteractiveClick = (event: MouseEvent) => {
    if (event.defaultPrevented) return true
    const interactiveSelector = 'a, area[href], button, input, textarea, select, option, form, label, summary, [role~="button"], [role~="link"], [role~="checkbox"], [role~="radio"], [role~="switch"], [role~="textbox"], [role~="searchbox"], [role~="combobox"], [role~="listbox"], [role~="option"], [role~="menuitem"], [role~="menuitemcheckbox"], [role~="menuitemradio"], [role~="tab"], [role~="slider"], [role~="spinbutton"], [role~="treeitem"], [role~="gridcell"], [role~="menu"], [role~="menubar"], [role~="toolbar"], [role~="radiogroup"], [role~="tablist"], [role~="dialog"], [role~="alertdialog"], [tabindex]:not([tabindex="-1"]), [onclick], [ondblclick], [onmousedown], [onmouseup], [onpointerdown], [onpointerup], [onkeydown], [data-action], [data-href], [aria-haspopup], [aria-pressed], [aria-expanded], [aria-selected], [contenteditable]:not([contenteditable="false"]), [draggable="true"], audio[controls], video[controls]'
    return event.composedPath().some((node) => {
      if (node === host) return true
      return node instanceof Element && (node.localName.includes('-') || node.matches(interactiveSelector) || getComputedStyle(node).cursor === 'pointer')
    })
  }
  const onDocumentClick = (event: MouseEvent) => {
    if (ballBusy || companionCaptured || event.composedPath().includes(host)) return
    const shouldMove = clickToMove && !isInteractiveClick(event)
    registerActivity()
    if (shouldMove) moveToVisitorDestination(event.clientX, event.clientY)
  }
  const onScroll = () => {
    if (!scrollReactions || destroyed) return
    const currentX = window.scrollX
    const currentY = window.scrollY
    const deltaX = currentX - lastScrollX
    const deltaY = currentY - lastScrollY
    lastScrollX = currentX
    lastScrollY = currentY
    if (deltaX === 0 && deltaY === 0) return
    if (ballBusy || companionCaptured) return

    const direction: ChaseDirection = Math.abs(deltaX) > Math.abs(deltaY)
      ? deltaX > 0 ? 'right' : 'left'
      : deltaY > 0 ? 'down' : 'up'
    const directionChanged = direction !== lastScrollDirection
    lastScrollDirection = direction
    scrollStopDeadline = Date.now() + 260
    registerActivity()
    if (directionChanged && (sleeping || waking)) pendingScrollDirection = direction
    else if (directionChanged) performScrollReaction(direction)
    else if (!pendingScrollDirection) armScrollReturn()
  }
  function armScrollReturn() {
    window.clearTimeout(scrollReturnTimer)
    const reactionWait = Number.isFinite(priorityUntil) ? Math.max(0, priorityUntil - Date.now()) : 0
    const delay = Math.max(260, scrollStopDeadline - Date.now() + reactionWait)
    scrollReturnTimer = window.setTimeout(() => {
      scrollReturnTimer = 0
      lastScrollDirection = null
      chase.returnToResting()
    }, delay)
  }
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.repeat || ['Alt', 'Control', 'Meta', 'Shift', 'CapsLock'].includes(event.key)) return
    registerActivity()
  }
  const onTouchActivity = (event: PointerEvent) => {
    if (event.pointerType === 'touch' && !event.composedPath().includes(host)) registerActivity()
  }

  pet.addEventListener('click', onPetClick)
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('pointerdown', onTouchActivity, { passive: true })
  if (followCursor) {
    document.addEventListener('pointermove', onDocumentPointerMove)
    document.addEventListener('pointerout', onDocumentPointerOut)
  }
  document.addEventListener('keydown', onKeyDown)
  if (scrollReactions) window.addEventListener('scroll', onScroll, { passive: true })

  status({ state: 'loading', message: `Loading ${creature.displayName}` })
  void loadCreature(creature).then(async (loaded) => {
    if (destroyed) return
    loadedCreature = loaded
    loadedDisplayHeight = getDisplayHeight(loaded)
    controller.setCreature({ ...loaded, displayHeight: loadedDisplayHeight })
    pet.setAttribute('aria-label', `Pat ${config.name?.trim() || creature.displayName}`)
    chase.attach(stage, pet, loaded.behavior, {
      horizontal: position.endsWith('left') ? 'left' : 'right',
      vertical: position.startsWith('top') ? 'top' : 'bottom',
      edgeOffset: config.edgeOffset ?? defaultCompanionWidgetConfig.edgeOffset,
    })
    chase.setEnabled(followCursor)
    const storageInstallation = config.installationId?.trim() || 'origin-default'
    const storageKey = `pokecharm:capture:${encodeURIComponent(window.location.origin)}:${encodeURIComponent(storageInstallation)}`
    const mountedBall = createPokeballController(stage, pet, dialogue, {
      idleUrl: resolveAsset('/assets/pokeball/pokecharm-orb-idle.png'),
      sheetUrl: resolveAsset('/assets/pokeball/pokecharm-orb-sheet.png'),
      storageKey,
      position: {
        horizontal: position.endsWith('left') ? 'left' : 'right',
        vertical: position.startsWith('top') ? 'top' : 'bottom',
        edgeOffset: config.edgeOffset ?? defaultCompanionWidgetConfig.edgeOffset,
      },
      getCompanionBounds: () => {
        const stageBounds = stage.getBoundingClientRect()
        const scale = pet.offsetHeight / loaded.cell[1]
        const anchorX = loaded.anchor.x * scale
        const anchorY = loaded.anchor.y * scale
        const horizontal = position.endsWith('left') ? 'left' : 'right'
        const vertical = position.startsWith('top') ? 'top' : 'bottom'
        const edgeOffset = config.edgeOffset ?? defaultCompanionWidgetConfig.edgeOffset
        const homeX = horizontal === 'left'
          ? edgeOffset + anchorX
          : stageBounds.width - edgeOffset - (pet.offsetWidth - anchorX)
        const homeY = vertical === 'top'
          ? edgeOffset + anchorY
          : stageBounds.height - edgeOffset - (pet.offsetHeight - anchorY)
        const facingInward = horizontal === 'left'
        const artLeft = facingInward
          ? homeX + (anchorX - loaded.visualBounds.right * scale)
          : homeX + (loaded.visualBounds.left * scale - anchorX)
        const artRight = facingInward
          ? homeX + (anchorX - loaded.visualBounds.left * scale)
          : homeX + (loaded.visualBounds.right * scale - anchorX)
        return {
          left: artLeft,
          top: homeY + (loaded.visualBounds.top * scale - anchorY),
          right: artRight,
          bottom: homeY + (loaded.visualBounds.bottom * scale - anchorY),
        }
      },
      onBusyChange: setBallBusy,
      onCapturedChange: setCompanionCaptured,
      onRelease: (ballPosition) => {
        if (!loadedCreature || destroyed) return
        const stageBounds = stage.getBoundingClientRect()
        const emergeX = ballPosition.x + (position.endsWith('left') ? 66 : -66)
        chase.moveTo(stageBounds.left + emergeX, stageBounds.top + ballPosition.y)
        controller.play('jump')
        sayAction('happy', 'speech')
      },
    })
    ballController = mountedBall
    try {
      await mountedBall.ready
    } catch (error) {
      if (!destroyed && ballController === mountedBall) {
        setCompanionCaptured(false)
        mountedBall.destroy()
        ballController = null
      }
      if (!destroyed) console.warn('Pokecharm Pokéball assets could not be loaded', error)
    }
    if (destroyed) {
      mountedBall.destroy()
      return
    }
    status({ state: 'ready', message: `${creature.displayName} is ready` })
    scheduleThought()
    const sleepRange = creature.autonomy.sleepAfterMs
    sleepDeadline = Date.now() + randomBetween(sleepRange.min, sleepRange.max)
    armSleepTimer()
    scheduleAutonomousJump()

    runAfterWake(greetOnce)
  }).catch((error: unknown) => {
    if (destroyed) return
    status({ state: 'error', message: `Could not load ${creature.displayName}` })
    console.error(`Could not load Pokecharm ${creature.displayName}`, error)
  })

  const onResize = () => {
    if (!loadedCreature) return
    const height = getDisplayHeight(loadedCreature)
    if (height === loadedDisplayHeight) return
    loadedDisplayHeight = height
    controller.setCreature({ ...loadedCreature, displayHeight: height })
  }
  window.addEventListener('resize', onResize)

  return {
    play(state: AnimationState) {
      if (!loadedCreature || ballBusy || companionCaptured) return false
      let played = false
      const action: CompanionAction = state === 'jump' ? 'jump'
        : state === 'attack' ? 'attack'
          : state === 'hurt' ? 'hurt'
            : 'happy'
      if (state === 'sleep') {
        enterSleep()
        return true
      }
      registerActivity(() => {
        if (state === 'idle') {
          clearPriority()
          controller.play('idle')
          played = true
          return
        }
        played = playEvent(action, state, behaviourPriority.visitorReaction)
      })
      return played || sleeping || waking
    },
    say,
    destroy() {
      if (destroyed) return
      destroyed = true
      window.clearTimeout(messageTimer)
      window.clearTimeout(thoughtTimer)
      window.clearTimeout(sleepTimer)
      window.clearTimeout(autonomousJumpTimer)
      window.clearTimeout(wakeTimer)
      window.clearTimeout(clickSequenceTimer)
      window.clearTimeout(priorityTimer)
      window.clearTimeout(scrollReturnTimer)
      pet.removeEventListener('click', onPetClick)
      document.removeEventListener('click', onDocumentClick)
      document.removeEventListener('pointerdown', onTouchActivity)
      if (followCursor) {
        document.removeEventListener('pointermove', onDocumentPointerMove)
        document.removeEventListener('pointerout', onDocumentPointerOut)
      }
      document.removeEventListener('keydown', onKeyDown)
      if (scrollReactions) window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      ballController?.destroy()
      ballController = null
      chase.destroy()
      controller.destroy()
      shadow.replaceChildren()
      host.removeAttribute('style')
      delete host.dataset.position
      delete host.dataset.followCursor
      delete host.dataset.viewportStage
    },
  }
}

function getSessionId() {
  const key = 'pokecharm:session-id'
  const existing = sessionStorageGet(key)
  if (existing) return existing
  const id = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
      const random = Math.floor(Math.random() * 16)
      return (character === 'x' ? random : (random & 0x3) | 0x8).toString(16)
    })
  sessionStorageSet(key, id)
  return id
}

function sessionStorageGet(key: string) {
  try { return window.sessionStorage.getItem(key) } catch { return null }
}

function sessionStorageSet(key: string, value: string) {
  try { window.sessionStorage.setItem(key, value) } catch { /* Storage can be disabled by the host page. */ }
}

function randomBetween(minimum: number, maximum: number) {
  return minimum + Math.floor(Math.random() * (maximum - minimum + 1))
}
