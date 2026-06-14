import { useState } from 'react'
import { GeneratedApp } from '../types'

interface Props {
  app: GeneratedApp
  streamingText?: string
}

type Tab = 'screens' | 'main' | 'pubspec'

export function CodePanel({ app, streamingText }: Props) {
  const [tab, setTab] = useState<Tab>('screens')
  const [screenIndex, setScreenIndex] = useState(0)

  const screen = app.screens[screenIndex]

  function getContent() {
    if (tab === 'main') return app.main_dart
    if (tab === 'pubspec') return app.pubspec_yaml
    return screen?.code ?? ''
  }

  function handleCopy() {
    navigator.clipboard.writeText(getContent())
  }

  function handleDownload() {
    const name = tab === 'main' ? 'main.dart' : tab === 'pubspec' ? 'pubspec.yaml' : `${screen?.name ?? 'pantalla'}.dart`
    const blob = new Blob([getContent()], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = name; a.click()
    URL.revokeObjectURL(url)
  }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'screens', label: 'Pantallas', icon: 'layers' },
    { key: 'main',    label: 'main.dart',   icon: 'code' },
    { key: 'pubspec', label: 'pubspec.yaml', icon: 'package_2' },
  ]

  return (
    <div className="flex flex-col h-full bg-surface-container-lowest border-l border-outline-variant">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-md py-xs border-b border-outline-variant bg-surface-container-low flex-shrink-0">
        <div className="flex gap-xs">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-xs px-sm py-xs rounded-lg text-[12px] font-medium transition-colors
                ${tab === t.key
                  ? 'bg-primary-container/20 text-primary font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                }`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-xs">
          <button
            onClick={handleCopy}
            className="flex items-center gap-xs px-sm py-xs rounded-lg text-[12px] font-medium text-on-surface-variant border border-outline-variant hover:bg-surface-container hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>content_copy</span>
            Copiar
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-xs px-sm py-xs rounded-lg text-[12px] font-medium text-on-surface-variant border border-outline-variant hover:bg-surface-container hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>download</span>
            Exportar
          </button>
        </div>
      </div>

      {/* Screen pills */}
      {tab === 'screens' && app.screens.length > 1 && (
        <div className="flex gap-xs px-md py-xs border-b border-outline-variant flex-wrap flex-shrink-0 bg-surface">
          {app.screens.map((s, i) => (
            <button
              key={i}
              onClick={() => setScreenIndex(i)}
              className={`px-sm py-xs rounded-md text-[11px] font-medium transition-colors
                ${i === screenIndex
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Código */}
      <div className="flex-1 overflow-auto code-block">
        {streamingText && tab === 'screens'
          ? <pre className="p-md whitespace-pre-wrap break-words text-on-surface-variant/80">{streamingText}<span className="inline-block w-0.5 h-3.5 bg-secondary align-middle ml-px animate-pulse" /></pre>
          : <pre className="p-md whitespace-pre-wrap break-words"><code>{getContent()}</code></pre>
        }
      </div>
    </div>
  )
}
