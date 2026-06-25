import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

// ── Toast ─────────────────────────────────────────────────
let _toastEl = null, _toastTimer = null;
export function showToast(msg, cor = '#d4a943') {
  if (!_toastEl) { _toastEl = document.createElement('div'); _toastEl.className = 'ui-mini-toast'; document.body.appendChild(_toastEl); }
  _toastEl.textContent = msg; _toastEl.style.borderColor = cor; _toastEl.style.color = cor;
  _toastEl.classList.add('show'); clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => _toastEl?.classList.remove('show'), 2200);
}

// ── Theme manager ─────────────────────────────────────────
export const THEMES = {
  sombria: { label: 'Sombria', image: 'torre_status.png', overlay: 'linear-gradient(to bottom, rgba(4,3,2,0.52), rgba(6,4,2,0.34), rgba(4,3,2,0.60))', vars: { '--gold':'#d4a943','--gold-light':'#f5d06e','--gold-dark':'#a07828','--gold-glow':'rgba(212,169,67,0.45)','--parchment':'#f5e8c0','--ink':'#d4c8a0','--ink-dim':'#9a8e6e','--ink-faint':'#3a3020','--panel-bg':'rgba(14,11,7,0.82)','--panel-border':'rgba(160,120,40,0.50)','--input-bg':'rgba(6,4,2,0.75)' } },
  cristal:  { label: 'Cristal',  image: 'torre_painel.png',   overlay: 'linear-gradient(to bottom, rgba(4,2,8,0.50), rgba(6,3,12,0.32), rgba(3,2,6,0.60))', vars: { '--gold':'#b06ee8','--gold-light':'#d4a8f5','--gold-dark':'#7c3aed','--gold-glow':'rgba(176,110,232,0.50)','--parchment':'#ede0ff','--ink':'#c9b8e8','--ink-dim':'#9a82c0','--ink-faint':'#3d2a5a','--panel-bg':'rgba(10,5,20,0.84)','--panel-border':'rgba(130,80,220,0.50)','--input-bg':'rgba(6,3,14,0.78)' } },
  alvorada: { label: 'Alvorada', image: 'torre_itens.png',   overlay: 'linear-gradient(to bottom, rgba(8,10,5,0.34), rgba(8,9,5,0.22), rgba(5,6,3,0.46))', vars: { '--gold':'#caa24a','--gold-light':'#f2d581','--gold-dark':'#8f7730','--gold-glow':'rgba(242,213,129,0.34)','--parchment':'#fff1c9','--ink':'#dfd09d','--ink-dim':'#a89b6c','--ink-faint':'#564d2d','--panel-bg':'rgba(14,13,7,0.78)','--panel-border':'rgba(202,162,74,0.48)','--input-bg':'rgba(8,7,3,0.75)' } },
  arcana:   { label: 'Arcana',   image: 'torre_talentos.png', overlay: 'linear-gradient(to bottom, rgba(6,3,12,0.48), rgba(8,4,16,0.32), rgba(5,2,10,0.58))', vars: { '--gold':'#9f7aea','--gold-light':'#d6bcfa','--gold-dark':'#6b46c1','--gold-glow':'rgba(159,122,234,0.48)','--parchment':'#f0e9ff','--ink':'#cfc2ef','--ink-dim':'#9f8ec2','--ink-faint':'#44335e','--panel-bg':'rgba(11,7,22,0.82)','--panel-border':'rgba(130,95,220,0.52)','--input-bg':'rgba(7,4,15,0.78)' } },
};
export function applyTheme(key) {
  const t = THEMES[key] || THEMES.sombria;
  Object.entries(t.vars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
  document.body.style.backgroundImage = `${t.overlay}, url('${t.image}')`;
  document.body.style.backgroundSize = 'cover';
  document.body.style.backgroundPosition = 'center center';
  document.body.style.backgroundRepeat = 'no-repeat';
  document.body.style.backgroundAttachment = 'fixed';
}

// ── Theme Picker ──────────────────────────────────────────
export function ThemePicker({ defaultTheme }) {
  const [active, setActive] = useState(() => localStorage.getItem('rpg_tower_theme') || defaultTheme || 'sombria');
  useEffect(() => { applyTheme(active); }, [active]);
  function pick(key) { setActive(key); localStorage.setItem('rpg_tower_theme', key); showToast(`✨ ${THEMES[key].label}`); }
  return (
    <section className="ui-ambient-panel">
      <div className="ui-ambient-title">Ambiente da Torre</div>
      <div className="tower-theme-grid">
        {Object.entries(THEMES).map(([key, theme]) => (
          <button key={key} type="button"
            className={`tower-theme-btn${active === key ? ' active' : ''}`}
            style={{ backgroundImage: `linear-gradient(to bottom,rgba(0,0,0,0.05),rgba(0,0,0,0.76)),url('${theme.image}')` }}
            onClick={() => pick(key)} aria-pressed={active === key}>
            <span>{theme.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

// ── Nav ───────────────────────────────────────────────────
export function Nav() {
  const location = useLocation();
  const { sessaoCache, logout } = useAuth();
  const [showLogout, setShowLogout] = useState(false);
  const isPainel = location.pathname === '/painel';

  const links = [
    { to: '/painel', label: '◀ Fichas' },
    { to: '/status', label: 'Status' },
    { to: '/talentos', label: 'Talentos' },
    { to: '/inventario', label: 'Inventário' },
  ];

  return (
    <>
      <nav>
        {links.map(l => (
          <Link key={l.to} to={l.to} className={location.pathname === l.to ? 'active' : ''}>{l.label}</Link>
        ))}
      </nav>

      {/* Widget de usuário — não exibir no painel (que tem header próprio) */}
      {sessaoCache && !isPainel && (
        <div style={{
          position: 'fixed', top: 8, right: 10, zIndex: 500,
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(14,10,6,0.96)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(160,120,40,0.30)', borderRadius: 6,
          padding: '5px 8px 5px 10px',
          boxShadow: '0 4px 18px rgba(0,0,0,0.60)',
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--gold)', whiteSpace: 'nowrap', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
            {sessaoCache.nome?.split(' ')[0] || sessaoCache.email}
          </span>
          <div style={{ width: 1, height: 14, background: 'rgba(160,120,40,0.3)' }} />
          <button onClick={() => setShowLogout(true)} title="Sair" style={{ background: 'transparent', border: 'none', color: 'var(--ink-dim)', padding: '4px 5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, minHeight: 30, borderRadius: 3, transition: 'color 0.18s', fontFamily: 'var(--font-heading)', fontSize: 9, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span>Sair</span>
          </button>
        </div>
      )}

      {showLogout && (
        <div className="modal-overlay" onClick={() => setShowLogout(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 340, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🚪</div>
            <div className="modal-title">Sair da conta?</div>
            <p style={{ fontSize: 13, color: 'var(--ink-dim)', marginBottom: 4 }}>Você será desconectado da sessão atual.</p>
            <p style={{ fontSize: 12, color: '#4CAF50', marginTop: 8, background: 'rgba(76,175,80,0.08)', border: '1px solid rgba(76,175,80,0.22)', borderRadius: 4, padding: '8px 12px' }}>💾 Seus dados estão salvos.</p>
            <div className="modal-actions">
              <button className="modal-btn primary" onClick={async () => { setShowLogout(false); await logout(); }}>Sim, sair</button>
              <button className="modal-btn secondary" onClick={() => setShowLogout(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Dice roller helper ────────────────────────────────────
function rollExpression(expression) {
  const clean = String(expression || '').toLowerCase().replace(/\s+/g, '');
  if (!clean || !/^[0-9d+\-]+$/.test(clean)) throw new Error('Use: 1d20, 2d6+3');
  const parts = clean.match(/[+-]?[^+-]+/g) || [];
  let total = 0; const details = [];
  parts.forEach(part => {
    const sign = part.startsWith('-') ? -1 : 1;
    const term = part.replace(/^[+-]/, '');
    if (!term) return;
    if (term.includes('d')) {
      const [cR, sR] = term.split('d');
      const count = cR ? parseInt(cR,10) : 1, sides = parseInt(sR,10);
      if (!Number.isInteger(count)||!Number.isInteger(sides)||count<1||count>50||sides<2) throw new Error('Limite: 50 dados.');
      const rolls = Array.from({length:count},()=>Math.floor(Math.random()*sides)+1);
      total += sign*rolls.reduce((a,n)=>a+n,0);
      details.push(`${sign<0?'-':''}${count}d${sides}[${rolls.join(',')}]`);
    } else {
      const n = parseInt(term,10); total += sign*n;
      details.push(`${sign<0?'-':'+'}${n}`);
    }
  });
  return { total, details: details.join(' ') };
}

// ── Status Smart Panel ────────────────────────────────────
export function StatusSmartPanel({ vidaAtual, vidaMax, manaAtual, manaMax, sanAtual, onStatusChange, fichaId }) {
  const [diceExpr, setDiceExpr] = useState('1d20');
  const [diceResult, setDiceResult] = useState(null);
  const [history, setHistory] = useState(() => { try { return JSON.parse(localStorage.getItem(`${fichaId}_dice_hist`)||'[]'); } catch { return []; } });
  const [notes, setNotes] = useState(() => localStorage.getItem(`${fichaId}_quick_notes`)||'');
  const [notesSaved, setNotesSaved] = useState('');
  const notesTimer = useRef(null);

  function roll(expr) {
    try {
      const res = rollExpression(expr || diceExpr);
      setDiceResult({ total: res.total, detail: res.details, expr: (expr||diceExpr).trim() });
      const entry = `${(expr||diceExpr).trim()}: ${res.total}`;
      const nh = [entry, ...history].slice(0,6);
      setHistory(nh); localStorage.setItem(`${fichaId}_dice_hist`, JSON.stringify(nh));
    } catch(e) { setDiceResult({ error: e.message }); }
  }

  function handleNotes(v) {
    setNotes(v); setNotesSaved('salvando…'); clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => { localStorage.setItem(`${fichaId}_quick_notes`, v); setNotesSaved('salvo'); }, 300);
  }

  const pct = (a, b) => `${Math.min(100, Math.round((a/Math.max(1,b))*100))}%`;

  const QUICK = [
    {label:'+10 HP',key:'vida',d:10,color:'#e05c3a'},{label:'-10 HP',key:'vida',d:-10,color:'#e05c3a'},
    {label:'+10 MP',key:'mana',d:10,color:'#2590c8'},{label:'-10 MP',key:'mana',d:-10,color:'#2590c8'},
    {label:'+5 San',key:'sanidade',d:5,color:'#8050b8'},{label:'-5 San',key:'sanidade',d:-5,color:'#8050b8'},
  ];

  const BARS = [
    {key:'vida', label:'HP', cur:vidaAtual,max:vidaMax, bg:'linear-gradient(90deg,#8b1a1a,#e05c3a)', color:'#ff8c00'},
    {key:'mana', label:'MP', cur:manaAtual,max:manaMax, bg:'linear-gradient(90deg,#0e3d5e,#2590c8)', color:'#00bfff'},
    {key:'san',  label:'San',cur:sanAtual, max:100,     bg:'linear-gradient(90deg,#3a235a,#8050b8)', color:'#b0c4de'},
  ];

  return (
    <div className="status-smart-panel">
      <div className="status-smart-grid">

        {/* Ações rápidas + barras */}
        <div className="status-tool-block">
          <div className="status-tool-title">Ações Rápidas</div>
          <div className="quick-actions-grid" style={{ marginBottom: 12 }}>
            {QUICK.map(({label,key,d,color})=>(
              <button key={label} type="button" className="ui-action-btn"
                style={{ borderColor: `${color}44`, color }}
                onClick={()=>onStatusChange(key,d)}>{label}</button>
            ))}
            <button type="button" className="ui-action-btn"
              style={{ gridColumn:'span 2', borderColor:'rgba(212,169,67,0.4)', color:'var(--gold)' }}
              onClick={()=>{ onStatusChange('vida',vidaMax-vidaAtual); onStatusChange('mana',manaMax-manaAtual); onStatusChange('sanidade',10); }}>
              🌙 Descanso Completo
            </button>
          </div>
          {BARS.map(({key,label,cur,max,bg,color})=>(
            <div key={key} style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
              <span style={{fontSize:10,fontFamily:'var(--font-heading)',fontWeight:700,color:'var(--ink-dim)',textTransform:'uppercase',letterSpacing:'0.8px',width:24,flexShrink:0}}>{label}</span>
              <div className="stat-meter" style={{flex:1}}><span className="stat-meter-fill" style={{width:pct(cur,max),background:bg}}/></div>
              <span style={{fontSize:11,color,fontWeight:700,fontFamily:'var(--font-heading)',minWidth:52,textAlign:'right'}}>{cur}/{max}</span>
            </div>
          ))}
        </div>

        {/* Dados */}
        <div className="status-tool-block">
          <div className="status-tool-title">Rolagem de Dados</div>
          <div className="dice-controls">
            <input type="text" value={diceExpr} onChange={e=>setDiceExpr(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&roll()} autoComplete="off"
              style={{textAlign:'center',letterSpacing:1,fontSize:15}} placeholder="1d20" />
            <button type="button" className="ui-action-btn" style={{padding:'0 14px',borderColor:'var(--gold)',color:'var(--gold)'}} onClick={()=>roll()}>⚄ Rolar</button>
          </div>
          <div className="dice-presets">
            {['1d20','1d12','1d10','1d8','1d6','1d4'].map(d=>(
              <button key={d} type="button" className="ui-action-btn" style={{fontSize:10}} onClick={()=>{setDiceExpr(d);roll(d);}}>
                {d.replace('1d','d')}
              </button>
            ))}
          </div>
          <div className="dice-result" style={{marginTop:8}}>
            {!diceResult && <span style={{color:'var(--ink-dim)',fontSize:12}}>Aguardando rolagem...</span>}
            {diceResult?.error && <span style={{color:'#e74c3c'}}>{diceResult.error}</span>}
            {diceResult && !diceResult.error && (
              <>
                <span style={{fontSize:22,fontFamily:'var(--font-heading)',fontWeight:900,color:'var(--gold-light)'}}>{diceResult.total}</span>
                <span style={{fontSize:11,color:'var(--ink-dim)',marginLeft:8}}>{diceResult.expr} → {diceResult.detail}</span>
              </>
            )}
          </div>
          {history.length > 0 && (
            <div className="dice-history">
              {history.map((h,i)=><span key={i}>{h}</span>)}
            </div>
          )}
        </div>
      </div>

      {/* Notas */}
      <div className="status-tool-block quick-notes" style={{marginTop:12}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
          <div className="status-tool-title" style={{marginBottom:0}}>Notas Rápidas</div>
          <span style={{fontSize:10,color:'var(--ink-dim)'}}>{notesSaved}</span>
        </div>
        <textarea value={notes} onChange={e=>handleNotes(e.target.value)}
          placeholder="Objetivos, pistas, efeitos temporários, recompensas..." />
      </div>
    </div>
  );
}
