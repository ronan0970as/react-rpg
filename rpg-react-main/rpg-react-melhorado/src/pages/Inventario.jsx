import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFichaId, carregarInventario, salvarInventario } from '../data';
import { Nav, ThemePicker, showToast } from '../components';

const CATS = {
  geral:     { label:'📦 Geral',     cor:'#888',    borda:'#444' },
  arma:      { label:'⚔️ Arma',      cor:'#e74c3c', borda:'#c0392b' },
  armadura:  { label:'🛡️ Armadura',  cor:'#3498db', borda:'#2980b9' },
  consumivel:{ label:'🧪 Consumível',cor:'#2ecc71', borda:'#27ae60' },
  anotacao:  { label:'📝 Anotação',  cor:'#f39c12', borda:'#d68910' },
  tesouro:   { label:'💰 Tesouro',   cor:'#f1c40f', borda:'#d4ac0d' },
  magico:    { label:'✨ Mágico',    cor:'#9b59b6', borda:'#8e44ad' },
  montaria:  { label:'🐴 Montaria',  cor:'#1abc9c', borda:'#16a085' },
};

const EMPTY_IMG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%230a0806'/%3E%3Ctext x='50' y='58' text-anchor='middle' font-size='28' fill='%23333'%3E📷%3C/text%3E%3C/svg%3E`;

function norm(s) { try { return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); } catch { return String(s).toLowerCase(); } }

export default function InventarioPage() {
  const navigate = useNavigate();
  const fichaId = getFichaId();
  const [inv, setInv] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [busca, setBusca] = useState('');
  const [catFiltro, setCatFiltro] = useState('todos');
  const [saving, setSaving] = useState(false);

  // Form state
  const [fNome, setFNome] = useState('');
  const [fDesc, setFDesc] = useState('');
  const [fImg, setFImg] = useState('');
  const [fCat, setFCat] = useState('geral');
  const [fQtd, setFQtd] = useState(1);
  const [fZoom, setFZoom] = useState(1);
  const [fX, setFX] = useState(50);
  const [fY, setFY] = useState(50);

  useEffect(() => {
    if (!fichaId) { navigate('/painel'); return; }
    carregarInventario().then(data => setInv(data || []));
    const handler = e => { if (fNome||fDesc) { e.preventDefault(); e.returnValue=''; } };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [fichaId]);

  async function adicionar() {
    if (!fNome.trim()) { showToast('⚠️ Digite o nome do item!','#f39c12'); return; }
    if (!fDesc.trim()) { showToast('⚠️ Adicione uma descrição!','#f39c12'); return; }
    setSaving(true);
    const item = { id:Date.now(), nome:fNome.trim(), descricao:fDesc.trim(), imagem:fImg||EMPTY_IMG, zoom:fZoom, posX:fX, posY:fY, categoria:fCat, quantidade:Math.max(1,fQtd) };
    const nova = [...(inv||[]), item];
    setInv(nova);
    await salvarInventario(nova);
    setSaving(false);
    setFNome(''); setFDesc(''); setFImg(''); setFCat('geral'); setFQtd(1); setFZoom(1); setFX(50); setFY(50);
    setFormOpen(false);
    showToast('✅ Item adicionado!','#4CAF50');
  }

  async function remover(id) {
    if (!confirm('Remover este item do inventário?')) return;
    const nova = (inv||[]).filter(i=>i.id!==id);
    setInv(nova); await salvarInventario(nova);
  }

  async function altQtd(id, delta) {
    const item = (inv||[]).find(i=>i.id===id); if (!item) return;
    const novaQtd = Math.max(0,(item.quantidade||1)+delta);
    if (novaQtd===0) { if (!confirm(`Remover "${item.nome}"?`)) return; }
    const nova = novaQtd===0 ? (inv||[]).filter(i=>i.id!==id) : (inv||[]).map(i=>i.id===id?{...i,quantidade:novaQtd}:i);
    setInv(nova); await salvarInventario(nova);
  }

  function loadImg(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => { const c=document.createElement('canvas'); const MAX=400; const sc=MAX/img.width; c.width=MAX; c.height=img.height*sc; c.getContext('2d').drawImage(img,0,0,c.width,c.height); setFImg(c.toDataURL('image/jpeg',0.72)); };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  const filtrado = (inv||[]).filter(item=>{
    const bOk = !busca || norm((item.nome||'')+' '+(item.descricao||'')).includes(norm(busca));
    const cOk = catFiltro==='todos'||(item.categoria||'geral')===catFiltro;
    return bOk&&cOk;
  });

  const total = (inv||[]).length;
  const visto = filtrado.length;

  return (
    <>
      <ThemePicker defaultTheme="alvorada"/>
      <Nav/>
      <div className="rpg-window">

        {/* ── Toggle form ── */}
        <button className="form-toggle-btn" onClick={()=>setFormOpen(o=>!o)}>
          <span>➕ Adicionar Novo Item</span>
          <span style={{fontSize:11,opacity:0.7}}>{formOpen?'▼':'▶'}</span>
        </button>

        {/* ── Formulário ── */}
        {formOpen && (
          <div style={{background:'rgba(8,5,2,0.55)',border:'1px solid rgba(160,120,40,0.20)',borderRadius:6,padding:16,marginBottom:16,display:'flex',flexDirection:'column',gap:12}}>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div>
                <label style={{display:'block',marginBottom:4}}>Nome do Item</label>
                <input type="text" value={fNome} onChange={e=>setFNome(e.target.value)} placeholder="Ex: Espada de Prata" autoComplete="off" style={{fontSize:14}}/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <div>
                  <label style={{display:'block',marginBottom:4}}>Categoria</label>
                  <select value={fCat} onChange={e=>setFCat(e.target.value)} style={{WebkitAppearance:'auto',appearance:'auto',fontSize:13}}>
                    {Object.entries(CATS).map(([k,{label}])=><option key={k} value={k}>{label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{display:'block',marginBottom:4}}>Quantidade</label>
                  <input type="number" value={fQtd} onChange={e=>setFQtd(parseInt(e.target.value)||1)} min="1" inputMode="numeric" style={{textAlign:'center',fontSize:14}}/>
                </div>
              </div>
            </div>

            <div>
              <label style={{display:'block',marginBottom:4}}>Descrição</label>
              <textarea value={fDesc} onChange={e=>setFDesc(e.target.value)} rows="3"
                placeholder="Dano, peso, propriedades mágicas, notas de roleplay..."
                style={{fontSize:13,resize:'vertical'}}/>
            </div>

            {/* Imagem */}
            <div className="upload-area">
              <label style={{display:'block',color:'var(--gold)',fontSize:12,marginBottom:8,fontFamily:'var(--font-heading)',fontWeight:700,letterSpacing:0.5,textTransform:'uppercase'}}>🖼️ Imagem (Opcional)</label>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <div>
                  <label style={{display:'block',fontSize:10,color:'var(--ink-dim)',marginBottom:4}}>Upload:</label>
                  <input type="file" accept="image/*" onChange={loadImg} style={{background:'transparent',border:'1px dashed rgba(160,120,40,0.35)',color:'var(--ink-dim)',padding:'6px 8px',borderRadius:4,cursor:'pointer',fontSize:11,width:'100%'}}/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,color:'var(--ink-dim)',marginBottom:4}}>URL:</label>
                  <input type="text" value={fImg} onChange={e=>setFImg(e.target.value)} placeholder="https://..." style={{fontSize:12}}/>
                </div>
              </div>
              {fImg && (
                <div style={{marginTop:10,display:'grid',gridTemplateColumns:'100px 1fr',gap:10,alignItems:'start'}}>
                  {/* Preview imagem */}
                  <div style={{width:100,height:100,borderRadius:4,overflow:'hidden',border:'1px solid rgba(160,120,40,0.30)',flexShrink:0}}>
                    <img src={fImg} alt="preview" style={{width:'100%',height:'100%',objectFit:'cover',transform:`scale(${fZoom})`,objectPosition:`${fX}% ${fY}%`}}/>
                  </div>
                  <div className="crop-controls">
                    <label>🔍 Zoom ({fZoom}x)</label>
                    <input type="range" min="1" max="3" step="0.1" value={fZoom} onChange={e=>setFZoom(parseFloat(e.target.value))}/>
                    <label>↔️ Horizontal ({fX}%)</label>
                    <input type="range" min="0" max="100" value={fX} onChange={e=>setFX(parseInt(e.target.value))}/>
                    <label>↕️ Vertical ({fY}%)</label>
                    <input type="range" min="0" max="100" value={fY} onChange={e=>setFY(parseInt(e.target.value))}/>
                  </div>
                </div>
              )}
            </div>

            <div style={{display:'flex',gap:8}}>
              <button className="save-btn" onClick={adicionar} disabled={saving} style={{flex:2}}>
                {saving?'⏳ Adicionando...':'➕ Adicionar ao Inventário'}
              </button>
              <button onClick={()=>{setFormOpen(false);}} style={{flex:1,background:'transparent',border:'1px solid rgba(160,120,40,0.25)',color:'var(--ink-dim)',borderRadius:4,cursor:'pointer',fontFamily:'var(--font-heading)',fontSize:11,fontWeight:700,letterSpacing:0.5,textTransform:'uppercase',minHeight:48}}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* ── Header Inventário ── */}
        <h2 style={{marginTop:4}}>🎒 Inventário</h2>

        {/* ── Toolbar ── */}
        <div className="inv-toolbar">
          <div className="inv-busca-wrap">
            <span className="inv-busca-icone">🔍</span>
            <input type="text" value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar por nome ou descrição..."/>
          </div>
          <span className="inv-count">
            {inv===null ? '...' : visto===total ? `${total} item${total!==1?'s':''}` : `${visto} de ${total}`}
          </span>
        </div>

        {/* ── Filtros ── */}
        <div className="inv-cats">
          {[['todos','Todos'],['arma','⚔️ Armas'],['armadura','🛡️ Armaduras'],['consumivel','🧪 Consumíveis'],['anotacao','📝 Anotações'],['tesouro','💰 Tesouros'],['magico','✨ Mágicos'],['montaria','🐴 Montarias'],['geral','📦 Geral']].map(([cat,label])=>(
            <button key={cat} className={`inv-cat-btn${catFiltro===cat?' ativo':''}`} data-cat={cat} onClick={()=>setCatFiltro(cat)}>{label}</button>
          ))}
        </div>

        {/* ── Lista ── */}
        {inv===null ? (
          <div className="grid-itens">
            {[0,1].map(i=>(
              <div key={i} className="skeleton-card">
                <div className="skeleton-body">
                  <div className="skeleton-line" style={{height:15,width:'50%'}}/>
                  <div className="skeleton-line" style={{height:11,width:'85%'}}/>
                  <div className="skeleton-line" style={{height:11,width:'65%'}}/>
                </div>
                <div className="skeleton-img"/>
              </div>
            ))}
          </div>
        ) : filtrado.length===0 ? (
          <div style={{textAlign:'center',padding:'32px 0',color:'var(--ink-dim)',fontSize:13,fontStyle:'italic'}}>
            {busca||catFiltro!=='todos' ? '🔍 Nenhum item encontrado com esses filtros.' : '📦 Inventário vazio. Adicione itens acima!'}
          </div>
        ) : (
          <div className="grid-itens">
            {filtrado.map(item=>{
              const cat = CATS[item.categoria||'geral']||CATS.geral;
              const qtd = Math.max(1,item.quantidade||1);
              return (
                <div key={item.id} className="item-card" style={{borderLeft:`3px solid ${cat.borda}`}}>
                  <div className="item-info">
                    <h3>
                      {item.nome}
                      <span style={{flex:1}}/>
                      <span style={{fontSize:10,fontWeight:700,color:cat.cor,background:'rgba(0,0,0,0.45)',border:`1px solid ${cat.borda}55`,padding:'2px 8px',borderRadius:20,whiteSpace:'nowrap',flexShrink:0}}>{cat.label}</span>
                    </h3>
                    <p>{item.descricao}</p>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,flexShrink:0}}>
                    {/* Imagem */}
                    <div className="item-img-container">
                      <img src={item.imagem||EMPTY_IMG} alt={item.nome} loading="lazy"
                        style={{transform:`scale(${parseFloat(item.zoom)||1})`,objectPosition:`${parseFloat(item.posX)||50}% ${parseFloat(item.posY)||50}%`}}/>
                    </div>
                    {/* Quantidade */}
                    <div style={{display:'flex',alignItems:'center',gap:6,background:'rgba(8,5,2,0.80)',border:'1px solid rgba(160,120,40,0.22)',borderRadius:4,padding:'4px 8px'}}>
                      <button onClick={()=>altQtd(item.id,-1)} style={{background:'none',border:'none',color:qtd<=1?'#e74c3c':'var(--ink-dim)',fontSize:18,fontWeight:700,cursor:'pointer',padding:'0 3px',lineHeight:1,fontFamily:'inherit',transition:'color 0.18s'}}>−</button>
                      <span style={{color:'var(--parchment)',fontWeight:700,fontSize:14,minWidth:20,textAlign:'center',fontFamily:'var(--font-heading)'}}>{qtd}</span>
                      <button onClick={()=>altQtd(item.id,1)} style={{background:'none',border:'none',color:'#4CAF50',fontSize:18,fontWeight:700,cursor:'pointer',padding:'0 3px',lineHeight:1,fontFamily:'inherit'}}>+</button>
                    </div>
                    <button onClick={()=>remover(item.id)} style={{background:'rgba(180,40,40,0.08)',border:'1px solid rgba(180,40,40,0.28)',color:'#c0554e',padding:'5px 10px',borderRadius:4,cursor:'pointer',fontSize:11,fontFamily:'var(--font-heading)',fontWeight:700,letterSpacing:0.4,textTransform:'uppercase',transition:'all 0.18s',width:'100%'}}>
                      🗑️ Remover
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </>
  );
}
