import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { ThemePicker, applyTheme, showToast } from '../components';

const NAV = [
  { to: '/status',     icon: '📊', label: 'Status' },
  { to: '/talentos',   icon: '✨', label: 'Talentos' },
  { to: '/inventario', icon: '🎒', label: 'Inventário' },
];

const S = {
  root: { display: 'flex', minHeight: '100dvh', background: 'transparent' },
  sidebar: { width: 220, flexShrink: 0, position: 'fixed', top: 0, left: 0, bottom: 0, background: 'rgba(6,4,12,0.97)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderRight: '1px solid var(--panel-border)', display: 'flex', flexDirection: 'column', zIndex: 100, overflow: 'hidden' },
  sidebarGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,transparent,var(--gold),transparent)', opacity: 0.5 },
  logoWrap: { padding: '18px 16px 14px', borderBottom: '1px solid var(--ink-faint)', flexShrink: 0 },
  logoText: { fontFamily: 'var(--font-title)', fontSize: 13, fontWeight: 700, color: 'var(--gold-light)', textTransform: 'uppercase', letterSpacing: 2, display: 'block', textShadow: '0 0 16px rgba(212,169,67,0.5)' },
  backLink: { display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-dim)', textDecoration: 'none', fontFamily: 'var(--font-heading)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, padding: '10px 16px', background: 'rgba(212,169,67,0.04)', borderBottom: '1px solid var(--ink-faint)', transition: '0.2s' },
  sectionLabel: { fontFamily: 'var(--font-heading)', fontSize: 9, fontWeight: 700, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: 2, padding: '10px 16px 4px' },
  navLink: (active) => ({ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', color: active ? 'var(--gold-light)' : 'var(--ink-dim)', background: active ? 'rgba(212,169,67,0.10)' : 'transparent', borderLeft: `3px solid ${active ? 'var(--gold)' : 'transparent'}`, border: 'none', width: '100%', textAlign: 'left', fontFamily: 'var(--font-heading)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, cursor: 'pointer', transition: '0.2s', textDecoration: 'none', minHeight: 44 }),
  navIcon: { fontSize: 16, width: 22, textAlign: 'center', flexShrink: 0 },
  sidebarSpacer: { flex: 1 },
  userWrap: { padding: '12px 14px', borderTop: '1px solid var(--ink-faint)', flexShrink: 0 },
  userInner: { display: 'flex', alignItems: 'center', gap: 10 },
  avatar: { width: 30, height: 30, borderRadius: '50%', background: 'rgba(212,169,67,0.15)', border: '2px solid rgba(212,169,67,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 },
  userName: { fontFamily: 'var(--font-heading)', fontSize: 10, fontWeight: 700, color: 'var(--gold)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  logoutBtn: { background: 'transparent', border: '1px solid var(--ink-faint)', color: '#5a4870', width: 28, height: 28, borderRadius: 3, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, transition: '0.2s', flexShrink: 0 },
  main: { marginLeft: 220, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100dvh' },
  topbar: { background: 'rgba(10,7,4,0.85)', backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--gold-dark)', padding: '0 20px', display: 'flex', alignItems: 'center', gap: 12, height: 52, flexShrink: 0, position: 'sticky', top: 0, zIndex: 50 },
  topTitle: { fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 700, color: 'var(--gold-light)', textTransform: 'uppercase', letterSpacing: 1.5 },
  content: { flex: 1, padding: '0' },
};

export default function DesktopShell({ title, icon, defaultTheme, topbarRight, children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { sessaoCache, logout } = useAuth();
  const [showLogout, setShowLogout] = useState(false);

  useEffect(() => {
    applyTheme(defaultTheme || 'sombria');
    document.body.classList.add('shell-active');
    return () => document.body.classList.remove('shell-active');
  }, [defaultTheme]);

  return (
    <div style={S.root}>
      {/* Sidebar */}
      <aside style={S.sidebar}>
        <div style={S.sidebarGlow} />

        {/* Logo */}
        <div style={S.logoWrap}>
          <span style={{ fontSize: 22, marginBottom: 6, display: 'block' }}>⚔️</span>
          <span style={S.logoText}>Ficha RPG</span>
        </div>

        {/* Voltar ao painel */}
        <Link to="/painel" style={S.backLink}>
          <span style={{ fontSize: 14 }}>◀</span> Minhas Fichas
        </Link>

        {/* Ficha atual */}
        <div style={S.sectionLabel}>Ficha Atual</div>
        {NAV.map(({ to, icon, label }) => {
          const active = location.pathname === to;
          return (
            <Link key={to} to={to} style={S.navLink(active)}>
              <span style={S.navIcon}>{icon}</span>
              {label}
            </Link>
          );
        })}

        {/* Tema */}
        <div style={{ padding: '12px 8px 0', borderTop: '1px solid var(--ink-faint)', marginTop: 8 }}>
          <ThemePicker defaultTheme={defaultTheme || 'sombria'} compact sidebar />
        </div>

        <div style={S.sidebarSpacer} />

        {/* Usuário */}
        <div style={S.userWrap}>
          <div style={S.userInner}>
            <div style={S.avatar}>👤</div>
            <span style={S.userName}>{sessaoCache?.nome?.split(' ')[0] || sessaoCache?.email || '...'}</span>
            <button style={S.logoutBtn} onClick={() => setShowLogout(true)} title="Sair">↩</button>
          </div>
        </div>
      </aside>

      {/* Conteúdo principal */}
      <div style={S.main}>
        {/* Topbar */}
        <header style={S.topbar}>
          <span style={{ fontSize: 20 }}>{icon}</span>
          <span style={S.topTitle}>{title}</span>
          <div style={{ flex: 1 }} />
          {topbarRight && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{topbarRight}</div>}
        </header>

        <div style={S.content}>{children}</div>
      </div>

      {/* Modal logout */}
      {showLogout && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={() => setShowLogout(false)}>
          <div style={{ background: '#0f0c07', border: '1px solid rgba(200,170,110,0.45)', borderTop: '3px solid var(--gold)', borderRadius: 10, padding: '28px 24px', maxWidth: 340, width: '90%', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 38, marginBottom: 10 }}>🚪</div>
            <div style={{ fontFamily: 'var(--font-heading)', color: 'var(--gold-light)', fontSize: 15, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Sair da conta?</div>
            <p style={{ fontSize: 13, color: 'var(--ink-dim)', marginBottom: 16 }}>Seus dados foram salvos automaticamente.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={async () => { setShowLogout(false); await logout(); navigate('/auth'); }} style={{ flex: 1, background: 'var(--gold)', color: '#0f0f0f', border: 'none', padding: 12, borderRadius: 5, fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Sim, sair</button>
              <button onClick={() => setShowLogout(false)} style={{ flex: 1, background: 'transparent', border: '1px solid #333', color: '#888', padding: 12, borderRadius: 5, fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
