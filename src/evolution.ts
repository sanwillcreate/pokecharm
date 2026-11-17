export interface EvolutionStage {
  name: string
  visitors: number
  label: string
}

export const evolutionStages: EvolutionStage[] = [
  { name: 'New friend', visitors: 0, label: 'JUST ARRIVED' },
  { name: 'Growing together', visitors: 100, label: 'FIRST MILESTONE' },
  { name: 'Website companion', visitors: 2000, label: 'FULLY GROWN' },
]

export function getEvolution(visitors: number) {
  const stageIndex = visitors >= 2000 ? 2 : visitors >= 100 ? 1 : 0
  const nextStage = evolutionStages[stageIndex + 1]
  const previousThreshold = evolutionStages[stageIndex].visitors
  const progress = nextStage
    ? Math.min(100, Math.round(((visitors - previousThreshold) / (nextStage.visitors - previousThreshold)) * 100))
    : 100

  return { stage: evolutionStages[stageIndex], nextStage, progress }
}
