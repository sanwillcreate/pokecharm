interface Point {
  x: number
  y: number
}

interface CaptureStorageState {
  captured: true
  xRatio: number
  yRatio: number
}

export interface PokeballControllerOptions {
  idleUrl: string
  sheetUrl: string
  storageKey: string
  position: { horizontal: 'left' | 'right'; vertical: 'top' | 'bottom'; edgeOffset: number }
  getCompanionBounds: () => { left: number; top: number; right: number; bottom: number }
  onBusyChange: (busy: boolean) => void
  onCapturedChange: (captured: boolean) => void
  onRelease: (position: Point) => void
}

export const pokeballConfig = {
  sheetSize: { width: 1024, height: 1280 },
  frameSize: { width: 128, height: 128 },
  columns: 8,
  rows: 10,
  anchor: { x: 64, y: 64 },
  renderSize: 60,
  captureChance: 0.7,
  dragThresholdPx: 9,
  minimumThrowGesturePx: 18,
  minimumThrowDistancePx: 120,
  maximumThrowDistancePx: 480,
  throwDistanceMultiplier: 1.25,
  flightSpeedPxPerSecond: 760,
  throwRotationBaseDegrees: 90,
  throwRotationMaxAdditionalDegrees: 180,
  throwRotationPerPixel: 0.25,
  maximumFlightDurationMs: 1050,
  minimumFlightDurationMs: 360,
  arcHeightRatio: 0.22,
  arcHeightMaxPx: 82,
  restingGapPx: 15,
  celebrationMessage: "Gotta catch 'em all!",
  celebrationDurationMs: 2100,
  returnDurationMs: 460,
  releaseRevealDelayMs: 360,
  animations: {
    idle: { row: 0, frames: 8, fps: 9, frameMs: 111, durationMs: 888, loop: true },
    hover: { row: 1, frames: 8, fps: 12, frameMs: 83, durationMs: 664, loop: true },
    pickup: { row: 2, frames: 8, fps: 14, frameMs: 71, durationMs: 568, loop: false },
    throw: { row: 3, frames: 8, fps: 15, frameMs: 67, durationMs: 536, loop: true },
    bounce: { row: 4, frames: 8, fps: 13, frameMs: 77, durationMs: 616, loop: false },
    open: { row: 5, frames: 8, fps: 14, frameMs: 71, durationMs: 568, loop: false },
    shake: { row: 6, frames: 8, fps: 15, frameMs: 67, durationMs: 536, loop: false },
    success: { row: 7, frames: 8, fps: 12, frameMs: 83, durationMs: 664, loop: false },
    escape: { row: 8, frames: 8, fps: 14, frameMs: 71, durationMs: 568, loop: false },
    release: { row: 9, frames: 8, fps: 13, frameMs: 77, durationMs: 616, loop: false },
  },
} as const

const fallbackCaptureStates = new Map<string, CaptureStorageState>()

export function createPokeballController(
  stage: HTMLElement,
  pet: HTMLElement,
  dialogue: HTMLElement,
  options: PokeballControllerOptions,
) {
  const button = document.createElement('button')
  button.className = 'pokecharm-ball'
  button.type = 'button'
  button.setAttribute('aria-label', 'Pick up and throw Pokéball')
  button.setAttribute('aria-describedby', 'pokecharm-ball-instructions')
  button.title = 'Drag to throw the ball; click it to release a companion'
  const sprite = document.createElement('span')
  sprite.className = 'pokecharm-ball-sprite'
  sprite.setAttribute('aria-hidden', 'true')
  button.append(sprite)
  button.style.width = `${pokeballConfig.renderSize}px`
  button.style.height = `${pokeballConfig.renderSize}px`
  sprite.style.width = `${pokeballConfig.renderSize}px`
  sprite.style.height = `${pokeballConfig.renderSize}px`
  sprite.style.backgroundImage = `url('${options.idleUrl}')`
  sprite.style.backgroundSize = `${pokeballConfig.renderSize}px ${pokeballConfig.renderSize}px`
  stage.append(button)

  const instructions = document.createElement('span')
  instructions.id = 'pokecharm-ball-instructions'
  instructions.className = 'pokecharm-ball-sr-only'
  instructions.textContent = 'Drag the ball to throw it. A captured companion can be released by clicking the ball.'
  stage.append(instructions)

  const message = document.createElement('div')
  message.className = 'pokecharm-ball-message'
  message.setAttribute('role', 'status')
  message.setAttribute('aria-live', 'polite')
  stage.append(message)

  const sheetImage = new Image()
  let currentAnimation = 'idle'
  let frameIndex = 0
  let frameTimer = 0
  let messageTimer = 0
  let sequenceTimer = 0
  let positionFrame = 0
  let destroyed = false
  let busy = false
  let captured = Boolean(readCapture(options.storageKey))
  let activePointerId: number | null = null
  let gestureStart: Point | null = null
  let lastGesturePoint: Point | null = null
  let dragged = false
  let pointerWasCaptured = false
  let releasing = false
  let lastPointerReleaseAt = 0
  let ballPosition: Point = { x: 0, y: 0 }
  let messageSize = { width: 0, height: 0 }
  let restingPosition: Point = { x: 0, y: 0 }
  let flightStart: Point | null = null
  let flightEnd: Point | null = null
  let flightStartedAt = 0
  let flightDuration = 0
  let flightArc = 0
  let flightRotation = 0
  let flightFrame = 0

  const animations = () => pokeballConfig.animations
  const bounds = () => stage.getBoundingClientRect()
  const setBusy = (next: boolean) => {
    if (busy === next) return
    busy = next
    options.onBusyChange(next)
  }
  const setPosition = (next: Point) => {
    const stageRect = bounds()
    const half = pokeballConfig.renderSize / 2
    ballPosition = {
      x: clamp(next.x, half, Math.max(half, stageRect.width - half)),
      y: clamp(next.y, half, Math.max(half, stageRect.height - half)),
    }
    button.style.left = `${ballPosition.x}px`
    button.style.top = `${ballPosition.y}px`
    if (message.classList.contains('is-visible')) positionMessage()
  }
  const visiblePetRect = () => {
    const rect = pet.getBoundingClientRect()
    const stageRect = bounds()
    return {
      left: rect.left - stageRect.left,
      right: rect.right - stageRect.left,
      top: rect.top - stageRect.top,
      bottom: rect.bottom - stageRect.top,
      width: rect.width,
      height: rect.height,
    }
  }
  const getRestingPosition = (): Point => {
    const stageRect = bounds()
    const half = pokeballConfig.renderSize / 2
    const { horizontal, vertical, edgeOffset } = options.position
    const petRect = options.getCompanionBounds()
    const gap = pokeballConfig.restingGapPx
    const inwardX = horizontal === 'left' ? petRect.right + gap + half : petRect.left - gap - half
    const besideFits = horizontal === 'left'
      ? inwardX + half <= stageRect.width - 8
      : inwardX - half >= 8
    if (besideFits) {
      return {
        x: inwardX,
        y: clamp(vertical === 'top' ? petRect.top + half : petRect.bottom - half, half + 8, stageRect.height - half - 8),
      }
    }

    const inwardY = vertical === 'top' ? petRect.bottom + gap + half : petRect.top - gap - half
    const verticalFits = vertical === 'top'
      ? inwardY + half <= stageRect.height - 8
      : inwardY - half >= 8
    if (verticalFits) {
      return {
        x: clamp((petRect.left + petRect.right) / 2, half + 8, stageRect.width - half - 8),
        y: inwardY,
      }
    }

    // Keep the orb inside the viewport in exceptionally small embeds.
    const x = horizontal === 'left' ? stageRect.width - edgeOffset - half : edgeOffset + half
    const y = vertical === 'top' ? stageRect.height - edgeOffset - half : edgeOffset + half
    return { x: clamp(x, half, stageRect.width - half), y: clamp(y, half, stageRect.height - half) }
  }
  const drawFrame = (index: number) => {
    const scale = pokeballConfig.renderSize / pokeballConfig.frameSize.width
    sprite.style.width = `${pokeballConfig.renderSize}px`
    sprite.style.height = `${pokeballConfig.renderSize}px`
    sprite.style.backgroundImage = `url('${options.sheetUrl}')`
    sprite.style.backgroundSize = `${pokeballConfig.sheetSize.width * scale}px ${pokeballConfig.sheetSize.height * scale}px`
    sprite.style.backgroundPosition = `${-index * pokeballConfig.renderSize}px ${-Number(animations()[currentAnimation as keyof typeof pokeballConfig.animations]?.row ?? 0) * pokeballConfig.renderSize}px`
  }
  const play = (name: string, onComplete?: () => void) => {
    if (destroyed) return
    window.clearTimeout(frameTimer)
    frameTimer = 0
    const playback = pokeballConfig.animations[name as keyof typeof pokeballConfig.animations]
    if (!playback) {
      onComplete?.()
      return
    }
    currentAnimation = name
    frameIndex = 0
    drawFrame(frameIndex)
    const tick = () => {
      frameTimer = 0
      if (destroyed || currentAnimation !== name) return
      frameIndex += 1
      if (frameIndex >= playback.frames) {
        if (playback.loop) frameIndex = 0
        else {
          drawFrame(playback.frames - 1)
          currentAnimation = 'idle'
          drawFrame(0)
          onComplete?.()
          return
        }
      }
      drawFrame(frameIndex)
      frameTimer = window.setTimeout(tick, playback.frameMs)
    }
    frameTimer = window.setTimeout(tick, playback.frameMs)
  }
  const clearSequence = () => {
    window.clearTimeout(sequenceTimer)
    sequenceTimer = 0
  }
  const setCaptured = (next: boolean, persist = true) => {
    captured = next
    pet.classList.toggle('is-pokecharm-captured', next)
    dialogue.classList.toggle('is-pokecharm-captured', next)
    button.classList.toggle('is-captured', next)
    button.setAttribute('aria-label', next ? 'Release captured companion' : 'Pick up and throw Pokéball')
    if (persist) saveCapture(options.storageKey, next ? { captured: true, xRatio: ratio(ballPosition.x, bounds().width), yRatio: ratio(ballPosition.y, bounds().height) } : null)
    options.onCapturedChange(next)
  }
  const sayCelebration = () => {
    message.textContent = pokeballConfig.celebrationMessage
    message.classList.add('is-visible')
    positionMessage(true)
    window.clearTimeout(messageTimer)
    messageTimer = window.setTimeout(() => message.classList.remove('is-visible'), pokeballConfig.celebrationDurationMs)
  }
  function positionMessage(measure = false) {
    const stageRect = bounds()
    if (measure || !messageSize.width || !messageSize.height) {
      messageSize = { width: message.offsetWidth, height: message.offsetHeight }
    }
    const { width, height } = messageSize
    const padding = 8
    const gap = 8
    const half = pokeballConfig.renderSize / 2
    const candidates = [
      { side: 'above', x: ballPosition.x - width / 2, y: ballPosition.y - half - height - gap },
      { side: 'right', x: ballPosition.x + half + gap, y: ballPosition.y - height / 2 },
      { side: 'left', x: ballPosition.x - half - width - gap, y: ballPosition.y - height / 2 },
      { side: 'below', x: ballPosition.x - width / 2, y: ballPosition.y + half + gap },
    ]
    const companion = captured ? null : options.getCompanionBounds()
    const fits = (candidate: typeof candidates[number]) => candidate.x >= padding
      && candidate.y >= padding
      && candidate.x + width <= stageRect.width - padding
      && candidate.y + height <= stageRect.height - padding
    const avoidsCompanion = (candidate: typeof candidates[number]) => !companion
      || candidate.x + width < companion.left - 6
      || candidate.x > companion.right + 6
      || candidate.y + height < companion.top - 6
      || candidate.y > companion.bottom + 6
    const candidate = candidates.find((item) => fits(item) && avoidsCompanion(item))
      ?? candidates.find(avoidsCompanion)
      ?? candidates[0]!
    const left = clamp(candidate.x, padding, Math.max(padding, stageRect.width - width - padding))
    const top = clamp(candidate.y, padding, Math.max(padding, stageRect.height - height - padding))
    message.dataset.position = candidate.side
    message.style.left = `${left}px`
    message.style.top = `${top}px`
    message.style.setProperty('--ball-message-tail-x', `${clamp(ballPosition.x - left, 12, Math.max(12, width - 12))}px`)
    message.style.setProperty('--ball-message-tail-y', `${clamp(ballPosition.y - top, 10, Math.max(10, height - 10))}px`)
  }
  const returnBall = (afterReturn?: () => void) => {
    const start = { ...ballPosition }
    const destination = { ...restingPosition }
    const duration = pokeballConfig.returnDurationMs
    const started = performance.now()
    const tick = (time: number) => {
      if (destroyed) return
      const progress = Math.min(1, (time - started) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setPosition({ x: start.x + (destination.x - start.x) * eased, y: start.y + (destination.y - start.y) * eased })
      if (progress >= 1) {
        positionFrame = 0
        button.style.setProperty('--ball-rotation', '0deg')
        play('idle')
        setBusy(captured)
        afterReturn?.()
      } else {
        positionFrame = window.requestAnimationFrame(tick)
      }
    }
    positionFrame = window.requestAnimationFrame(tick)
  }
  const endThrow = (hit: Point | null) => {
    flightFrame = 0
    flightStart = null
    flightEnd = null
    if (!hit) {
      play('bounce', () => returnBall())
      return
    }
    setPosition(hit)
    const success = Math.random() < pokeballConfig.captureChance
    play('open', () => {
      if (success) {
        setCaptured(true)
        play('shake', () => play('success', () => {
          saveCapture(options.storageKey, { captured: true, xRatio: ratio(ballPosition.x, bounds().width), yRatio: ratio(ballPosition.y, bounds().height) })
          sayCelebration()
          play('idle')
        }))
      } else {
        play('escape', () => returnBall())
      }
    })
  }
  const animateFlight = (from: Point, to: Point) => {
    flightStart = { ...from }
    flightEnd = { ...to }
    flightStartedAt = performance.now()
    const distance = Math.hypot(to.x - from.x, to.y - from.y)
    flightDuration = clamp(distance / pokeballConfig.flightSpeedPxPerSecond * 1000, pokeballConfig.minimumFlightDurationMs, pokeballConfig.maximumFlightDurationMs)
    flightArc = Math.min(pokeballConfig.arcHeightMaxPx, distance * pokeballConfig.arcHeightRatio)
    flightRotation = (to.x >= from.x ? 1 : -1) * (pokeballConfig.throwRotationBaseDegrees + Math.min(pokeballConfig.throwRotationMaxAdditionalDegrees, distance * pokeballConfig.throwRotationPerPixel))
    play('throw')
    const petRect = visiblePetRect()
    const expandedPetRect = {
      left: petRect.left - pokeballConfig.renderSize * 0.38,
      right: petRect.right + pokeballConfig.renderSize * 0.38,
      top: petRect.top - pokeballConfig.renderSize * 0.38,
      bottom: petRect.bottom + pokeballConfig.renderSize * 0.38,
    }
    const hit = findArcIntersection(from, to, expandedPetRect, flightArc)
    const getFlightPoint = (progress: number) => {
      const eased = progress < 0.5 ? 4 * progress ** 3 : 1 - Math.pow(-2 * progress + 2, 3) / 2
      return {
        x: from.x + (to.x - from.x) * eased,
        y: from.y + (to.y - from.y) * eased - Math.sin(Math.PI * eased) * flightArc,
      }
    }
    const tick = (time: number) => {
      if (destroyed || !flightStart || !flightEnd) return
      const progress = Math.min(1, (time - flightStartedAt) / flightDuration)
      const point = getFlightPoint(progress)
      setPosition(point)
      button.style.setProperty('--ball-rotation', `${flightRotation * progress}deg`)
      if (hit && progress >= hit.progress) {
        endThrow(hit.point)
      } else if (progress >= 1) endThrow(null)
      else flightFrame = window.requestAnimationFrame(tick)
    }
    flightFrame = window.requestAnimationFrame(tick)
  }
  const startThrow = (releasePoint: Point, start: Point, wasDragged: boolean) => {
    if (!wasDragged) {
      restingPosition = getRestingPosition()
      setPosition(restingPosition)
      play('idle')
      setBusy(false)
      return
    }
    const deltaX = releasePoint.x - start.x
    const deltaY = releasePoint.y - start.y
    const gestureLength = Math.hypot(deltaX, deltaY)
    if (gestureLength < pokeballConfig.minimumThrowGesturePx) {
      play('bounce', () => {
        returnBall()
      })
      return
    }
    const length = Math.max(1, gestureLength)
    const direction = { x: deltaX / length, y: deltaY / length }
    const stageRect = bounds()
    const maximumDistance = Math.max(pokeballConfig.maximumThrowDistancePx, Math.hypot(stageRect.width, stageRect.height))
    const flightDistance = clamp(gestureLength * pokeballConfig.throwDistanceMultiplier, pokeballConfig.minimumThrowDistancePx, maximumDistance)
    const half = pokeballConfig.renderSize / 2
    const destination = {
      x: clamp(releasePoint.x + direction.x * flightDistance, half, stageRect.width - half),
      y: clamp(releasePoint.y + direction.y * flightDistance, half, stageRect.height - half),
    }
    animateFlight(releasePoint, destination)
  }
  const resetGesture = () => {
    activePointerId = null
    gestureStart = null
    lastGesturePoint = null
    dragged = false
    pointerWasCaptured = false
  }
  const onPointerDown = (event: PointerEvent) => {
    if (destroyed || busy && (!captured || releasing) || event.button !== 0) return
    activePointerId = event.pointerId
    gestureStart = { x: event.clientX - bounds().left, y: event.clientY - bounds().top }
    lastGesturePoint = { ...gestureStart }
    dragged = false
    pointerWasCaptured = captured
    try { button.setPointerCapture(event.pointerId) } catch { /* Pointer capture is unavailable in some embedded browsers. */ }
    if (!captured) {
      setBusy(true)
      clearSequence()
      play('pickup')
    }
  }
  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerId !== activePointerId || !gestureStart || !lastGesturePoint) return
    const stageRect = bounds()
    const next = { x: event.clientX - stageRect.left, y: event.clientY - stageRect.top }
    if (Math.hypot(next.x - gestureStart.x, next.y - gestureStart.y) >= pokeballConfig.dragThresholdPx) dragged = true
    if (dragged && !pointerWasCaptured) setPosition(next)
    lastGesturePoint = next
  }
  const onPointerUp = (event: PointerEvent) => {
    if (event.pointerId !== activePointerId || !gestureStart || !lastGesturePoint) return
    lastPointerReleaseAt = Date.now()
    const stageRect = bounds()
    const half = pokeballConfig.renderSize / 2
    const releasePoint = {
      x: clamp(event.clientX - stageRect.left, half, stageRect.width - half),
      y: clamp(event.clientY - stageRect.top, half, stageRect.height - half),
    }
    if (pointerWasCaptured) {
      if (!dragged) releaseCaptured()
      resetGesture()
      return
    }
    const start = { ...gestureStart }
    const didDrag = dragged
    if (didDrag) setPosition(releasePoint)
    resetGesture()
    startThrow(releasePoint, start, didDrag)
  }
  const onPointerCancel = (event: PointerEvent) => {
    if (event.pointerId !== activePointerId) return
    resetGesture()
    if (!captured) {
      play('bounce', () => returnBall())
    }
  }
  const onLostPointerCapture = (event: PointerEvent) => {
    if (event.pointerId === activePointerId) onPointerCancel(event)
  }
  const onClick = () => {
    if (captured && Date.now() - lastPointerReleaseAt > 300) releaseCaptured()
  }
  const releaseCaptured = () => {
    if (!captured || releasing) return
    releasing = true
    setBusy(true)
    clearSequence()
    play('release', () => {
      setCaptured(false)
      releasing = false
      setRestingPosition()
      options.onRelease({ ...ballPosition })
      sequenceTimer = window.setTimeout(() => {
        sequenceTimer = 0
        play('bounce', () => returnBall(() => setBusy(false)))
      }, pokeballConfig.releaseRevealDelayMs)
    })
  }
  const onPointerEnter = () => {
    if (!busy && !captured) play('hover')
  }
  const onPointerLeave = () => {
    if (!busy && !captured) play('idle')
  }
  const setRestingPosition = () => {
    restingPosition = getRestingPosition()
    if (!busy && !captured) setPosition(restingPosition)
  }
  const onResize = () => {
    if (activePointerId !== null || flightFrame || positionFrame || releasing || busy && !captured) {
      cancelInteraction()
      return
    }
    if (captured) {
      const saved = readCapture(options.storageKey)
      if (saved) setPosition({ x: saved.xRatio * bounds().width, y: saved.yRatio * bounds().height })
    } else {
      setRestingPosition()
      setPosition(restingPosition)
    }
    if (message.classList.contains('is-visible')) positionMessage(true)
  }
  const onVisibilityChange = () => {
    if (document.hidden) cancelInteraction()
  }
  const cancelInteraction = () => {
    if (activePointerId !== null) {
      try { button.releasePointerCapture(activePointerId) } catch { /* The pointer may already be released. */ }
      resetGesture()
    }
    window.cancelAnimationFrame(flightFrame)
    window.cancelAnimationFrame(positionFrame)
    flightFrame = 0
    positionFrame = 0
    flightStart = null
    flightEnd = null
    clearSequence()
    if (captured) {
      saveCapture(options.storageKey, { captured: true, xRatio: ratio(ballPosition.x, bounds().width), yRatio: ratio(ballPosition.y, bounds().height) })
      releasing = false
      setPosition(ballPosition)
      play('idle')
      setBusy(true)
    } else {
      releasing = false
      setCaptured(false, false)
      setPosition(restingPosition)
      play('idle')
      setBusy(false)
    }
  }

  button.addEventListener('pointerdown', onPointerDown)
  button.addEventListener('pointermove', onPointerMove)
  button.addEventListener('pointerup', onPointerUp)
  button.addEventListener('pointercancel', onPointerCancel)
  button.addEventListener('lostpointercapture', onLostPointerCapture)
  button.addEventListener('click', onClick)
  button.addEventListener('pointerenter', onPointerEnter)
  button.addEventListener('pointerleave', onPointerLeave)
  window.addEventListener('resize', onResize)
  const stageResizeObserver = new ResizeObserver(onResize)
  stageResizeObserver.observe(stage)
  document.addEventListener('visibilitychange', onVisibilityChange)

  if (captured) {
    pet.classList.add('is-pokecharm-captured')
    dialogue.classList.add('is-pokecharm-captured')
    button.classList.add('is-captured')
    button.setAttribute('aria-label', 'Release captured companion')
    options.onCapturedChange(true)
    setBusy(true)
  }
  restingPosition = getRestingPosition()
  const stored = readCapture(options.storageKey)
  ballPosition = stored
    ? { x: stored.xRatio * bounds().width, y: stored.yRatio * bounds().height }
    : { ...restingPosition }
  setPosition(ballPosition)

  const ready = (async () => {
    validateConfig()
    sheetImage.src = options.sheetUrl
    await sheetImage.decode()
    if (sheetImage.naturalWidth !== pokeballConfig.sheetSize.width || sheetImage.naturalHeight !== pokeballConfig.sheetSize.height) {
      throw new Error('Pokéball sheet dimensions do not match its configuration')
    }
    if (destroyed) return
    play('idle')
    if (captured) {
      const savedCapture = readCapture(options.storageKey)
      if (savedCapture) setPosition({ x: savedCapture.xRatio * bounds().width, y: savedCapture.yRatio * bounds().height })
    } else {
      setRestingPosition()
    }
  })()

  return {
    ready,
    get isCaptured() { return captured },
    destroy() {
      if (destroyed) return
      destroyed = true
      window.clearTimeout(frameTimer)
      window.clearTimeout(messageTimer)
      window.clearTimeout(sequenceTimer)
      window.cancelAnimationFrame(flightFrame)
      window.cancelAnimationFrame(positionFrame)
      if (activePointerId !== null) {
        try { button.releasePointerCapture(activePointerId) } catch { /* The widget is being removed. */ }
      }
      button.removeEventListener('pointerdown', onPointerDown)
      button.removeEventListener('pointermove', onPointerMove)
      button.removeEventListener('pointerup', onPointerUp)
      button.removeEventListener('pointercancel', onPointerCancel)
      button.removeEventListener('lostpointercapture', onLostPointerCapture)
      button.removeEventListener('click', onClick)
      button.removeEventListener('pointerenter', onPointerEnter)
      button.removeEventListener('pointerleave', onPointerLeave)
      window.removeEventListener('resize', onResize)
      stageResizeObserver.disconnect()
      document.removeEventListener('visibilitychange', onVisibilityChange)
      button.remove()
      instructions.remove()
      message.remove()
      sheetImage.src = ''
      if (busy) options.onBusyChange(false)
    },
  }
}

function validateConfig() {
  if (pokeballConfig.sheetSize.width !== pokeballConfig.frameSize.width * pokeballConfig.columns || pokeballConfig.sheetSize.height !== pokeballConfig.frameSize.height * pokeballConfig.rows) {
    throw new Error('Pokéball animation grid dimensions are inconsistent')
  }
  if (pokeballConfig.anchor.x !== pokeballConfig.frameSize.width / 2 || pokeballConfig.anchor.y !== pokeballConfig.frameSize.height / 2) {
    throw new Error('Pokéball anchor must remain at the frame center')
  }
  for (const [name, expected] of Object.entries(pokeballConfig.animations)) {
    if (expected.row < 0 || expected.row >= pokeballConfig.rows || expected.frames > pokeballConfig.columns || expected.frames < 1 || expected.frameMs <= 0 || expected.durationMs !== expected.frames * expected.frameMs) {
      throw new Error(`Pokéball animation ${name} references invalid frames`)
    }
  }
}

function segmentRectIntersection(start: Point, end: Point, rect: { left: number; right: number; top: number; bottom: number }) {
  let startT = 0
  let endT = 1
  const dx = end.x - start.x
  const dy = end.y - start.y
  const edges: [number, number][] = [
    [-dx, start.x - rect.left],
    [dx, rect.right - start.x],
    [-dy, start.y - rect.top],
    [dy, rect.bottom - start.y],
  ]
  for (const [direction, distance] of edges) {
    if (direction === 0) {
      if (distance < 0) return null
      continue
    }
    const ratio = distance / direction
    if (direction < 0) startT = Math.max(startT, ratio)
    else endT = Math.min(endT, ratio)
    if (startT > endT) return null
  }
  return startT
}

function findArcIntersection(
  start: Point,
  end: Point,
  rect: { left: number; right: number; top: number; bottom: number },
  arcHeight: number,
) {
  const steps = 96
  const pointAt = (progress: number) => {
    const eased = progress < 0.5 ? 4 * progress ** 3 : 1 - Math.pow(-2 * progress + 2, 3) / 2
    return {
      x: start.x + (end.x - start.x) * eased,
      y: start.y + (end.y - start.y) * eased - Math.sin(Math.PI * eased) * arcHeight,
    }
  }
  let previous = pointAt(0)
  for (let step = 1; step <= steps; step += 1) {
    const progress = step / steps
    const current = pointAt(progress)
    const intersection = segmentRectIntersection(previous, current, rect)
    if (intersection !== null) {
      const hitProgress = (step - 1 + intersection) / steps
      return {
        progress: hitProgress,
        point: {
          x: previous.x + (current.x - previous.x) * intersection,
          y: previous.y + (current.y - previous.y) * intersection,
        },
      }
    }
    previous = current
  }
  return null
}

function readCapture(key: string): CaptureStorageState | null {
  const fallback = fallbackCaptureStates.get(key)
  if (fallback) return fallback
  try {
    const value = window.localStorage.getItem(key)
    if (!value) return null
    const state = JSON.parse(value) as Partial<CaptureStorageState>
    if (state.captured === true && Number.isFinite(state.xRatio) && Number.isFinite(state.yRatio)) {
      const valid: CaptureStorageState = { captured: true, xRatio: clamp(state.xRatio!, 0, 1), yRatio: clamp(state.yRatio!, 0, 1) }
      fallbackCaptureStates.set(key, valid)
      return valid
    }
  } catch { /* Blocked localStorage falls back to in-memory state. */ }
  return null
}

function saveCapture(key: string, state: CaptureStorageState | null) {
  if (!state) fallbackCaptureStates.delete(key)
  else fallbackCaptureStates.set(key, state)
  try {
    if (state) window.localStorage.setItem(key, JSON.stringify(state))
    else window.localStorage.removeItem(key)
  } catch { /* Blocked localStorage falls back to in-memory state. */ }
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value))
}

function ratio(value: number, maximum: number) {
  return maximum > 0 ? clamp(value / maximum, 0, 1) : 0.5
}
