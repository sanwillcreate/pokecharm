import { createAnimationController } from './creature-animation'
import { companions } from './companions'
import { creatureRegistry, loadCreature, type LoadedCreature } from './creature-registry'
import type { CompanionWidgetConfig } from './companion-widget'
import { getWidgetAssetBase, widgetInstallerConfig } from './widget-installer-config'
import { createZipArchive } from './zip-archive'

interface PreviewHandle {
  destroy: () => void
  play: (state: 'idle' | 'jump' | 'attack' | 'hurt' | 'sleep' | 'happy' | 'run' | 'walk' | 'evolution') => boolean
  say: (message: string, style: 'speech' | 'thought', duration?: number) => void
  simulateMilestone: () => boolean
}

interface PreviewApi {
  mount: (config: CompanionWidgetConfig, target?: HTMLElement) => PreviewHandle
  destroyAll: () => void
  simulateMilestone: (target?: HTMLElement) => boolean
}

interface PreviewWindow extends Window {
  PokecharmWidget?: PreviewApi
}

const sizeOptions = [
  { value: 72, label: 'Small' },
  { value: 96, label: 'Medium' },
  { value: 128, label: 'Large' },
] as const

export function mountCompanionInstaller(root: HTMLElement) {
  const defaultCreature = creatureRegistry[0]
  if (!defaultCreature) throw new Error('Pokecharm requires at least one registered companion')

  let selectedCreature = defaultCreature
  let selectedSize = 96
  let widgetApiPromise: Promise<PreviewApi> | null = null
  let previewHandle: PreviewHandle | null = null
  let previewTimer = 0
  let feedbackTimer = 0
  let destroyed = false
  const loadedCreatures = new Map<string, LoadedCreature>()

  const getDefaultName = (creature = selectedCreature) => companions.find((item) => item.id === creature.companionId)?.defaultName ?? creature.displayName
  const getWidgetBoxSize = (creature = selectedCreature) => {
    const loaded = loadedCreatures.get(creature.id)
    const widthToHeightRatio = loaded ? loaded.cell[0] / loaded.cell[1] : 1
    return Math.ceil(selectedSize * Math.max(1, widthToHeightRatio))
  }
  const getNameInput = () => root.querySelector<HTMLInputElement>('#installer-companion-name')!
  const getName = () => getNameInput().value.trim() || getDefaultName()
  const getPreviewTarget = () => root.querySelector<HTMLElement>('.installer-preview-widget')!
  const previewStatus = () => root.querySelector<HTMLElement>('.installer-preview-status')!
  const snippetNode = () => root.querySelector<HTMLElement>('#installer-code')!
  const copyStatus = () => root.querySelector<HTMLElement>('.installer-copy-status')!

  root.innerHTML = `
    <div class="installer-layout">
      <section class="installer-step">
        <div class="installer-step-heading"><span>01</span><div><h3>Choose a companion</h3><p>Pick the personality that feels like your site.</p></div></div>
        <div class="installer-companion-grid" role="group" aria-label="Choose a companion">
          ${creatureRegistry.map((creature, index) => `<button class="installer-companion-choice ${index === 0 ? 'is-selected' : ''}" type="button" data-creature="${creature.id}" aria-pressed="${index === 0}" style="--creature-accent:${creature.theme.accent}"><span class="installer-choice-art"><span class="installer-choice-sprite"></span></span><span class="installer-choice-copy"><b>${creature.personality}</b><span>${creature.displayName}</span></span><span class="installer-choice-check" aria-hidden="true">✓</span></button>`).join('')}
        </div>
      </section>

      <div class="installer-personalize">
        <section class="installer-step installer-name-step">
          <div class="installer-step-heading"><span>02</span><div><h3>Name your companion</h3><p>Make them feel at home.</p></div></div>
          <label class="installer-name-field" for="installer-companion-name">Companion name<input id="installer-companion-name" type="text" maxlength="24" autocomplete="off" value="${escapeHtml(getDefaultName())}"></label>
        </section>

        <section class="installer-step installer-size-step">
          <div class="installer-step-heading"><span>03</span><div><h3>Choose a size</h3><p>Pick the presence that suits your pages.</p></div></div>
          <fieldset class="installer-size-options"><legend class="sr-only">Companion size</legend>
            ${sizeOptions.map((option) => `<label class="installer-size-option ${option.value === selectedSize ? 'is-selected' : ''}"><input type="radio" name="installer-size" value="${option.value}" ${option.value === selectedSize ? 'checked' : ''}><span><b>${option.label}</b><small>${option.value}px</small></span></label>`).join('')}
          </fieldset>
        </section>
      </div>

      <section class="installer-step installer-preview-step">
        <div class="installer-step-heading"><span>04</span><div><h3>Meet your companion</h3><p>This is the same live widget your visitors will see.</p></div><span class="installer-live-label"><i></i> Live preview</span></div>
        <div class="installer-preview-stage" style="--preview-background:${selectedCreature.theme.background}">
          <div class="installer-preview-site-copy"><span>YOUR WEBSITE</span><p>A little personality goes a long way.</p><div></div></div>
          <div class="installer-preview-widget" aria-label="Live companion preview"></div>
        </div>
        <p class="installer-preview-status" role="status" aria-live="polite">Loading the live preview…</p>
      </section>

      <section class="installer-step installer-code-step">
        <div class="installer-step-heading"><span>05</span><div><h3>Install your companion</h3><p>Choose the setup that works for your website.</p></div></div>
        <div class="installer-method installer-zip-method"><div><h4>Download ZIP <span>Recommended</span></h4><p>A self-hosted package with the widget and companion assets, ready to upload to your website.</p></div><button class="installer-download-button" type="button">Download ZIP <span aria-hidden="true">↓</span></button></div>
        <p class="installer-download-status" role="status" aria-live="polite"></p>
        <div class="installer-method installer-embed-method"><div><h4>Copy embed code</h4><p>This option loads the widget and its assets from Pokecharm’s hosted domain.</p></div><div class="installer-code-panel"><pre><code id="installer-code"></code></pre><button class="installer-copy-button" type="button"><span>Copy code</span><span aria-hidden="true">↗</span></button></div></div>
        <p class="installer-url-note" role="note"></p>
        <p class="installer-hosting-note">For the ZIP option, extract the download and upload its folder to a publicly accessible location on your website. The package README includes the self-hosting steps.</p>
        <h4 class="installer-embed-instructions-heading">Embed code setup</h4>
        <ol class="installer-instructions">
          <li>Copy the code above.</li>
          <li>Open your website’s HTML or custom code settings.</li>
          <li>Paste the script just before the closing <code>&lt;/body&gt;</code> tag.</li>
          <li>Publish your website.</li>
          <li>Refresh the website to see your companion.</li>
        </ol>
        <p class="installer-platform-note">Platform-specific guides for WordPress, Shopify, React and other platforms can be added later.</p>
        <p class="installer-copy-status" role="status" aria-live="polite"></p>
      </section>
    </div>`

  const updateSnippet = () => {
    const copyButton = root.querySelector<HTMLButtonElement>('.installer-copy-button')!
    if (widgetInstallerConfig.hasPublicUrl) {
      const snippetUrl = escapeAttribute(widgetInstallerConfig.installationUrl)
      const companion = escapeAttribute(selectedCreature.id)
      const name = escapeAttribute(getName())
      const boxSize = getWidgetBoxSize()
      const size = `${boxSize},${boxSize}`
      snippetNode().textContent = `<script src="${snippetUrl}" data-companion="${companion}" data-name="${name}" data-size="${size}" async><\/script>`
      copyButton.disabled = false
    } else {
      snippetNode().textContent = 'Hosted installation is not ready. A public widget URL has not been configured yet.'
      copyButton.disabled = true
    }
    root.querySelector<HTMLElement>('.installer-url-note')!.textContent = widgetInstallerConfig.hasPublicUrl
      ? 'Ready to install. The widget and companion assets will load from Pokecharm’s hosted domain.'
      : 'Hosted installation is not ready. Configure VITE_POKECHARM_WIDGET_URL after the public widget is deployed.'
    root.querySelector<HTMLOListElement>('.installer-instructions')!.hidden = !widgetInstallerConfig.hasPublicUrl
    root.querySelector<HTMLElement>('.installer-embed-instructions-heading')!.hidden = !widgetInstallerConfig.hasPublicUrl
    copyStatus().textContent = ''
  }

  const selectedAssets = (creature = selectedCreature) => {
    const spritePath = creature.spriteSheetPath
    const atlasPath = creature.atlasPath
    return [
      { source: spritePath, path: `assets/creatures/${creature.id}/${spritePath.slice(spritePath.lastIndexOf('/') + 1)}` },
      { source: atlasPath, path: `assets/creatures/${creature.id}/${atlasPath.slice(atlasPath.lastIndexOf('/') + 1)}` },
      { source: '/assets/pokeball/pokecharm-orb-idle.png', path: 'assets/pokeball/pokecharm-orb-idle.png' },
      { source: '/assets/pokeball/pokecharm-orb-sheet.png', path: 'assets/pokeball/pokecharm-orb-sheet.png' },
    ]
  }

  const downloadPackage = async () => {
    const button = root.querySelector<HTMLButtonElement>('.installer-download-button')!
    const selected = selectedCreature
    const chosenSize = selectedSize
    const name = getName()
    button.disabled = true
    root.querySelector<HTMLElement>('.installer-download-status')!.textContent = 'Preparing your self-hosted package…'
    try {
      const runtimeResponse = await fetch('/widget.js')
      if (!runtimeResponse.ok) throw new Error('The production widget runtime is unavailable. Build and deploy the standalone widget before downloading packages.')
      const [loaded, entries] = await Promise.all([loadCreature(selected), Promise.all(selectedAssets(selected).map(async (asset) => {
        const response = await fetch(asset.source)
        if (!response.ok) throw new Error(`Could not load package asset: ${asset.path}`)
        return { path: asset.path, content: new Uint8Array(await response.arrayBuffer()) }
      }))])
      loadedCreatures.set(loaded.id, loaded)
      const boxSize = Math.ceil(chosenSize * Math.max(1, loaded.cell[0] / loaded.cell[1]))
      const companion = selected.id
      const config = {
        companion,
        name,
        size: { label: sizeOptions.find((option) => option.value === chosenSize)?.label, renderedHeight: chosenSize, widgetBox: boxSize },
        assets: entries.map((entry) => entry.path),
      }
      const files = [
        { path: 'pokecharm-install/widget.js', content: new Uint8Array(await runtimeResponse.arrayBuffer()) },
        ...entries.map((entry) => ({ path: `pokecharm-install/${entry.path}`, content: entry.content })),
        { path: 'pokecharm-install/config.json', content: new TextEncoder().encode(`${JSON.stringify(config, null, 2)}\n`) },
        { path: 'pokecharm-install/README.md', content: new TextEncoder().encode(createPackageReadme(companion, name, chosenSize, boxSize)) },
      ]
      const archive = createZipArchive(files)
      const downloadUrl = URL.createObjectURL(archive)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = 'pokecharm-install.zip'
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000)
      root.querySelector<HTMLElement>('.installer-download-status')!.textContent = 'Your ZIP is ready. Upload its extracted folder to a public location on your website.'
    } catch (error) {
      root.querySelector<HTMLElement>('.installer-download-status')!.textContent = error instanceof Error ? error.message : 'Could not create the installation package.'
    } finally {
      button.disabled = false
    }
  }

  const loadWidgetApi = () => {
    const previewWindow = window as PreviewWindow
    if (previewWindow.PokecharmWidget) return Promise.resolve(previewWindow.PokecharmWidget)
    if (widgetApiPromise) return widgetApiPromise

    widgetApiPromise = new Promise<PreviewApi>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = widgetInstallerConfig.scriptUrl
      script.async = true
      script.dataset.noAutostart = 'true'
      if (widgetInstallerConfig.scriptType === 'module') script.type = 'module'
      script.addEventListener('load', () => {
        const api = previewWindow.PokecharmWidget
        if (api) resolve(api)
        else reject(new Error('The widget loaded without its public mount API'))
      }, { once: true })
      script.addEventListener('error', () => reject(new Error('The widget preview could not be loaded')), { once: true })
      document.head.append(script)
    }).catch((error: unknown) => {
      widgetApiPromise = null
      throw error
    })

    return widgetApiPromise
  }

  const clearPreviewCapture = () => {
    const key = `pokecharm:capture:${encodeURIComponent(window.location.origin)}:${encodeURIComponent('installer-preview')}`
    try { window.localStorage.removeItem(key) } catch { /* Storage can be disabled by the page. */ }
  }

  const updatePreview = async () => {
    window.clearTimeout(previewTimer)
    if (previewHandle) {
      previewHandle.destroy()
      previewHandle = null
      clearPreviewCapture()
    }
    const previewTarget = getPreviewTarget()
    const generation = ++previewGeneration
    previewStatus().textContent = 'Loading the live preview…'
    try {
      const [api, loaded] = await Promise.all([loadWidgetApi(), loadCreature(selectedCreature)])
      if (destroyed || generation !== previewGeneration) return
      loadedCreatures.set(loaded.id, loaded)
      updateSnippet()
      previewHandle = api.mount({
        companion: selectedCreature.id,
        name: getName(),
        size: { desktop: getWidgetBoxSize(loaded), mobile: getWidgetBoxSize(loaded) },
        position: 'bottom-right',
        edgeOffset: 22,
        viewportStage: false,
        assetBase: getWidgetAssetBase(),
        installationId: 'installer-preview',
        onStatus: (status) => {
          if (generation !== previewGeneration) return
          if (status.state === 'ready') previewStatus().textContent = 'Live preview ready. Drag its Pokéball to try it out.'
          else if (status.state === 'loading' || status.state === 'error') previewStatus().textContent = status.message
        },
      }, previewTarget)
      previewTarget.style.position = 'absolute'
      previewTarget.style.inset = '0'
      previewTarget.style.width = '100%'
      previewTarget.style.height = '100%'
    } catch (error) {
      if (generation !== previewGeneration) return
      previewStatus().textContent = error instanceof Error ? error.message : 'The widget preview could not be loaded.'
    }
  }

  let previewGeneration = 0

  const choiceAnimations = new Map<string, ReturnType<typeof createAnimationController>>()
  for (const creature of creatureRegistry) {
    const card = root.querySelector<HTMLButtonElement>(`[data-creature="${creature.id}"]`)!
    const wrapper = card.querySelector<HTMLElement>('.installer-choice-art')!
    const sprite = card.querySelector<HTMLElement>('.installer-choice-sprite')!
    const animation = createAnimationController()
    animation.bind(sprite, wrapper)
    choiceAnimations.set(creature.id, animation)
    void loadCreature(creature).then((loaded) => {
      if (destroyed) return
      loadedCreatures.set(loaded.id, loaded)
      animation.setCreature(loaded)
      if (selectedCreature.id === loaded.id) updateSnippet()
    }).catch((error: unknown) => {
      if (!destroyed) console.error(`Could not load ${creature.displayName} installer artwork`, error)
    })
    card.addEventListener('click', () => {
      if (selectedCreature.id === creature.id) return
      selectedCreature = creature
      getNameInput().value = getDefaultName()
      root.querySelectorAll<HTMLButtonElement>('[data-creature]').forEach((choice) => {
        const selected = choice.dataset.creature === creature.id
        choice.classList.toggle('is-selected', selected)
        choice.setAttribute('aria-pressed', String(selected))
      })
      root.querySelector<HTMLElement>('.installer-preview-stage')!.style.setProperty('--preview-background', creature.theme.background)
      updateSnippet()
      void updatePreview()
    })
  }

  getNameInput().addEventListener('input', () => {
    updateSnippet()
    window.clearTimeout(previewTimer)
    previewTimer = window.setTimeout(() => void updatePreview(), 220)
  })
  getNameInput().addEventListener('blur', () => {
    if (!getNameInput().value.trim()) getNameInput().value = getDefaultName()
    updateSnippet()
  })

  root.querySelectorAll<HTMLInputElement>('input[name="installer-size"]').forEach((input) => {
    input.addEventListener('change', () => {
      if (!input.checked) return
      selectedSize = Number(input.value)
      root.querySelectorAll<HTMLElement>('.installer-size-option').forEach((option) => {
        option.classList.toggle('is-selected', option.querySelector('input') === input)
      })
      updateSnippet()
      void updatePreview()
    })
  })

  root.querySelector<HTMLButtonElement>('.installer-copy-button')!.addEventListener('click', async () => {
    if (!widgetInstallerConfig.hasPublicUrl) return
    const snippet = snippetNode().textContent ?? ''
    let copied = false
    try {
      await navigator.clipboard.writeText(snippet)
      copied = true
      copyStatus().textContent = 'Copied. Your companion is ready for its new home.'
    } catch {
      const textArea = document.createElement('textarea')
      textArea.value = snippet
      textArea.setAttribute('readonly', '')
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.append(textArea)
      textArea.select()
      copied = document.execCommand('copy')
      textArea.remove()
      if (copied) copyStatus().textContent = 'Copied. Your companion is ready for its new home.'
      else {
        const selection = window.getSelection()
        const range = document.createRange()
        range.selectNodeContents(snippetNode())
        selection?.removeAllRanges()
        selection?.addRange(range)
        copyStatus().textContent = 'Select the highlighted code and copy it.'
      }
    }
    const button = root.querySelector<HTMLButtonElement>('.installer-copy-button')!
    button.querySelector('span')!.textContent = copied ? 'Copied' : 'Select code'
    window.clearTimeout(feedbackTimer)
    feedbackTimer = window.setTimeout(() => {
      button.querySelector('span')!.textContent = 'Copy code'
      copyStatus().textContent = ''
    }, 2400)
  })

  root.querySelector<HTMLButtonElement>('.installer-download-button')!.addEventListener('click', () => void downloadPackage())

  updateSnippet()
  void updatePreview()

  return () => {
    if (destroyed) return
    destroyed = true
    window.clearTimeout(previewTimer)
    window.clearTimeout(feedbackTimer)
    previewHandle?.destroy()
    previewHandle = null
    clearPreviewCapture()
    choiceAnimations.forEach((animation) => animation.destroy())
  }
}

function escapeAttribute(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character)
}

function escapeHtml(value: string) {
  return escapeAttribute(value)
}

function createPackageReadme(companion: string, name: string, renderedHeight: number, boxSize: number) {
  const escapedName = escapeAttribute(name)
  return [
    '# Pokecharm self-hosted companion',
    '',
    `This package is configured for **${companion}** at a rendered height of **${renderedHeight}px**. The widget and its companion/Pokéball assets are included locally.`,
    '',
    '## Install',
    '',
    '1. Extract pokecharm-install.zip.',
    '2. Upload the extracted pokecharm-install folder to a publicly accessible location on your website. Keep its files and folders together.',
    '3. Add this script to your website HTML, replacing the path with the public URL of the uploaded folder:',
    '',
    '```html',
    `<script src="https://your-site.example/pokecharm-install/widget.js" data-assets-base="https://your-site.example/pokecharm-install/" data-companion="${companion}" data-name="${escapedName}" data-size="${boxSize},${boxSize}" async></script>`,
    '```',
    '',
    'Replace both example URLs with the public location where you uploaded the folder. The data-assets-base value must point to the folder containing the assets directory, including its final slash.',
    '',
    '## Change the companion settings',
    '',
    `Edit data-name to change the displayed name. Edit data-size to change the desktop and mobile widget box sizes in pixels, in desktop,mobile order (each value must be 24–512). The generated values preserve the selected ${renderedHeight}px rendered size; see config.json for the matching widgetBox value.`,
    '',
    `This ZIP contains assets only for ${companion}. Keep the generated data-companion value as-is. To use another companion, download a new ZIP with that companion selected in Pokecharm.`,
    '',
    'To remove the companion, remove this script tag from your website HTML and publish the change.',
    '',
  ].join('\n')
}
