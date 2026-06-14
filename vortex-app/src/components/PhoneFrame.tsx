import { GeneratedApp, GeneratedScreen, PreviewComponent } from '../types'
import { useState } from 'react'

interface Props {
  app: GeneratedApp
  isTv?: boolean
  activeIndex?: number
  onScreenChange?: (index: number, name: string) => void
}

export function PhoneFrame({ app, isTv, activeIndex: controlledIdx, onScreenChange }: Props) {
  const [internalIdx, setInternalIdx] = useState(0)
  const activeIndex = controlledIdx ?? internalIdx

  function handleTabClick(i: number) {
    setInternalIdx(i)
    onScreenChange?.(i, app.screens[i]?.name ?? '')
  }

  const screen = app.screens[activeIndex]
  if (!screen) return null

  const bg = screen.preview.bg_color ?? app.theme.background ?? '#1a1a2e'
  const primary = app.theme.primary ?? '#7c3aed'

  return (
    <div className="phone-wrapper">
      {/* Screen tabs */}
      {app.screens.length > 1 && (
        <div className="screen-tabs">
          {app.screens.map((s, i) => (
            <button
              key={i}
              className={`screen-tab ${i === activeIndex ? 'active' : ''}`}
              onClick={() => handleTabClick(i)}
            >
              {s.name.replace('Screen', '')}
            </button>
          ))}
        </div>
      )}

      {/* Device frame */}
      <div className={`device-frame ${isTv ? 'tv-frame' : 'phone-frame'}`}>
        <div className="device-notch" />
        <div className="device-screen" style={{ background: bg }}>
          <ScreenRenderer screen={screen} primary={primary} />
        </div>
        {!isTv && <div className="device-home-bar" />}
      </div>

      <div className="app-meta">
        <span className="app-name">{app.app_name}</span>
        <span className="app-desc">{app.description}</span>
      </div>

      <style>{`
        .phone-wrapper { display: flex; flex-direction: column; align-items: center; gap: 12px; }

        .screen-tabs { display: flex; gap: 4px; flex-wrap: wrap; justify-content: center; }
        .screen-tab {
          padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 500;
          background: var(--surface2); color: var(--text-3); border: 1px solid var(--border);
          cursor: pointer; transition: all .15s;
        }
        .screen-tab.active { background: var(--primary); color: #fff; border-color: var(--primary); }
        .screen-tab:hover:not(.active) { color: var(--text); border-color: var(--text-3); }

        .device-frame {
          position: relative; border-radius: 36px;
          border: 2px solid #3a3a4a;
          box-shadow: 0 0 0 1px #1e1e2e, 0 24px 48px rgba(0,0,0,.6);
          overflow: hidden; background: #111;
        }
        .phone-frame { width: 280px; height: 560px; }
        .tv-frame { width: 480px; height: 270px; border-radius: 16px; }

        .device-notch {
          position: absolute; top: 10px; left: 50%; transform: translateX(-50%);
          width: 80px; height: 12px; background: #111;
          border-radius: 6px; z-index: 10;
        }
        .tv-frame .device-notch { display: none; }

        .device-screen {
          position: absolute; inset: 0;
          overflow: hidden; display: flex; flex-direction: column;
        }

        .device-home-bar {
          position: absolute; bottom: 6px; left: 50%; transform: translateX(-50%);
          width: 80px; height: 3px; background: rgba(255,255,255,.2);
          border-radius: 2px; z-index: 10;
        }

        .app-meta { text-align: center; }
        .app-name { display: block; font-weight: 600; font-size: 13px; color: var(--text); }
        .app-desc { display: block; font-size: 11px; color: var(--text-3); margin-top: 2px; }
      `}</style>
    </div>
  )
}

function ScreenRenderer({ screen, primary }: { screen: GeneratedScreen; primary: string }) {
  const components = screen.preview.components ?? []
  const hasNavBar = components.some(c => c.type === 'nav_bar')

  return (
    <>
      <div style={{ flex: 1, overflow: 'hidden auto', paddingBottom: hasNavBar ? 48 : 0 }}>
        {components.filter(c => c.type !== 'nav_bar').map((c, i) => (
          <ComponentRenderer key={i} c={c} primary={primary} />
        ))}
      </div>
      {hasNavBar && (
        <NavBar items={components.find(c => c.type === 'nav_bar')?.items ?? []} primary={primary} />
      )}
    </>
  )
}

function ComponentRenderer({ c, primary }: { c: PreviewComponent; primary: string }) {
  switch (c.type) {
    case 'app_bar':
      return (
        <div style={{ padding: '28px 14px 10px', fontSize: 15, fontWeight: 700, color: '#fff', background: 'rgba(0,0,0,.2)' }}>
          {c.title}
        </div>
      )
    case 'text':
      return (
        <div style={{
          padding: '4px 14px',
          fontSize: c.style === 'headline' ? 18 : c.style === 'caption' ? 10 : 13,
          fontWeight: c.style === 'headline' ? 700 : 400,
          color: c.style === 'caption' ? 'rgba(255,255,255,.5)' : '#fff',
        }}>
          {c.value}
        </div>
      )
    case 'button':
      return (
        <div style={{ padding: '6px 14px' }}>
          <div style={{
            background: c.color ?? primary, color: '#fff',
            padding: '9px 16px', borderRadius: 8,
            fontSize: 12, fontWeight: 600, textAlign: 'center',
          }}>
            {c.label}
          </div>
        </div>
      )
    case 'card':
      return (
        <div style={{ margin: '6px 14px', background: 'rgba(255,255,255,.07)', borderRadius: 10, padding: '10px 12px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{c.title}</div>
          {c.subtitle && <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>{c.subtitle}</div>}
        </div>
      )
    case 'list':
      return (
        <div style={{ margin: '4px 0' }}>
          {(c.items ?? []).slice(0, 4).map((item, i) => (
            <div key={i} style={{ padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,.05)', fontSize: 12, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: primary, flexShrink: 0 }} />
              {item}
            </div>
          ))}
        </div>
      )
    case 'input':
      return (
        <div style={{ margin: '6px 14px', background: 'rgba(255,255,255,.07)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'rgba(255,255,255,.35)' }}>
          {c.placeholder}
        </div>
      )
    case 'image':
      return (
        <div style={{ margin: '6px 14px', height: 90, background: 'rgba(255,255,255,.05)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'rgba(255,255,255,.3)' }}>
          {c.placeholder ?? 'Image'}
        </div>
      )
    case 'chip':
      return (
        <div style={{ display: 'inline-block', margin: '4px 14px', background: primary + '33', color: primary, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500 }}>
          {c.label}
        </div>
      )
    case 'spacer':
      return <div style={{ height: 12 }} />
    case 'list_item':
      return (
        <div style={{ padding: '9px 14px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#fff' }}>{c.title}</div>
            {c.subtitle && <div style={{ fontSize: 10, color: 'rgba(255,255,255,.45)', marginTop: 1 }}>{c.subtitle}</div>}
          </div>
          {c.trailing && <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>{c.trailing}</div>}
          {c.badge != null && (
            <div style={{ background: primary, color: '#fff', borderRadius: 10, fontSize: 9, fontWeight: 700, padding: '1px 6px' }}>{c.badge}</div>
          )}
        </div>
      )
    case 'chip_row':
      return (
        <div style={{ display: 'flex', gap: 6, padding: '6px 14px', flexWrap: 'wrap' }}>
          {(c.items ?? []).map((item, i) => (
            <div key={i} style={{ background: i === 0 ? primary : 'rgba(255,255,255,.08)', color: i === 0 ? '#fff' : 'rgba(255,255,255,.7)', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500 }}>
              {item}
            </div>
          ))}
        </div>
      )
    case 'stat':
      return (
        <div style={{ margin: '4px 14px', background: 'rgba(255,255,255,.06)', borderRadius: 10, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.45)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{c.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: c.color ?? primary, marginTop: 2 }}>{c.value}</div>
          </div>
          {c.subtitle && <div style={{ fontSize: 10, color: c.variant === 'up' ? '#4ade80' : c.variant === 'down' ? '#f87171' : 'rgba(255,255,255,.4)' }}>{c.subtitle}</div>}
        </div>
      )
    case 'divider':
      return <div style={{ height: 1, background: 'rgba(255,255,255,.07)', margin: '4px 14px' }} />
    default:
      return null
  }
}

function NavBar({ items, primary }: { items: string[]; primary: string }) {
  const [active, setActive] = useState(0)
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(10,10,15,.9)', borderTop: '1px solid rgba(255,255,255,.07)', display: 'flex', height: 48 }}>
      {items.slice(0, 5).map((item, i) => (
        <button
          key={i}
          onClick={() => setActive(i)}
          style={{ flex: 1, background: 'none', border: 'none', color: i === active ? primary : 'rgba(255,255,255,.4)', fontSize: 10, fontWeight: 500, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}
        >
          <span style={{ width: 4, height: 4, borderRadius: '50%', background: i === active ? primary : 'transparent' }} />
          {item}
        </button>
      ))}
    </div>
  )
}
