import { useState, useEffect, useRef, useCallback } from 'react';
import { Nav, StatusSmartPanel, showToast } from '../components';
import { useAuth }       from '../AuthContext';
import { useMesa }       from '../contexts/MesaContext';
import { useBuffs }      from '../hooks/useBuffs';
import { usePermissoes } from '../hooks/usePermissoes';
import { supabase }      from '../supabase';
import {
  getFichaId, getMesaId,
  carregarStatus, salvarStatus, carregarTalentos,
  sincronizarPontosGastos, registrarHistorico,
} from '../data';

const ATTRS = [
  { key:'forca',        baseKey:'forcaBase', bonusKey:'forcaBonus',  label:'Força',        icon:'⚔️' },
  { key:'velocidade',   baseKey:'velBase',   bonusKey:'velBonus',    label:'Velocidade',   icon:'🏃' },
  { key:'inteligencia', baseKey:'intBase',   bonusKey:'intBonus',    label:'Inteligência', icon:'🧠' },
  { key:'defesa',       baseKey:'defBase',   bonusKey:'defBonus',    label:'Defesa',       icon:'🛡️' },
  { key:'pontaria',     baseKey:'pontBase',  bonusKey:'pontBonus',   label:'Pontaria',     icon:'🎯' },
  { key:'carisma',      baseKey:'carBase',   bonusKey:'carBonus',    label:'Carisma',      icon:'💬' },
  { key:'furtividade',  baseKey:'furtBase',  bonusKey:'furtBonus',   label:'Furtividade',  icon:'🌑' },
];
const DEFAULTS = {
  nome:'', classe:'', raca:'', nivel:1, genero:'',
  forcaBase:0,forcaBonus:'',velBase:0,velBonus:'',
  intBase:0,intBonus:'',defBase:0,defBonus:'',
  pontBase:0,pontBonus:'',carBase:0,carBonus:'',
  furtBase:0,furtBonus:'',habilidades:'',
  vidaAtual:50,manaAtual:0,sanAtual:100,
  foto:'',deusId:'',deusNome:'',origemId:'',origemNome:'',
  pontosDistribuicao:{},
};

export default function StatusPage() {
  const { mesaAtiva } = useAuth();
  const { deuses, origens, camposVisiveis:v, camposLabels:L,
          recarregarPontos, pontosJogador } = useMesa();

  const fichaExternaRef = useRef(localStorage.getItem('rpg_mestre_ficha_alvo') || null);
  const fichaId  = fichaExternaRef.current || getFichaId();
  const mesaId   = getMesaId() || mesaAtiva?.id;
  const perms    = usePermissoes(fichaId);

  const [dados,   setDados]   = useState(DEFAULTS);
  const [talentos,setTalentos]= useState([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const fileRef  = useRef(null);
  const saveLock = useRef(false);

  /* BUGFIX: cálculo de buffs via useMemo isolado, sem setState → sem loops */
  const { bases, totais, vidaMax, manaMax } = useBuffs(dados, talentos);

  const pontosDispDistrib = Object.values(dados.pontosDistribuicao || {})
    .reduce((a,v2) => a + (parseInt(v2)||0), 0);
  const pontosDisp = Math.max(0, pontosJogador.pontos_totais - pontosDispDistrib);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [d, t] = await Promise.all([
        carregarStatus(fichaId),
        carregarTalentos(fichaId),
      ]);
      setDados({ ...DEFAULTS, ...(d||{}) });
      setTalentos(t||[]);
      if (fichaId && mesaId) await recarregarPontos(fichaId);
    } catch(err) { showToast('Erro ao carregar: '+err.message,'#e74c3c'); }
    finally { setLoading(false); }
  }, [fichaId, mesaId, recarregarPontos]);

  useEffect(() => { carregar(); }, [carregar]);

  const set = useCallback((key, val) =>
    setDados(p => ({ ...p, [key]: val })), []);

  const gastarPonto = useCallback(async (attrKey) => {
    if (!perms.podeGastarPontos) return showToast('Sem permissão.','#e74c3c');
    if (pontosDisp <= 0)          return showToast('Sem pontos disponíveis!','#e74c3c');
    if (saveLock.current)         return;
    saveLock.current = true;

    const novaDistrib = { ...(dados.pontosDistribuicao||{}),
      [attrKey]: (dados.pontosDistribuicao?.[attrKey]||0) + 1 };
    const novosDados = { ...dados, pontosDistribuicao: novaDistrib };
    setDados(novosDados); // optimistic update
    try {
      const novoGasto = Object.values(novaDistrib).reduce((a,v2)=>a+(parseInt(v2)||0),0);
      await Promise.all([
        salvarStatus(novosDados, fichaId),
        mesaId ? sincronizarPontosGastos(fichaId, mesaId, novoGasto) : null,
      ]);
      if (mesaId) await recarregarPontos(fichaId);
      showToast(`+1 em ${ATTRS.find(a=>a.key===attrKey)?.label}!`);
    } catch(err) {
      setDados(dados); // rollback
      showToast('Erro: '+err.message,'#e74c3c');
    } finally { saveLock.current = false; }
  }, [perms, pontosDisp, dados, fichaId, mesaId, recarregarPontos]);

  const onStatusChange = useCallback((tipo, delta) => {
    setDados(p => {
      const c = {...p};
      if (tipo==='vida')     c.vidaAtual = Math.max(0,Math.min(vidaMax,(c.vidaAtual||0)+delta));
      if (tipo==='mana')     c.manaAtual = Math.max(0,Math.min(manaMax,(c.manaAtual||0)+delta));
      if (tipo==='sanidade') c.sanAtual  = Math.max(0,Math.min(100,   (c.sanAtual ||0)+delta));
      return c;
    });
  }, [vidaMax, manaMax]);

  const handleFoto = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2*1024*1024) return showToast('Máx 2MB.','#e74c3c');
    const r = new FileReader();
    r.onload = ev => set('foto', ev.target.result);
    r.readAsDataURL(file);
  }, [set]);

  const selecionarOpcao = useCallback((tipo, opcao) => {
    if (tipo==='deus') { set('deusId',opcao?.id||''); set('deusNome',opcao?.nome||''); }
    else { set('origemId',opcao?.id||''); set('origemNome',opcao?.nome||''); }
  }, [set]);

  const salvar = useCallback(async (e) => {
    e?.preventDefault();
    if (saveLock.current || !fichaId) return;
    saveLock.current = true; setSaving(true);
    try {
      const payload = { ...dados, vidaMax, manaMax };
      await salvarStatus(payload, fichaId);
      if (dados.nome && perms.ehDonoDaFicha)
        await supabase.from('fichas').update({ nome:dados.nome }).eq('id',fichaId);
      if (mesaId) await sincronizarPontosGastos(fichaId, mesaId, pontosDispDistrib);
      await registrarHistorico(fichaId,'status','Ficha salva');
      setSaved(true); showToast('✨ Ficha salva!');
      setTimeout(()=>setSaved(false), 2500);
    } catch(err) { showToast('Erro ao salvar: '+err.message,'#e74c3c'); }
    finally { setSaving(false); saveLock.current = false; }
  }, [dados, fichaId, mesaId, vidaMax, manaMax, pontosDispDistrib, perms]);

  if (loading) return (
    <div className="spinner-overlay">
      <div className="spinner-anel"/><div className="spinner-txt">Carregando ficha...</div>
    </div>
  );

  return (
    <>
      <Nav />
      <div className="rpg-window">
        {perms.estaSendoMestre && (
          <div className="aviso-mestre">
            <span>👑 Visualizando como Mestre</span>
            <button onClick={()=>{ localStorage.removeItem('rpg_mestre_ficha_alvo'); window.location.reload(); }}>← Sair</button>
          </div>
        )}
        <form onSubmit={salvar} noValidate>
          {mesaId && (
            <div className="pontos-status-panel">
              <div className="pontos-status-header">
                <span className="pontos-title">★ Pontos de Status</span>
                <div className="pontos-counters">
                  {[['Total',pontosJogador.pontos_totais,'gold'],['Gastos',pontosDispDistrib,'dim'],['Disponíveis',pontosDisp,pontosDisp>0?'green':'dim']].map(([l,n,c])=>(
                    <span key={l} className="pontos-item">
                      <span className="pontos-label">{l}</span>
                      <span className={`pontos-val ${c}`}>{n}</span>
                    </span>
                  ))}
                </div>
              </div>
              {pontosDisp>0 && perms.podeGastarPontos && (
                <div className="pontos-hint">💡 Clique em <strong>+</strong> ao lado de um atributo para gastar 1 ponto.</div>
              )}
            </div>
          )}

          <div className="grid-container">
            {/* Coluna 1 */}
            <div className="char-card-col">
              <div className="char-foto-card">
                <div className="char-foto-wrap"
                  onClick={()=>perms.podeFazerUploadFoto&&fileRef.current?.click()}
                  style={{cursor:perms.podeFazerUploadFoto?'pointer':'default'}}>
                  {dados.foto ? <img src={dados.foto} alt={dados.nome||'personagem'}/> : <span className="char-foto-placeholder">🧙</span>}
                </div>
                <div className="char-foto-nome">{dados.nome||'—'}</div>
                <div className="char-foto-classe">{dados.classe||'Sem classe'}</div>
                {perms.podeFazerUploadFoto && (
                  <><input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleFoto}/>
                  <button type="button" className="char-foto-btn" onClick={()=>fileRef.current?.click()}>📷 Foto</button></>
                )}
              </div>
              <div className="section" style={{marginTop:10}}>
                {v.deus!==false && (
                  <div className="input-row">
                    <label>{L.deus||'Deus'}</label>
                    {deuses.length>0 ? (
                      <select value={dados.deusId} disabled={!perms.ehDonoDaFicha}
                        onChange={e=>selecionarOpcao('deus',deuses.find(d=>d.id===e.target.value)||null)}>
                        <option value="">— Nenhum —</option>
                        {deuses.map(d=><option key={d.id} value={d.id}>{d.icone?d.icone+' ':''}{d.nome}</option>)}
                      </select>
                    ) : (
                      <input type="text" value={dados.deusNome} onChange={e=>set('deusNome',e.target.value)}
                        placeholder="Nome do deus" readOnly={!!mesaId&&!perms.isMestre}/>
                    )}
                  </div>
                )}
                {v.origem!==false && (
                  <div className="input-row" style={{marginTop:6}}>
                    <label>{L.origem||'Origem'}</label>
                    {origens.length>0 ? (
                      <select value={dados.origemId} disabled={!perms.ehDonoDaFicha}
                        onChange={e=>selecionarOpcao('origem',origens.find(o=>o.id===e.target.value)||null)}>
                        <option value="">— Nenhuma —</option>
                        {origens.map(o=><option key={o.id} value={o.id}>{o.icone?o.icone+' ':''}{o.nome}</option>)}
                      </select>
                    ) : (
                      <input type="text" value={dados.origemNome} onChange={e=>set('origemNome',e.target.value)}
                        placeholder="Origem" readOnly={!!mesaId&&!perms.isMestre}/>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Coluna 2 */}
            <div>
              <div className="section">
                <h2>📋 Informações</h2>
                {[{k:'nome',l:'Nome',ph:'Nome do personagem',ro:!perms.podeEditarInfoBasica},
                  ...(v.classe!==false?[{k:'classe',l:L.classe||'Classe',ph:'Ex: Guerreiro',ro:!perms.podeEditarBase}]:[]),
                  ...(v.raca!==false  ?[{k:'raca',  l:L.raca  ||'Raça',  ph:'Ex: Humano',  ro:!perms.podeEditarBase}]:[]),
                ].map(({k,l,ph,ro})=>(
                  <div key={k} className="input-row">
                    <label>{l}</label>
                    <input type="text" value={dados[k]||''} onChange={e=>set(k,e.target.value)} placeholder={ph} readOnly={ro}/>
                  </div>
                ))}
                <div className="input-row">
                  <label>Nível</label>
                  <input type="number" value={dados.nivel} min={0} max={99}
                    onChange={e=>set('nivel',parseInt(e.target.value)||0)}
                    readOnly={!perms.podeEditarBase} style={{maxWidth:70,textAlign:'center'}}/>
                  <div className="genero-selector">
                    {['M','F','Outro'].map(g=>(
                      <button key={g} type="button" className={`genero-btn${dados.genero===g?' ativo':''}`}
                        disabled={!perms.podeEditarBase}
                        onClick={()=>perms.podeEditarBase&&set('genero',dados.genero===g?'':g)}>{g}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="section">
                <h2>❤️ Status Vital</h2>
                {[
                  {key:'vidaAtual',label:'❤️',max:vidaMax,tipo:'vida',    cor:'#e05c3a'},
                  {key:'manaAtual',label:'💧',max:manaMax,tipo:'mana',    cor:'#2590c8'},
                  ...(v.sanidade!==false?[{key:'sanAtual',label:'🌀',max:100,tipo:'sanidade',cor:'#8050b8'}]:[]),
                ].map(({key,label,max,tipo,cor})=>{
                  const cur=dados[key]||0;
                  const pct=Math.min(100,Math.round((cur/Math.max(1,max))*100));
                  return (
                    <div key={key} className="status-bar">
                      <label>{label}</label>
                      <div className="stat-meter" style={{flex:1}}>
                        <span className="stat-meter-fill" style={{background:`linear-gradient(90deg,${cor}88,${cor})`,width:`${pct}%`}}/>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:4,flexShrink:0}}>
                        <button type="button" className="calc-btn" onClick={()=>onStatusChange(tipo,-1)}>−</button>
                        <input type="number" value={cur} min={0} max={max}
                          onChange={e=>set(key,parseInt(e.target.value)||0)} style={{width:52,textAlign:'center'}}/>
                        <button type="button" className="calc-btn" onClick={()=>onStatusChange(tipo,1)}>+</button>
                        <span className="highlight">/ {max}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Coluna 3 */}
            <div>
              <div className="section">
                <h2>⚡ Atributos</h2>
                {ATTRS.filter(({key})=>{
                  if(key==='carisma'    &&v.carisma    ===false)return false;
                  if(key==='furtividade'&&v.furtividade===false)return false;
                  if(key==='pontaria'   &&v.pontaria   ===false)return false;
                  return true;
                }).map(({key,baseKey,bonusKey,label,icon})=>{
                  const distrib=parseInt(dados.pontosDistribuicao?.[key])||0;
                  const buffVal=totais[key]||0;
                  const total=bases[key]+buffVal;
                  return (
                    <div key={key} className="attr-row">
                      <label>{icon} {L[key]||label}</label>
                      <input type="number" value={dados[baseKey]} min={0} max={99}
                        onChange={e=>set(baseKey,parseInt(e.target.value)||0)}
                        readOnly={!perms.podeEditarBase} style={{width:56,textAlign:'center'}}/>
                      <span style={{color:'var(--gold-dark)',fontSize:12}}>+</span>
                      <input type="text" value={dados[bonusKey]} onChange={e=>set(bonusKey,e.target.value)}
                        readOnly={!perms.podeEditarBase} placeholder="0" className="mod-input" style={{maxWidth:56}}/>
                      {mesaId && (
                        <div style={{display:'flex',alignItems:'center',gap:4}}>
                          {distrib>0 && <span style={{fontSize:11,color:'#4CAF50',fontWeight:700}}>+{distrib}★</span>}
                          {perms.podeGastarPontos && pontosDisp>0 && (
                            <button type="button" className="pontos-gasto-btn"
                              title="Gastar 1 ponto" onClick={()=>gastarPonto(key)}>+</button>
                          )}
                        </div>
                      )}
                      <span className="total-stat">
                        = <strong style={{color:total>=10?'var(--gold-light)':'var(--ink)'}}>{total}</strong>
                        {buffVal!==0&&<span style={{fontSize:10,color:buffVal>0?'#4CAF50':'#e74c3c',marginLeft:3}}>({buffVal>0?'+':''}{buffVal})</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
              {v.habilidades!==false && (
                <div className="section">
                  <h2>📖 {L.habilidades||'Habilidades'}</h2>
                  <textarea value={dados.habilidades} onChange={e=>set('habilidades',e.target.value)}
                    readOnly={!perms.podeEditarBase&&!perms.ehDonoDaFicha}
                    placeholder="Ex: +5 de forca a cada 3 de inteligencia..." style={{minHeight:90}}/>
                </div>
              )}
            </div>
          </div>

          <StatusSmartPanel
            vidaAtual={dados.vidaAtual||0} vidaMax={vidaMax}
            manaAtual={dados.manaAtual||0} manaMax={manaMax}
            sanAtual={dados.sanAtual||0}
            onStatusChange={onStatusChange} fichaId={fichaId}
          />
          <div style={{height:16}}/>
          <button type="submit" className="save-btn" disabled={saving||!fichaId}>
            {saving?'⏳ Salvando...':saved?'✓ Salvo!':'💾 Salvar Ficha'}
          </button>
        </form>
      </div>
    </>
  );
}
