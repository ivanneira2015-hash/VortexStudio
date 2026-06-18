import { GeneratedApp, GeneratedScreen, PreviewComponent } from '../types'
import { useState } from 'react'

interface Props {
  app: GeneratedApp
  isTv?: boolean
  activeIndex?: number
  onScreenChange?: (index: number, name: string) => void
}

// ─── Icon helpers ────────────────────────────────────────────────────────────
const NAV_ICONS: Record<string, string> = {
  home: '🏠', search: '🔍', profile: '👤', favorites: '❤️',
  settings: '⚙️', cart: '🛒', notifications: '🔔', explore: '🧭',
  messages: '💬', dashboard: '📊', library: '📚', history: '🕐',
}

function navIcon(label: string): string {
  const key = label.toLowerCase().replace(/\s+/g, '')
  for (const [k, v] of Object.entries(NAV_ICONS)) {
    if (key.includes(k)) return v
  }
  return '⬡'
}

// ─── Color utilities ──────────────────────────────────────────────────────────
function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}

function withAlpha(hex: string, alpha: number) {
  try { return `rgba(${hexToRgb(hex)},${alpha})` } catch { return hex }
}

function isDark(hex: string) {
  try {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return (r * 299 + g * 587 + b * 114) / 1000 < 128
  } catch { return true }
}

// ─── Main component ───────────────────────────────────────────────────────────
export function PhoneFrame({ app, isTv, activeIndex: controlledIdx, onScreenChange }: Props) {
  const [internalIdx, setInternalIdx] = useState(0)
  const activeIndex = controlledIdx ?? internalIdx

  function handleTabClick(i: number) {
    setInternalIdx(i)
    onScreenChange?.(i, app.screens[i]?.name ?? '')
  }

  const screen = app.screens[activeIndex]
  if (!screen) return null

  const rawTheme = {
    primary: app.theme.primary ?? '#6750A4',
    background: screen.preview.bg_color ?? app.theme.background ?? '#FFFBFE',
    surface: app.theme.surface ?? '#FFFBFE',
    textPrimary: app.theme.text_primary ?? '#1C1B1F',
  }

  // Auto-correct: if bg is dark but text_primary is also dark, flip text to light
  const bgDark = isDark(rawTheme.background)
  const theme = {
    ...rawTheme,
    textPrimary: bgDark && isDark(rawTheme.textPrimary) ? '#EEEEEE' : rawTheme.textPrimary,
  }

  const onPrimary = isDark(theme.primary) ? '#fff' : '#1C1B1F'

  return (
    <div className="phone-wrapper">
      {/* Screen navigation tabs — outside the frame */}
      {app.screens.length > 1 && (
        <div className="screen-tabs">
          {app.screens.map((s, i) => (
            <button
              key={i}
              className={`screen-tab ${i === activeIndex ? 'active' : ''}`}
              onClick={() => handleTabClick(i)}
              style={i === activeIndex ? { background: theme.primary, borderColor: theme.primary, color: onPrimary } : {}}
            >
              {s.name.replace('Screen', '').trim()}
            </button>
          ))}
        </div>
      )}

      {/* Device frame */}
      <div className={`device-frame ${isTv ? 'tv-frame' : 'phone-frame'}`}>
        {/* Dynamic island / notch */}
        {!isTv && <div className="device-notch" />}
        {/* Status bar */}
        {!isTv && (
          <div className="status-bar" style={{ background: theme.primary }}>
            <span className="status-time">9:41</span>
            <div className="status-icons">
              <span>▲</span><span>▲▲▲</span><span>🔋</span>
            </div>
          </div>
        )}

        {/* Scrollable screen content */}
        <div className="device-screen" style={{ background: theme.background }}>
          <ScreenRenderer screen={screen} theme={theme} onPrimary={onPrimary} isTv={!!isTv} />
        </div>

        {/* Home bar */}
        {!isTv && <div className="device-home-bar" />}
      </div>

      {/* App meta */}
      <div className="app-meta" style={{ width: isTv ? 480 : 280 }}>
        <span className="app-name">{app.app_name}</span>
        <span className="app-desc">{app.description}</span>
      </div>

      {/* Playground button — URL cambia según el stack */}
      {(() => {
        const stackKey = app.stack_recommendation?.recommended_stack ?? 'flutter'
        const playgrounds: Record<string, { url: string; label: string; hint: string }> = {
          flutter:      { url: 'https://dartpad.dev',          label: 'Abrir en DartPad',      hint: 'Copiá el código Dart y pegalo en DartPad para previsualizarlo' },
          react_native: { url: 'https://snack.expo.dev',       label: 'Abrir en Expo Snack',   hint: 'Copiá el código React Native y pegalo en Expo Snack para previsualizarlo' },
          kotlin:       { url: 'https://play.kotlinlang.org',  label: 'Kotlin Playground',     hint: 'Copiá el código Kotlin y pegalo en Kotlin Playground' },
        }
        const pg = playgrounds[stackKey] ?? playgrounds.flutter
        return (
          <a
            href={pg.url}
            target="_blank"
            rel="noopener noreferrer"
            className="dartpad-btn"
            style={{ borderColor: theme.primary, color: theme.primary }}
            title={pg.hint}
          >
            <span>⟨/⟩</span> {pg.label}
          </a>
        )
      })()}

      <style>{`
        .phone-wrapper {
          display: flex; flex-direction: column; align-items: center; gap: 10px;
          font-family: 'Roboto', 'Inter', sans-serif;
        }

        /* ── Screen tabs ── */
        .screen-tabs {
          display: flex; gap: 4px; flex-wrap: wrap; justify-content: center; max-width: 320px;
        }
        .screen-tab {
          padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 500;
          background: var(--surface2, #1e1e2e); color: var(--text-3, #888);
          border: 1px solid var(--border, #333); cursor: pointer; transition: all .15s;
          white-space: nowrap;
        }
        .screen-tab:hover:not(.active) { color: var(--text, #eee); border-color: var(--text-3, #888); }

        /* ── Device frame ── */
        .device-frame {
          position: relative; border-radius: 36px;
          border: 2.5px solid #3a3a4a;
          box-shadow: 0 0 0 1px #1a1a2a, 0 8px 16px rgba(0,0,0,.4), 0 24px 48px rgba(0,0,0,.5);
          overflow: hidden; background: #111; flex-shrink: 0;
        }
        .phone-frame { width: 280px; height: 560px; }
        .tv-frame { width: 480px; height: 270px; border-radius: 16px; }

        /* Dynamic island notch */
        .device-notch {
          position: absolute; top: 8px; left: 50%; transform: translateX(-50%);
          width: 72px; height: 22px; background: #111;
          border-radius: 12px; z-index: 20;
        }
        .tv-frame .device-notch { display: none; }

        /* Status bar */
        .status-bar {
          position: absolute; top: 0; left: 0; right: 0; height: 28px;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 16px; z-index: 15;
        }
        .status-time { font-size: 10px; font-weight: 600; color: #fff; letter-spacing: 0.3px; }
        .status-icons { display: flex; gap: 4px; font-size: 8px; color: #fff; align-items: center; }

        /* Screen scrollable area */
        .device-screen {
          position: absolute; inset: 0;
          display: flex; flex-direction: column;
          overflow: hidden;
        }

        /* Home bar */
        .device-home-bar {
          position: absolute; bottom: 6px; left: 50%; transform: translateX(-50%);
          width: 80px; height: 4px;
          background: rgba(0,0,0,.25); border-radius: 2px; z-index: 20;
        }

        /* ── App meta ── */
        .app-meta { text-align: center; }
        .app-name { display: block; font-weight: 600; font-size: 13px; color: var(--text, #eee); }
        .app-desc { display: block; font-size: 11px; color: var(--text-3, #888); margin-top: 2px; }

        /* ── DartPad button ── */
        .dartpad-btn {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 14px; border-radius: 20px; font-size: 11px; font-weight: 500;
          border: 1.5px solid; text-decoration: none; cursor: pointer;
          transition: opacity .15s; opacity: 0.85;
        }
        .dartpad-btn:hover { opacity: 1; }

        /* ── MD3 component styles ── */
        .md-app-bar {
          display: flex; align-items: center; gap: 10px;
          padding: 0 12px; height: 56px;
          box-shadow: 0 1px 2px rgba(0,0,0,.15);
          flex-shrink: 0;
        }
        .md-app-bar-back { font-size: 18px; cursor: pointer; line-height: 1; }
        .md-app-bar-title { font-size: 16px; font-weight: 600; flex: 1; letter-spacing: 0.1px; }

        .md-card {
          margin: 6px 12px; border-radius: 12px;
          padding: 14px 14px 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,.12), 0 4px 12px rgba(0,0,0,.08);
        }
        .md-card-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
        .md-card-title { font-size: 14px; font-weight: 700; letter-spacing: 0.1px; }
        .md-card-subtitle { font-size: 12px; margin-top: 3px; opacity: 0.6; }
        .md-card-badge {
          font-size: 10px; font-weight: 700; padding: 2px 8px;
          border-radius: 12px; white-space: nowrap; margin-top: 1px;
        }

        .md-list-item {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 16px;
        }
        .md-list-avatar {
          width: 36px; height: 36px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; flex-shrink: 0; font-weight: 700;
        }
        .md-list-content { flex: 1; min-width: 0; }
        .md-list-title { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .md-list-subtitle { font-size: 11px; opacity: 0.55; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .md-list-trailing { font-size: 11px; opacity: 0.5; white-space: nowrap; }
        .md-list-badge { font-size: 9px; font-weight: 700; padding: 2px 5px; border-radius: 10px; white-space: nowrap; }
        .md-divider { height: 1px; margin: 0; }

        .md-btn-filled {
          display: block; width: calc(100% - 24px); margin: 6px 12px;
          padding: 11px 16px; border-radius: 24px;
          font-size: 13px; font-weight: 600; text-align: center;
          letter-spacing: 0.3px; cursor: pointer;
        }
        .md-btn-outlined {
          display: block; width: calc(100% - 24px); margin: 6px 12px;
          padding: 10px 16px; border-radius: 24px; border-width: 1.5px; border-style: solid;
          font-size: 13px; font-weight: 600; text-align: center;
          letter-spacing: 0.3px; cursor: pointer; background: transparent;
        }
        .md-btn-text {
          display: inline-block; margin: 6px 12px;
          padding: 10px 12px;
          font-size: 13px; font-weight: 600; text-align: center;
          letter-spacing: 0.3px; cursor: pointer;
        }

        .md-input {
          margin: 6px 12px;
        }
        .md-input-outlined {
          position: relative; border: 1.5px solid rgba(0,0,0,.3); border-radius: 4px; padding: 14px 12px 6px;
        }
        .md-input-label {
          position: absolute; top: -7px; left: 10px; font-size: 11px; font-weight: 500;
          padding: 0 3px;
        }
        .md-input-value { font-size: 13px; }
        .md-input-placeholder { font-size: 13px; opacity: 0.38; }

        .md-nav-bar {
          display: flex; flex-shrink: 0;
          border-top-width: 1px; border-top-style: solid;
          height: 56px;
        }
        .md-nav-item {
          flex: 1; display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 2px; cursor: pointer; border: none; background: none;
          transition: all .15s; padding: 0;
        }
        .md-nav-icon { font-size: 18px; line-height: 1; }
        .md-nav-label { font-size: 10px; font-weight: 500; letter-spacing: 0.3px; }
        .md-nav-indicator { height: 26px; min-width: 48px; border-radius: 13px; display: flex; align-items: center; justify-content: center; }

        .md-chip-row { display: flex; gap: 6px; padding: 6px 12px; flex-wrap: wrap; overflow-x: auto; }
        .md-chip {
          padding: 5px 12px; border-radius: 20px; font-size: 11px; font-weight: 500;
          white-space: nowrap; border: 1px solid transparent;
        }

        .md-stat-row {
          display: flex; gap: 0; margin: 4px 12px;
        }
        .md-stat-card {
          flex: 1; border-radius: 12px; padding: 12px 12px 10px;
          box-shadow: 0 1px 3px rgba(0,0,0,.1);
        }
        .md-stat-label { font-size: 10px; opacity: 0.55; text-transform: uppercase; letter-spacing: 0.5px; }
        .md-stat-value { font-size: 24px; font-weight: 800; margin-top: 2px; letter-spacing: -0.5px; }
        .md-stat-sub { font-size: 10px; margin-top: 2px; font-weight: 500; }

        .md-image-placeholder {
          margin: 6px 12px; border-radius: 12px;
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 4px;
          background: linear-gradient(135deg, #e8e8e8 0%, #d0d0d0 100%);
          overflow: hidden; position: relative;
        }
        .md-image-icon { font-size: 24px; opacity: 0.4; }
        .md-image-label { font-size: 10px; opacity: 0.4; font-weight: 500; }

        .md-text-display { padding: 6px 14px; font-size: 28px; font-weight: 700; line-height: 1.2; letter-spacing: -0.3px; }
        .md-text-headline { padding: 4px 14px; font-size: 20px; font-weight: 600; line-height: 1.3; }
        .md-text-body { padding: 2px 14px; font-size: 14px; font-weight: 400; line-height: 1.5; }
        .md-text-caption { padding: 2px 14px; font-size: 11px; font-weight: 400; line-height: 1.4; opacity: 0.55; }
      `}</style>
    </div>
  )
}

// ─── Screen renderer ──────────────────────────────────────────────────────────
interface ThemeCtx {
  primary: string
  background: string
  surface: string
  textPrimary: string
}

function ScreenRenderer({ screen, theme, onPrimary, isTv }: { screen: GeneratedScreen; theme: ThemeCtx; onPrimary: string; isTv?: boolean }) {
  const components = screen.preview.components ?? []
  const hasNavBar = components.some(c => c.type === 'nav_bar')
  const hasAppBar = components.some(c => c.type === 'app_bar')

  const topOffset = (!isTv && !hasAppBar) ? 28 : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', paddingTop: topOffset }}>
      {/* Scrollable content area */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: hasNavBar ? 0 : 16, scrollbarWidth: 'none' }}>
        {(() => {
          const visible = components.filter(c => c.type !== 'nav_bar')
          if (visible.length === 0) return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, opacity: 0.5, padding: 16 }}>
              <div style={{ fontSize: isTv ? 28 : 22 }}>📱</div>
              <div style={{ fontSize: isTv ? 13 : 11, color: theme.textPrimary, textAlign: 'center' }}>
                {screen.preview.title ?? screen.name}
              </div>
            </div>
          )
          return <>{visible.map((c, i) => <ComponentRenderer key={i} c={c} theme={theme} onPrimary={onPrimary} />)}</>
        })()}
      </div>

      {/* Fixed bottom nav bar */}
      {hasNavBar && (
        <NavBar
          items={components.find(c => c.type === 'nav_bar')?.items ?? []}
          theme={theme}
          onPrimary={onPrimary}
        />
      )}
    </div>
  )
}

// ─── Component renderer ───────────────────────────────────────────────────────
function ComponentRenderer({ c, theme, onPrimary }: { c: PreviewComponent; theme: ThemeCtx; onPrimary: string }) {
  const { primary, surface, textPrimary } = theme
  const textMuted = withAlpha(textPrimary, 0.55)

  switch (c.type) {

    // ── App Bar ──
    case 'app_bar': {
      const isHome = !c.variant || c.variant === 'home'
      const barTextColor = isDark(primary) ? '#fff' : '#1C1B1F'
      return (
        <div className="md-app-bar" style={{ background: primary, paddingTop: 28, height: 84, color: barTextColor }}>
          {!isHome && (
            <span className="md-app-bar-back" style={{ color: barTextColor }}>←</span>
          )}
          <span className="md-app-bar-title" style={{ color: barTextColor }}>
            {c.title}
          </span>
        </div>
      )
    }

    // ── Card ──
    case 'card': {
      const badgeBg = c.color ?? primary
      const badgeText = isDark(badgeBg) ? '#fff' : '#1C1B1F'
      return (
        <div className="md-card" style={{ background: surface, color: textPrimary }}>
          <div className="md-card-header">
            <div style={{ flex: 1 }}>
              <div className="md-card-title" style={{ color: textPrimary }}>{c.title}</div>
              {c.subtitle && <div className="md-card-subtitle" style={{ color: textPrimary }}>{c.subtitle}</div>}
            </div>
            {c.badge != null && (
              <div className="md-card-badge" style={{ background: badgeBg, color: badgeText }}>
                {c.badge}
              </div>
            )}
          </div>
          {c.value && (
            <div style={{ fontSize: 13, color: textMuted, marginTop: 8, lineHeight: 1.5 }}>{c.value}</div>
          )}
        </div>
      )
    }

    // ── List item ──
    case 'list_item': {
      const avatarBg = withAlpha(primary, 0.15)
      const avatarLetter = (c.title ?? '?')[0].toUpperCase()
      return (
        <>
          <div className="md-list-item" style={{ color: textPrimary }}>
            <div className="md-list-avatar" style={{ background: avatarBg, color: primary }}>
              {avatarLetter}
            </div>
            <div className="md-list-content">
              <div className="md-list-title" style={{ color: textPrimary }}>{c.title}</div>
              {c.subtitle && <div className="md-list-subtitle" style={{ color: textPrimary }}>{c.subtitle}</div>}
            </div>
            {c.trailing && (
              <div className="md-list-trailing" style={{ color: textPrimary }}>{c.trailing}</div>
            )}
            {c.badge != null && (
              <div className="md-list-badge" style={{ background: primary, color: onPrimary }}>{c.badge}</div>
            )}
          </div>
          <div className="md-divider" style={{ background: withAlpha(textPrimary, 0.08), margin: '0 16px' }} />
        </>
      )
    }

    // ── List (legacy) ──
    case 'list':
      return (
        <div style={{ margin: '4px 0' }}>
          {(c.items ?? []).slice(0, 5).map((item, i) => (
            <div key={i}>
              <div className="md-list-item" style={{ color: textPrimary }}>
                <div className="md-list-avatar" style={{ background: withAlpha(primary, 0.12), color: primary }}>
                  {item[0]?.toUpperCase() ?? '#'}
                </div>
                <div className="md-list-content">
                  <div className="md-list-title" style={{ color: textPrimary }}>{item}</div>
                </div>
              </div>
              <div className="md-divider" style={{ background: withAlpha(textPrimary, 0.07), margin: '0 16px' }} />
            </div>
          ))}
        </div>
      )

    // ── Button ──
    case 'button': {
      const variant = c.variant ?? c.style ?? 'filled'
      if (variant === 'outlined') {
        return (
          <div className="md-btn-outlined" style={{ borderColor: primary, color: primary }}>
            {c.label}
          </div>
        )
      }
      if (variant === 'text') {
        return (
          <div className="md-btn-text" style={{ color: primary }}>
            {c.label}
          </div>
        )
      }
      // filled (default)
      const btnBg = c.color ?? primary
      const btnText = isDark(btnBg) ? '#fff' : '#1C1B1F'
      return (
        <div className="md-btn-filled" style={{ background: btnBg, color: btnText }}>
          {c.label}
        </div>
      )
    }

    // ── Input ──
    case 'input': {
      const hasValue = !!c.value
      const labelColor = primary
      const inputBg = surface
      return (
        <div className="md-input">
          <div className="md-input-outlined" style={{ background: inputBg, borderColor: withAlpha(textPrimary, 0.25) }}>
            <span className="md-input-label" style={{ color: labelColor, background: inputBg }}>
              {c.label ?? c.placeholder}
            </span>
            {hasValue
              ? <div className="md-input-value" style={{ color: textPrimary }}>{c.value}</div>
              : <div className="md-input-placeholder" style={{ color: textPrimary }}>{c.placeholder}</div>
            }
          </div>
        </div>
      )
    }

    // ── Image ──
    case 'image': {
      const aspect = c.aspect ?? 'banner'
      const heights: Record<string, number> = { banner: 90, square: 120, thumb: 80 }
      const h = heights[aspect] ?? 90
      return (
        <div className="md-image-placeholder" style={{ height: h }}>
          <div className="md-image-icon">🖼️</div>
          {c.placeholder && <div className="md-image-label">{c.placeholder}</div>}
        </div>
      )
    }

    // ── Chip ──
    case 'chip': {
      const chipBg = withAlpha(primary, 0.12)
      return (
        <div style={{ display: 'inline-block', margin: '4px 12px' }}>
          <div className="md-chip" style={{ background: chipBg, color: primary, borderColor: 'transparent' }}>
            {c.label}
          </div>
        </div>
      )
    }

    // ── Chip row ──
    case 'chip_row': {
      return (
        <div className="md-chip-row">
          {(c.items ?? []).map((item, i) => {
            const isActive = i === 0
            return (
              <div
                key={i}
                className="md-chip"
                style={{
                  background: isActive ? primary : withAlpha(textPrimary, 0.07),
                  color: isActive ? onPrimary : textPrimary,
                  borderColor: isActive ? 'transparent' : withAlpha(textPrimary, 0.2),
                }}
              >
                {item}
              </div>
            )
          })}
        </div>
      )
    }

    // ── Stat ──
    case 'stat': {
      const statColor = c.color ?? primary
      const trendColor = c.variant === 'up' ? '#16a34a' : c.variant === 'down' ? '#dc2626' : withAlpha(textPrimary, 0.5)
      const trendArrow = c.variant === 'up' ? '▲' : c.variant === 'down' ? '▼' : ''
      return (
        <div className="md-stat-row">
          <div className="md-stat-card" style={{ background: surface }}>
            <div className="md-stat-label" style={{ color: textPrimary }}>{c.label}</div>
            <div className="md-stat-value" style={{ color: statColor }}>{c.value}</div>
            {c.subtitle && (
              <div className="md-stat-sub" style={{ color: trendColor }}>
                {trendArrow} {c.subtitle}
              </div>
            )}
          </div>
        </div>
      )
    }

    // ── Text ──
    case 'text': {
      const style = c.style ?? 'body'
      const classMap: Record<string, string> = {
        display: 'md-text-display',
        headline: 'md-text-headline',
        body: 'md-text-body',
        caption: 'md-text-caption',
      }
      const cls = classMap[style] ?? 'md-text-body'
      const color = style === 'caption' ? textMuted : textPrimary
      return (
        <div className={cls} style={{ color }}>
          {c.value}
        </div>
      )
    }

    // ── Divider ──
    case 'divider':
      return (
        <div className="md-divider" style={{ background: withAlpha(textPrimary, 0.1), margin: '6px 14px' }} />
      )

    // ── Spacer ──
    case 'spacer': {
      const sizes: Record<string, number> = { sm: 8, md: 16, lg: 24 }
      const h = sizes[c.style ?? 'md'] ?? 16
      return <div style={{ height: h, flexShrink: 0 }} />
    }

    default: {
      const fallback = c.title ?? c.label ?? c.value ?? c.type
      return (
        <div style={{ margin: '4px 12px', padding: '8px 10px', borderRadius: 8, background: withAlpha(surface, 0.6), color: textPrimary, fontSize: 12 }}>
          {fallback}
        </div>
      )
    }
  }
}

// ─── Bottom navigation bar ────────────────────────────────────────────────────
function NavBar({ items, theme, onPrimary }: { items: string[]; theme: ThemeCtx; onPrimary: string }) {
  const [active, setActive] = useState(0)
  const { primary, surface, textPrimary } = theme

  return (
    <div
      className="md-nav-bar"
      style={{
        background: surface,
        borderTopColor: withAlpha(textPrimary, 0.1),
      }}
    >
      {items.slice(0, 5).map((item, i) => {
        const isActive = i === active
        return (
          <button
            key={i}
            className="md-nav-item"
            onClick={() => setActive(i)}
            style={{ color: isActive ? primary : withAlpha(textPrimary, 0.5) }}
          >
            <div
              className="md-nav-indicator"
              style={{ background: isActive ? withAlpha(primary, 0.15) : 'transparent' }}
            >
              <span className="md-nav-icon">{navIcon(item)}</span>
            </div>
            <span className="md-nav-label">{item}</span>
          </button>
        )
      })}
    </div>
  )
}
