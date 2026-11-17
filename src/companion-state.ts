import { companions, type Companion, type CompanionMood } from './companions'
import { selectCompanion } from './companion-selection'
import { soundConfiguration } from './sound'

export interface CompanionState {
  companion: Companion
  name: string
  mood: CompanionMood
  dialogue: string
  emote: string
  soundEnabled: boolean
}

export function createCompanionState() {
  const companion = companions[0]
  let nameIsCustom = false
  const state: CompanionState = {
    companion,
    name: 'Pip',
    mood: 'curious',
    dialogue: companion.dialogue.greeting[0],
    emote: '',
    soundEnabled: soundConfiguration.defaultEnabled,
  }

  return {
    state,
    choose(id: string) {
      state.companion = selectCompanion(id)
      if (!nameIsCustom) state.name = state.companion.defaultName
      state.mood = 'curious'
      state.emote = ''
      state.dialogue = state.companion.dialogue.greeting[0]
    },
    rename(name: string) {
      nameIsCustom = true
      state.name = name.trim().slice(0, 18) || state.companion.defaultName
    },
    setSound(enabled: boolean) { state.soundEnabled = enabled },
    idle() {
      const rested = Math.random() < 0.2
      state.mood = rested ? 'resting' : Math.random() < 0.45 ? 'happy' : 'curious'
      state.emote = nextLine(state.companion.emotes, state.emote)
      state.dialogue = randomLine(state.companion.dialogue.idle)
    },
  }
}

function randomLine(lines: string[]) {
  return lines[Math.floor(Math.random() * lines.length)]
}

function nextLine(lines: string[], previous: string) {
  const choices = lines.filter((line) => line !== previous)
  return randomLine(choices.length ? choices : lines)
}
