import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFichaId, carregarStatus, carregarTalentos, salvarTalentos } from '../data';
import { calcularTodosBuffs, parsearBuffsDinamicos } from '../buffs';
import { Nav, ThemePicker, showToast } from '../components';

const ATRIBUTOS = [
  { key:'forca',       label:'⚔️ Força' },
  { key:'velocidade',  label:'💨 Velocidade' },
  { key:'inteligencia',label:'🧠 Inteligência' },
  { key:'defesa',      label:'🛡️ Defesa' },
  { key:'pontaria',    label:'🎯 Pontaria' },
  { key:'carisma',     label:'🗣️ Carisma' },
  { key:'furtividade', label:'🌑 Furtividade' },
];

function calcBonus(base, txt) {
  if (!txt || txt==='0') return 0;
  const s = String(txt).trim();
  if (s.includes('%')) { const p=parseFloat(s); return isNaN(p)?0:Math.round(p/100*base); }
  return parseInt(s)||0;
}
function basesComBonus(d) {
  if (!d) return Object.fromEntries(ATRIBUTOS.map(a=>[a.key,0]));
  const m = { forca:[d.forcaBase,d.forcaBonus], velocidade:[d.velBase,d.velBonus], inteligencia:[d.intBase,d.intBonus], defesa:[d.defBase,d.defBonus], pontaria:[d.pontBase,d.pontBonus], carisma:[d.carBase,d.carBonus], furtividade:[d.furtBase,d.furtBonus] };
  return Object.fromEntries(Object.entries(m).map(([k,[b,bn]])=>{ const base=parseInt(b||0); return [k, base+calcBonus(base,bn||'0')]; }));
}

let _uid = 1;
function novoTalento(d={}) { return { _uid:_uid++, ativo:d.ativo!==undefined?d.ativo:true, nome:d.nome||'', tipo:d.tipo||'Passivo', categoria:d.categoria||'Talento', raca:d.raca||'', classe:d.classe||'', desc:d.desc||'', buffs:d.buffs||{}, _calcVida:'', _calcMana:'', _calcSan:'', _fbVida:'', _fbMana:'', _fbSan:'' }; }

export default function TalentosPage() {
  const navigate = useNavigate();
  const fichaId = getFichaId();
  const [talentos, setTalentos] = useState([]);
  const [dadosSt, setDadosSt] = useState(null);
  const [status, setStatus] = useState({ vida:{cur:0,max:100}, mana:{cur:0,max:10}, san:{cur:100,max:100} });
  const [calc, setCalc] = useState({ acum:{}, bases:{} });
  const [busca, setBusca] = useState('');
  const [catFiltro, setCatFiltro] = useState('todos');
  const [tipoFiltro, setTipoFiltro] = useState('todos');
  const [loading, setLoading] = useState(true);
  const saveTimer = useRef(null);

  useEffect(() => {
    if (!fichaId) { navigate('/painel'); return; }
    init();
  }, [fichaId]);

  async function init() {
    setLoading(true);
    const [tal, ds] = await Promise.all([carregarTalentos(), carregarStatus()]);
    setDadosSt(ds);
    const lista = tal?.length ? tal.map(novoTalento) : [novoTalento()];
    setTalentos(lista);
    if (ds) setStatus(prev => ({ ...prev, vida:{...prev.vida, cur:parseInt(ds.vidaAtual||0)}, mana:{...prev.mana, cur:parseInt(ds.manaAtual||0)}, san:{...prev.san, cur:parseInt(ds.sanAtual||100)} }));
    setTimeout(() => recalcular(lista, ds), 0);
    setLoading(false);
  }

  function recalcular(tal, ds) {
    const d = ds || dadosSt;
    const bases = basesComBonus(d);
    const nivel = parseInt(d?.nivel||0), san = parseInt(d?.sanAtual||0);
    const si = { manaMax:bases.inteligencia*10, vidaMax:50+bases.defesa*50, nivel, sanidade:san };
    const acum = calcularTodosBuffs(tal||[], bases, si);
    if (d?.habilidades?.trim()) {
      const ctx={}; ATRIBUTOS.forEach(a=>{ctx[a.key]=(bases[a.key]||0)+(acum[a.key]||0);});
      const cSt={manaMax:ctx.inteligencia*10+(acum.manaMax||0),vidaMax:50+ctx.defesa*50+(acum.vidaMax||0),nivel,sanidade:san,...ctx};
      const din=parsearBuffsDinamicos(d.habilidades,{bases:ctx,statusLocal:cSt});
      Object.keys(acum).forEach(k=>{if(din[k])acum[k]+=din[k];});
    }
    const defT=(bases.defesa||0)+(acum.defesa||0), intT=(bases.inteligencia||0)+(acum.inteligencia||0);
    const vidaMax=Math.max(1,50+defT*50+(acum.vidaMax||0)), manaMax=Math.max(1,intT*10+(acum.manaMax||0)), sanMax=100+(acum.sanidadeMax||0);
    setCalc({acum,bases});
    setStatus(prev=>({ vida:{cur:Math.min(prev.vida.cur,vidaMax),max:vidaMax}, mana:{cur:Math.min(prev.mana.cur,manaMax),max:manaMax}, san:{cur:Math.min(prev.san.cur,sanMax),max:sanMax} }));
  }

  function autoSave(newTal) {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async()=>{
      const toSave=newTal.map(({_uid,_calcVida,_calcMana,_calcSan,_fbVida,_fbMana,_fbSan,...r})=>r);
      await salvarTalentos(toSave);
    },600);
  }

  function update(uid,field,val) {
    setTalentos(prev=>{const n=prev.map(t=>t._uid===uid?{...t,[field]:val}:t);autoSave(n);recalcular(n,dadosSt);return n;});
  }
  function updateBuff(uid,k,v) {
    setTalentos(prev=>{const n=prev.map(t=>t._uid===uid?{...t,buffs:{...t.buffs,[k]:v}}:t);autoSave(n);recalcular(n,dadosSt);return n;});
  }
  function toggle(uid) { update(uid,'ativo',!talentos.find(t=>t._uid===uid)?.ativo); }
  function remover(uid) { setTalentos(prev=>{const n=prev.filter(t=>t._uid!==uid);autoSave(n);recalcular(n,dadosSt);return n;}); }
  function adicionar() { setTalentos(prev=>[...prev,novoTalento()]); }

  async function salvarManual() {
    clearTimeout(saveTimer.current);
    const toSave=talentos.map(({_uid,_calcVida,_calcMana,_calcSan,_fbVida,_fbMana,_fbSan,...r})=>r);
    await salvarTalentos(toSave);
    showToast('💾 Talentos salvos!','#4CAF50');
  }

  function aplicarCalc(uid,tipo,val) {
    const key = {vida:'vida',mana:'mana',sanidade:'san'}[tipo];
    if (!key) return;
    const st = {...status[key]};
    let mod=0;
    if(val.includes('%'))mod=Math.round(parseFloat(val.replace('%',''))/100*st.max);
    else mod=parseInt(val)||0;
    const anterior=st.cur; st.cur=Math.max(0,Math.min(st.max,st.cur+mod));
    const diff=st.cur-anterior;
    setStatus(prev=>({...prev,[key]:st}));
    const fbKey = `_fb${tipo.charAt(0).toUpperCase()+tipo.slice(1)}`;
    const calcKey = `_calc${tipo.charAt(0).toUpperCase()+tipo.slice(1)}`;
    update(uid,fbKey,`${diff>=0?'+':''}${diff} → ${st.cur}`);
    update(uid,calcKey,'');
    setTimeout(()=>update(uid,fbKey,''),2500);
  }

  const pct=(a,b)=>Math.min(100,Math.round(a/Math.max(1,b)*100));

  const filtrado = talentos.filter(t=>{
    if(busca&&!t.nome.toLowerCase().includes(busca.toLowerCase())&&!t.desc.toLowerCase().includes(busca.toLowerCase())) return false;
    if(catFiltro!=='todos'&&t.categoria!==catFiltro) return false;
    if(tipoFiltro!=='todos'&&t.tipo!==tipoFiltro) return false;
    return true;
  });

  if (loading) return (
    <div className="spinner-overlay"><div className="spinner-anel"/><div className="spinner-txt">Carregando Talentos...</div></div>
  );

  return (
    <>
      <ThemePicker defaultTheme="arcana"/>
      <Nav/>
      <div className="rpg-window">

        {/* ── Status Pills ── */}
        <div className="status-panel">
          {[
            {k:'vida', label:'❤️ HP', barCls:'bar-hp', valCls:'val-hp'},
            {k:'mana', label:'💧 MP', barCls:'bar-mp', valCls:'val-mp'},
            {k:'san',  label:'🧠 San',barCls:'bar-san',valCls:'val-san'},
          ].map(({k,label,barCls,valCls})=>(
            <div key={k} className="status-pill">
              <span className="s-label">{label}</span>
              <div className="bar-wrap"><div className={`bar ${barCls}`} style={{width:`${pct(status[k].cur,status[k].max)}%`}}/></div>
              <span className={`s-val ${valCls}`}>{status[k].cur}/{status[k].max}</span>
            </div>
          ))}
        </div>

        {/* ── Atributos ── */}
        <div className="attr-resumo">
          {ATRIBUTOS.map(a=>{
            const base=calc.bases[a.key]||0, buff=calc.acum[a.key]||0, total=base+buff;
            return (
              <div key={a.key} className="attr-chip">
                <div className="a-nome">{a.label}</div>
                <div className="a-val" style={{color:buff>0?'#4CAF50':buff<0?'#e74c3c':'var(--gold)'}}>{total}</div>
                <div className="a-base">base {base}</div>
                <div className="a-buff">{buff!==0?<span style={{color:buff>0?'#4CAF50':'#e74c3c',fontSize:10}}>{buff>0?'+':''}{buff}✨</span>:<span style={{color:'var(--ink-faint)',fontSize:10}}>—</span>}</div>
              </div>
            );
          })}
          {/* Chips de HP/MP máximo */}
          {[
            {label:'❤️ Vida Máx',val:status.vida.max,cor:'#ff6b35'},
            {label:'💧 Mana Máx',val:status.mana.max,cor:'#00bfff'},
            {label:'🧠 San Máx', val:status.san.max, cor:'#b0c4de'},
          ].map(({label,val,cor})=>(
            <div key={label} className="attr-chip" style={{borderColor:`${cor}44`}}>
              <div className="a-nome" style={{fontSize:8}}>{label}</div>
              <div className="a-val" style={{color:cor,fontSize:18}}>{val}</div>
              <div className="a-base" style={{fontSize:8}}>calculado</div>
              <div className="a-buff" style={{height:14}}/>
            </div>
          ))}
        </div>

        {/* ── Filtros ── */}
        <div style={{background:'rgba(8,5,2,0.60)',border:'1px solid rgba(160,120,40,0.20)',borderRadius:6,padding:'12px 14px',marginBottom:16}}>
          <div style={{display:'flex',gap:8,marginBottom:10,flexWrap:'wrap'}}>
            <input type="text" value={busca} onChange={e=>setBusca(e.target.value)}
              placeholder="🔍 Buscar talento ou habilidade..." style={{flex:'1 1 180px',minWidth:150,fontSize:13}}/>
          </div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:6}}>
            <span style={{alignSelf:'center',fontSize:9,fontFamily:'var(--font-heading)',fontWeight:700,color:'var(--ink-dim)',textTransform:'uppercase',letterSpacing:1,flexShrink:0}}>Categoria:</span>
            {['todos','Talento','Habilidade','Raça'].map(c=>(
              <button key={c} onClick={()=>setCatFiltro(c)} style={{padding:'5px 11px',borderRadius:3,border:`1px solid ${catFiltro===c?'var(--gold)':'rgba(160,120,40,0.22)'}`,background:catFiltro===c?'rgba(212,169,67,0.10)':'transparent',color:catFiltro===c?'var(--gold-light)':'var(--ink-dim)',cursor:'pointer',fontFamily:'var(--font-heading)',fontSize:10,fontWeight:700,letterSpacing:0.5,textTransform:'uppercase',minHeight:30}}>{c}</button>
            ))}
          </div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            <span style={{alignSelf:'center',fontSize:9,fontFamily:'var(--font-heading)',fontWeight:700,color:'var(--ink-dim)',textTransform:'uppercase',letterSpacing:1,flexShrink:0}}>Tipo:</span>
            {['todos','Passivo','Ativo','Reação','Especial'].map(t=>(
              <button key={t} onClick={()=>setTipoFiltro(t)} style={{padding:'5px 11px',borderRadius:3,border:`1px solid ${tipoFiltro===t?'var(--gold)':'rgba(160,120,40,0.22)'}`,background:tipoFiltro===t?'rgba(212,169,67,0.10)':'transparent',color:tipoFiltro===t?'var(--gold-light)':'var(--ink-dim)',cursor:'pointer',fontFamily:'var(--font-heading)',fontSize:10,fontWeight:700,letterSpacing:0.5,textTransform:'uppercase',minHeight:30}}>{t}</button>
            ))}
          </div>
        </div>

        {/* ── Lista ── */}
        <div id="lista-talentos">
          {filtrado.length===0&&(
            <div style={{textAlign:'center',padding:32,color:'var(--ink-dim)',fontStyle:'italic',fontSize:13}}>
              {busca||catFiltro!=='todos'||tipoFiltro!=='todos'?'Nenhum talento encontrado com esses filtros.':'Nenhum talento criado ainda. Adicione abaixo!'}
            </div>
          )}
          {filtrado.map(t=>(
            <TalentoCard key={t._uid} t={t}
              onToggle={()=>toggle(t._uid)}
              onUpdate={(f,v)=>update(t._uid,f,v)}
              onBuff={(k,v)=>updateBuff(t._uid,k,v)}
              onRemover={()=>remover(t._uid)}
              onAplicar={(tipo,v)=>aplicarCalc(t._uid,tipo,v)}
            />
          ))}
        </div>

        {/* ── Botões ── */}
        <div style={{display:'flex',gap:10,marginTop:4,flexWrap:'wrap'}}>
          <button onClick={adicionar} style={{flex:1,minWidth:140,background:'transparent',border:'2px dashed rgba(76,175,80,0.5)',color:'#4CAF50',padding:13,borderRadius:6,cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:'var(--font-heading)',letterSpacing:0.6,textTransform:'uppercase',transition:'all 0.18s',minHeight:48}}>
            ＋ Adicionar Talento
          </button>
          <button onClick={salvarManual} style={{flex:1,minWidth:140,background:'rgba(76,175,80,0.14)',border:'1px solid rgba(76,175,80,0.55)',color:'#4CAF50',padding:13,borderRadius:6,cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:'var(--font-heading)',letterSpacing:0.6,textTransform:'uppercase',transition:'all 0.18s',minHeight:48}}>
            💾 Salvar Talentos
          </button>
        </div>

      </div>
    </>
  );
}

function TalentoCard({ t, onToggle, onUpdate, onBuff, onRemover, onAplicar }) {
  const [buffOpen, setBuffOpen] = useState(false);
  const cat = t.categoria||'Talento';
  const catCls = cat==='Habilidade'?'cat-habilidade':cat==='Raça'?'cat-raca':'cat-talento';

  return (
    <div className={`talento-card ${t.ativo?'ativo':'inativo'} ${catCls}`}>

      {/* Header */}
      <div className="talento-header">
        <div className={`toggle-ativo${t.ativo?' on':''}`} onClick={onToggle} title={t.ativo?'Ativo — clique para desativar':'Inativo — clique para ativar'}/>
        <input type="text" className="talento-nome" value={t.nome} onChange={e=>onUpdate('nome',e.target.value)} placeholder="Nome do Talento ou Habilidade..."/>
        <select className={`cat-badge cat-${cat.toLowerCase()}`} value={cat} onChange={e=>onUpdate('categoria',e.target.value)} style={{WebkitAppearance:'auto',appearance:'auto'}}>
          <option value="Talento">🌟 Talento</option>
          <option value="Habilidade">⚡ Habilidade</option>
          <option value="Raça">🧬 Raça</option>
        </select>
        <select className="tipo-badge" value={t.tipo||'Passivo'} onChange={e=>onUpdate('tipo',e.target.value)} style={{WebkitAppearance:'auto',appearance:'auto'}}>
          {['Passivo','Ativo','Reação','Especial'].map(tp=><option key={tp} value={tp}>{tp}</option>)}
        </select>
        <button onClick={onRemover} title="Remover talento" style={{background:'transparent',border:'1px solid rgba(180,40,40,0.30)',color:'#c0554e',width:32,height:32,borderRadius:4,cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.18s',flexShrink:0}}>✕</button>
      </div>

      {/* Raça / Classe */}
      <div style={{display:'flex',gap:10,marginBottom:10,flexWrap:'wrap'}}>
        <div className="raca-row" style={{flex:1,minWidth:140}}>
          <label>🧬 Raça:</label>
          <input type="text" className="raca-input" value={t.raca} onChange={e=>onUpdate('raca',e.target.value)} placeholder="Ex: Elfo (ou vazio para geral)"/>
        </div>
        <div className="raca-row" style={{flex:1,minWidth:140}}>
          <label>🗡️ Classe:</label>
          <input type="text" className="raca-input" style={{color:'#e8a830',borderColor:'rgba(232,168,48,0.30)'}} value={t.classe} onChange={e=>onUpdate('classe',e.target.value)} placeholder="Ex: Guerreiro (ou vazio)"/>
        </div>
      </div>

      {/* Descrição */}
      <textarea value={t.desc} onChange={e=>onUpdate('desc',e.target.value)}
        placeholder="Descreva o efeito, condições de uso, custo de mana, narrativa..."
        style={{width:'100%',background:'rgba(6,4,2,0.80)',border:'1px solid rgba(160,120,40,0.22)',color:'var(--ink)',padding:'10px 12px',borderRadius:4,fontSize:13,resize:'vertical',minHeight:68,fontFamily:'var(--font-body)',lineHeight:1.55,outline:'none',transition:'border-color 0.18s',marginBottom:10}}
        onFocus={e=>e.target.style.borderColor='var(--gold)'}
        onBlur={e=>e.target.style.borderColor='rgba(160,120,40,0.22)'}
      />

      {/* Painel de Buffs — colapsável */}
      <button onClick={()=>setBuffOpen(o=>!o)} style={{background:buffOpen?'rgba(212,169,67,0.08)':'transparent',border:'1px solid rgba(160,120,40,0.22)',borderRadius:4,color:'var(--ink-dim)',padding:'6px 12px',cursor:'pointer',fontFamily:'var(--font-heading)',fontSize:10,fontWeight:700,letterSpacing:0.6,textTransform:'uppercase',width:'100%',textAlign:'left',display:'flex',alignItems:'center',justifyContent:'space-between',transition:'all 0.18s',minHeight:34}}>
        <span>📊 Buffs & Efeitos de Status</span>
        <span style={{fontSize:12,opacity:0.6}}>{buffOpen?'▼':'▶'}</span>
      </button>

      {buffOpen && (
        <div style={{marginTop:8,background:'rgba(4,2,1,0.50)',border:'1px solid rgba(160,120,40,0.18)',borderRadius:4,padding:'10px 12px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>

          {/* Atributos */}
          <div>
            <div style={{fontSize:9,fontFamily:'var(--font-heading)',fontWeight:700,color:'var(--gold)',textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>Buff nos Atributos</div>
            <div style={{display:'flex',flexDirection:'column',gap:5}}>
              {ATRIBUTOS.map(a=>(
                <div key={a.key} style={{display:'flex',alignItems:'center',gap:6}}>
                  <span style={{fontSize:10,fontFamily:'var(--font-heading)',fontWeight:700,color:'var(--ink-dim)',width:76,flexShrink:0}}>{a.label}</span>
                  <input type="text" value={t.buffs?.[a.key]||''} onChange={e=>onBuff(a.key,e.target.value)}
                    placeholder="+10%" inputMode="decimal"
                    style={{flex:1,background:'rgba(8,5,2,0.85)',border:'1px solid rgba(160,120,40,0.25)',color:'var(--gold)',padding:'5px 7px',borderRadius:3,fontSize:13,fontWeight:700,textAlign:'center',fontFamily:'var(--font-body)',minHeight:0,outline:'none'}}/>
                </div>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <div style={{fontSize:9,fontFamily:'var(--font-heading)',fontWeight:700,color:'var(--gold)',textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>Efeito no Status</div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {[
                {tipo:'vida',    label:'❤️ Vida',   cor:'#ff6b35', calcKey:'_calcVida', fbKey:'_fbVida'},
                {tipo:'mana',    label:'💧 Mana',   cor:'#00bfff', calcKey:'_calcMana', fbKey:'_fbMana'},
                {tipo:'sanidade',label:'🧠 San.',   cor:'#b0c4de', calcKey:'_calcSan',  fbKey:'_fbSan'},
              ].map(({tipo,label,cor,calcKey,fbKey})=>(
                <div key={tipo}>
                  <div style={{display:'flex',alignItems:'center',gap:5}}>
                    <span style={{fontSize:10,fontWeight:700,color:cor,width:46,flexShrink:0,fontFamily:'var(--font-heading)'}}>{label}</span>
                    <input type="text" value={t[calcKey]||''} onChange={e=>onUpdate(calcKey,e.target.value)}
                      placeholder="+10, -5%" inputMode="decimal"
                      style={{flex:1,background:'rgba(8,5,2,0.85)',border:'1px solid rgba(160,120,40,0.25)',color:'#fff',padding:'5px 7px',borderRadius:3,fontSize:13,fontFamily:'var(--font-body)',minHeight:0,outline:'none'}}/>
                    <button onClick={()=>t[calcKey]&&onAplicar(tipo,t[calcKey])}
                      style={{background:'rgba(160,120,40,0.12)',border:'1px solid rgba(160,120,40,0.28)',color:'var(--gold)',padding:'5px 8px',borderRadius:3,cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:'var(--font-heading)',minHeight:0,flexShrink:0,transition:'all 0.18s'}}>✓</button>
                  </div>
                  {t[fbKey]&&<div style={{fontSize:10,color:'#4CAF50',fontWeight:700,marginTop:2,fontFamily:'var(--font-heading)'}}>{t[fbKey]}</div>}
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
