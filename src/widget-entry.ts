import widgetStyles from './embed-widget.css?inline'
import { mountCompanionWidget, type CompanionWidgetConfig } from './companion-widget'

interface WidgetHandle {
  destroy: () => void
  play: (state: 'idle' | 'jump' | 'attack' | 'hurt' | 'sleep' | 'happy' | 'run' | 'walk' | 'evolution') => boolean
  say: (message: string, style: 'speech' | 'thought', duration?: number) => void
  simulateMilestone: () => boolean
}

interface PokecharmWidgetApi {
  mount: (config: CompanionWidgetConfig, target?: HTMLElement) => WidgetHandle
  destroyAll: () => void
  simulateMilestone: (target?: HTMLElement) => boolean
}

declare global {
  interface Window { PokecharmWidget?: PokecharmWidgetApi }
}

const script = document.currentScript instanceof HTMLScriptElement ? document.currentScript : null
const instances = new Map<WidgetHandle, HTMLElement>()

function mount(config: CompanionWidgetConfig, target?: HTMLElement) {
  const host = target ?? document.createElement('div')
  if (!target) document.body.append(host)
  host.setAttribute('aria-label', 'Pokecharm companion')
  const handle = mountCompanionWidget(host, config, widgetStyles)
  const originalDestroy = handle.destroy
  const wrapped: WidgetHandle = {
    ...handle,
    destroy() {
      originalDestroy()
      instances.delete(wrapped)
      if (!target) host.remove()
    },
  }
  instances.set(wrapped, host)
  return wrapped
}

const api: PokecharmWidgetApi = {
  mount,
  destroyAll() {
    for (const [handle] of instances) handle.destroy()
  },
  simulateMilestone(target) {
    const entry = [...instances.entries()].find(([, host]) => !target || host === target)
    return entry?.[0].simulateMilestone() ?? false
  },
}

window.PokecharmWidget = api

if (script && script.dataset.noAutostart !== 'true') {
  const data = script.dataset
  const parseSize = (value: string | undefined) => {
    if (!value) return undefined
    const [desktop, mobile] = value.split(/[,:/]/).map(Number)
    if (!Number.isFinite(desktop) || desktop < 24 || desktop > 512) return undefined
    return { desktop, mobile: Number.isFinite(mobile) && mobile >= 24 && mobile <= 512 ? mobile : undefined }
  }
  const size = parseSize(data.size)
  const scriptUrl = new URL(script.src || document.baseURI, document.baseURI)
  const assetBase = data.assetsBase || new URL('/', scriptUrl).href
  const config: CompanionWidgetConfig = {
    companion: data.companion || 'pikachu',
    name: data.name,
    size,
    position: data.position as CompanionWidgetConfig['position'],
    edgeOffset: Number(data.edgeOffset) || undefined,
    clickToMove: data.clickToMove !== 'false',
    scrollReactions: data.scrollReactions !== 'false',
    followCursor: data.followCursor === 'true',
    installationId: data.installationId,
    publicSiteKey: data.siteKey,
    visitEndpoint: data.visitEndpoint,
    assetBase,
  }
  const start = () => mount(config)
  if (document.body) start()
  else document.addEventListener('DOMContentLoaded', start, { once: true })
}
