import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { applyTheme, THEMES, showToast } from '../components';

const NAV = [
  { to: '/painel',     icon: '🗂️', label: 'Fichas' },
  { to: '/status',     icon: '📊', label: 'Status' },
  { to: '/talentos',   icon: '✨', label: 'Talentos' },
  { to: '/inventario', icon: '🎒', label: 'Inventário' },
];

function ThemeSheet({ onFechar, defaultTheme }) {
  const [active, setActive] = useState(
    () => localStorage.getItem('rpg_tower_theme') || defaultTheme || 'sombria'
  );
  function pick(key) {
    setActive(key);
    localStorage.setItem('rpg_tower_theme', key);
    applyTheme(key);
    showToast(`🎨 ${THEMES[key].label}`);
    onFechar();
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 500, display: 'flex', alignItems: 'flex-end' }} onClick={onFechar}>
      <div style={{ background: 'rgba(10,7,4,0.98)', backdropFilter: 'blur(14px)', border: '1px solid var(--panel-border)', borderTop: '3px solid var(--gold)', borderRadius: '14px 14px 0 0', padding: '16px 14px 28px', width: '100%' }} onClick={e => e.stopPropagation()}>
        <div style={{ width: 36, height: 4, background: 'rgba(160,120,40,0.35)', borderRadius: 2, margin: '0 auto 14px' }} />
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 11, fontWeight: 700, color: 'var(--gold-light)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>🎨 Ambiente da Torre</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {Object.entries(THEMES).map(([key, theme]) => (
            <button key={key} onClick={() => pick(key)} style={{ background: active === key ? 'rgba(200,170,110,0.15)' : 'rgba(0,0,0,0.5)', border: `1px solid ${active === key ? 'var(--gold)' : 'rgba(160,120,40,0.25)'}`, borderRadius: 6, padding: '10px 8px', cursor: 'pointer', color: active === key ? 'var(--gold-light)' : 'var(--ink-dim)', fontFamily: 'var(--font-heading)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, backgroundImage: `linear-gradient(rgba(0,0,0,0.55),rgba(0,0,0,0.55)),url('${theme.image}')`, backgroundSize: 'cover', backgroundPosition: 'center', minHeight: 52, transition: '0.2s' }}>
              {theme.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MobileShell({ title, icon, defaultTheme = 'sombria', headerRight, children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [themeOpen, setThemeOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('rpg_tower_theme') || defaultTheme;
    applyTheme(saved);
    document.body.classList.add('shell-active');
    return () => document.body.classList.remove('shell-active');
  }, [defaultTheme]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>

      {/* Header fixo */}
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, height: 52, background: 'rgba(8,5,2,0.97)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid var(--gold-dark)', display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px', boxShadow: '0 2px 20px rgba(0,0,0,0.6)' }}>
        <button onClick={() => navigate('/painel')} aria-label="Voltar" style={{ background: 'transparent', border: '1px solid var(--gold-dark)', color: 'var(--ink-dim)', width: 34, height: 34, borderRadius: 4, cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>◀</button>
        <span style={{ fontFamily: 'var(--font-heading)', fontSize: 12, fontWeight: 700, color: 'var(--gold-light)', textTransform: 'uppercase', letterSpacing: 1.2, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {icon && <span style={{ marginRight: 5 }}>{icon}</span>}{title}
        </span>
        {headerRight && <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>{headerRight}</div>}
        <button onClick={() => setThemeOpen(true)} aria-label="Tema" title="Mudar ambiente" style={{ background: 'transparent', border: '1px solid rgba(160,120,40,0.25)', color: 'var(--ink-faint)', width: 32, height: 32, borderRadius: 4, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>🎨</button>
      </header>

      {/* Conteúdo */}
      <main style={{ flex: 1, paddingTop: 52, paddingBottom: 56 }}>
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="shell-bottom-nav" aria-label="Navegação principal">
        {NAV.map(({ to, icon: navIcon, label }) => {
          const active = location.pathname === to;
          return (
            <Link key={to} to={to} aria-label={label} aria-current={active ? 'page' : undefined} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '8px 4px 10px', textDecoration: 'none', color: active ? 'var(--gold-light)' : '#5a4870', borderTop: `2px solid ${active ? 'var(--gold)' : 'transparent'}`, background: active ? 'rgba(212,169,67,0.05)' : 'transparent', minHeight: 56, transition: 'color 0.15s, border-color 0.15s' }}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>{navIcon}</span>
              <span style={{ fontSize: 9.5, fontFamily: 'var(--font-heading)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Theme sheet */}
      {themeOpen && <ThemeSheet onFechar={() => setThemeOpen(false)} defaultTheme={defaultTheme} />}
    </div>
  );
}
