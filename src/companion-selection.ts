import { companions, type Companion, type CompanionId } from './companions'

export function selectCompanion(id: string): Companion {
  return companions.find((companion) => companion.id === id as CompanionId) ?? companions[0]
}
