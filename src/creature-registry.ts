import type { CompanionId } from './companions'
import { creatureDialogues, type CompanionDialogue } from './dialogue'

export type CreatureAnimationName = 'idle' | 'walk' | 'run' | 'jump' | 'attack' | 'hurt' | 'sleep' | 'happy'
type FrameRect = [number, number, number, number]

export interface CreatureAnimationDefinition {
  row: number
  y: number
  frames: number
  fps: number
  frame_ms: number
  duration_ms: number
  loop: boolean
  rects?: FrameRect[]
}

export interface CreatureAtlas {
  name: string
  image: string
  image_size: [number, number]
  cell?: [number, number]
  frame_width?: number
  frame_height?: number
  columns: number
  rows: number
  anchor: { x: number; y: number; note?: string }
  animations: Partial<Record<CreatureAnimationName, CreatureAnimationDefinition>>
}

export interface CreatureTheme {
  primary: string
  secondary: string
  background: string
  accent: string
  textAccent: string
}

export interface CreatureAutonomyConfig {
  autonomousJump: { minDelayMs: number; maxDelayMs: number; chance: number; cooldownMs: number }
  sleepAfterMs: { min: number; max: number }
  clickSequenceWindowMs: number
}

export interface CreatureConfig {
  id: string
  displayName: string
  companionId: CompanionId
  personality: 'Bright' | 'Warm' | 'Calm' | 'Steady'
  themeName: string
  theme: CreatureTheme
  showcaseTraits: string
  showcaseDescription: string
  spriteSheetPath: string
  atlasPath: string
  displayHeight: number
  dialogue: CompanionDialogue
  autonomy: CreatureAutonomyConfig
  sound?: { enabled: boolean; source?: string }
  behavior?: { followAnimation?: 'run'; flipsToTravelDirection?: boolean }
}

export interface LoadedCreature extends CreatureConfig {
  name: string
  image: string
  image_size: [number, number]
  cell: [number, number]
  columns: number
  rows: number
  anchor: { x: number; y: number; note?: string }
  visualBounds: { left: number; top: number; right: number; bottom: number }
  animations: Partial<Record<CreatureAnimationName, CreatureAnimationDefinition>>
}

export const creatureRegistry: CreatureConfig[] = [
  {
    id: 'spark',
    displayName: 'Spark',
    companionId: 'spark',
    personality: 'Bright',
    themeName: 'Electric',
    theme: {
      primary: '#d6aa32',
      secondary: '#f0d47b',
      background: 'radial-gradient(circle at 86% 18%, #e4bd4b1c 0 3px, transparent 4px), radial-gradient(circle at 78% 24%, #e4bd4b16 0 2px, transparent 3px), linear-gradient(145deg, #fffaf0 0%, #fff4d6 54%, #f9edc6 100%)',
      accent: '#c99a25',
      textAccent: '#876514',
    },
    showcaseTraits: 'Bright · Energetic · Curious',
    showcaseDescription: 'A cheerful spark, always curious about who might stop by.',
    spriteSheetPath: '/assets/creatures/spark/spark-sheet.png',
    atlasPath: '/assets/creatures/spark/spark-atlas.json',
    displayHeight: 100,
    dialogue: creatureDialogues.spark,
    autonomy: {
      autonomousJump: { minDelayMs: 1200, maxDelayMs: 2600, chance: 0.78, cooldownMs: 4800 },
      sleepAfterMs: { min: 5200, max: 5900 },
      clickSequenceWindowMs: 1120,
    },
    sound: { enabled: false },
    behavior: { followAnimation: 'run', flipsToTravelDirection: true },
  },
  {
    id: 'ember',
    displayName: 'Ember',
    companionId: 'ember',
    personality: 'Warm',
    themeName: 'Fire',
    theme: {
      primary: '#d9795e',
      secondary: '#f2aa79',
      background: 'radial-gradient(ellipse at 86% 18%, #e7865c20 0%, transparent 21%), radial-gradient(ellipse at 12% 78%, #e7865c13 0%, transparent 23%), linear-gradient(145deg, #fff7f0 0%, #ffede2 54%, #fbe5e1 100%)',
      accent: '#d87558',
      textAccent: '#a7513e',
    },
    showcaseTraits: 'Warm · Playful · Enthusiastic',
    showcaseDescription: 'A playful little flame with a warm welcome for everyone.',
    spriteSheetPath: '/assets/creatures/ember/ember-sheet.png',
    atlasPath: '/assets/creatures/ember/ember-atlas.json',
    displayHeight: 100,
    dialogue: creatureDialogues.ember,
    autonomy: {
      autonomousJump: { minDelayMs: 1800, maxDelayMs: 3400, chance: 0.46, cooldownMs: 6500 },
      sleepAfterMs: { min: 5200, max: 5900 },
      clickSequenceWindowMs: 1120,
    },
    sound: { enabled: false },
    behavior: { followAnimation: 'run', flipsToTravelDirection: true },
  },
  {
    id: 'tide',
    displayName: 'Tide',
    companionId: 'tide',
    personality: 'Calm',
    themeName: 'Water',
    theme: {
      primary: '#419fb8',
      secondary: '#8ed2dc',
      background: 'radial-gradient(ellipse at 84% 18%, #59b9cb20 0%, transparent 22%), radial-gradient(ellipse at 16% 80%, #59b9cb13 0%, transparent 25%), linear-gradient(145deg, #f2fbfc 0%, #e1f5f8 54%, #e1f0f8 100%)',
      accent: '#3895ae',
      textAccent: '#2c7184',
    },
    showcaseTraits: 'Calm · Relaxed · Witty',
    showcaseDescription: 'Cool-headed and easygoing, Tide makes everyone feel at home.',
    spriteSheetPath: '/assets/creatures/tide/tide-sheet.png',
    atlasPath: '/assets/creatures/tide/tide-atlas.json',
    displayHeight: 100,
    dialogue: creatureDialogues.tide,
    autonomy: {
      autonomousJump: { minDelayMs: 2300, maxDelayMs: 4200, chance: 0.2, cooldownMs: 8500 },
      sleepAfterMs: { min: 5300, max: 6000 },
      clickSequenceWindowMs: 1120,
    },
    sound: { enabled: false },
    behavior: { followAnimation: 'run', flipsToTravelDirection: true },
  },
  {
    id: 'moss',
    displayName: 'Moss',
    companionId: 'moss',
    personality: 'Steady',
    themeName: 'Grass',
    theme: {
      primary: '#7b9f59',
      secondary: '#b6cd8d',
      background: 'radial-gradient(ellipse at 86% 18%, #94b86a1c 0%, transparent 22%), radial-gradient(ellipse at 14% 78%, #94b86a14 0%, transparent 24%), linear-gradient(145deg, #f8fbf1 0%, #edf4df 54%, #e8f0df 100%)',
      accent: '#779a53',
      textAccent: '#57733d',
    },
    showcaseTraits: 'Steady · Gentle · Dependable',
    showcaseDescription: 'A gentle, steady friend who brings a little calm to this corner.',
    spriteSheetPath: '/assets/creatures/moss/moss-sheet.png',
    atlasPath: '/assets/creatures/moss/moss-atlas.json',
    displayHeight: 100,
    dialogue: creatureDialogues.moss,
    autonomy: {
      autonomousJump: { minDelayMs: 1700, maxDelayMs: 3300, chance: 0.32, cooldownMs: 7200 },
      sleepAfterMs: { min: 5200, max: 5900 },
      clickSequenceWindowMs: 1120,
    },
    sound: { enabled: false },
    behavior: { followAnimation: 'run', flipsToTravelDirection: true },
  },
]

const loadedCreatures = new Map<string, Promise<LoadedCreature>>()

export function getCreatureForCompanion(companionId: CompanionId) {
  return creatureRegistry.find((creature) => creature.companionId === companionId)
}

export function loadCreature(creature: CreatureConfig): Promise<LoadedCreature> {
  const cached = loadedCreatures.get(creature.id)
  if (cached) return cached

  const loading = fetch(creature.atlasPath)
    .then((response) => {
      if (!response.ok) throw new Error(`Could not load ${creature.displayName} atlas`)
      return response.json() as Promise<CreatureAtlas>
    })
    .then(async (atlas) => {
      const cell = atlas.cell ?? (atlas.frame_width && atlas.frame_height
        ? [atlas.frame_width, atlas.frame_height] as [number, number]
        : null)
      if (!cell || atlas.image_size[0] !== cell[0] * atlas.columns || atlas.image_size[1] !== cell[1] * atlas.rows) {
        throw new Error(`${creature.displayName} atlas grid does not match its sheet dimensions`)
      }
      const sheetFileName = creature.spriteSheetPath.slice(creature.spriteSheetPath.lastIndexOf('/') + 1)
      if (atlas.image !== sheetFileName) throw new Error(`${creature.displayName} atlas points to a different sprite sheet`)
      if (atlas.anchor.x < 0 || atlas.anchor.x > cell[0] || atlas.anchor.y < 0 || atlas.anchor.y > cell[1]) {
        throw new Error(`${creature.displayName} atlas anchor is outside its frame`)
      }
      for (const [name, animation] of Object.entries(atlas.animations)) {
        if (!animation || !animation.frames || !animation.frame_ms) continue
        if (animation.rects && animation.rects.length !== animation.frames) {
          throw new Error(`${creature.displayName} ${name} frame count does not match its atlas rectangles`)
        }
        if (animation.rects?.some((rect) => rect[0] < 0 || rect[1] < 0 || rect[2] !== cell[0] || rect[3] !== cell[1] || rect[0] + rect[2] > atlas.image_size[0] || rect[1] + rect[3] > atlas.image_size[1])) {
          throw new Error(`${creature.displayName} ${name} frames are outside its sprite sheet`)
        }
      }
      const image = new Image()
      image.crossOrigin = 'anonymous'
      image.src = creature.spriteSheetPath
      await image.decode()
      if (image.naturalWidth !== atlas.image_size[0] || image.naturalHeight !== atlas.image_size[1]) {
        throw new Error(`${creature.displayName} sprite sheet dimensions do not match its atlas`)
      }
      return { ...creature, ...atlas, cell, visualBounds: getVisualBounds(image, atlas, cell) }
    })
    .catch((error: unknown) => {
      loadedCreatures.delete(creature.id)
      throw error
    })

  loadedCreatures.set(creature.id, loading)
  return loading
}

function getVisualBounds(image: HTMLImageElement, atlas: CreatureAtlas, cell: [number, number]) {
  const fallback = { left: 0, top: 0, right: cell[0], bottom: cell[1] }
  try {
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return fallback
    context.drawImage(image, 0, 0)
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
    let left = cell[0]
    let top = cell[1]
    let right = 0
    let bottom = 0
    for (const animation of Object.values(atlas.animations)) {
      if (!animation) continue
      for (let frame = 0; frame < animation.frames; frame += 1) {
        const rect = animation.rects?.[frame]
        const frameX = rect?.[0] ?? frame * cell[0]
        const frameY = rect?.[1] ?? animation.y
        for (let y = 0; y < cell[1]; y += 1) {
          for (let x = 0; x < cell[0]; x += 1) {
            const alpha = pixels[((frameY + y) * canvas.width + frameX + x) * 4 + 3]
            if (!alpha) continue
            left = Math.min(left, x)
            top = Math.min(top, y)
            right = Math.max(right, x + 1)
            bottom = Math.max(bottom, y + 1)
          }
        }
      }
    }
    return right > left && bottom > top ? { left, top, right, bottom } : fallback
  } catch {
    // Cross-origin assets without canvas access use the animation frame as a safe bound.
    return fallback
  }
}
