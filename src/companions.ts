export type CompanionId = 'spark' | 'ember' | 'tide' | 'moss'
export type CompanionMood = 'curious' | 'happy' | 'resting'

export interface Companion {
  id: CompanionId
  label: string
  defaultName: string
  description: string
  body: string
  accent: string
  detail: string
  dialogue: { greeting: string[]; idle: string[]; visitor: string[]; milestone: string[] }
  emotes: string[]
  idleStyle: 'bounce' | 'sway' | 'float' | 'nod'
  sound: { enabled: boolean; source?: string }
}

const sprite = (body: string, accent: string, detail: string) => `<svg viewBox="0 0 160 160" role="img" aria-label="Original pixel companion" shape-rendering="crispEdges"><rect x="48" y="24" width="64" height="16" fill="${body}"/><rect x="32" y="40" width="96" height="56" fill="${body}"/><rect x="24" y="56" width="16" height="40" fill="${body}"/><rect x="120" y="56" width="16" height="40" fill="${body}"/><rect x="40" y="96" width="80" height="24" fill="${body}"/><rect x="48" y="120" width="24" height="16" fill="${body}"/><rect x="88" y="120" width="24" height="16" fill="${body}"/><rect class="eye eye-left" x="48" y="56" width="16" height="16" fill="#182b32"/><rect class="eye eye-right" x="96" y="56" width="16" height="16" fill="#182b32"/><rect x="52" y="56" width="5" height="5" fill="white"/><rect x="100" y="56" width="5" height="5" fill="white"/><rect x="72" y="80" width="16" height="8" fill="${detail}"/><rect x="48" y="104" width="64" height="8" fill="${accent}"/><rect x="16" y="32" width="16" height="16" fill="${accent}"/><rect x="128" y="24" width="16" height="16" fill="${accent}"/><rect x="56" y="8" width="8" height="16" fill="${accent}"/><rect x="88" y="8" width="8" height="16" fill="${accent}"/><rect x="56" y="136" width="8" height="8" fill="#182b32"/><rect x="96" y="136" width="8" height="8" fill="#182b32"/></svg>`

const lines = {
  greeting: ['Hello, visitor. I’m glad you found us.', 'A new face! This place feels warmer already.'],
  idle: ['I like it here. It feels like us.', 'I wonder what we’ll make next.', 'Just taking in the view.'],
  visitor: ['Oh, someone’s here! I’ll say hello.', 'A visitor! Our little corner is growing.', 'There you are. Welcome in!'],
  milestone: ['We did it together. Look how far we’ve come!', 'A little more of us in the world. Thank you.'],
}

// Temporary original placeholders. Replace sprite fields and optional sound sources with licensed assets later.
export const companions: Companion[] = [
  { id: 'spark', label: 'Bright', defaultName: 'Pip', description: 'Pikachu · curious, quick to greet, always looking around.', body: '#4aaee0', accent: '#f0cf70', detail: '#fff0aa', dialogue: lines, emotes: ['A small wave', 'A curious look', 'A happy bounce'], idleStyle: 'bounce', sound: { enabled: false } },
  { id: 'ember', label: 'Warm', defaultName: 'Charmender', description: 'Charmender · gentle, playful, and encouraging.', body: '#d98778', accent: '#efb87b', detail: '#ffe0a8', dialogue: { ...lines, idle: ['It’s nice when things feel welcoming.', 'I’ll keep this little place cozy.'] }, emotes: ['A soft nod', 'A content smile', 'A little stretch'], idleStyle: 'sway', sound: { enabled: false } },
  { id: 'tide', label: 'Calm', defaultName: 'Squirtle', description: 'Squirtle · relaxed, witty, and cool-headed.', body: '#6e9fe8', accent: '#a8dfea', detail: '#d4f7ff', dialogue: { ...lines, idle: ['There’s a nice rhythm to this place.', 'I could sit by this window all day.'] }, emotes: ['A slow blink', 'A tiny wave', 'A restful sigh'], idleStyle: 'float', sound: { enabled: false } },
  { id: 'moss', label: 'Steady', defaultName: 'Bulbasaur', description: 'Bulbasaur · gentle, patient, and dependable.', body: '#69a978', accent: '#b5d971', detail: '#e3f3b9', dialogue: { ...lines, idle: ['Little by little is still growing.', 'I like watching this place take shape.'] }, emotes: ['A pleased nod', 'A gentle stretch', 'A thoughtful look'], idleStyle: 'nod', sound: { enabled: false } },
]

export function getCompanionArt(companion: Companion) {
  return sprite(companion.body, companion.accent, companion.detail)
}
