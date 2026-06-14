import { useState, useRef, useEffect } from 'react'
import { AppStack, AppTarget } from '../types'

interface Props {
  onGenerate: (prompt: string, stack: AppStack, target: AppTarget) => void
  loading: boolean
  stack: AppStack
  target: AppTarget
  onStackChange: (s: AppStack) => void
  onTargetChange: (t: AppTarget) => void
}

const STACKS: { value: AppStack; label: string; icon: string }[] = [
  { value: 'flutter',      label: 'Flutter',      icon: 'flutter_dash' },
  { value: 'kotlin',       label: 'Compose',      icon: 'android' },
  { value: 'react_native', label: 'React Native', icon: 'hub' },
]

const TARGETS: { value: AppTarget; label: string; icon: string }[] = [
  { value: 'mobile', label: 'Celular',     icon: 'smartphone' },
  { value: 'tv',     label: 'Android TV',  icon: 'tv' },
  { value: 'both',   label: 'Celular + TV', icon: 'devices' },
]

export function PromptBar({ onGenerate, loading, stack, target, onStackChange, onTargetChange }: Props) {
  const [prompt, setPrompt] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto'
      ref.current.style.height = Math.min(ref.current.scrollHeight, 140) + 'px'
    }
  }, [prompt])

  function handleSubmit() {
    if (!prompt.trim() || loading) return
    onGenerate(prompt.trim(), stack, target)
    setPrompt('')
  }

  return (
    <div className="bg-surface border-t border-outline-variant px-md py-sm flex flex-col gap-sm">
      {/* Selectores */}
      <div className="flex items-center gap-lg flex-wrap">
        <div className="flex items-center gap-sm">
          <span className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wide">Stack</span>
          <div className="flex gap-xs">
            {STACKS.map(s => (
              <button
                key={s.value}
                disabled={loading}
                onClick={() => onStackChange(s.value)}
                className={`flex items-center gap-xs px-sm py-xs rounded-full text-[12px] font-medium transition-all duration-200 border
                  ${stack === s.value
                    ? 'bg-primary text-on-primary border-primary shadow-sm'
                    : 'bg-surface-container-low text-on-surface-variant border-outline-variant hover:bg-surface-container-high hover:text-on-surface'
                  } disabled:opacity-50`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{s.icon}</span>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-sm">
          <span className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wide">Destino</span>
          <div className="flex gap-xs">
            {TARGETS.map(t => (
              <button
                key={t.value}
                disabled={loading}
                onClick={() => onTargetChange(t.value)}
                className={`flex items-center gap-xs px-sm py-xs rounded-full text-[12px] font-medium transition-all duration-200 border
                  ${target === t.value
                    ? 'bg-secondary text-on-secondary border-secondary shadow-sm'
                    : 'bg-surface-container-low text-on-surface-variant border-outline-variant hover:bg-surface-container-high hover:text-on-surface'
                  } disabled:opacity-50`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="flex gap-sm items-end">
        <textarea
          ref={ref}
          rows={1}
          disabled={loading}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit() }}
          placeholder="Describí tu app... ej: Un rastreador de ejercicios con pantalla de inicio, biblioteca de ejercicios y temporizador activo"
          className="flex-1 px-md py-sm border border-outline-variant rounded-lg bg-surface-container-lowest text-on-surface text-[14px] resize-none transition-all duration-200 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-on-surface-variant/60 disabled:opacity-50"
        />
        <button
          onClick={handleSubmit}
          disabled={loading || !prompt.trim()}
          className="h-10 px-lg rounded-lg bg-primary text-on-primary text-[14px] font-semibold flex items-center gap-xs shadow-sm hover:brightness-90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {loading
            ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generando...</>
            : <><span className="material-symbols-outlined" style={{ fontSize: 18 }}>auto_awesome</span>Generar</>
          }
        </button>
      </div>
      <p className="text-[11px] text-on-surface-variant/60">Ctrl+Enter para generar</p>
    </div>
  )
}
