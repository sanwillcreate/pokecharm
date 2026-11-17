const configuredWidgetScriptUrl = import.meta.env.VITE_POKECHARM_WIDGET_URL?.trim() ?? ''
const isPublicWidgetScriptUrl = /^https:\/\//i.test(configuredWidgetScriptUrl)
  && !/(localhost|127\.0\.0\.1|0\.0\.0\.0)/i.test(configuredWidgetScriptUrl)

export const widgetInstallerConfig = {
  scriptUrl: configuredWidgetScriptUrl || (import.meta.env.DEV ? '/src/widget-entry.ts' : '/widget.js'),
  scriptType: configuredWidgetScriptUrl || !import.meta.env.DEV ? 'classic' as const : 'module' as const,
  installationUrl: isPublicWidgetScriptUrl ? configuredWidgetScriptUrl : '',
  hasPublicUrl: isPublicWidgetScriptUrl,
}

export function getWidgetAssetBase() {
  return new URL('/', new URL(widgetInstallerConfig.scriptUrl, window.location.href)).href
}
