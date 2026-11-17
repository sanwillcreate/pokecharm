type MovementAnimation = 'idle' | 'run'
type CreatureBehavior = { followAnimation?: 'run'; flipsToTravelDirection?: boolean }

interface Position {
  x: number
  y: number
}

type MovementMode = 'rest' | 'follow' | 'click' | 'scroll'

export interface CursorChaseHome {
  horizontal: 'left' | 'right'
  vertical: 'top' | 'bottom'
  edgeOffset: number
}

export type ChaseDirection = 'up' | 'down' | 'left' | 'right'

export function createCursorChaseController(
  playAnimation: (state: MovementAnimation) => void,
  onPosition: () => void = () => {},
) {
  let stage: HTMLElement | null = null
  let pet: HTMLElement | null = null
  let resizeObserver: ResizeObserver | null = null
  let enabled = false
  let paused = false
  let frameId = 0
  let pauseTimer = 0
  let lastFrameTime = 0
  let pauseUntil = 0
  let running = false
  let position: Position = { x: 0, y: 0 }
  let target: Position = { x: 0, y: 0 }
  let configuredStartingPosition: Position | null = null
  let restingPosition: Position | null = null
  let clickDestination: Position | null = null
  let temporaryScrollDestination: Position | null = null
  let movementMode: MovementMode = 'rest'
  let restingFollowsConfiguredStart = true
  let velocity: Position = { x: 0, y: 0 }
  let targetRatio: Position | null = null
  let initialized = false
  let followAnimation: MovementAnimation = 'run'
  let flipsToTravelDirection = true
  let restFacesTowardContent = false
  let lastHorizontalDirection: 'left' | 'right' = 'left'
  let homePlacement: CursorChaseHome | undefined

  const getBounds = () => stage?.getBoundingClientRect()

  const getSafeBounds = () => {
    const bounds = getBounds()
    if (!bounds || !pet) return null
    const anchorX = Number.parseFloat(getComputedStyle(pet).getPropertyValue('--pet-anchor-x')) || pet.offsetWidth / 2
    const anchorY = Number.parseFloat(getComputedStyle(pet).getPropertyValue('--pet-anchor-y')) || pet.offsetHeight * 0.9
    const spriteHeight = pet.offsetHeight
    const uiBottom = (stage?.querySelector<HTMLElement>('.visitor-card')?.getBoundingClientRect().bottom ?? bounds.top) - bounds.top
    const minX = Math.min(bounds.width / 2, anchorX + 12)
    const maxX = Math.max(bounds.width / 2, bounds.width - (pet.offsetWidth - anchorX) - 12)
    const maxY = bounds.height - (spriteHeight - anchorY) - 8
    const minY = Math.min(maxY, uiBottom + anchorY + 10)
    const homeX = homePlacement?.horizontal === 'left'
      ? homePlacement.edgeOffset + anchorX
      : homePlacement?.horizontal === 'right'
        ? bounds.width - homePlacement.edgeOffset - (pet.offsetWidth - anchorX)
        : bounds.width / 2
    const homeY = homePlacement?.vertical === 'top'
      ? homePlacement.edgeOffset + anchorY
      : homePlacement?.vertical === 'bottom'
        ? bounds.height - homePlacement.edgeOffset - (spriteHeight - anchorY)
        : bounds.height - 54
    return { minX, maxX, minY, maxY, home: { x: Math.max(minX, Math.min(maxX, homeX)), y: Math.max(minY, Math.min(maxY, homeY)) } }
  }

  const clampPosition = (value: Position, safe: NonNullable<ReturnType<typeof getSafeBounds>>): Position => ({
    x: Math.max(safe.minX, Math.min(safe.maxX, value.x)),
    y: Math.max(safe.minY, Math.min(safe.maxY, value.y)),
  })

  const setPosition = () => {
    if (!stage || !pet) return
    pet.style.setProperty('--pet-x', `${position.x}px`)
    pet.style.setProperty('--pet-y', `${position.y}px`)
    stage.style.setProperty('--pet-x', `${position.x}px`)
    stage.style.setProperty('--pet-y', `${position.y}px`)

    const speech = stage.querySelector<HTMLElement>('.companion-speech')
    if (!speech) return
    const bounds = getBounds()
    if (!bounds) return
    const style = getComputedStyle(pet)
    const anchorX = Number.parseFloat(style.getPropertyValue('--pet-anchor-x')) || pet.offsetWidth / 2
    const anchorY = Number.parseFloat(style.getPropertyValue('--pet-anchor-y')) || pet.offsetHeight * 0.9
    const bubbleWidth = speech.offsetWidth
    const bubbleHeight = speech.offsetHeight
    const maxLeft = Math.max(8, bounds.width - bubbleWidth - 8)
    const spriteLeft = position.x - anchorX
    const spriteTop = position.y - anchorY
    const headY = spriteTop + pet.offsetHeight * 0.27
    const aboveTop = spriteTop - bubbleHeight - 9
    const sideGap = speech.dataset.style === 'thought' ? 22 : 8
    const canPlaceRight = spriteLeft + pet.offsetWidth + sideGap + bubbleWidth <= bounds.width - 8
    const canPlaceLeft = spriteLeft - sideGap - bubbleWidth >= 8
    let left: number
    let top: number
    speech.classList.remove('is-side', 'tail-left', 'tail-right', 'tail-bottom')

    if (canPlaceRight || canPlaceLeft) {
      speech.classList.add('is-side')
      const placeRight = canPlaceRight
      left = placeRight
        ? spriteLeft + pet.offsetWidth + sideGap
        : spriteLeft - bubbleWidth - sideGap
      top = headY - bubbleHeight * 0.65
      speech.classList.add(placeRight ? 'tail-left' : 'tail-right')
      speech.style.setProperty('--speech-tail-y', `${Math.max(8, Math.min(bubbleHeight - 8, headY - top))}px`)
      speech.style.setProperty('--speech-trail-y', `${Math.max(8, Math.min(bubbleHeight - 8, headY - top))}px`)
    } else if (aboveTop >= 8) {
      left = Math.max(8, Math.min(maxLeft, position.x - bubbleWidth / 2))
      top = aboveTop
      speech.classList.add('tail-bottom')
      speech.style.setProperty('--speech-tail-x', `${Math.max(10, Math.min(bubbleWidth - 10, position.x - left))}px`)
    } else {
      const placeRight = bounds.width - (spriteLeft + pet.offsetWidth) >= spriteLeft
      speech.classList.add('is-side', placeRight ? 'tail-left' : 'tail-right')
      left = placeRight ? spriteLeft + pet.offsetWidth + sideGap : spriteLeft - bubbleWidth - sideGap
      top = headY - bubbleHeight * 0.65
      speech.style.setProperty('--speech-tail-y', `${Math.max(8, Math.min(bubbleHeight - 8, headY - top))}px`)
      speech.style.setProperty('--speech-trail-y', `${Math.max(8, Math.min(bubbleHeight - 8, headY - top))}px`)
    }

    speech.style.left = `${Math.max(8, Math.min(maxLeft, left))}px`
    speech.style.top = `${Math.max(8, Math.min(bounds.height - bubbleHeight - 8, top))}px`
    onPosition()
  }

  const setRunning = (next: boolean) => {
    if (running === next) return
    running = next
    playAnimation(next ? followAnimation : 'idle')
  }

  const refreshMovement = () => {
    if (stage && pet) playAnimation(running ? followAnimation : 'idle')
  }

  const setFacing = (direction: 'left' | 'right', resting = false) => {
    if (!pet) return
    pet.classList.toggle('is-resting-orientation', resting)
    pet.style.setProperty('--pet-facing', direction === 'left' ? '1' : '-1')
    lastHorizontalDirection = direction
  }

  const setRestingFacing = (x: number, transition = true) => {
    if (!restFacesTowardContent || !stage) return
    const midpoint = stage.getBoundingClientRect().width / 2
    const fromCenter = x - midpoint
    const direction = Math.abs(fromCenter) <= 8
      ? lastHorizontalDirection
      : fromCenter > 0 ? 'left' : 'right'
    setFacing(direction, transition)
  }

  const stopFrame = () => {
    if (!frameId) return
    window.cancelAnimationFrame(frameId)
    frameId = 0
    lastFrameTime = 0
  }

  const frame = (time: number) => {
    frameId = 0
    if (!stage || !pet) return
    const safe = getSafeBounds()
    if (!safe) return

    if (lastFrameTime === 0) lastFrameTime = time
    const deltaTime = Math.min((time - lastFrameTime) / 1000, 0.04)
    lastFrameTime = time

    target.x = Math.max(safe.minX, Math.min(safe.maxX, target.x))
    target.y = Math.max(safe.minY, Math.min(safe.maxY, target.y))
    position.x = Math.max(safe.minX, Math.min(safe.maxX, position.x))
    position.y = Math.max(safe.minY, Math.min(safe.maxY, position.y))

    const dx = target.x - position.x
    const dy = target.y - position.y
    const distance = Math.hypot(dx, dy)
    if (distance > 3) pet.classList.remove('is-resting-orientation')
    if (distance <= 3) {
      position = { ...target }
      velocity = { x: 0, y: 0 }
      if (movementMode === 'click') {
        clickDestination = { ...position }
        restingPosition = { ...position }
      }
      setRestingFacing(position.x)
      setPosition()
      setRunning(false)
      stopFrame()
      return
    }

    const desiredSpeed = Math.min(420, distance * 3.6)
    const desiredVelocity = { x: dx / distance * desiredSpeed, y: dy / distance * desiredSpeed }
    const velocityDelta = { x: desiredVelocity.x - velocity.x, y: desiredVelocity.y - velocity.y }
    const velocityChange = Math.hypot(velocityDelta.x, velocityDelta.y)
    const maxChange = 1800 * deltaTime
    if (velocityChange > maxChange) {
      velocity.x += velocityDelta.x / velocityChange * maxChange
      velocity.y += velocityDelta.y / velocityChange * maxChange
    } else {
      velocity = desiredVelocity
    }

    const step = Math.hypot(velocity.x, velocity.y) * deltaTime
    const travelDirection = Math.abs(velocity.x) > 3
      ? velocity.x < 0 ? 'left' : 'right'
      : null
    if (step >= distance) {
      position = { ...target }
      velocity = { x: 0, y: 0 }
    } else {
      position.x += velocity.x * deltaTime
      position.y += velocity.y * deltaTime
    }
    // All registered sprite sheets face left by default (scaleX(1)). Flip
    // only when travelling right; vertical movement keeps the last facing.
    if (flipsToTravelDirection && travelDirection) setFacing(travelDirection)
    setPosition()
    setRunning(distance > 5)
    frameId = window.requestAnimationFrame(frame)
  }

  const startFrame = () => {
    if (paused || performance.now() < pauseUntil) return
    if (!frameId) frameId = window.requestAnimationFrame(frame)
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!enabled || paused || event.pointerType === 'touch' || !stage || clickDestination || movementMode === 'scroll') return
    const bounds = stage.getBoundingClientRect()
    const safe = getSafeBounds()
    if (!safe || bounds.width === 0 || bounds.height === 0) return
    const localX = event.clientX - bounds.left
    const localY = event.clientY - bounds.top
    targetRatio = { x: localX / bounds.width, y: localY / bounds.height }
    temporaryScrollDestination = null
    movementMode = 'follow'
    target = {
      x: Math.max(safe.minX, Math.min(safe.maxX, localX)),
      y: Math.max(safe.minY, Math.min(safe.maxY, localY)),
    }
    startFrame()
  }

  const onPointerLeave = (event: PointerEvent) => {
    if (!enabled || paused || event.pointerType === 'touch' || !stage) return
    const safe = getSafeBounds()
    if (!safe) return
    targetRatio = null
    temporaryScrollDestination = null
    movementMode = 'rest'
    target = clickDestination && restingPosition
      ? { ...restingPosition }
      : configuredStartingPosition ? { ...configuredStartingPosition } : safe.home
    startFrame()
  }

  const addPointerListeners = () => {
    if (!enabled || !stage) return
    stage.addEventListener('pointermove', onPointerMove)
    stage.addEventListener('pointerleave', onPointerLeave)
  }

  const removePointerListeners = () => {
    if (!stage) return
    stage.removeEventListener('pointermove', onPointerMove)
    stage.removeEventListener('pointerleave', onPointerLeave)
  }

  const moveTo = (clientX: number, clientY: number) => {
    if (!stage) return
    const bounds = stage.getBoundingClientRect()
    const safe = getSafeBounds()
    if (!safe || bounds.width === 0 || bounds.height === 0) return
    targetRatio = null
    temporaryScrollDestination = null
    movementMode = 'click'
    restingFollowsConfiguredStart = false
    clickDestination = {
      x: Math.max(safe.minX, Math.min(safe.maxX, clientX - bounds.left)),
      y: Math.max(safe.minY, Math.min(safe.maxY, clientY - bounds.top)),
    }
    restingPosition = { ...clickDestination }
    target = { ...clickDestination }
    startFrame()
  }

  const nudge = (direction: ChaseDirection, distance = 72) => {
    const safe = getSafeBounds()
    if (!safe) return
    const delta = direction === 'up' ? { x: 0, y: -distance }
      : direction === 'down' ? { x: 0, y: distance }
        : direction === 'left' ? { x: -distance, y: 0 }
          : { x: distance, y: 0 }
    targetRatio = null
    temporaryScrollDestination = clampPosition({ x: position.x + delta.x, y: position.y + delta.y }, safe)
    movementMode = 'scroll'
    target = { ...temporaryScrollDestination }
    startFrame()
  }

  const returnHome = () => {
    const safe = getSafeBounds()
    if (!safe) return
    targetRatio = null
    configuredStartingPosition = { ...safe.home }
    restingPosition = { ...safe.home }
    clickDestination = null
    temporaryScrollDestination = null
    restingFollowsConfiguredStart = true
    movementMode = 'rest'
    target = { ...safe.home }
    startFrame()
  }

  const returnToResting = () => {
    const safe = getSafeBounds()
    if (!safe) return
    targetRatio = null
    temporaryScrollDestination = null
    movementMode = 'rest'
    if (!restingPosition) restingPosition = configuredStartingPosition ?? safe.home
    target = clampPosition(restingPosition, safe)
    restingPosition = { ...target }
    startFrame()
  }

  const syncPositionsToBounds = (safe: NonNullable<ReturnType<typeof getSafeBounds>>, width: number, height: number) => {
    position = clampPosition(position, safe)
    configuredStartingPosition = { ...safe.home }
    if (restingFollowsConfiguredStart) restingPosition = { ...safe.home }
    else if (restingPosition) restingPosition = clampPosition(restingPosition, safe)
    if (clickDestination) clickDestination = clampPosition(clickDestination, safe)
    if (temporaryScrollDestination) temporaryScrollDestination = clampPosition(temporaryScrollDestination, safe)
    target = movementMode === 'follow' && targetRatio
      ? clampPosition({ x: targetRatio.x * width, y: targetRatio.y * height }, safe)
      : movementMode === 'scroll' && temporaryScrollDestination
        ? { ...temporaryScrollDestination }
        : movementMode === 'click' && clickDestination
          ? { ...clickDestination }
          : { ...(restingPosition ?? safe.home) }
  }

  const attach = (nextStage: HTMLElement, nextPet: HTMLElement, behavior?: CreatureBehavior, home?: CursorChaseHome) => {
    removePointerListeners()
    resizeObserver?.disconnect()
    stage = nextStage
    pet = nextPet
    homePlacement = home
    followAnimation = behavior?.followAnimation ?? 'run'
    flipsToTravelDirection = behavior?.flipsToTravelDirection ?? true
    const safe = getSafeBounds()
    if (!safe) return
    if (!initialized) {
      position = { ...safe.home }
      target = { ...safe.home }
      configuredStartingPosition = { ...safe.home }
      restingPosition = { ...safe.home }
      initialized = true
    } else {
      syncPositionsToBounds(safe, nextStage.clientWidth, nextStage.clientHeight)
    }
    if (!running) setRestingFacing(position.x, false)
    setPosition()
    addPointerListeners()
    resizeObserver = new ResizeObserver(() => {
      const resized = getSafeBounds()
      if (!resized) return
      syncPositionsToBounds(resized, nextStage.clientWidth, nextStage.clientHeight)
      if (!running) setRestingFacing(position.x)
      setPosition()
      startFrame()
    })
    resizeObserver.observe(nextStage)
    if (enabled) startFrame()
  }

  const reset = () => {
    window.clearTimeout(pauseTimer)
    pauseTimer = 0
    pauseUntil = 0
    targetRatio = null
    movementMode = 'rest'
    temporaryScrollDestination = null
    clickDestination = null
    restingFollowsConfiguredStart = true
    velocity = { x: 0, y: 0 }
    const safe = getSafeBounds()
    if (safe) {
      configuredStartingPosition = { ...safe.home }
      restingPosition = { ...safe.home }
      position = { ...safe.home }
      target = { ...safe.home }
      setPosition()
    }
    setRunning(false)
    stopFrame()
  }

  const detach = () => {
    stopFrame()
    resizeObserver?.disconnect()
    resizeObserver = null
    if (stage) {
      removePointerListeners()
    }
    stage = null
    pet = null
    initialized = false
    targetRatio = null
    configuredStartingPosition = null
    restingPosition = null
    clickDestination = null
    temporaryScrollDestination = null
    movementMode = 'rest'
    restingFollowsConfiguredStart = true
    homePlacement = undefined
  }

  const setEnabled = (next: boolean) => {
    enabled = next
    if (enabled) {
      addPointerListeners()
    } else {
      removePointerListeners()
      targetRatio = null
      const safe = getSafeBounds()
      if (safe) {
        temporaryScrollDestination = null
        movementMode = 'rest'
        target = clickDestination && restingPosition
          ? { ...restingPosition }
          : { ...safe.home }
      }
      startFrame()
    }
  }

  const setPaused = (next: boolean) => {
    if (paused === next) return
    paused = next
    if (paused) {
      stopFrame()
      velocity = { x: 0, y: 0 }
      setRunning(false)
    } else {
      startFrame()
    }
  }

  const setRestFacesTowardContent = (next: boolean) => {
    restFacesTowardContent = next
    if (next && stage && !running) setRestingFacing(position.x, false)
  }

  const pauseFor = (duration: number) => {
    pauseUntil = performance.now() + duration
    window.clearTimeout(pauseTimer)
    stopFrame()
    velocity = { x: 0, y: 0 }
    running = false
    pauseTimer = window.setTimeout(() => {
      pauseTimer = 0
      pauseUntil = 0
      startFrame()
    }, duration)
  }

  const destroy = () => {
    stopFrame()
    window.clearTimeout(pauseTimer)
    pauseTimer = 0
    resizeObserver?.disconnect()
    if (stage) {
      removePointerListeners()
    }
    stage = null
    pet = null
    configuredStartingPosition = null
    restingPosition = null
    clickDestination = null
    temporaryScrollDestination = null
    movementMode = 'rest'
    restingFollowsConfiguredStart = true
    homePlacement = undefined
  }

  return { attach, detach, reset, setEnabled, setPaused, setRestFacesTowardContent, moveTo, nudge, returnHome, returnToResting, pauseFor, refreshPosition: setPosition, refreshMovement, get isMoving() { return running }, destroy }
}
