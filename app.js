/* Droid Tycoon — v28.3: Caminho 6 revisado e Flagelo (Scourge) em todo o inventário / Rebirth. */
(()=>{'use strict';
const DB=window.DROID_DB, TRAITS=window.DROID_TRAITS;
const STORE='droidtycoon_local_v1', RESTORE='droidtycoon_restore_undo_v1', NOTICE_KEY='droidtycoon_sale_notices_v2';
const ACCOUNTS_KEY='droidtycoon_accounts_v1', ACCOUNTS_UNDO='droidtycoon_accounts_restore_v1', OP_UNDO_KEY='droidtycoon_operation_undo_v27_';
const PRE_TRAITS_BACKUP='droidtycoon_pre_traits_v26';
const T=DB.tiers, UPGRADE_TIERS=T.filter(t=>t!=='Scourge'), FUSION_TIERS=UPGRADE_TIERS, CAT=DB.catalog, R=DB.requirements, byName=Object.fromEntries(CAT.map(d=>[d.name,d]));
// Traduções apenas para apresentação; os identificadores originais permanecem intactos.
const RARITY_PT={Common:'Comum',Rare:'Raro',Epic:'Épico',Legendary:'Lendário',Mythic:'Mítico',Iconic:'Icônico'};
const ROLE_PT={Astromech:'Astromecânico',Worker:'Operário',Battle:'Combate',Protocol:'Protocolo'};
const rarityLabel=rarity=>RARITY_PT[rarity]||rarity||'';
// Cores somente nas etiquetas de raridade. Comum e Icônico não têm fundo.
const rarityTag=rarity=>rarity?`<span class="rarity-label" data-rarity="${h(rarity)}">${h(rarityLabel(rarity))}</span>`:'';
const roleLabel=role=>ROLE_PT[role]||role||'';
// Traduzir somente o que é exibido; manter os identificadores originais no inventário e nos backups.
const VARIANT_PT={Default:'Padrão',Gold:'Ouro',Diamond:'Diamante',Rainbow:'Arco-íris',Beskar:'Beskar',Galactic:'Galáctico',Stellar:'Estelar',Kyber:'Kyber',Scourge:'Flagelo','Única':'Única'};
const variantLabel=tier=>VARIANT_PT[tier]||tier||'';
// Imagens de referência fornecidas pelo Droid Tycoon Helper. Falhas usam ícones locais.
const IMAGE_ROOT='https://droidtycoonhelper.com/img/droids/';
// Fotos com endereço específico, sem mudar nome, raridade, variante ou banco de dados.
const IMAGE_OVERRIDES=Object.freeze({
 'UTIL-TEC':'https://static.wikia.nocookie.net/star-wars-droid-tycoon/images/8/82/Util-Tec_Main.png'
});
const slug=name=>String(name).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\([^)]*\)/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const imageUrl=name=>IMAGE_OVERRIDES[name]||`${IMAGE_ROOT}${encodeURIComponent(slug(name))}.webp`;
const imageOf=(name,large=false,tier='Default')=>`<span class="droid-thumb ${large?'droid-thumb-lg':''}" data-variant="${h(tier)}" aria-label="${h(variantLabel(tier))}"><span class="droid-fallback" aria-hidden="true">✦</span><img data-droid-img alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" src="${h(imageUrl(name))}"></span>`;

// 17 receitas comunitárias de fusão. Ordem dos ingredientes não interfere no jogo.
// Conferidas com Droid Tycoon Helper / tycoon-tools.com em 17/10/2026.
const FUSIONS=[
 {id:'WHL-EX',parts:['MOUSE','MOUSE','ARG']},
 {id:'ZRO-TEC',parts:['ID10','ID10','2BB']},
 {id:'BTL-R',parts:['B1 BATTLE','R9','BDX EXPLORER']},
 {id:'N-UL',parts:['B1 HEAVY','GUNRUNNER','BB']},
 {id:'SCRP-R',parts:['GONK','GROUNDMECH','R6']},
 {id:'ARM-CORE',parts:['ARG','ARG','B2 HEAVY']},
 {id:'OPT-AR',parts:['R2','R2','B2 SUPER']},
 {id:'RO-TOR',parts:['BB9','PIT','B1 BATTLE']},
 {id:'FUS-3',parts:['B-U4D','B-U4D','R7']},
 {id:'ORB-XL',parts:['CB','GUNRUNNER','B2-RP']},
 {id:'QIK-BIT',parts:['GROUNDMECH','GROUNDMECH','BB9']},
 {id:'RIV-3T',parts:['KX','IG','RIC']},
 {id:'LUG-G',parts:['LOADLIFTER','ID10','R5']},
 {id:'LOW-MO',parts:['A-LT','A-LT','LOADLIFTER']},
 {id:'AXI-POD',parts:['RIC','BDX EXPLORER','R7']},
 {id:'SRV-O',parts:['B1 HEAVY','B1 HEAVY','RIC-1200']},
 {id:'X-ONK',parts:['KX','KX','GONK']}
];
const FUSION_BY_ID=Object.fromEntries(FUSIONS.map(r=>[r.id,r]));
const FUSION_INGREDIENTS=Object.fromEntries(CAT.map(d=>[d.name,FUSIONS.filter(r=>r.parts.includes(d.name))]));
function cleanFusion(raw){
 const out={plans:{},history:[],genericPlans:[],genericHistory:[],prices:{}};if(!raw||typeof raw!=='object')return out;
 if(raw.plans&&typeof raw.plans==='object'&&!Array.isArray(raw.plans))for(const [id,p] of Object.entries(raw.plans)){
  const r=FUSION_BY_ID[id];if(r&&p&&Array.isArray(p.tiers)&&p.tiers.length===3&&p.tiers.every(t=>FUSION_TIERS.includes(t)))out.plans[id]={tiers:[...p.tiers]};
 }
 if(Array.isArray(raw.history))out.history=raw.history.filter(x=>FUSION_BY_ID[x?.id]&&T.includes(x?.tier)&&Array.isArray(x?.tiers)&&x.tiers.length===3&&x.tiers.every(t=>T.includes(t))).slice(-120).map(x=>({id:x.id,tier:x.tier,tiers:[...x.tiers],cost:typeof x.cost==='string'?x.cost.slice(0,35):'',date:typeof x.date==='string'?x.date.slice(0,40):''}));
 // Custos informados para cada receita e combinação exata de variantes, por conta.
 if(raw.prices&&typeof raw.prices==='object'&&!Array.isArray(raw.prices))for(const [key,p] of Object.entries(raw.prices).slice(0,800)){
  const [id,...tiers]=key.split('::');if(!FUSION_BY_ID[id]||tiers.length!==3||!tiers.every(t=>FUSION_TIERS.includes(t)))continue;
  if(p&&typeof p==='object'&&typeof p.display==='string'&&/^(?:\d+(?:[.,]\d+)?)(?:\s?(?:K|M|B|T|Qa|Qi|Sx|Sp|Oc|No|Dc))?$/i.test(p.display.trim())&&p.display.length<=35){out.prices[key]={display:p.display.trim(),source:'informado pelo usuário',verifiedAt:typeof p.verifiedAt==='string'?p.verifiedAt.slice(0,40):''}}
 }
 // Compatível com os backups antigos: as reservas comuns são opcionais.
 const validParts=parts=>Array.isArray(parts)&&parts.length===3&&parts.every(p=>p&&validName(p.name)&&validTier(p.name,p.tier)&&p.tier!=='Única');
 if(Array.isArray(raw.genericPlans))for(const row of raw.genericPlans.slice(0,40)){
  if(row&&typeof row.id==='string'&&row.id.length<=100&&['special','variant','rarity','mythic'].includes(row.kind)&&validParts(row.parts)&&!out.genericPlans.some(p=>p.id===row.id))
   out.genericPlans.push({id:row.id,kind:row.kind,parts:row.parts.map(p=>({name:p.name,tier:p.tier}))});
 }
 if(Array.isArray(raw.genericHistory))out.genericHistory=raw.genericHistory.filter(x=>x&&['special','variant','rarity','mythic'].includes(x.kind)&&validParts(x.parts)&&validName(x.result)&&validTier(x.result,x.tier)).slice(-120).map(x=>({kind:x.kind,parts:x.parts.map(p=>({name:p.name,tier:p.tier})),result:x.result,tier:x.tier,date:typeof x.date==='string'?x.date.slice(0,40):''}));
 return out;
}

const stages={};for(const item of R){const key=`${item.p}:${item.c}`;(stages[key]??=[]).push(item)}
const pick=(p,c)=>stages[`${p}:${c}`]||[];
const h=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
// Destaques visuais de variantes; apenas HTML de apresentação, sem alterar dados.
const variantText=tier=>`<span class="variant-name" data-variant="${h(tier)}">${h(variantLabel(tier))}</span>`;
const variantBadge=tier=>`<span class="variant-token" data-variant="${h(tier)}">${h(variantLabel(tier))}</span>`;
const nf=n=>new Intl.NumberFormat('pt-BR').format(n), rank=v=>Math.max(0,T.indexOf(v)), nextId=(name,tier)=>`${name}::${tier}`;
const arrInventory=s=>Object.entries(s.inventory).flatMap(([name,tiers])=>Object.entries(tiers).filter(([,qty])=>qty>0).map(([tier,qty])=>({name,tier,qty}))).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')||rank(b.tier)-rank(a.tier));
const validName=name=>!!byName[name], validTier=(name,tier)=>byName[name]?.rarity==='Iconic'?tier==='Única':T.includes(tier);
// Individual units coexist with aggregate inventory: legacy rebirth/fusion totals remain intact.
function bareUnit(name,tier){return {id:'unidade-'+newId(),name,tier,traitStatus:'unknown',trait:'',grade:'',bonus:'',nickname:'',favorite:false,uses:[],rolls:0,history:[],tests:[],createdAt:new Date().toISOString()}}
function normalizeUnits(input,inventory){
 const list=[];const used=new Set();
 if(Array.isArray(input))for(const row of input.slice(0,30000)){
  if(!row||!validName(row.name)||!validTier(row.name,row.tier))continue;
  const id=typeof row.id==='string'&&row.id.length<=130&&row.id&&!used.has(row.id)?row.id:null;
  if(!id)continue;used.add(id);
  list.push({id,name:row.name,tier:row.tier,traitStatus:['unknown','none','known'].includes(row.traitStatus)?row.traitStatus:'unknown',
   trait:typeof row.trait==='string'?row.trait.slice(0,120):'',grade:TRAITS.tiers.includes(row.grade)?row.grade:'',
   bonus:typeof row.bonus==='string'?row.bonus.slice(0,60):'',nickname:typeof row.nickname==='string'?row.nickname.slice(0,60):'',
   favorite:row.favorite===true,uses:Array.isArray(row.uses)?row.uses.filter(x=>typeof x==='string').slice(0,8):[],
   rolls:Number.isSafeInteger(row.rolls)&&row.rolls>=0?row.rolls:0,history:Array.isArray(row.history)?row.history.slice(-80):[],
   tests:Array.isArray(row.tests)?row.tests.slice(-50):[],createdAt:typeof row.createdAt==='string'?row.createdAt:'',
   });
 }
 // Aggregated legacy totals are canonical: correct partial migrations without losing inventory.
 for(const [name,ts] of Object.entries(inventory))for(const [tier,qty] of Object.entries(ts)){
  const have=list.filter(x=>x.name===name&&x.tier===tier);
  if(have.length>qty){let over=have.length-qty;for(let i=list.length-1;i>=0&&over;i--)if(list[i].name===name&&list[i].tier===tier){list.splice(i,1);over--}}
  else for(let i=have.length;i<qty;i++)list.push(bareUnit(name,tier));
 }
 return list.filter(x=>!!inventory[x.name]?.[x.tier]);
}
function unitsFor(name,tier){return (state.units||[]).filter(x=>x.name===name&&(!tier||x.tier===tier))}
function unitById(id){return state.units.find(x=>x.id===id)}
function unitName(u){return u.nickname||u.name+' · '+u.id.slice(-5)}
function unitTrait(u){return u.traitStatus==='known'?(TRAITS.byId[u.trait]?.label||accountsDb.customTraits?.find(t=>t.id===u.trait)?.name||u.trait):u.traitStatus==='none'?'Sem habilidade':'Não verificado'}
function unitFit(u){const d=byName[u.name];return u.traitStatus==='known'?TRAITS.fit(u.name,d.role,u.trait,u.grade,u.uses):{score:-1,label:u.traitStatus==='none'?'Sem habilidade':'Não verificado',explain:'Cadastre o resultado obtido no jogo para avaliar.'}}
function unitPriority(u){const fit=unitFit(u);return (u.favorite?100:0)+(fit.score>=3?30+fit.score*10:fit.score===-1?8:0)+(u.history.length>0?1:0)}
function smartUnits(name,tier,qty){return unitsFor(name,tier).sort((a,b)=>unitPriority(a)-unitPriority(b)||a.id.localeCompare(b.id)).slice(0,qty)}
function selectedUnits(name,tier,qty,ids){
 const list=Array.isArray(ids)?ids.map(unitById):smartUnits(name,tier,qty);
 if(list.length!==qty||new Set(list.map(x=>x?.id)).size!==qty||list.some(x=>!x||x.name!==name||x.tier!==tier))throw new Error('Seleção de unidades inválida; confira sua base.');
 return list;
}
function archiveUnit(u,reason){state.unitArchive.push({...JSON.parse(JSON.stringify(u)),retiredAt:new Date().toISOString(),reason});state.unitArchive=state.unitArchive.slice(-350)}
function removeUnits(name,tier,qty,ids,reason){const removed=selectedUnits(name,tier,qty,ids);for(const u of removed){archiveUnit(u,reason);state.units=state.units.filter(x=>x.id!==u.id)}return removed}
function unitOptions(name,tier,qty=1){const list=smartUnits(name,tier,unitsFor(name,tier).length);return list.map(u=>`<option value="${h(u.id)}">${h(unitName(u))} — ${h(unitTrait(u))}${u.favorite?' ★':''}</option>`).join('')}
function smartUnitSelect(name,tier,field,index=0){const pool=smartUnits(name,tier,unitsFor(name,tier).length);return `<select class="select" name="${h(field)}" required>${pool.map((u,i)=>`<option value="${h(u.id)}" ${i===index?'selected':''}>${h(unitName(u))} · ${h(unitTrait(u))}${u.favorite?' ★':''}</option>`).join('')}</select>`}
function isValuable(u){return u.favorite||unitFit(u).score>=5}
function ensureValuableConsent(units,action){const risky=units.filter(isValuable);return !risky.length||window.confirm(`ATENÇÃO: ${risky.length} unidade(s) selecionada(s) são favoritas ou possuem habilidades Excelentes. Deseja realmente ${action}?`)}
function opRecord(kind,units,extra={}){state.unitOperations.push({kind,date:new Date().toISOString(),units:units.map(u=>u.id),...extra});state.unitOperations=state.unitOperations.slice(-150)}
// Cristais Nova - a fonte canônica fica no schema de cada conta, sincronizada no Drive.
const NOVA_REWARDS=Object.freeze({20:5,21:10,22:15,23:20,24:25,25:40,26:50,27:60,28:70,29:80,30:120,31:140,32:160,33:180,34:200,35:300,36:300,37:300,38:300,39:300,40:300});
const NOVA_OLD_PREFIX='droidTycoon_novaLedger_v1_';
function cleanNovaLedger(raw){
 const opening=Number.isSafeInteger(raw?.opening)&&raw.opening>=0?raw.opening:null;
 const seen=new Set(),rows=[];
 if(Array.isArray(raw?.rows))for(const r of raw.rows.slice(0,10000)){
  if(!r||typeof r.id!=='string'||!r.id||r.id.length>150||seen.has(r.id)||!['in','out'].includes(r.type)||!Number.isSafeInteger(r.amount)||r.amount<=0)continue;
  seen.add(r.id);rows.push({id:r.id,type:r.type,amount:r.amount,note:String(r.note||'').slice(0,160),date:typeof r.date==='string'?r.date.slice(0,40):'',source:String(r.source||'manual').slice(0,30),path:Number.isInteger(r.path)?r.path:null,cycle:Number.isInteger(r.cycle)?r.cycle:null});
 }
 return {opening,rows};
}
function novaBalance(ledger){return (ledger.opening||0)+ledger.rows.reduce((sum,r)=>sum+(r.type==='in'?r.amount:-r.amount),0)}
function ensureNova(){if(state.novaLedger.opening===null)state.novaLedger.opening=Number.isSafeInteger(state.finance.nova)?state.finance.nova:0;state.finance.nova=novaBalance(state.novaLedger)}
function novaAppend(type,amount,note,source='manual',id='nova-'+newId(),path=null,cycle=null){
 if(!Number.isSafeInteger(amount)||amount<=0)throw Error('Informe uma quantidade inteira positiva.');
 ensureNova();if(state.novaLedger.rows.some(r=>r.id===id))return false;
 if(type==='out'&&amount>novaBalance(state.novaLedger))throw Error('Saldo insuficiente de Cristais Nova.');
 if(state.novaLedger.rows.length>=9999)throw Error('Histórico Nova atingiu o limite. Exporte um backup antes de continuar.');
 state.novaLedger.rows.push({id,type,amount,note,date:new Date().toISOString(),source,path,cycle});
 state.finance.nova=novaBalance(state.novaLedger);return true;
}
function importLegacyNova(){
 let changed=false;
 for(const acct of accountsDb.accounts){
  const original=acct.data.novaLedger;
  let raw=null;try{raw=JSON.parse(localStorage.getItem(NOVA_OLD_PREFIX+encodeURIComponent(acct.id))||'null')}catch(e){}
  if(!raw||!Array.isArray(raw.rows))continue;
  if(original.opening!==null||original.rows.length)continue; // nunca substituir histórico já sincronizado
  const migrated=cleanNovaLedger(raw);if(migrated.opening===null)continue;
  if(novaBalance(migrated)<0)continue;
  acct.data.novaLedger=migrated;acct.data.finance.nova=novaBalance(migrated);changed=true;
 }
 if(changed){state=currentAccount().data;writeAccounts()}
}
function novaPanel(){
 const ledger=state.novaLedger, balance=ledger.opening===null?(state.finance.nova??0):novaBalance(ledger);
 const rows=ledger.rows.slice(-150).reverse().map(r=>`<div class="nova-inline-row"><div><b>${h(r.note||'Movimentação')}</b><small>${h(r.date.slice(0,10))} · ${h(r.source==='rebirth'?'Rebirth automático':r.source==='scanner'?'Scanner':'Manual')}</small></div><strong style="color:${r.type==='in'?'#72e6ad':'#ff8aa5'}">${r.type==='in'?'+':'−'}${nf(r.amount)}</strong></div>`).join('');
 return `<section id="nova-wallet" class="card card-pad nova-inline-card"><div class="wizard-path-title"><div><h2>💎 Meus Cristais Nova</h2><p class="mini-note">Conta: ${h(currentAccount().name)} · Histórico integrado ao backup do Google Drive</p></div><img src="cristal-nova.png" style="height:64px;width:64px;object-fit:contain" alt="Cristal Nova"></div><div class="nova-inline-balance"><small>SALDO DISPONÍVEL</small><strong>${nf(balance)}</strong></div><p class="mini-note">Rebirths 20–40: recompensas creditadas ao confirmar a conclusão. Super Renascimento: registre o ganho efetivo manualmente, separadamente.</p><form id="nova-wallet-form"><label>Movimentação<select class="select" name="type"><option value="in">Ganhei</option><option value="out">Gastei</option></select></label><label>Quantidade<input class="input" type="number" name="amount" min="1" step="1" required></label><label>Motivo<input class="input" type="text" name="note" maxlength="160" placeholder="Evento, compra, Super Renascimento..."></label><button type="submit" class="btn">Registrar cristais</button></form><details class="nova-inline-history"><summary>Histórico (${ledger.rows.length} movimentações)</summary>${rows||'<p class="mini-note">Nenhuma movimentação registrada.</p>'}</details></section>`;
}
window.DroidNovaRewards=NOVA_REWARDS;
const empty=()=>({schema:1,path:0,cycle:1,inventory:{},absent:{},sales:[],removals:[],history:[],completed:[],fusions:{plans:{},history:[],genericPlans:[],genericHistory:[],prices:{}},units:[],unitArchive:[],unitOperations:[],finance:{nova:null,credits:null,budget:null},financeLedger:[],novaLedger:{opening:null,rows:[]},lastModified:Date.now()});
function sanitize(raw){if(!raw||typeof raw!=='object'||raw.schema!==1)throw new Error('Arquivo incompatível ou sem dados válidos.');
 const x=empty();x.path=Number(raw.path)||0;if(!Number.isInteger(x.path)||x.path<0||x.path>6)throw new Error('Caminho inválido.');
 x.cycle=Number(raw.cycle)||1;if(!Number.isInteger(x.cycle)||x.cycle<1||x.cycle>40)throw new Error('Ciclo inválido.');
 if(raw.inventory&&typeof raw.inventory==='object')for(const [n,ts]of Object.entries(raw.inventory)){if(!validName(n)||!ts||typeof ts!=='object')continue;for(const [t,q]of Object.entries(ts)){if(!validTier(n,t)||!Number.isSafeInteger(q)||q<1||q>100000)continue;(x.inventory[n]??={})[t]=q}}
 if(raw.absent&&typeof raw.absent==='object')for(const [n,v]of Object.entries(raw.absent))if(validName(n)&&v===true&&!x.inventory[n])x.absent[n]=true;
 for(const [k,max]of [['sales',30],['history',30],['completed',40],['removals',100]]) if(Array.isArray(raw[k]))x[k]=raw[k].filter(a=>a&&typeof a==='object').slice(-max).map(a=>JSON.parse(JSON.stringify(a))).filter(a=>JSON.stringify(a).length<25000);
 x.fusions=cleanFusion(raw.fusions);
 x.units=normalizeUnits(raw.units,x.inventory);
 x.unitArchive=Array.isArray(raw.unitArchive)?raw.unitArchive.filter(x=>x&&typeof x==='object'&&validName(x.name)&&validTier(x.name,x.tier)).slice(-350).map(x=>JSON.parse(JSON.stringify(x))):[];
 x.unitOperations=Array.isArray(raw.unitOperations)?raw.unitOperations.filter(x=>x&&typeof x==='object').slice(-150).map(x=>JSON.parse(JSON.stringify(x))):[];
 const f=raw.finance||{};for(const k of ['nova','credits','budget'])x.finance[k]=(f[k]===null||f[k]===undefined||f[k]==='')?null:(Number.isFinite(Number(f[k]))&&Number(f[k])>=0?Number(f[k]):null);
 x.financeLedger=Array.isArray(raw.financeLedger)?raw.financeLedger.filter(x=>x&&typeof x==='object').slice(-200):[];
 x.novaLedger=cleanNovaLedger(raw.novaLedger); if(x.novaLedger.opening!==null)x.finance.nova=novaBalance(x.novaLedger);
 x.lastModified=Number(raw.lastModified)||Date.now();return x;
}
// O armazenamento v1 NÃO é apagado. Na primeira abertura, é copiado para a conta inicial.
function readLegacy(){try{const raw=localStorage.getItem(STORE);return raw?sanitize(JSON.parse(raw)):empty()}catch(e){return empty()}}
function sanitizeNotices(raw){if(!raw||typeof raw!=='object'||Array.isArray(raw))return {};return Object.fromEntries(Object.entries(raw).filter(([key,x])=>x&&typeof x==='object'&&validName(x.name)&&validTier(x.name,x.tier)&&Number.isSafeInteger(x.qty)&&x.qty>0).slice(0,100));}
function readLegacyNotices(){try{return sanitizeNotices(JSON.parse(localStorage.getItem(NOTICE_KEY)||'{}'))}catch(e){return {}}}
function newId(){return 'conta-'+(typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));}
function validAccountName(name){const value=String(name||'').trim();return value.length>=1&&value.length<=40&&!/[\u0000-\u001F\u007F]/.test(value)?value:null}
function nameAvailable(name,excluding=''){return !accountsDb.accounts.some(a=>a.id!==excluding&&a.name.toLocaleLowerCase('pt-BR')===name.toLocaleLowerCase('pt-BR'))}
function sanitizeAccounts(raw){
 if(!raw||raw.schema!==2||!Array.isArray(raw.accounts)||!raw.accounts.length)throw new Error('Backup de contas incompatível.');
 const ids=new Set(),names=new Set();
 const a=raw.accounts.map(row=>{
  const id=typeof row.id==='string'&&row.id.length>0&&row.id.length<=100?row.id:null;
  const name=validAccountName(row.name);
  if(!id||ids.has(id)||!name||names.has(name.toLocaleLowerCase('pt-BR')))throw new Error('Contas com nomes ou identificadores inválidos.');
  ids.add(id);names.add(name.toLocaleLowerCase('pt-BR'));
  return {id,name,data:sanitize(row.data),notices:sanitizeNotices(row.notices)};
 });
 return {schema:2,activeId:a.some(x=>x.id===raw.activeId)?raw.activeId:a[0].id,accounts:a,
  customTraits:Array.isArray(raw.customTraits)?raw.customTraits.filter(x=>x&&typeof x.name==='string'&&x.name.trim()&&x.name.length<=100).slice(0,80).map(x=>({id:String(x.id||''),name:String(x.name).trim()})):[]};
}
function loadAccounts(){
 const old=localStorage.getItem(ACCOUNTS_KEY);
 if(old!==null){
  const parsed=JSON.parse(old);
  const needsMigration=parsed?.schema===2&&parsed.accounts?.some(a=>!Array.isArray(a?.data?.units));
  if(needsMigration&&!localStorage.getItem(PRE_TRAITS_BACKUP))localStorage.setItem(PRE_TRAITS_BACKUP,old);
  return sanitizeAccounts(parsed);
 }
 const initial={schema:2,activeId:newId(),accounts:[],customTraits:[]};
 initial.accounts.push({id:initial.activeId,name:'Minha conta',data:readLegacy(),notices:readLegacyNotices()});
 // Falha de gravação bloqueia alterações para evitar falsa sensação de segurança.
 localStorage.setItem(ACCOUNTS_KEY,JSON.stringify(initial));
 return initial;
}
let accountsDb=null,storageError='';
try{accountsDb=loadAccounts()}catch(e){storageError=e.message||'Armazenamento indisponível.';accountsDb={schema:2,activeId:'bloqueada',accounts:[{id:'bloqueada',name:'Recuperação',data:readLegacy(),notices:{}}]}}
function currentAccount(){return accountsDb.accounts.find(a=>a.id===accountsDb.activeId)||accountsDb.accounts[0]}
let state=currentAccount().data,unreadNotices=currentAccount().notices;
if(!storageError)importLegacyNova();
let ui={tab:'inventory',open:new Set(['pending']),baseAccordionKey:'',search:'',pathFilter:0,detail:'',detailTier:'',browsePath:1,browseCycle:1,simPath:1,simCycle:1,simReady:false,globalSearchOpen:false,globalSearch:'',catalogSearch:'',catalogRarity:'Todos',catalogAll:false,batch:{},batchMode:true,setupPath:1,setupCycle:1,setupRegister:true,pathSearch:'',pathChecklistFilter:'Todos',pathBatch:{},pathDraft:{},fusionFilter:'Todas',fusionSearch:'',fusionOpen:'',fusionDraft:{},inventorySearch:'',inventoryScope:'mine',inventoryFilter:'Todos',fusionIdeaFilter:'Todas',fusionIdeaExpanded:false,catalogVisible:false,lastQuickSale:false,guideSearch:'',guideOnlyFavorites:false,modal:null},undo=null,toastTimer=null;
function saveAccountsBlob(){
 if(storageError){notify('Salvamento bloqueado: '+storageError);return false}
 try{localStorage.setItem(ACCOUNTS_KEY,JSON.stringify(accountsDb));window.DroidDrive?.noteLocalChange();return true}
 catch(e){notify('Não foi possível salvar as contas. Exporte seu backup e libere espaço no navegador.');return false}
}
function writeAccounts(){const a=currentAccount();a.data=state;a.notices=unreadNotices;return saveAccountsBlob()}
function storeNotices(){writeAccounts()}
function activateAccount(id){
 const next=accountsDb.accounts.find(a=>a.id===id);if(!next||id===accountsDb.activeId)return;
 if(!writeAccounts())return;
 const previous=accountsDb.activeId;accountsDb.activeId=id;
 if(!saveAccountsBlob()){accountsDb.activeId=previous;return}
 state=next.data;unreadNotices=next.notices;
 undo=null;ui.modal=null;ui.detail='';ui.detailTier='';ui.batch={};ui.pathBatch={};ui.pathDraft={};ui.pathSearch='';ui.pathChecklistFilter='Todos';ui.fusionFilter='Todas';ui.fusionSearch='';ui.fusionOpen='';ui.fusionDraft={};ui.catalogVisible=false;ui.lastQuickSale=false;ui.baseAccordionKey='';
 render();notify('Conta ativa: '+next.name);
}
function resetAccountView(){state=currentAccount().data;unreadNotices=currentAccount().notices;undo=null;ui.modal=null;ui.detail='';ui.detailTier='';ui.batch={};ui.pathBatch={};ui.pathDraft={};ui.pathSearch='';ui.pathChecklistFilter='Todos';ui.fusionFilter='Todas';ui.fusionSearch='';ui.fusionOpen='';ui.fusionDraft={};ui.catalogVisible=false;ui.lastQuickSale=false;ui.baseAccordionKey='';ui.simReady=false;closeGlobalSearch();}
function accountHeader(){
 const el=document.getElementById('account-select');if(!el)return;
 el.innerHTML=accountsDb.accounts.map(a=>`<option value="${h(a.id)}" ${a.id===accountsDb.activeId?'selected':''}>${h(a.name)}</option>`).join('');
 el.title='Conta ativa: '+currentAccount().name;
}
function saveUndoSnapshot(){try{localStorage.setItem(ACCOUNTS_UNDO,JSON.stringify(accountsDb));return true}catch(e){notify('Não foi possível salvar a cópia de segurança. Restauração cancelada.');return false}}
function restoreAccountsSnapshot(){
 try{
  const prev=sanitizeAccounts(JSON.parse(localStorage.getItem(ACCOUNTS_UNDO)));
  const now=JSON.stringify(accountsDb);
  localStorage.setItem(ACCOUNTS_KEY,JSON.stringify(prev));
  localStorage.setItem(ACCOUNTS_UNDO,now);
  accountsDb=prev;resetAccountView();render();notify('Contas anteriores restauradas.');
 }catch(e){notify('Não foi possível desfazer a restauração.');}
}
function undoLastOperation(){
 const k=OP_UNDO_KEY+currentAccount().id;
 try{
  const entry=JSON.parse(localStorage.getItem(k)||'null');
  if(!entry?.before)return notify('Nenhuma movimentação anterior para recuperar.');
  if(Number(entry.after)!==Number(state.lastModified))return notify('Houve alterações depois da movimentação. Exporte o backup e revise antes de restaurar manualmente.');
  if(!window.confirm('Desfazer a última alteração desta conta? As alterações registradas depois dela não serão preservadas.'))return;
  const previous=sanitize(JSON.parse(entry.before));
  // Guardar um registro da correção para auditoria, preservando o estado anterior.
  previous.unitOperations.push({kind:'correção — última operação desfeita',date:new Date().toISOString(),units:[]});
  previous.unitOperations=previous.unitOperations.slice(-150);
  state=previous;unreadNotices=JSON.parse(entry.notices||'{}');
  if(!persist())throw new Error('Falha na gravação da reversão.');
  localStorage.removeItem(k);render();notify('Última movimentação recuperada com sucesso.');
 }catch(e){notify('Não foi possível desfazer: '+e.message)}
}
function salesMap(){return new Map(requireCounts().saleEntries.map(x=>[nextId(x.name,x.tier),x.qty]))}
function reconcileNotices(before){const after=salesMap();for(const [key,v] of Object.entries(unreadNotices)){const left=after.get(key)||0;if(left<=0)delete unreadNotices[key];else v.qty=Math.min(v.qty,left)}
 for(const e of requireCounts().saleEntries){const k=nextId(e.name,e.tier),newly=e.qty-(before.get(k)||0);if(newly>0)unreadNotices[k]={name:e.name,tier:e.tier,qty:Math.min(e.qty,(unreadNotices[k]?.qty||0)+newly),createdAt:new Date().toISOString()}}
 storeNotices();}
function listNewSales(){const available=salesMap();return Object.values(unreadNotices).filter(x=>available.has(nextId(x.name,x.tier))).map(x=>({...x,qty:Math.min(x.qty,available.get(nextId(x.name,x.tier)))})).filter(x=>x.qty>0)}
const app=document.getElementById('app');
function persist(){requireCountsCache=null;state.lastModified=Math.max(Date.now(),Number(state.lastModified||0)+1);return writeAccounts()}
function notify(message,withUndo=false){const el=document.getElementById('toast');el.innerHTML=h(message)+(withUndo?` <button type="button" data-action="undo">Desfazer</button>`:'');el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),5700)}
function save(mutator,message){
 ui.lastQuickSale=false;const before=JSON.stringify(state),oldNotices=JSON.stringify(unreadNotices),oldSales=salesMap();
 try{mutator();if(!persist())throw new Error('Falha ao salvar.');reconcileNotices(oldSales);
  try{localStorage.setItem(OP_UNDO_KEY+currentAccount().id,JSON.stringify({before,after:state.lastModified,notices:oldNotices,savedAt:new Date().toISOString()}))}catch(err){}
 }
 catch(err){state=sanitize(JSON.parse(before));unreadNotices=JSON.parse(oldNotices);requireCountsCache=null;render();notify('Alteração cancelada: '+err.message);return false}
 undo=()=>{state=sanitize(JSON.parse(before));unreadNotices=JSON.parse(oldNotices);persist();storeNotices();render();notify('Alteração desfeita.')};render();if(message)notify(message,!!undo);return true;
}
const reqFor=(name,path=state.path,from=state.cycle)=>R.filter(x=>x.name===name&&x.p===path&&x.c>=from).sort((a,b)=>a.c-b.c);
const needAt=(name,p,c)=>pick(p,c).filter(x=>x.name===name);
function countOwned(name){return Object.values(state.inventory[name]||{}).reduce((s,n)=>s+n,0)}
function anyOwned(name){return countOwned(name)>0}
const isIconic=name=>byName[name]?.rarity==='Iconic';
const iconicLimitMessage=name=>`${name} é Icônico: é permitido cadastrar somente 1 unidade deste droid por conta.`;
const canRegister=(name,qty=1)=>!isIconic(name)||countOwned(name)+qty<=1;

function best(name){const entries=Object.keys(state.inventory[name]||{});return entries.sort((a,b)=>rank(b)-rank(a))[0]||null}
function meets(name,tier){return Object.entries(state.inventory[name]||{}).reduce((s,[t,q])=>s+(rank(t)>=rank(tier)?q:0),0)}
function chips(name,from,to){const r=byName[name]?.rarity, costs=DB.costs[r];if(from==='Scourge'||to==='Scourge')return null; if(!costs||!UPGRADE_TIERS.includes(from)||!UPGRADE_TIERS.includes(to)||rank(from)>=rank(to))return 0;return costs.slice(rank(from)+1,rank(to)+1).reduce((s,n)=>s+n,0)}
// Proteção disjunta: a mesma unidade não pode atender ao mesmo tempo uma reserva de fusão e a progressão.
function fusionPlanNeeds(skip=''){
 const map={};for(const [id,p] of Object.entries(state.fusions.plans)){
  if(id===skip||!FUSION_BY_ID[id])continue;
  FUSION_BY_ID[id].parts.forEach((name,i)=>{const tier=p.tiers[i],key=nextId(name,tier);map[key]=(map[key]||0)+1});
 }
 for(const plan of state.fusions.genericPlans||[]){
  if('g:'+plan.id===skip)continue;
  for(const part of plan.parts){const key=nextId(part.name,part.tier);map[key]=(map[key]||0)+1;}
 }
 return map;
}
// Um droid pode servir em vários ciclos; suas unidades não são consumidas entre ciclos.
// Calculamos a quantidade máxima de requisitos que as unidades atuais conseguem satisfazer
// em CADA ciclo futuro. Só é excedente o que pode sair sem reduzir essa cobertura.
// Um exemplar de variante inferior também pode cumprir um requisito futuro APÓS evoluir.
// A cobertura potencial protege o droid para evolução; NÃO marca o ciclo como concluído.
// Droids de ciclos diferentes são reutilizados, então contamos cada ciclo em separado.
function futureCycleCoverage(name,remaining){
 if(!state.path)return [];
 const total=Object.values(remaining).reduce((sum,qty)=>sum+Math.max(0,qty||0),0);
 const byCycle=new Map();
 for(const r of reqFor(name))byCycle.set(r.c,(byCycle.get(r.c)||0)+1);
 return [...byCycle.values()].map(required=>Math.min(total,required));
}
// Planejamento conservador de evolução: obtém o pico de demanda por limiar de
// variante, sem somar ciclos distintos; atribui primeiro o melhor droid disponível
// a cada requisito mais exigente. Retorna separadamente evoluções e novos droids.
function futureEvolutionPlan(name,owned){
 if(!state.path)return {upgrades:[],missing:[]};
 const requests=reqFor(name);
 if(!requests.length)return {upgrades:[],missing:[]};
 const levels=byName[name]?.rarity==='Iconic'?['Única']:T;
 const byCycle=new Map();
 for(const r of requests){if(!byCycle.has(r.c))byCycle.set(r.c,[]);byCycle.get(r.c).push(r.tier)}
 const peaks=levels.map((tier,i)=>Math.max(...[...byCycle.values()].map(reqs=>reqs.filter(t=>levels.indexOf(t)>=i).length)));
 const stock=levels.map(tier=>({tier,qty:Math.max(0,owned[tier]||0)}));
 const upgrades=[],missing=[];
 for(let i=levels.length-1;i>=0;i--){
  const target=levels[i],demand=peaks[i]-(peaks[i+1]||0);
  const firstCycle=requests.find(r=>r.tier===target)?.c||requests[0].c;
  for(let j=0;j<demand;j++){
   // Maior variante suficiente é desnecessária quando outra menor já atende.
   let available=stock.findIndex((x,k)=>k>=i&&x.qty>0);
   if(available<0){for(let k=i-1;k>=0;k--)if(stock[k].qty>0){available=k;break}}
   if(available<0){const last=missing.find(x=>x.tier===target);if(last)last.qty++;else missing.push({tier:target,qty:1,cycles:[firstCycle]});continue}
   stock[available].qty--;
   if(available<i){const from=levels[available],last=upgrades.find(x=>x.from===from&&x.to===target);if(last)last.qty++;else upgrades.push({from,to:target,qty:1,cycle:firstCycle});}
  }
 }
 return {upgrades,missing};
}
let requireCountsCache=null;
function requireCounts(){
 if(requireCountsCache)return requireCountsCache;
 const protectedEntries=[],saleEntries=[],reserved=fusionPlanNeeds();
 const owned=arrInventory(state),groups=new Map();
 for(const row of owned){if(!groups.has(row.name))groups.set(row.name,[]);groups.get(row.name).push(row)}
 for(const [name,rows] of groups){
   if(isIconic(name)){for(const row of rows)protectedEntries.push({...row,qty:row.qty,fusionQty:0,pathQty:row.qty,current:false,requirements:reqFor(name),upgrades:[],upgradeQty:0});continue;} // icônicos nunca vendáveis
  const remainder={},fixed={};
  for(const row of rows){
   const fusion=Math.min(row.qty,reserved[nextId(name,row.tier)]||0);
   fixed[row.tier]=fusion;remainder[row.tier]=row.qty-fusion;
  }
  const baseline=state.path?futureCycleCoverage(name,remainder):[];
  const keepStart=protectedEntries.length;
  // Vende primeiro as variantes inferiores; protege todas as unidades que
  // possam ser evoluídas para cobrir exigências futuras ainda descobertas.
  for(const row of [...rows].sort((a,b)=>rank(a.tier)-rank(b.tier))){
   const tier=row.tier,free=remainder[tier];let sell=0;
   if(state.path){
    let low=0,high=free;
    while(low<high){
     const mid=Math.ceil((low+high)/2);
     remainder[tier]=free-mid;
     const after=futureCycleCoverage(name,remainder);
     if(after.every((x,i)=>x===baseline[i]))low=mid;else high=mid-1;
    }
    sell=low;
   }
   remainder[tier]=free-sell;
   const fusionQty=fixed[tier]||0,pathQty=free-sell,kept=fusionQty+pathQty;
   if(kept)protectedEntries.push({...row,qty:kept,fusionQty,pathQty,current:!!state.path&&needAt(name,state.path,state.cycle).length>0,requirements:reqFor(name)});
   if(sell)saleEntries.push({...row,qty:sell});
  }
  // Somente as unidades não reservadas para fusões entram no plano de evolução.
  const plan=futureEvolutionPlan(name,remainder);
  for(const kept of protectedEntries.slice(keepStart)){
   kept.upgrades=plan.upgrades.filter(x=>x.from===kept.tier);
   kept.upgradeQty=kept.upgrades.reduce((n,x)=>n+x.qty,0);
  }
 }
 return (requireCountsCache={protectedEntries,saleEntries});
}
function pendings(){return pick(state.path,state.cycle).filter(r=>meets(r.name,r.tier)<needAt(r.name,state.path,state.cycle).length)}
function stageBuckets(){const confirmed=[],unknown=[],fulfilled=[];for(const r of pick(state.path,state.cycle)){if(meets(r.name,r.tier)>=needAt(r.name,state.path,state.cycle).length)fulfilled.push(r);else if(anyOwned(r.name)||state.absent[r.name]===true)confirmed.push(r);else unknown.push(r)}return {confirmed,unknown,fulfilled}}
function calcRowCounts(name,tier){const a=requireCounts();return {keep:a.protectedEntries.find(x=>x.name===name&&x.tier===tier)?.qty||0,sell:a.saleEntries.find(x=>x.name===name&&x.tier===tier)?.qty||0}}
function panelButton(name,tier='',cls='droid-open'){return `data-action="detail" data-name="${h(name)}" data-tier="${h(tier)}" class="${cls}"`}
function mark(k){return k==='danger'?'red':k==='success'?'green':k==='warning'?'yellow':k==='blue'?'blue':'gray'}
const badge=(text,color='muted')=>`<span class="badge ${mark(color)}">${h(text)}</span>`;
function btn(label,action,opt={}){return `<button type="button" class="btn ${opt.kind||''} ${opt.size||''}" data-action="${h(action)}" ${opt.attrs||''}>${label}</button>`}
const selects=(vals,selected='')=>vals.map(v=>`<option value="${h(v.value??v)}" ${String(v.value??v)===String(selected)?'selected':''}>${h(v.label??v)}</option>`).join('');
const tierSelect=(selected,iconic=false,name='tier',attrs='')=>`<select class="select variant-select" data-variant="${h(selected)}" name="${name}" ${attrs}>${selects((iconic?['Única']:T).map(value=>({value,label:variantLabel(value)})),selected)}</select>`;
function titlePage(k,title,desc,actions=''){return `<div class="page-heading"><div><div class="kicker">${h(k)}</div><h1>${h(title)}</h1><p class="subtitle">${h(desc)}</p></div>${actions?`<div class="page-actions">${actions}</div>`:''}</div>`}
function setTab(tab){
 if(tab==='search'){openGlobalSearch();return;}
 if(!['inventory','dashboard','simulator','traits','fusion','pathlist','settings'].includes(tab))return;
 const before=ui.tab;
 if(tab==='simulator'&&!ui.simReady){ui.simPath=state.path||1;ui.simCycle=state.cycle||1;ui.simReady=true;}
 ui.tab=tab==='pathlist'&&!state.path?'dashboard':tab;
 if(ui.tab==='inventory'&&before!=='inventory')ui.baseAccordionKey='';
 if(ui.tab==='dashboard'&&before!=='dashboard')ui.open=new Set(['pending']);
 ui.modal=null;ui.detail='';closeGlobalSearch();render();
 window.scrollTo({top:0,behavior:'auto'});
}
function section(id,symbol,title,desc,count,body){const opened=ui.open.has(id);return `<section id="${h(id)}" class="card section ${id==='basemissing'?'base-missing-section':''} ${id==='fusionideas'?'base-fusion-accordion':''}"><button type="button" class="section-toggle" data-action="expand" data-id="${h(id)}" aria-expanded="${opened}" aria-controls="panel-${h(id)}"><span class="section-icon">${symbol}</span><span class="section-title-wrap"><span class="section-title">${h(title)}</span><span class="section-caption" style="display:block">${h(desc)}</span></span><span class="counter">${h(count)}</span><span class="chevron">${opened?'⌃':'⌄'}</span></button>${opened?`<div id="panel-${h(id)}" class="section-body">${body}</div>`:''}</section>`}
function statusText(entry,kept){if(!kept)return badge('Pode Vender','success');if(entry.current)return badge('Necessário agora','danger');const future=entry.requirements[0];return badge(`Precisa no Ciclo ${future.c} — Variante ${variantLabel(future.tier)}`,'warning')}
function entryInventory(e,baseQuickSale=false){
 const split=calcRowCounts(e.name,e.tier),needed=reqFor(e.name),now=needAt(e.name,state.path,state.cycle).length>0;
 const later=needed.filter(x=>x.c>state.cycle),nextCycle=later[0],future=nextCycle?`Precisa no Ciclo ${nextCycle.c} — Variante ${variantLabel(nextCycle.tier)}`:'';
 // Destaque visual só para o aviso de ciclo futuro; o nome da variante permanece legível.
 const futureHtml=nextCycle?`<strong class="future-cycle-emphasis">Precisa no Ciclo <span class="future-cycle-number">${h(nextCycle.c)}</span></strong><span class="future-variant-text"> — Variante ${variantText(nextCycle.tier)}</span>`:'';
 const fusionReserved=requireCounts().protectedEntries.find(x=>x.name===e.name&&x.tier===e.tier)?.fusionQty||0;
 const keptRow=requireCounts().protectedEntries.find(x=>x.name===e.name&&x.tier===e.tier);
 const upgrade=keptRow?.upgrades?.[0];
 const upgradeText=upgrade?`<strong class="evolution-keep">Guardar para evoluir ${nf(keptRow.upgradeQty)}×</strong> · ${variantText(e.tier)} → ${variantText(upgrade.to)} · Ciclo <b>${upgrade.cycle}</b>`:'';
 const status=split.keep?(now?'Necessário agora':future||'Reservado para fusão / guardar'):'Pode Vender';
 const statusHtml=upgradeText ? upgradeText : (split.keep&&!now&&nextCycle ? futureHtml : h(status));
 // A ação de venda fica FORA do botão que abre detalhes: evita dois cliques concorrentes.
 const sellQuick=baseQuickSale?`<div class="base-quick-actions"><button type="button" class="base-sell-one" data-action="sellOne" data-name="${h(e.name)}" data-tier="${h(e.tier)}" title="Registrar a venda de 1 unidade no jogo e atualizar a base imediatamente" aria-label="Registrar venda de 1 unidade de ${h(e.name)} ${h(variantLabel(e.tier))}">Registrar venda</button>${fusionReserved?'<small class="base-risk" title="Há reserva ativa para fusão">⚗ Reservado para fusão</small>':upgrade?'<small class="base-risk" title="Esta variante será necessária para evoluir">⚠ Guardar para evoluir</small>':split.keep?'<small class="base-risk" title="Pode ser necessário no seu caminho">⚠ Necessário no caminho</small>':''}</div>`:'';
 return `<div class="entry droid-entry ${baseQuickSale?'base-owned-row':''}"><button type="button" ${panelButton(e.name,e.tier)}>${imageOf(e.name,false,e.tier)}<span class="droid-info"><span class="droid-heading">${h(e.name)} ${unitsFor(e.name,e.tier).some(u=>u.favorite)?'<span class="unit-fav-icon" title="Favorito">★</span>':''} ${rarityTag(byName[e.name]?.rarity)} ${variantBadge(e.tier)}</span><span class="entry-sub">${nf(e.qty)} unidade(s) · ${statusHtml}</span>${split.keep&&now&&future?`<span class="entry-sub future-line">${futureHtml}</span>`:''}<span class="quantities">${split.keep?`<span class="keep-label">Guardar ${split.keep}</span>`:''}${fusionReserved?`<span class="fusion-keep-label">Fusão ${fusionReserved}</span>`:''}${split.sell?`<span class="sell-label">Pode Vender ${split.sell}</span>`:''}${FUSION_INGREDIENTS[e.name]?.length?`<span class="fusion-keep-label">⚗ Fusão especial · ${FUSION_INGREDIENTS[e.name].length}</span>`:''}</span></span>${!baseQuickSale?'<span class="entry-arrow">›</span>':''}</button>${sellQuick}</div>`;
}
function requirementRow(r){const count=meets(r.name,r.tier),currBest=best(r.name),owned=anyOwned(r.name),isAbsent=state.absent[r.name]===true,good=count>=needAt(r.name,state.path,state.cycle).length;
 let info=good?`Requisito ${variantText(r.tier)} atendido`:owned?`Necessário ${variantText(r.tier)} — Possui ${variantText(currBest)}`:`Necessário ${variantText(r.tier)} — ${isAbsent?'Não possui':'Não cadastrado'}`;
 const exp=owned&&currBest&&rank(currBest)<rank(r.tier)?`<div class="entry-sub">Chips para evoluir: <strong class="chip-highlight">${nf(chips(r.name,currBest,r.tier))}</strong></div>`:'';
 const actions=good?'':owned?btn('Evoluí','evolve',{kind:'secondary',size:'small',attrs:`data-name="${h(r.name)}" data-tier="${h(currBest)}" ${['Kyber','Scourge'].includes(currBest)?'disabled':''}`}):`${btn('Consegui','add',{kind:'outline-green',size:'small',attrs:`data-name="${h(r.name)}"`})}${isAbsent?btn('Desmarcar','unabsent',{kind:'ghost',size:'small',attrs:`data-name="${h(r.name)}"`}):btn('Não possuo','absent',{kind:'ghost',size:'small',attrs:`data-name="${h(r.name)}"`})}`;
 return `<div class="entry requirement-entry ${good?'':'needed-now'}"><div class="entry-main"><button type="button" ${panelButton(r.name)}>${imageOf(r.name,false,r.tier)}<span class="droid-info"><span class="droid-heading">${h(r.name)} ${rarityTag(byName[r.name]?.rarity)}</span><span class="entry-sub">${info}</span>${exp}</span></button></div><div class="entry-actions">${actions}</div></div>`;
}
function getStats(){const inv=arrInventory(state),anal=requireCounts(),b=stageBuckets();return {inventory:inv,anal,total:inv.reduce((a,x)=>a+x.qty,0),pending:b.confirmed.length,unknown:b.unknown.length,fulfilled:b.fulfilled.length,protected:anal.protectedEntries.reduce((a,x)=>a+x.qty,0),sale:anal.saleEntries.reduce((a,x)=>a+x.qty,0),buckets:b}}
function dashboard(){if(!state.path)return setup();const stat=getStats(),required=pick(state.path,state.cycle),credits=required[0]?.credits||'—',recent=listNewSales();
 const ready=stat.pending===0&&stat.unknown===0,cycleMessage=stat.pending?'Possui pendências':stat.unknown?'Aguardando conferência':'Ciclo pronto!';
 const heading=titlePage('MEU CAMINHO',`Caminho ${state.path} · Ciclo ${state.cycle}`,'Pendências primeiro. Depois, veja o que já pode vender.',`${btn('Lista completa do caminho','openpathlist',{kind:'secondary'})}${btn('Mudar ciclo','cycle',{kind:'secondary'})}${btn('+ Droid','addpick')}`);
 const finished=state.completed.some(c=>c.path===state.path&&c.cycle===40);
 const prog=`<div class="card hero hero-v2"><div><div class="kicker">${finished?'CAMINHO CONCLUÍDO':'PROGRESSÃO'} · CICLO ${state.cycle}/40</div><h2>${finished?'Caminho concluído!':cycleMessage}</h2><p>${stat.pending?`${stat.pending} pendência(s) confirmada(s). `:''}${stat.unknown?`${stat.unknown} droid(s) para conferir. `:''}${ready?'Os requisitos estão confirmados no inventário. ':''}Créditos exigidos: ${h(credits)}.</p>${finished?btn('Iniciar outro caminho','changePath'):btn(state.cycle===40?'Concluir caminho':'Concluí o Ciclo','advance')}</div></div>`;
 const stats=`<div class="stats stats-v2"><div class="card stat"><div class="stat-label">Pendências</div><div class="stat-value ${stat.pending?'yellow':'green'}">${stat.pending}</div><div class="stat-note">Ausentes ou insuficientes</div></div><div class="card stat"><div class="stat-label">Conferir</div><div class="stat-value">${stat.unknown}</div><div class="stat-note">Ainda não cadastrados</div></div><div class="card stat"><div class="stat-label">Pode vender</div><div class="stat-value green">${stat.sale}</div><div class="stat-note">Unidades excedentes</div></div></div>`;
 const b=stat.buckets;
 const groups=`${b.confirmed.length?`<div class="group-caption warn">Pendências confirmadas · ${b.confirmed.length}</div>${b.confirmed.map(requirementRow).join('')}`:''}${b.unknown.length?`<div class="group-caption">Ainda precisa conferir · ${b.unknown.length}</div>${b.unknown.map(requirementRow).join('')}`:''}${!b.confirmed.length&&!b.unknown.length?`<div class="success-state">✓ Todos os requisitos deste ciclo foram confirmados.</div>`:''}`;
 const pendingSection=section('pending','◎','Pendências do Ciclo',`${stat.pending} pendência(s) · ${stat.unknown} para conferir`,stat.pending+stat.unknown,groups);
 const newBlock=recent.length?`<div class="new-sales-note"><div class="notice-header"><b>✧ ${recent.reduce((a,x)=>a+x.qty,0)} unidade(s) recém-liberada(s)</b>${btn('Marcar como lido','readSales',{kind:'ghost',size:'small'})}</div>${recent.map(x=>`<div class="notice-row">${h(x.name)} · ${variantText(x.tier)} <span>${x.qty} nova(s)</span></div>`).join('')}</div>`:'';
 const sellSection=section('sell','↗','Pode Vender','Excedentes após caminho e reservas para fusões',recent.length?`${stat.sale} · ${recent.reduce((n,x)=>n+x.qty,0)} novos`:stat.sale,`${newBlock}${stat.anal.saleEntries.length?arrInventory(state).filter(e=>calcRowCounts(e.name,e.tier).sell>0).map(entryInventory).join(''):'<div class="empty">Nenhuma unidade disponível para venda.</div>'}<div class="hint" style="margin-top:12px">“Pode Vender” protege também os droids que precisam ser evoluídos para os próximos ciclos e suas reservas de fusão. Não considera renda nem coleção.</div>`);
 const keepSection=section('keep','♧','Guardar para o futuro','Unidades protegidas para o caminho e fusões',stat.protected,stat.inventory.filter(e=>calcRowCounts(e.name,e.tier).keep>0).map(entryInventory).join('')||'<div class="empty">Nenhuma unidade protegida.</div>');
 const invenSection=section('inventory','▤','Minha Base','Droids que você possui atualmente',stat.total,`${stat.inventory.length?stat.inventory.map(entryInventory).join(''):'<div class="empty">Nenhum droid cadastrado.</div>'}<div class="utility-bar">${btn('Abrir catálogo completo','openinventory',{kind:'secondary'})}</div>`);
 return heading+prog+stats+`<div class="dashboard-columns">${pendingSection}${sellSection}</div>`+keepSection+invenSection+footer();
}
// Checklist completo: 120 requisitos por caminho, agrupados por droid sem perder ciclos/variantes.
function fullPathEntries(path=state.path){
 const byDroid=new Map();
 for(const r of R.filter(r=>r.p===path).sort((a,b)=>a.c-b.c)){
  if(!byDroid.has(r.name))byDroid.set(r.name,{name:r.name,requirements:[]});
  byDroid.get(r.name).requirements.push(r);
 }
 return [...byDroid.values()].sort((a,b)=>a.requirements[0].c-b.requirements[0].c||a.name.localeCompare(b.name,'pt-BR'));
}
function pathDraft(name){
 const d=ui.pathDraft[name];
 return d&&validTier(name,d.tier)?d:{tier:byName[name].rarity==='Iconic'?'Única':'Default',qty:1};
}
function fullPathChecklist(){
 if(!state.path)return setup();
 const all=fullPathEntries(),count=all.filter(e=>anyOwned(e.name)).length;
 const term=ui.pathSearch.trim().toUpperCase();
 const visible=all.filter(e=>(!term||e.name.toUpperCase().includes(term))&&(ui.pathChecklistFilter==='Todos'||(ui.pathChecklistFilter==='Não cadastrados'&&!anyOwned(e.name))||(ui.pathChecklistFilter==='Cadastrados'&&anyOwned(e.name))));
 const cards=visible.map(e=>{
  const d=byName[e.name],draft=pathDraft(e.name),isOwned=anyOwned(e.name),owned=Object.entries(state.inventory[e.name]||{}).filter(([,q])=>q>0).sort((x,y)=>rank(y[0])-rank(x[0]));
  const byTier=new Map();for(const r of e.requirements){if(!byTier.has(r.tier))byTier.set(r.tier,[]);byTier.get(r.tier).push(r.c)}
  const needs=[...byTier].map(([tier,cycles])=>`<span class="path-need" data-variant="${h(tier)}"><b>${h(variantLabel(tier))}</b><small>Ciclo${cycles.length>1?'s':''} ${cycles.join(', ')}</small></span>`).join('');
  const ownedText=owned.length?`<div class="path-owned">✓ Já cadastrou: ${owned.map(([tier,q])=>`<span class="owned-variant" data-variant="${h(tier)}">${nf(q)} × ${h(variantLabel(tier))}</span>`).join(' ')}</div>`:'<div class="path-not-owned">Ainda não cadastrado nesta conta</div>';
  return `<div class="path-check-row ${isOwned?'path-is-owned':''}" data-droid="${h(e.name)}">
    <div class="path-card-top"><label class="path-pick" title="Marcar para cadastrar em lote"><input type="checkbox" class="checkbox" data-input="pathToggle" data-name="${h(e.name)}" ${ui.pathBatch[e.name]?'checked':''} aria-label="Selecionar ${h(e.name)} para cadastro em lote"></label>
      <button type="button" ${panelButton(e.name,'','path-droid-link')}>${imageOf(e.name,false,owned[0]?.[0]||draft.tier)}<span class="droid-info"><strong>${h(e.name)}</strong><span class="rarity-meta">${rarityTag(d.rarity)} <span class="role-label">${h(roleLabel(d.role))}</span></span></span></button>
      <span class="path-owned-indicator ${isOwned?'yes':'no'}">${isOwned?'✓ Tenho':'Não tenho'}</span>
    </div>
    <div class="path-requirements"><span class="path-muted-heading">Exigido neste caminho:</span>${needs}</div>
    ${ownedText}
    <div class="path-register-line"><label class="path-control"><span>Minha variante</span>${tierSelect(draft.tier,d.rarity==='Iconic','pathTier',`data-input="pathTier" data-name="${h(e.name)}" aria-label="Minha variante de ${h(e.name)}"`)}</label>
      <label class="path-control path-qty"><span>Qtd.</span><input class="input" type="number" min="1" max="${isIconic(e.name)?1:100000}" value="${h(draft.qty)}" data-input="pathQty" data-name="${h(e.name)}" aria-label="Quantidade de ${h(e.name)}"></label>
      ${btn(isOwned?'+ Adicionar outra':'✓ Tenho este droid','pathAdd',{kind:isOwned?'secondary':'outline-green',size:'small',attrs:`data-name="${h(e.name)}"`})}
    </div>
  </div>`;
 }).join('');
 const selected=Object.keys(ui.pathBatch).length;
 return titlePage('MEU CAMINHO',`Lista completa · Caminho ${state.path}`,'Confira os droids de todos os 40 ciclos, escolha a variante que realmente possui e cadastre com um toque.',btn('Voltar ao painel','opendashboard',{kind:'secondary'}))+
 `<div class="card card-pad path-summary"><div><b>${count} de ${all.length}</b><span>droids diferentes já cadastrados nesta conta</span></div><div><b>120 requisitos</b><span>distribuídos por 40 ciclos</span></div><div><b>Ciclo ${state.cycle}</b><span>seu progresso atual</span></div></div>
 <div class="hint path-helper"><strong>Como usar:</strong> cada droid aparece uma vez, com todas as variantes e ciclos exigidos. Escolha a variante que você possui, ajuste a quantidade e toque em <strong>Tenho este droid</strong>. Para registrar vários de uma vez, marque as caixas e toque em <strong>Cadastrar selecionados</strong>. Os cadastros existentes não são substituídos. <strong>Importante:</strong> possuir uma variante inferior não atende automaticamente uma exigência superior.</div>
 <div class="card card-pad path-checklist"><div class="path-tools"><div class="searchbox"><input class="input search-input" data-input="pathSearch" value="${h(ui.pathSearch)}" placeholder="Buscar droid neste caminho..." aria-label="Buscar droid na lista completa" autocomplete="off"></div><div class="quick-filters">${['Todos','Não cadastrados','Cadastrados'].map(f=>`<button type="button" class="filter-pill ${f===ui.pathChecklistFilter?'on':''}" data-action="pathChecklistFilter" data-filter="${h(f)}">${h(f)}</button>`).join('')}</div></div>
 <div class="path-count">${visible.length} droid(s) na lista · <span>${selected} selecionado(s) para cadastrar</span></div>
 ${cards||'<div class="empty">Nenhum droid corresponde aos filtros.</div>'}</div>
 ${selected?`<div class="sticky-batch path-batch"><span><strong>${selected}</strong> droid(s) selecionado(s)</span>${btn('Limpar seleção','pathClear',{kind:'secondary',size:'small'})}${btn('Cadastrar selecionados','pathSaveBatch')}</div>`:''}`+footer();
}
function setup(){return titlePage('COMECE AQUI','Seu guia inteligente de droids','Escolha seu caminho, informe o ciclo atual e decida se quer cadastrar os droids agora.')+`<div class="card setup-card"><div class="wizard-path-title"><div><h2 style="margin:0">Configurar meu caminho</h2><p class="muted small">Os outros caminhos continuam disponíveis na consulta.</p></div>${badge('Primeiro acesso','success')}</div><div class="setup-paths">${[1,2,3,4,5,6].map(p=>`<button type="button" class="path-select ${ui.setupPath===p?'chosen':''}" data-action="choosepath" data-path="${p}"><b>Caminho ${p}</b><small>40 ciclos · 120 requisitos</small></button>`).join('')}</div><div class="setup-fields"><div class="field"><label for="setup-cycle">Em qual ciclo você está atualmente?</label><select class="select" id="setup-cycle" data-input="setupCycle">${selects(Array.from({length:40},(_,i)=>({label:`Ciclo ${i+1}`,value:i+1})),ui.setupCycle)}</select></div><fieldset class="setup-registration"><legend>Quer cadastrar seus droids atuais agora?</legend><label><input type="radio" name="register-now" data-input="setupRegister" value="yes" ${ui.setupRegister?'checked':''}> Sim, mostrar a lista completa do meu caminho</label><label><input type="radio" name="register-now" data-input="setupRegister" value="no" ${!ui.setupRegister?'checked':''}> Não, prefiro cadastrar depois</label></fieldset>${btn('Confirmar caminho e ciclo →','start')}</div><div class="hint" style="margin-top:21px"><strong>Sem login:</strong> seus dados serão salvos automaticamente neste navegador. Use “Exportar backup” caso troque de aparelho ou precise limpar o navegador.</div></div><div class="grid-2" style="margin-top:19px"><div class="card preview-tile"><h3>⌕ Consultar um droid</h3><p>Explore livremente os seis caminhos, mesmo sem configurar inventário.</p>${btn('Abrir consulta','opensearch',{kind:'secondary',size:'small'})}</div><div class="card preview-tile"><h3>▣ Registrar aos poucos</h3><p>Cadastre somente os droids que já quiser acompanhar.</p><span class="mini-note">Cadastro rápido em lote ou individual.</span></div></div>`+footer()}
function browseCycles(p,c){const list=pick(p,c);return `<div class="path-panel"><div class="wizard-path-title"><h3>Requisitos do Caminho ${p}</h3>${badge(`Ciclo ${c} de 40`,'blue')}</div><div class="utility-bar"><div class="field" style="flex:1"><label>Escolher o caminho</label><select class="select" data-input="browsePath">${selects(Array.from({length:6},(_,i)=>({value:i+1,label:`Caminho ${i+1}`})),p)}</select></div><div class="field" style="flex:1"><label>Escolher o ciclo</label><select class="select" data-input="browseCycle">${selects(Array.from({length:40},(_,i)=>({value:i+1,label:`Ciclo ${i+1}`})),c)}</select></div></div><div class="hint"><strong>Rebirth ${c-1} → ${c}</strong> · Créditos exigidos: <strong>${h(list[0]?.credits||'—')}</strong></div>${list.map(r=>`<div class="path-cycle-row"><button type="button" ${panelButton(r.name)}>${imageOf(r.name,false,r.tier)}<span class="droid-info"><b>${h(r.name)}</b><small class="muted">${rarityTag(byName[r.name]?.rarity)}</small></span></button>${variantBadge(r.tier)}</div>`).join('')}<div class="utility-bar">${btn('← Anterior','prevBrowse',{kind:'ghost',size:'small',attrs:c===1?'disabled':''})}${btn('Próximo →','nextBrowse',{kind:'ghost',size:'small',attrs:c===40?'disabled':''})}</div></div>`}
function allOccurrences(name,pathFilter){return R.filter(x=>x.name===name&&(!pathFilter||x.p===pathFilter)).sort((a,b)=>a.p-b.p||a.c-b.c)}
// A consulta sempre usa o catálogo completo, nunca o inventário da conta.
// Normalização aceita espaços, acentos e hífens diferentes ("r2 d2" encontra "R2-D2").
const normSearch=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
function findCatalogDroids(term){
 const needle=normSearch(term);
 return CAT.filter(d=>!needle||normSearch(d.name).includes(needle)).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
}
function searchResultsHTML(matching){
 const saleByName={};if(state.path)for(const row of requireCounts().saleEntries)saleByName[row.name]=(saleByName[row.name]||0)+row.qty;
 return matching.map(d=>{const uses=FUSION_INGREDIENTS[d.name]||[],sell=saleByName[d.name]||0;return `<button type="button" class="selectable result-droid" data-action="detail" data-name="${h(d.name)}">${imageOf(d.name,false,best(d.name)||'Default')}<span class="droid-info"><b>${h(d.name)}</b><small class="rarity-meta">${rarityTag(d.rarity)} <span class="role-label">${h(roleLabel(d.role))}</span></small><span class="search-droid-warnings"><span class="tag">${anyOwned(d.name)?'Na minha base':'Não cadastrado'}</span>${uses.length?`<span class="search-fusion-tag">⚗ Fusão · ${uses.length}</span>`:''}${sell?`<span class="search-sale-tag">Pode vender · ${sell}</span>`:''}</span></span><span class="entry-arrow">›</span></button>`}).join('')||'<div class="empty">Nenhum droid encontrado no catálogo completo.</div>';
}
function searchCountText(matching,term){return term.trim()?`${matching.length} ${matching.length===1?'droid encontrado':'droids encontrados'} entre os ${CAT.length} do catálogo`:`${CAT.length} droids disponíveis no catálogo`}
function refreshSearchResults(){
 const count=document.querySelector('.results-count');const results=document.querySelector('.results-grid');
 if(!count||!results)return;
 const matching=findCatalogDroids(ui.search);
 count.textContent=searchCountText(matching,ui.search);
 results.innerHTML=searchResultsHTML(matching);
}
// Pesquisa universal: abre sobre a aba atual, não altera progresso ou navegação.
function globalSearchItems(){
 const term=ui.globalSearch.trim();
 const matches=term?findCatalogDroids(term):CAT.filter(d=>anyOwned(d.name)).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')).slice(0,10);
 return {matches:matches.slice(0,60),total:term?matches.length:matches.length,term};
}
function globalSearchList(){
 const {matches,total,term}=globalSearchItems();
 return `<div class="global-search-summary">${term?`${total} resultado(s) no catálogo completo`:(matches.length?'Droids da sua base':'Comece digitando para procurar entre os '+CAT.length+' droids')}</div><div class="global-search-results">${matches.length?matches.map(d=>`<button type="button" class="global-result" data-action="detail" data-name="${h(d.name)}">${imageOf(d.name,false,best(d.name)||'Default')}<span class="global-result-copy"><strong>${h(d.name)}</strong><small>${h(roleLabel(d.role))} · ${h(rarityLabel(d.rarity))}${anyOwned(d.name)?' · Na minha base':''}</small></span><span aria-hidden="true">›</span></button>`).join(''):'<p class="global-empty">Nenhum resultado. Tente outro nome.</p>'}</div>${total>60?'<p class="mini-note global-search-cut">Exibindo os primeiros 60 resultados. Refine a pesquisa.</p>':''}`;
}
function renderGlobalSearch(){
 const root=document.getElementById('global-search-root');if(!root)return;
 if(!ui.globalSearchOpen){root.innerHTML='';document.body.classList.remove('global-search-open');return;}
 document.body.classList.add('global-search-open');
 root.innerHTML=`<div class="global-search-overlay"><button type="button" class="global-search-veil" data-action="closeGlobalSearch" aria-label="Fechar pesquisa"></button><section class="global-search-panel" role="dialog" aria-modal="true" aria-label="Pesquisar droids"><div class="global-search-header"><div><strong>Pesquisar droids</strong><small>Todos os ${CAT.length} droids · em qualquer aba</small></div><button type="button" class="global-search-close" data-action="closeGlobalSearch" aria-label="Fechar pesquisa">×</button></div><label class="global-search-field"><span aria-hidden="true">⌕</span><input type="search" data-input="globalSearch" placeholder="Digite o nome do droid..." value="${h(ui.globalSearch)}" autocomplete="off" aria-label="Pesquisar droid"></label><div id="global-search-list">${globalSearchList()}</div></section></div>`;
}
function openGlobalSearch(){ui.modal=null;renderModal();ui.detail='';renderDetail();ui.globalSearchOpen=true;ui.globalSearch='';renderGlobalSearch();document.querySelector('[data-input="globalSearch"]')?.focus({preventScroll:true})}
function closeGlobalSearch(){ui.globalSearchOpen=false;renderGlobalSearch()}
function refreshGlobalSearch(){const box=document.getElementById('global-search-list');if(box)box.innerHTML=globalSearchList()}
function search(){
 const matching=findCatalogDroids(ui.search);
 return titlePage('CONSULTA LIVRE','Consultar droids','Pesquise os 100 droids e veja os avisos de venda e as possíveis fusões especiais.')+`<div class="card card-pad"><div class="field"><label for="search-all">PESQUISAR DROID</label><div class="searchbox"><input id="search-all" class="input search-input" data-input="search" value="${h(ui.search)}" placeholder="Nome do droid..." autocomplete="off"></div></div><div class="small muted results-count">${searchCountText(matching,ui.search)}</div><p class="mini-note">Busca em todos os ${CAT.length} droids, incluindo os que você não cadastrou nesta conta.</p><div class="results-grid">${searchResultsHTML(matching)}</div></div><h2 class="subheading">Consultar caminhos e ciclos</h2>${browseCycles(ui.browsePath,ui.browseCycle)}`+footer();
}
// Simulador totalmente independente do progresso real. Só consulta DB e inventário.
function simulatorPage(){
 const p=Number(ui.simPath)||1,c=Number(ui.simCycle)||1;
 const requirements=pick(p,c),credits=requirements[0]?.credits||'—';
 const keys=new Map();for(const r of requirements){const key=nextId(r.name,r.tier);if(!keys.has(key))keys.set(key,{...r,qty:0});keys.get(key).qty++;}
 const items=[...keys.values()].map(r=>{
  const have=meets(r.name,r.tier),owned=countOwned(r.name),current=best(r.name),missing=Math.max(0,r.qty-have),hasLower=owned>0&&current&&rank(current)<rank(r.tier)&&r.tier!=='Única';
  const canUpgrade=missing>0&&hasLower;
  return {r,have,owned,current,missing,canUpgrade};
 });
 const complete=items.filter(x=>x.missing===0).length;
 const cards=items.map(({r,have,owned,current,missing,canUpgrade})=>`<article class="sim-droid ${missing?'sim-unmet':'sim-met'}"><button type="button" class="sim-droid-main" ${panelButton(r.name,'','sim-droid-open')}>
 ${imageOf(r.name,false,r.tier)}<span class="sim-droid-text"><strong>${h(r.name)}</strong><span>${rarityTag(byName[r.name]?.rarity)} ${variantBadge(r.tier)}</span></span><span class="sim-droid-arrow" aria-hidden="true">›</span></button>
 <div class="sim-status">${missing?badge(`Faltam ${missing}`,'warning'):badge('Requisito atendido','success')}<span>Na base: <b>${owned}</b>${owned&&current?' · Maior variante: '+h(variantLabel(current)):''}</span></div>
 ${canUpgrade?`<p class="sim-upgrade-note">Você possui variante inferior. Pode precisar evoluir para ${h(variantLabel(r.tier))}; confira os chips na ficha do droid.</p>`:''}
 ${missing&&!owned?'<p class="sim-upgrade-note">Ainda não cadastrado nesta conta.</p>':''}</article>`).join('');
 return titlePage('SIMULADOR LIVRE','Simular caminho e ciclo','Veja os requisitos de qualquer ciclo sem alterar o caminho real nem seus droids.')+
 `<section class="sim-hero card"><div class="sim-head"><span class="sim-dot">◎</span><div><h2>Escolha o cenário</h2><p>Caminhos 1–6 · ciclos 1–40 · Flagelo atende qualquer variante · consulta independente</p></div>${badge('Somente simulação','blue')}</div>
 <div class="sim-controls"><label>Caminho<select class="select" data-input="simPath" aria-label="Caminho para simular">${selects(Array.from({length:6},(_,i)=>({value:i+1,label:`Caminho ${i+1}`})),p)}</select></label><label>Ciclo<select class="select" data-input="simCycle" aria-label="Ciclo para simular">${selects(Array.from({length:40},(_,i)=>({value:i+1,label:`Ciclo ${i+1}`})),c)}</select></label></div>
 <div class="sim-steps"><button type="button" data-action="simPrev" ${c===1?'disabled':''}>← Ciclo anterior</button><button type="button" data-action="simNow" ${!state.path||(state.path===p&&state.cycle===c)?'disabled':''}>↺ Meu ciclo real</button><button type="button" data-action="simNext" ${c===40?'disabled':''}>Próximo ciclo →</button></div></section>
 <div class="sim-metrics"><div class="card"><span>Cenário consultado</span><strong>Caminho ${p} · Ciclo ${c}</strong></div><div class="card"><span>Créditos exigidos</span><strong>${h(credits)}</strong></div><div class="card"><span>Requisitos encontrados na base</span><strong>${complete} de ${items.length}</strong></div></div>
 <section class="card sim-results"><div class="sim-results-heading"><div><h2>O que você precisa neste ciclo</h2><p>Toque em qualquer droid para ver sua ficha completa e em quais outros ciclos será necessário.</p></div>${items.length&&complete===items.length?badge('Tudo atendido','success'):badge(`${items.length-complete} pendente(s)`,'warning')}</div>
 <div class="sim-droid-grid">${cards||'<p class="empty">Não há requisitos registrados para este cenário.</p>'}</div></section>
 <p class="sim-disclaimer">${state.path?`Seu progresso real continua em <b>Caminho ${state.path} · Ciclo ${state.cycle}</b>.`:'Você ainda não configurou um caminho real nesta conta.'} Alterar os seletores acima não muda o inventário, as reservas, os avisos de venda nem os requisitos do seu caminho real. <strong>Flagelo</strong> atende qualquer variante exigida do mesmo droid.</p>`+footer();
}
// Um campo de busca e dois escopos: inventário real ou catálogo completo.
// Só atualizamos os resultados durante a digitação para não perder foco em celulares.
function baseResultsHTML(){
 const term=normSearch(ui.inventorySearch),s=getStats();
 if(ui.inventoryScope==='all'){
  const result=findCatalogDroids(ui.inventorySearch);
  return {count:result.length,html:result.map(d=>{
   const owned=countOwned(d.name),next=reqFor(d.name)[0];
   return `<div class="base-catalog-result"> <button type="button" ${panelButton(d.name)}>${imageOf(d.name,false,best(d.name)||'Default')}<span class="droid-info"><span class="droid-heading">${h(d.name)} ${rarityTag(d.rarity)}</span><span class="entry-sub">${h(roleLabel(d.role))} · ${owned?`${owned} na minha base`:'Não cadastrado'}</span>${next?`<span class="mini-note">Caminho ${state.path} · Próximo ciclo ${next.c}</span>`:''}</span><span class="entry-arrow">›</span></button>${btn(owned?'＋ Adicionar mais':'＋ Cadastrar','add',{kind:'secondary',size:'small',attrs:`data-name="${h(d.name)}"`})}</div>`;
  }).join('')||'<div class="empty">Nenhum droid encontrado no catálogo de 100.</div>'};
 }
 const list=s.inventory.filter(e=>normSearch(e.name).includes(term)&&(
  ui.inventoryFilter==='Todos'||
  ui.inventoryFilter==='Pode Vender'&&calcRowCounts(e.name,e.tier).sell>0||
  ui.inventoryFilter==='Necessários'&&calcRowCounts(e.name,e.tier).keep>0&&needAt(e.name,state.path,state.cycle).length>0||
  ui.inventoryFilter==='Futuros'&&calcRowCounts(e.name,e.tier).keep>0&&reqFor(e.name).some(r=>r.c>state.cycle)));
 return {count:list.length,html:list.length?list.map(e=>entryInventory(e,true)).join(''):`<div class="empty">${s.inventory.length?'Nenhum droid corresponde à pesquisa ou filtro. Toque em “Todos os droids” para pesquisar o catálogo.':'Sua base está vazia. Use “Todos os droids” para cadastrar.'}</div>`};
}
function refreshBaseResults(){
 const target=document.getElementById('base-live-results'),count=document.getElementById('base-count');
 if(!target||!count)return;
 const result=baseResultsHTML();target.innerHTML=result.html;
 count.textContent=ui.inventoryScope==='all'?`${result.count} de ${CAT.length} droids do catálogo`:`${result.count} registros na base`;
}
// Lista dinâmica dos requisitos FUTUROS que ainda não são atendidos pela Base.
// Droids NÃO são consumidos ao passar de ciclo: vale a maior necessidade simultânea,
// e não a soma de todos os ciclos. Variantes superiores satisfazem as inferiores.
function missingBaseRequirements(){
 if(!state.path)return [];
 const group=new Map();
 for(const r of R){
  if(r.p!==state.path||r.c<state.cycle)continue;
  if(!group.has(r.name))group.set(r.name,{name:r.name,requirements:[]});
  group.get(r.name).requirements.push(r);
 }
 const rows=[],reserved=fusionPlanNeeds();
 for(const row of group.values()){
  const owned=state.inventory[row.name]||{};
  const free=Object.fromEntries(Object.entries(owned).map(([tier,qty])=>[tier,Math.max(0,qty-(reserved[nextId(row.name,tier)]||0))]));
  const {missing:deficit,upgrades}=futureEvolutionPlan(row.name,free);
  if(!deficit.length&&!upgrades.length)continue;
  row.requirements.sort((a,b)=>a.c-b.c||rank(b.tier)-rank(a.tier));
  const existing=Object.entries(owned).filter(([,qty])=>qty>0).sort((a,b)=>rank(b[0])-rank(a[0]));
  rows.push({name:row.name,deficit,upgrades,existing,firstCycle:row.requirements[0].c,requirements:row.requirements});
 }
 return rows.sort((a,b)=>a.firstCycle-b.firstCycle||a.name.localeCompare(b.name,'pt-BR'));
}
function missingBasePanel(){
 if(!state.path)return '';
 const list=missingBaseRequirements();
 const missingCount=list.reduce((sum,item)=>sum+item.deficit.reduce((n,d)=>n+d.qty,0),0);
 const upgradeCount=list.reduce((sum,item)=>sum+item.upgrades.reduce((n,u)=>n+u.qty,0),0);
 const cards=ui.open.has('basemissing')?list.map(item=>{
  const earliest=item.firstCycle;
  const own=item.existing.length?`<span class="base-missing-owned">Na base: ${item.existing.map(([tier,qty])=>`${nf(qty)} × ${variantText(tier)}`).join(' · ')}</span>`:'<span class="base-missing-owned">Ainda não possui nenhuma variante</span>';
  const requirements=[...new Map(item.requirements.map(r=>[`${r.c}:${r.tier}`,r])).values()].map(r=>`<span class="base-missing-cycle">Ciclo <b>${r.c}</b> · ${variantText(r.tier)}</span>`).join('');
  return `<article class="base-missing-item"><div class="base-missing-head"><button type="button" ${panelButton(item.name,'','path-droid-link')}>${imageOf(item.name,false,item.deficit[0]?.tier||item.upgrades[0]?.to||'Default')}<span class="droid-info"><span class="droid-heading">${h(item.name)} ${rarityTag(byName[item.name]?.rarity)}</span><span class="entry-sub">Próxima exigência no ciclo <strong>${earliest}</strong></span></span></button></div><div class="base-missing-need">${item.upgrades.length?`<span class="base-missing-label evolution-keep">Já possui — guardar para evoluir:</span>${item.upgrades.map(u=>`<div class="base-missing-variant"><span class="evolution-keep">${nf(u.qty)}×</span> ${variantBadge(u.from)} → ${variantBadge(u.to)} <small>· Ciclo ${u.cycle}</small> ${btn('Evoluir','evolve',{kind:'secondary',size:'small',attrs:`data-name="${h(item.name)}" data-tier="${h(u.from)}" data-to="${h(u.to)}"`})}</div>`).join('')}`:''}${item.deficit.length?`<span class="base-missing-label">Ainda precisa conseguir:</span>${item.deficit.map(d=>`<div class="base-missing-variant">${variantBadge(d.tier)} <b>${nf(d.qty)} unidade(s)</b> ${btn('+ Cadastrar','add',{kind:'secondary',size:'small',attrs:`data-name="${h(item.name)}" data-tier="${h(d.tier)}"`})}</div>`).join('')}`:''}</div><div class="base-missing-cycles"><span class="base-missing-label">Ciclos e variantes exigidos:</span><div class="base-missing-cycle-list">${requirements}</div></div>${own}</article>`;
 }).join(''):'';
 return section('basemissing','◈','Droids que ainda preciso',`Caminho ${state.path} · do ciclo ${state.cycle} ao 40`,`${nf(list.length)} droids`,list.length?`<div class="base-missing-intro">Para os ciclos restantes: <strong>${nf(upgradeCount)} unidade(s) para evoluir</strong> e <strong>${nf(missingCount)} para conseguir</strong>, em <strong>${nf(list.length)} droid(s)</strong>. Variantes inferiores são aproveitadas como base de evolução; variantes superiores atendem às menores. Registrar a evolução continua necessário para concluir o ciclo.</div><div class="base-missing-list">${cards}</div>`:'<div class="success-state">✓ Sua base já atende às variantes exigidas nos ciclos restantes deste caminho.</div>');
}
function inventory(){
 const s=getStats(),isAll=ui.inventoryScope==='all';
 // Ao abrir Minha Base, mostramos as pendências automaticamente quando houver.
 // A decisão é apenas visual: nenhuma alteração nas contas ou nas reservas.
 const key=`${accountsDb.activeId}:${state.path}:${state.cycle}`;
 if(ui.baseAccordionKey!==key){
  ui.open=state.path&&missingBaseRequirements().length?new Set(['basemissing']):new Set();
  ui.baseAccordionKey=key;
 }
 const result=baseResultsHTML();
 const toolbar=`<div class="base-floating-controls" aria-label="Controles da Minha Base">
  <div class="base-scope-switch" role="group" aria-label="Onde pesquisar droids"><button type="button" data-action="inventoryScope" data-scope="mine" aria-pressed="${!isAll}" class="${!isAll?'on':''}">▣ Minha Base</button><button type="button" data-action="inventoryScope" data-scope="all" aria-pressed="${isAll}" class="${isAll?'on':''}">⌕ Todos os droids</button></div>
  <div class="base-search-row"><label class="base-search-label" for="base-search">PESQUISAR DROID</label><div class="searchbox base-unified-search"><input id="base-search" class="input search-input" data-input="inventorySearch" value="${h(ui.inventorySearch)}" placeholder="${isAll?'Buscar nos 100 droids...':'Buscar na minha base...'}" autocomplete="off" spellcheck="false"></div></div>
  ${!isAll?`<div class="quick-filters base-filter-pills" role="group" aria-label="Filtros da Minha Base">${['Todos','Pode Vender','Necessários','Futuros'].map(f=>`<button type="button" class="filter-pill ${ui.inventoryFilter===f?'on':''}" data-action="inventoryFilter" data-filter="${f}" aria-pressed="${ui.inventoryFilter===f}">${f}</button>`).join('')}</div>`:''}
  <div class="base-view-links" role="group" aria-label="Acesso rápido às seções">
   <button type="button" data-action="baseJump" data-id="base-owned">▣ Inventário</button>
   ${state.path&&!isAll?`<button type="button" data-action="baseJump" data-id="basemissing" aria-pressed="${ui.open.has('basemissing')}">◈ Ainda preciso</button><button type="button" data-action="baseJump" data-id="fusionideas" aria-pressed="${ui.open.has('fusionideas')}">⚗ Fusões</button>`:''}
  </div>
 </div>`;
 const myDroids=`<section id="base-owned" class="card card-pad base-own-card"><div class="wizard-path-title"><h2 style="margin:0">${isAll?'Buscar qualquer droid':'Droids na minha base'}</h2>${badge(isAll?`${CAT.length} no catálogo`:`${s.total} unidades`,'blue')}</div>
 <p class="mini-note">${isAll?'Consulte ou cadastre qualquer um dos 100 droids, mesmo que não esteja na sua base.':'Mostra somente os droids que você possui na conta '+h(currentAccount().name)+'. Ao vender no jogo, toque em Registrar venda.'}</p>
 ${ui.lastQuickSale&&undo?`<div class="base-undo-bar"><span>✓ Venda registrada. Base atualizada.</span>${btn('↶ Desfazer última venda','undo',{kind:'secondary',size:'small'})}</div>`:''}
 <p class="mini-note base-result-count" id="base-count" aria-live="polite">${isAll?`${result.count} de ${CAT.length} droids do catálogo`:`${result.count} registros na base`}</p>
 <div id="base-live-results" class="${isAll?'base-all-results':'base-owned-results'}">${result.html}</div>
 <div class="base-catalog-trigger">${btn(isAll?'＋ Cadastro em lote':'＋ Cadastrar Droid','baseRegister',{kind:'secondary'})}<span class="mini-note">${isAll?'Para adicionar vários de uma só vez, abra o cadastro em lote.':'A busca em “Todos os droids” permite cadastrar sem mudar de aba.'}</span></div></section>`;
 let pool=state.path&&!ui.catalogAll?CAT.filter(d=>reqFor(d.name).length):CAT;pool=pool.filter(d=>(ui.catalogRarity==='Todos'||d.rarity===ui.catalogRarity)&&normSearch(d.name).includes(normSearch(ui.catalogSearch)));
 const catalog=`<section class="card card-pad" style="margin-top:17px"><div class="wizard-path-title"><h2 style="margin:0">Cadastro em lote</h2>${badge(`${pool.length} resultados`,'blue')}</div><div class="utility-bar"><div class="searchbox"><input class="input search-input" data-input="catalogSearch" value="${h(ui.catalogSearch)}" placeholder="Buscar droids para cadastrar..."></div><div class="field"><label class="hidden" for="catalog-rarity">Raridade</label><select class="select" id="catalog-rarity" data-input="catalogRarity">${selects([{value:'Todos',label:'Todas as raridades'},...['Common','Rare','Epic','Legendary','Mythic','Iconic'].map(value=>({value,label:rarityLabel(value)}))],ui.catalogRarity)}</select></div></div><div class="filter-row"><div class="seg"><button type="button" data-action="catalogMode" data-mode="current" class="${!ui.catalogAll?'on':''}">Do meu caminho</button><button type="button" data-action="catalogMode" data-mode="all" class="${ui.catalogAll?'on':''}">Todos os 100</button></div></div><div class="catalog-items">${pool.map(d=>`<div class="catalog-item"><button type="button" ${panelButton(d.name)}>${imageOf(d.name,false,best(d.name)||'Default')}<span class="droid-info"><span class="name">${h(d.name)}</span><span class="info rarity-meta">${rarityTag(d.rarity)} <span class="role-label">${h(roleLabel(d.role))}</span></span></span></button><div class="catalog-actions"><label class="batch-check"><input class="checkbox" type="checkbox" data-input="batchToggle" data-name="${h(d.name)}" ${ui.batch[d.name]?'checked':''}> Lote</label>${isIconic(d.name)&&anyOwned(d.name)?'<span class="mini-note">Máx. 1 por conta ✓</span>':btn('+ Adicionar','add',{kind:'secondary',size:'small',attrs:`data-name="${h(d.name)}"`})}</div>${ui.batch[d.name]?`<div class="batch-box"><span class="small muted">Variante</span>${tierSelect(ui.batch[d.name].tier,d.rarity==='Iconic','batchTier',`data-input="batchTier" data-name="${h(d.name)}"`)}<span class="small muted">Quantidade</span><input class="input" type="number" min="1" max="${isIconic(d.name)?1:10000}" value="${ui.batch[d.name].qty}" data-input="batchQty" data-name="${h(d.name)}" aria-label="Quantidade de ${h(d.name)}"></div>`:''}</div>`).join('')||'<div class="empty">Nenhum droid corresponde aos filtros.</div>'}</div></section>`;
 const iconicLegacy=CAT.filter(d=>isIconic(d.name)&&countOwned(d.name)>1).map(d=>d.name);const iconicWarning=iconicLegacy.length?`<div class="hint removal-warning">⚠ Existem Icônicos com mais de uma unidade cadastrada anteriormente (${h(iconicLegacy.join(', '))}). Esses registros foram preservados para evitar perda de informações; revise as quantidades na Minha Base. Novos duplicados estão bloqueados.</div>`:'';
 return titlePage('INVENTÁRIO ATUAL','Minha Base','Sua base e o catálogo completo em um único lugar. Flagelo atende todas as variantes exigidas no Rebirth.',state.path?`${btn('Lista completa do caminho','openpathlist',{kind:'secondary'})}${btn('Meu caminho','opendashboard',{kind:'ghost'})}`:btn('Escolher caminho','setup'))+(!state.path?'<div class="hint" style="margin-bottom:18px">Selecione um caminho para ativar as recomendações de venda e fusão.</div>':'')+iconicWarning+toolbar+myDroids+(!isAll?novaPanel():'')+(!isAll?missingBasePanel():'')+(!isAll?fusionSuggestionsPanel():'')+(ui.catalogVisible?catalog:'')+(ui.catalogVisible&&Object.keys(ui.batch).length?`<div class="sticky-batch"><span><b>${Object.keys(ui.batch).length} selecionado(s)</b></span>${btn('Salvar em lote','saveBatch')}</div>`:'')+footer();
}


// Propostas conservadoras: três excedentes da MESMA variante. Sem mexer em reservas ou requisitos.
// A fusão aleatória aceita três modelos DIFERENTES da mesma raridade, mesmo
// com variantes mistas. O resultado herda a MENOR variante entre os três.
function genericPlanResult(kind,parts){
 if(!Array.isArray(parts)||parts.length!==3)return null;
 if(parts.some(p=>!validTier(p.name,p.tier)||!FUSION_TIERS.includes(p.tier)))return null; // Flagelo: resultado de fusão ainda não verificado.
 const rarity=byName[parts[0].name]?.rarity,common=parts[0].tier;
 const lowest=parts.reduce((tier,p)=>rank(p.tier)<rank(tier)?p.tier:tier,common);
 const isSpecial=FUSIONS.some(r=>r.parts.slice().sort().join('|')===parts.map(p=>p.name).sort().join('|'));
 if(kind==='special'){
  const match=FUSIONS.find(r=>r.parts.slice().sort().join('|')===parts.map(p=>p.name).sort().join('|'));
  return match?{name:match.id,tier:lowest,random:false}:null;
 }
 if(isSpecial)return null; // Receita exclusiva sempre tem precedência.
 if(kind==='variant'&&parts.every(p=>p.tier===common&&p.name===parts[0].name)&&common!=='Kyber')
  return {name:parts[0].name,tier:T[rank(common)+1],random:false};
 if(kind==='mythic'&&rarity==='Mythic'&&common!=='Kyber'&&parts.every(p=>byName[p.name]?.rarity==='Mythic'&&p.tier===common)&&new Set(parts.map(p=>p.name)).size>=2)
  return {rarity:'Mythic',tier:T[rank(common)+1],random:true};
 if(kind==='rarity'&&parts.every(p=>byName[p.name]?.rarity===rarity)&&new Set(parts.map(p=>p.name)).size===3){
  const next={Common:'Rare',Rare:'Epic',Epic:'Legendary',Legendary:'Mythic'}[rarity];
  if(!next)return null;
  return {rarity:next,tier:lowest,random:true};
 }
 return null;
}
function availableFusionStock(){
 const stock={};
 for(const row of requireCounts().saleEntries)stock[nextId(row.name,row.tier)]=row.qty;
 return stock;
}
function safeForProgress(parts){
 // Conferência adicional contra consumir uma unidade que atende requisito atual
 // ou futuro já satisfeito. O cálculo principal de excedentes usa todos os ciclos.
 const byConsumed={};for(const p of parts)byConsumed[nextId(p.name,p.tier)]=(byConsumed[nextId(p.name,p.tier)]||0)+1;
 for(const name of new Set(parts.map(p=>p.name))){
  const owned={...(state.inventory[name]||{})},before=futureCycleCoverage(name,owned);
  for(const [key,qty] of Object.entries(byConsumed))if(key.startsWith(name+'::')){
   const tier=key.slice(name.length+2);owned[tier]=Math.max(0,(owned[tier]||0)-qty);
  }
  const after=futureCycleCoverage(name,owned);
  if(after.some((value,index)=>value<before[index]))return false;
 }
 return true;
}
function planIsFree(parts,skip=''){
 const used={},reserved=fusionPlanNeeds(skip);
 for(const p of parts){const key=nextId(p.name,p.tier);used[key]=(used[key]||0)+1;
  if(used[key]+(reserved[key]||0)>(state.inventory[p.name]?.[p.tier]||0))return false;
 }
 return true;
}
function fusionSuggestions(){
 const stock=availableFusionStock(),ideas=[],seen=new Set();
 const enough=parts=>{
  const used={};for(const p of parts){const key=nextId(p.name,p.tier);
   used[key]=(used[key]||0)+1;if(used[key]>(stock[key]||0))return false;
  }
  return safeForProgress(parts);
 };
 const push=(kind,parts)=>{
  if(!enough(parts))return false;
  const result=genericPlanResult(kind,parts);if(!result)return false;
  const signature=kind+':'+parts.map(p=>nextId(p.name,p.tier)).sort().join('|');
  if(seen.has(signature))return false;
  seen.add(signature);ideas.push({kind,parts,result});return true;
 };
 // Receitas exclusivas: considera também misturas de variantes (resulta a menor).
 for(const recipe of FUSIONS){
  const options=recipe.parts.map(name=>[...FUSION_TIERS].reverse().filter(t=>(stock[nextId(name,t)]||0)>0));
  if(options.some(x=>!x.length))continue;
  const choices=[];
  for(const a of options[0])for(const b of options[1])for(const c of options[2]){
   const parts=recipe.parts.map((name,i)=>({name,tier:[a,b,c][i]}));
   if(enough(parts))choices.push(parts);
  }
  choices.sort((a,b)=>{
   const low=x=>Math.min(...x.map(p=>rank(p.tier)));
   // Primeiro a variante mais alta, depois a combinação que menos desperdiça variantes superiores.
   return low(b)-low(a)||a.reduce((v,p)=>v+rank(p.tier),0)-b.reduce((v,p)=>v+rank(p.tier),0);
  });
  for(const parts of choices.slice(0,2))push('special',parts);
 }
 // Evolução de variante: três unidades do MESMO droid e da MESMA variante.
 for(const d of CAT){if(d.rarity==='Iconic')continue;
  for(const tier of [...FUSION_TIERS].reverse()){
   if(tier==='Kyber')continue;
   if((stock[nextId(d.name,tier)]||0)>=3)
    push('variant',Array.from({length:3},()=>({name:d.name,tier})));
  }
 }
 // Evolução de raridade: modelos diferentes, mesma raridade. Variedades podem
 // ser diferentes; o resultado terá a MENOR variante dos ingredientes.
 for(const rarity of ['Legendary','Epic','Rare','Common']){
  const pool=CAT.filter(d=>d.rarity===rarity).flatMap(d=>FUSION_TIERS.filter(tier=>(stock[nextId(d.name,tier)]||0)>0).map(tier=>({name:d.name,tier})));
  for(const minTier of [...T].reverse()){
   const eligible=pool.filter(p=>rank(p.tier)>=rank(minTier));
   const anchors=eligible.filter(p=>p.tier===minTier);
   if(new Set(eligible.map(p=>p.name)).size<3||!anchors.length)continue;
   // Preferimos ingredientes da MESMA variante, antes de gastar uma superior.
   const order=(a,b)=>rank(a.tier)-rank(b.tier)||a.name.localeCompare(b.name,'pt-BR');
   const ordered=[...eligible].sort(order);
   let inserted=0;
   for(const anchor of anchors.sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'))){
    const remaining=ordered.filter(p=>p.name!==anchor.name);
    for(let j=0;j<remaining.length;j++){
     const first=remaining[j];
     const second=remaining.find((p,k)=>k>j&&p.name!==first.name);
     if(!second)continue;
     if(push('rarity',[anchor,first,second])){inserted++;break;}
    }
    if(inserted>=4)break;
   }
  }
 }
 // Três Míticos da mesma variante também podem gerar um Mítico aleatório
 // da variante seguinte. Não sugerimos Kyber: o aplicativo não rastreia cores.
 for(const tier of [...FUSION_TIERS].reverse()){
  if(tier==='Kyber')continue;
  const names=CAT.filter(d=>d.rarity==='Mythic'&&(stock[nextId(d.name,tier)]||0)>0).map(d=>d.name);
  if(names.length<2)continue;
  let count=0;
  for(let i=0;i<names.length&&count<3;i++)for(let j=i;j<names.length&&count<3;j++)for(let k=j+1;k<names.length&&count<3;k++){
   const parts=[names[i],names[j],names[k]].map(name=>({name,tier}));
   if(push('mythic',parts))count++;
  }
 }
 const priority={rarity:4,mythic:3,special:2,variant:1};
 const rarityOrder={Legendary:0,Epic:1,Rare:2,Common:3};
 return ideas.sort((a,b)=>rank(b.result.tier)-rank(a.result.tier)||priority[b.kind]-priority[a.kind]||
  (rarityOrder[byName[a.parts[0].name]?.rarity]??4)-(rarityOrder[byName[b.parts[0].name]?.rarity]??4));
}
const fusionKindName={special:'Fusão especial',variant:'Evoluir variante',rarity:'Evoluir raridade',mythic:'Evoluir Mítico'};
function fusionPartsSummary(parts){return parts.map(p=>`${h(p.name)} · ${variantText(p.tier)}`).join(' <span class="fusion-plus">+</span> ')}
function fusionSuggestionsPanel(){
 if(!ui.open.has('fusionideas'))return section('fusionideas','⚗','Sugestões de fusão','Combinações possíveis com os excedentes da sua base','Abrir','');
 const ideas=fusionSuggestions(),plans=state.fusions.genericPlans||[];
 const saved=plans.map(plan=>{const result=genericPlanResult(plan.kind,plan.parts),ready=!!result&&planIsFree(plan.parts,'g:'+plan.id);
  return `<article class="smart-fusion-card smart-fusion-reserved"><div class="smart-fusion-meta">${badge('Reservada','success')} <b>${h(fusionKindName[plan.kind])}</b></div><div class="smart-fusion-parts">${fusionPartsSummary(plan.parts)}</div><div class="smart-fusion-outcome">→ ${result?.random?`Droid ${h(rarityLabel(result.rarity))} aleatório`:h(result?.name||'—')} · ${result?variantText(result.tier):''}</div><div class="smart-fusion-actions">${btn('Já fiz esta fusão','genericMake',{kind:'outline-green',size:'small',attrs:`data-id="${h(plan.id)}" ${ready?'':'disabled'}`})}${btn('Cancelar reserva','genericUnplan',{kind:'ghost',size:'small',attrs:`data-id="${h(plan.id)}"`})}</div>${ready?'':'<small class="base-risk">Ingredientes indisponíveis; confira a reserva.</small>'}</article>`;
 }).join('');
 const filter=ui.fusionIdeaFilter||'Todas';
 const visible=ideas.map((idea,index)=>({idea,index})).filter(({idea})=>filter==='Todas'||idea.kind===filter);
 const limit=ui.fusionIdeaExpanded?60:12;
 const cards=visible.slice(0,limit).map(({idea,index})=>`<article class="smart-fusion-card"><div class="smart-fusion-meta"><b>${h(fusionKindName[idea.kind])}</b>${idea.kind==='special'?badge('Exclusiva','blue'):''}</div><div class="smart-fusion-parts">${fusionPartsSummary(idea.parts)}</div><div class="smart-fusion-outcome">→ ${idea.result.random?`1 ${h(rarityLabel(idea.result.rarity))} aleatório`:`1 ${h(idea.result.name)}`} · ${variantText(idea.result.tier)}</div><div class="smart-fusion-actions">${btn('Guardar para fusão','genericReserve',{kind:'secondary',size:'small',attrs:`data-idea="${index}"`})}${btn('Já fiz esta fusão','genericMakeNow',{kind:'ghost',size:'small',attrs:`data-idea="${index}"`})}</div></article>`).join('');
 return section('fusionideas','⚗','Sugestões de fusão','Combinações possíveis com excedentes',`${ideas.length} sugestões`, `<div class="base-fusion-panel"><p class="mini-note">Analisa os excedentes, protegendo também droids que precisam ser evoluídos para requisitos futuros e unidades reservadas.</p>
 ${saved?`<h3 class="smart-fusion-subtitle">Ingredientes que você reservou</h3><div class="smart-fusion-grid">${saved}</div>`:''}
 <div class="filter-row smart-fusion-filters" role="group" aria-label="Filtrar sugestões de fusão">
  ${[['Todas','Todas'],['rarity','Evoluir raridade'],['variant','Evoluir variante'],['mythic','Evoluir Mítico'],['special','Fusões especiais']].map(([value,label])=>`<button type="button" class="btn small ${filter===value?'outline-green':'ghost'}" data-action="fusionIdeaFilter" data-filter="${value}" aria-pressed="${filter===value}">${label}</button>`).join('')}
 </div>
 ${visible.length?`<h3 class="smart-fusion-subtitle">Combinações disponíveis · ${visible.length}</h3><div class="smart-fusion-grid">${cards}</div>${ui.fusionIdeaExpanded?btn('Mostrar menos','fusionIdeaMore',{kind:'ghost',size:'small'}):visible.length>limit?btn(`Ver mais sugestões (${visible.length-limit})`,'fusionIdeaMore',{kind:'secondary',size:'small'}):''}`:'<div class="empty">Nenhuma combinação com três excedentes neste filtro.</div>'}
 <p class="mini-note">O sistema analisa os excedentes elegíveis e mostra até 60 combinações por filtro. A variante Flagelo não entra nas sugestões automáticas de fusão até termos confirmação do resultado no jogo. As propostas são alternativas: os mesmos droids podem aparecer em mais de uma sugestão. Ao reservar uma delas, as outras são recalculadas. Resultados aleatórios precisam ser confirmados após a fusão no jogo. Kyber colorido não é controlado pelo aplicativo.</p></div>`);
}

// ----- Fusion Lab: receitas, escolhas e reservas independentes por conta -----
function suggestedFusionTiers(recipe){
 const held=fusionPlanNeeds(recipe.id),taken={};
 return recipe.parts.map(name=>{
  for(const tier of FUSION_TIERS){const key=nextId(name,tier),free=(state.inventory[name]?.[tier]||0)-(held[key]||0)-(taken[key]||0);
   if(free>0){taken[key]=(taken[key]||0)+1;return tier}
  }
  return 'Default';
 });
}
function fusionTiers(recipe){return ui.fusionDraft[recipe.id]||state.fusions.plans[recipe.id]?.tiers||suggestedFusionTiers(recipe)}
function fusionAvailability(recipe,tiers){
 const other=fusionPlanNeeds(recipe.id),used={},slots=recipe.parts.map((name,i)=>{
  const tier=tiers[i],key=nextId(name,tier),stock=state.inventory[name]?.[tier]||0;
  const free=Math.max(0,stock-(other[key]||0)-(used[key]||0));
  used[key]=(used[key]||0)+1;
  return {name,tier,free,stock,have:free>=1};
 });
 return {slots,ready:slots.every(x=>x.have),owned:slots.filter(x=>x.have).length,tier:tiers.reduce((lowest,t)=>rank(t)<rank(lowest)?t:lowest,tiers[0])};
}
function fusionRisks(recipe,tiers){
 if(!state.path)return [];
 const consumed={},risk=[];
 recipe.parts.forEach((name,i)=>{const key=nextId(name,tiers[i]);consumed[key]=(consumed[key]||0)+1});
 for(const name of new Set(recipe.parts)){
  const before={...(state.inventory[name]||{})},after={...before};
  for(const [key,qty] of Object.entries(consumed))if(key.startsWith(name+'::')){
   const tier=key.slice(name.length+2);after[tier]=Math.max(0,(after[tier]||0)-qty);
  }
  const current=futureCycleCoverage(name,before),remaining=futureCycleCoverage(name,after);
  if(remaining.some((amount,index)=>amount<current[index]))risk.push(`${name} (necessário para o caminho, inclusive evolução)`);
 }
 return risk;
}
function fusionIngredientText(recipe){const count={};for(const n of recipe.parts)count[n]=(count[n]||0)+1;return Object.entries(count).map(([n,q])=>`${q>1?q+'× ':''}${n}`).join(' + ')}
function fusionHistoryCount(id){return state.fusions.history.filter(x=>x.id===id).length}
function quickFusionTiers(recipe,name,tier){
 // Prioriza a variante selecionada na consulta; preserva, quando possível, as escolhas já feitas.
 const used={},other=fusionPlanNeeds(recipe.id),existing=state.fusions.plans[recipe.id]?.tiers||suggestedFusionTiers(recipe);
 let usedSelection=false;
 return recipe.parts.map((part,i)=>{
  const key=(t)=>nextId(part,t);
  const stock=(t)=>(state.inventory[part]?.[t]||0)-(other[key(t)]||0)-(used[key(t)]||0);
  let chosen='Default';
  if(part===name&&!usedSelection){chosen=tier;usedSelection=true;}
  else {
   const options=[existing[i],...FUSION_TIERS].filter((t,j,a)=>FUSION_TIERS.includes(t)&&a.indexOf(t)===j);
   chosen=options.find(t=>stock(t)>0)||existing[i]||'Default';
  }
  used[key(chosen)]=(used[key(chosen)]||0)+1;
  return chosen;
 });
}
function saleTotalForDroid(name){return state.path?requireCounts().saleEntries.filter(x=>x.name===name).reduce((n,x)=>n+x.qty,0):0}
function fusionReservationStatus(recipe,name,tier){
 const plan=state.fusions.plans[recipe.id];if(!plan)return 0;
 return recipe.parts.reduce((n,part,i)=>n+(part===name&&plan.tiers[i]===tier?1:0),0);
}
function fusionAlerts(name,selected){
 const uses=FUSION_INGREDIENTS[name]||[];
 if(!uses.length)return '<p class="mini-note">Este droid não é ingrediente das 17 fusões especiais cadastradas.</p>';
 return `<p class="mini-note">Este droid participa de ${uses.length} fusão(ões). Você pode guardar unidades mesmo antes de conseguir os outros ingredientes.</p><div class="fusion-related-list">${uses.map(recipe=>{
   const necessary=recipe.parts.filter(x=>x===name).length,plan=state.fusions.plans[recipe.id];
   const qty=selected?(state.inventory[name]?.[selected]||0):0;
   const reserved=selected?fusionReservationStatus(recipe,name,selected):0;
   const other=fusionPlanNeeds(recipe.id);
   const canReserve=!!selected&&(qty>(other[nextId(name,selected)]||0)||reserved>0);
   const info=plan?`<span class="fusion-booked">Reserva ativa${reserved?` · ${Math.min(qty,reserved)} ${variantText(selected)}`:''}</span>`:'';
   return `<div class="fusion-related"><div class="fusion-related-header"><strong>${h(recipe.id)}</strong>${info}</div><p>${h(fusionIngredientText(recipe))}</p><small>Usa ${necessary}× ${h(name)}${selected?' · sua variante: '+variantText(selected):''}</small><div class="fusion-related-buttons">${selected?btn(plan?'Atualizar reserva':'Guardar para fusão','quickFusionReserve',{kind:'outline-green',size:'small',attrs:`data-id="${h(recipe.id)}" data-name="${h(name)}" data-tier="${h(selected)}" ${canReserve?'':'disabled'}`}):''}${btn('Ver fusão','openFusionRecipe',{kind:'secondary',size:'small',attrs:`data-id="${h(recipe.id)}"`})}</div>${selected&&!canReserve?'<small class="fusion-unavailable">Esta variante já está comprometida com outras reservas.</small>':''}</div>`;
  }).join('')}</div><p class="mini-note fusion-safety-note">Guardar para fusão protege as unidades disponíveis dos avisos de venda, mas não consome os droids. A reserva é independente em cada conta.</p>`;
}

// Não extrapolar preços entre variantes: a máquina pode cobrar diferente por trio.
const fusionPriceKey=(id,tiers)=>[id,...tiers].join('::');
function fusionPrice(id,tiers){return state.fusions.prices?.[fusionPriceKey(id,tiers)]||null}
function fusionPricePanel(id,tiers){const saved=fusionPrice(id,tiers);return `<div class="fusion-cost-panel"><div class="fusion-cost-line"><span>Custo desta combinação</span><strong>${saved?h(saved.display)+' créditos':'Não verificado'}</strong></div><p class="mini-note">O custo depende dos três droids e das variantes. Confira o preço na máquina antes de confirmar. ${saved?'Preço cadastrado para esta combinação exata.':'Cadastre o preço mostrado no jogo para salvá-lo nesta conta e no backup.'}</p><form data-fusion-price="${h(id)}"><input type="hidden" name="price-id" value="${h(id)}"><label>Valor exibido na máquina (créditos)<input class="input" name="fusion-price" placeholder="Ex.: 6.38T" value="${saved?h(saved.display):''}" maxlength="35" inputmode="text" aria-label="Preço exato da fusão"></label><button class="btn secondary small" type="submit">Salvar custo</button></form></div>`}
function fusionCard(recipe){
 const plan=state.fusions.plans[recipe.id],tiers=fusionTiers(recipe),status=fusionAvailability(recipe,tiers),expanded=ui.fusionOpen===recipe.id,rarity=byName[recipe.id]?.rarity;
 const saved=fusionHistoryCount(recipe.id),present=countOwned(recipe.id);
 const slots=expanded?`<div class="fusion-slots">${status.slots.map((part,i)=>`<div class="fusion-slot ${part.have?'slot-ready':'slot-missing'}">${imageOf(part.name,false,part.tier)}<div class="fusion-slot-name"><button type="button" ${panelButton(part.name)}>${h(part.name)}</button><small>${part.have?'✓ Disponível':'Falta esta variante'} · ${part.stock} no inventário</small></div><label class="fusion-slot-choice"><span>Variante</span><select class="select variant-select" data-variant="${h(part.tier)}" data-input="fusionTier" data-id="${h(recipe.id)}" data-index="${i}" aria-label="Variante de ${h(part.name)}, ingrediente ${i+1}">${selects(FUSION_TIERS.map(value=>({value,label:variantLabel(value)})),part.tier)}</select></label></div>`).join('')}</div>`:'';
 return `<article class="card fusion-card ${expanded?'fusion-expanded':''}" data-recipe="${h(recipe.id)}">
 <div class="fusion-card-head">${imageOf(recipe.id,true,status.tier)}<div class="fusion-card-title"><div class="fusion-name-line"><strong>${h(recipe.id)}</strong>${rarityTag(rarity)}</div><span class="muted small">${h(roleLabel(byName[recipe.id]?.role))} · Resultado ${variantText(status.tier)}</span><div class="fusion-tags">${plan?badge('Reservada','blue'):''}${status.ready?badge('Pronta','success'):badge(`Faltam ${3-status.owned} ingrediente(s)`,'warning')}${saved?badge(`${saved} feita(s)`,'success'):''}${present?badge(`${present} no inventário`,'blue'):''}</div></div></div>
 <div class="fusion-recipe-line"><span>Receita</span><b>${h(fusionIngredientText(recipe))}</b></div><div class="fusion-cost-summary">Custo: <strong>${h(fusionPrice(recipe.id,tiers)?.display||"Não verificado")}${fusionPrice(recipe.id,tiers)?" créditos":""}</strong></div>
 <div class="fusion-progress"><div style="width:${Math.round(100*status.owned/3)}%"></div></div>
 ${btn(expanded?'Ocultar ingredientes':'Ver ingredientes e variantes','fusionToggle',{kind:'secondary',size:'small',attrs:`data-id="${h(recipe.id)}"`})}
 ${expanded?`<div class="fusion-expanded-area"><p class="mini-note">Escolha a variante <strong>real</strong> de cada ingrediente. A fusão produz a menor das três variantes. Reservas de outras receitas reduzem a disponibilidade. Flagelo não participa das sugestões de fusão por falta de confirmação do resultado.</p>${slots}${fusionPricePanel(recipe.id,tiers)}<div class="fusion-result"><span>Resultado previsto</span><strong>${h(recipe.id)} · ${variantText(status.tier)}</strong></div><div class="fusion-buttons">${btn(plan?'Atualizar reserva':'Reservar ingredientes','fusionPlan',{kind:'secondary',attrs:`data-id="${h(recipe.id)}"`})}${plan?btn('Cancelar reserva','fusionUnplan',{kind:'ghost',attrs:`data-id="${h(recipe.id)}"`}):''}${btn('Registrar fusão feita','fusionMake',{attrs:`data-id="${h(recipe.id)}" ${status.ready?'':'disabled'}`})}</div>${plan?'<p class="mini-note">Reserva ativa: estas unidades deixam de aparecer como disponíveis para venda.</p>':''}</div>`:''}
 </article>`;
}
function fusionPage(){
 const stats=FUSIONS.map(r=>({r,p:!!state.fusions.plans[r.id],...fusionAvailability(r,fusionTiers(r)),done:fusionHistoryCount(r.id)}));
 const ready=stats.filter(x=>x.ready).length,reserved=stats.filter(x=>x.p).length,done=state.fusions.history.length;
 const term=ui.fusionSearch.trim().toLocaleUpperCase('pt-BR');
 const shown=stats.filter(x=>(!term||x.r.id.includes(term)||x.r.parts.some(name=>name.includes(term)))&&(ui.fusionFilter==='Todas'||ui.fusionFilter==='Prontas'&&x.ready||ui.fusionFilter==='Faltando'&&!x.ready||ui.fusionFilter==='Reservadas'&&x.p||ui.fusionFilter==='Já realizadas'&&x.done));
 const groups=['Rare','Epic','Legendary','Mythic'];
 return titlePage('LABORATÓRIO DE FUSÃO','Fusões especiais','17 receitas exclusivas, ingredientes por conta e proteção dos droids reservados.')+
 `<div class="fusion-overview"><div class="card"><b>${ready}</b><span>Prontas agora</span></div><div class="card"><b>${reserved}</b><span>Reservadas</span></div><div class="card"><b>${done}</b><span>Fusões registradas</span></div></div>
 <div class="hint fusion-intro"><strong>Como funciona:</strong> cada fusão utiliza <strong>3 droids</strong> e cria 1. A variante final é a <strong>menor variante</strong> escolhida. Toque em uma receita para conferir as suas variantes. Reserve ingredientes para protegê-los das recomendações de venda; após realizar a fusão no jogo, confirme para atualizar o inventário. <strong>Reservar não consome droids.</strong></div>
 <section class="card card-pad fusion-toolbar"><div class="searchbox"><input class="input search-input" data-input="fusionSearch" value="${h(ui.fusionSearch)}" placeholder="Buscar fusão ou ingrediente..." aria-label="Buscar fusões"></div><div class="quick-filters">${['Todas','Prontas','Faltando','Reservadas','Já realizadas'].map(f=>`<button type="button" class="filter-pill ${ui.fusionFilter===f?'on':''}" data-action="fusionFilter" data-filter="${h(f)}">${h(f)}</button>`).join('')}</div></section>
 ${groups.map(g=>{const items=shown.filter(x=>byName[x.r.id]?.rarity===g);return items.length?`<section class="fusion-group"><h2>${h(rarityLabel(g))} <span>${items.length} receita(s)</span></h2><div class="fusion-grid">${items.map(x=>fusionCard(x.r)).join('')}</div></section>`:''}).join('')||'<div class="card empty">Nenhuma fusão encontrada neste filtro.</div>'}
 <div class="hint" style="margin-top:20px">Receitas comunitárias, sujeitas a mudanças no jogo. Confira a combinação na estação de fusão antes de consumir seus droids. <a href="https://droidtycoonhelper.com/fusion/" target="_blank" rel="noopener noreferrer">Conferir fonte das receitas</a>.</div>`+footer();
}

function uniqueImportName(){const base='Conta importada';let name=base,i=2;while(!nameAvailable(name)){name=base+' '+i++;}return name}
function accountByName(name){const key=name.toLocaleLowerCase('pt-BR');return accountsDb.accounts.find(a=>a.name.toLocaleLowerCase('pt-BR')===key)}
function backupFilenamePart(name){return String(name).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,55)||'conta'}
function incomingAccountList(preview,format,name='',notices={}){
 return format==='multi'?preview.accounts.map(a=>({name:a.name,data:a.data,notices:a.notices})):[{name,data:preview,notices}];
}
function overwriteList(rows){return rows.map(a=>a.name).filter(name=>!!accountByName(name))}
function mergeBackupAccounts(rows,selectImported=false){
 const list=[...accountsDb.accounts];let chosen=accountsDb.activeId;
 for(const row of rows){
  const pos=list.findIndex(a=>a.name.toLocaleLowerCase('pt-BR')===row.name.toLocaleLowerCase('pt-BR'));
  if(pos>=0){
   // Keep the existing ID so the active-account selector remains stable.
   list[pos]={...list[pos],name:row.name,data:sanitize(row.data),notices:sanitizeNotices(row.notices)};
   if(selectImported)chosen=list[pos].id;
  }else{
   const fresh={id:newId(),name:row.name,data:sanitize(row.data),notices:sanitizeNotices(row.notices)};
   list.push(fresh);if(selectImported)chosen=fresh.id;
  }
 }
 return {schema:2,activeId:chosen,accounts:list,customTraits:accountsDb.customTraits||[]};
}
function accountSettings(){return `<section class="card card-pad account-settings"><div class="wizard-path-title"><div><h2 style="margin:0">Minhas contas</h2><p class="muted small">Cada conta possui inventário, progresso e avisos próprios.</p></div>${btn('+ Nova conta','createAccount',{kind:'secondary'})}</div><div class="account-list">${accountsDb.accounts.map(a=>{const active=a.id===accountsDb.activeId,qty=arrInventory(a.data).reduce((n,e)=>n+e.qty,0);return `<div class="account-row ${active?'account-current':''}"><div class="account-row-info"><strong>${h(a.name)}</strong>${active?'<span class="account-active-tag">Ativa</span>':''}<small>Caminho ${a.data.path||'não definido'} · Ciclo ${a.data.cycle} · ${nf(qty)} droid(s)</small></div><div class="account-row-buttons">${!active?btn('Usar','activateAccount',{kind:'secondary',size:'small',attrs:`data-id="${h(a.id)}"` }):''}${btn('Renomear','renameAccount',{kind:'ghost',size:'small',attrs:`data-id="${h(a.id)}"`})}${accountsDb.accounts.length>1?btn('Excluir','deleteAccount',{kind:'ghost',size:'small',attrs:`data-id="${h(a.id)}"` }):''}</div></div>`}).join('')}</div><p class="mini-note">A última conta utilizada será aberta automaticamente. Para trocar de conta em qualquer tela, use o seletor no topo.</p></section>`}
function settings(){let s=getStats();return titlePage('CONFIGURAÇÕES','Seus dados, sob seu controle','Sem cadastro. Tudo fica neste navegador e você pode fazer backup quando quiser.')+accountSettings()+(window.DroidDrive?.panelHtml()||'')+`<div class="grid-3" style="margin-top:17px"><div class="card card-pad"><h3>⇩ Backup da conta ativa</h3><p class="muted small">Baixe apenas <strong>${h(currentAccount().name)}</strong>, com o nome no arquivo. Ao importar, o nome será mantido.</p>${btn('Baixar backup desta conta','exportActive',{kind:'secondary'})}</div><div class="card card-pad"><h3>⇩ Backup completo</h3><p class="muted small">Salve todas as contas, seus nomes, inventários, ciclos e históricos em um único arquivo JSON.</p>${btn('Baixar todas as contas','export',{kind:'secondary'})}</div><div class="card card-pad"><h3>⇧ Importar backup</h3><p class="muted small">Mantém o nome da conta do arquivo. Se já existir, perguntaremos antes de substituir; as demais contas serão preservadas.</p>${btn('Escolher arquivo','import',{kind:'secondary'})}</div></div><section class="card card-pad" style="margin-top:17px"><h3>Meu progresso</h3><div class="small muted">Caminho: <b>${state.path||'Não configurado'}</b> · Ciclo: <b>${state.cycle}</b> · Droids cadastrados: <b>${s.total}</b></div><div class="utility-bar">${state.path?`${btn('Corrigir ciclo','cycle',{kind:'secondary'})}${btn('Trocar de caminho','changePath',{kind:'ghost'})}`:btn('Configurar caminho','setup',{kind:'secondary'})}</div>${state.history.length?`<h4 class="subheading">Caminhos anteriores</h4>${state.history.slice(-5).reverse().map(x=>`<div class="details-line">Caminho ${h(x.path)} · Ciclo ${h(x.cycle)} <span class="small">${h(x.date||'')}</span></div>`).join('')}`:''}</section>${state.sales?.length?`<section class="card card-pad base-sales-history" style="margin-top:17px"><h3>Últimas vendas registradas</h3><p class="mini-note">Movimentações registradas pelo botão Registrar venda, nesta base ou nos detalhes.</p>${state.sales.slice(-10).reverse().map(e=>`<div class="details-line"><span>${h(e.name)} · ${variantText(e.tier)}</span><b>−${nf(e.qty)}</b></div>`).join('')}</section>`:''}${state.fusions?.genericHistory?.length?`<section class="card card-pad" style="margin-top:17px"><h3>Últimas fusões sugeridas realizadas</h3>${state.fusions.genericHistory.slice(-10).reverse().map(x=>`<div class="details-line"><span>${h(x.result)} · ${variantText(x.tier)}</span><b>${h(fusionKindName[x.kind])}</b></div>`).join('')}</section>`:''}${state.removals?.length?`<section class="card card-pad removal-history" style="margin-top:17px"><h3>Últimas retiradas do inventário</h3><p class="mini-note">Registros do botão “Não possuo mais”, por conta. Vendas e fusões têm registros separados.</p>${state.removals.slice(-10).reverse().map(e=>`<div class="details-line"><span>${h(e.name)} · ${variantText(e.tier)}</span><b>−${nf(e.qty)}</b></div>`).join('')}</section>`:''}<section class="card card-pad" style="margin-top:17px"><h3>Verificar fotos dos droids</h3><p class="small muted">Confira se as imagens dos 100 droids carregam na sua conexão. O teste não altera seu inventário.</p>${btn('Testar as 100 imagens','auditImages',{kind:'secondary'})}</section><section class="card card-pad" style="margin-top:17px"><h3>Privacidade e armazenamento</h3><p class="small muted">Os dados não são enviados ao Google Sheets nem ao GitHub. O inventário fica salvo neste navegador. Se você autorizar o Google Drive, uma cópia de backup também será enviada à sua conta Google. Para sincronizar entre aparelhos, conecte a mesma conta Google em ambos; mudanças da mesma conta feitas simultaneamente exigem revisão. Na navegação anônima ou após limpar dados do navegador, você pode perder informações sem backup.</p><div class="utility-bar">${btn('Conferir fonte dos requisitos','source',{kind:'ghost'})}${localStorage.getItem(OP_UNDO_KEY+currentAccount().id)?btn('Desfazer última movimentação','undoOperation',{kind:'secondary'}):''}${localStorage.getItem(ACCOUNTS_UNDO)?btn('Desfazer última restauração','undoRestore',{kind:'secondary'}):''}</div></section>`+footer();}
function footer(){return `<footer class="footer-note">Referência comunitária: <a href="${h(DB.source)}" target="_blank" rel="noopener noreferrer">Droidex · 6 caminhos</a> e <a href="${h(DB.catalogSource)}" target="_blank" rel="noopener noreferrer">Droid Tycoon Helper · 100 droids e chips</a>. Progressão ${h(DB.version)} · Habilidades ${h(TRAITS.version)} · Interface v28.3. Informações de progressão podem mudar com atualizações do jogo. “Pode Vender” respeita as evoluções necessárias e as reservas de fusão, mas não considera renda nem coleção.</footer>`}
// ===== Guia de Habilidades v27 =====
const TRAIT_GRADES_PT={Common:'Comum',Gold:'Ouro',Diamond:'Diamante',Rainbow:'Arco-íris'};
const traitGradeLabel=g=>TRAIT_GRADES_PT[g]||g;
const financeValue=(key)=>state.finance?.[key]==null?'Não informado':nf(state.finance[key]);
const currencyLabel=key=>key==='credits'?'créditos':'Cristais Nova';
const knownTraitPrice=(rarity,rolls)=>TRAITS.price(rarity,rolls);
const costDisplay=(rarity,rolls=0)=>{const amt=knownTraitPrice(rarity,rolls);return amt==null?'Custo em créditos não confirmado':nf(amt)+' Cristais Nova';};
// Aceita os sufixos comuns de créditos do jogo sem arredondamento para inteiros pequenos.
function parseGameMoney(raw){const v=String(raw??'').trim().replace(/\s+/g,'');if(!v)return null;
 const match=v.match(/^(\d+(?:[.,]\d+)?)\s*(K|M|B|T|Qa|Qi)?$/i);
 if(!match)return NaN;
 const factor={k:1e3,m:1e6,b:1e9,t:1e12,qa:1e15,qi:1e18};
 const n=Number(match[1].replace(',','.'))*(factor[(match[2]||'').toLowerCase()]||1);
 return Number.isFinite(n)&&n>=0&&n<=1e30?n:NaN;
}
function traitStatusBadge(u){const f=unitFit(u);const color=f.label==='Excelente'?'success':f.label==='Boa'?'blue':f.label==='Situacional'?'warning':'muted';return badge(f.label,color)}
function detailUnitsHtml(name,tier){
 const list=unitsFor(name,tier);
 return `<div class="units-panel"><div class="units-heading"><b>Unidades e habilidades (${list.length})</b><small>Cada unidade possui histórico próprio.</small></div>${list.map(u=>`<div class="unit-line"><div class="unit-line-main"><b>${u.favorite?'★ ':''}${h(unitName(u))}</b><small>${h(unitTrait(u))}${u.grade?' · '+h(traitGradeLabel(u.grade)):''} ${u.bonus?h(u.bonus):''}</small>${traitStatusBadge(u)}</div><div class="unit-line-actions">${btn(u.favorite?'★':'☆','favoriteUnit',{kind:'ghost',size:'small',attrs:`data-id="${h(u.id)}" title="Marcar favorito"`})}${btn('Cadastrar / Ver habilidade','unitProfile',{kind:'secondary',size:'small',attrs:`data-id="${h(u.id)}"`})}</div></div>`).join('')}</div>`;
}
function traitOptions(name,rarity,chosen='',custom=true){
 // O nome vem primeiro. As classificações disponíveis dependem da habilidade selecionada.
 const entries=TRAITS.traits.filter(t=>TRAITS.tiers.some(g=>TRAITS.eligible(name,rarity,t.id,g)))
  .map(t=>({id:t.id,label:t.label}));
 entries.push(...(accountsDb.customTraits||[]).map(t=>({id:t.id,label:t.name+' · Personalizada'})));
 if(chosen&&!entries.some(t=>t.id===chosen))entries.push({id:chosen,label:'Registrada anteriormente: '+chosen});
 return `<option value="">Selecione uma habilidade</option>${entries.map(t=>`<option value="${h(t.id)}" ${t.id===chosen?'selected':''}>${h(t.label)}</option>`).join('')}${custom?'<option value="__custom__">+ Cadastrar outra habilidade (personalizada)</option>':''}`;
}
function traitValueOptions(name,rarity,traitId,previousGrade='',previousBonus=''){
 const trait=TRAITS.byId[traitId];if(!trait)return '<option value="">Escolha a habilidade primeiro</option>';
 const opts=TRAITS.tiers.filter(grade=>TRAITS.eligible(name,rarity,traitId,grade)).map(grade=>{
  const value=trait.values?.[TRAITS.tiers.indexOf(grade)]||'';
  const label=value?`${value} · ${traitGradeLabel(grade)}`:`${traitGradeLabel(grade)} · Efeito fixo`;
  return {grade,value,label};
 });
 let preferred=opts.some(x=>x.grade===previousGrade)?previousGrade:'';
 const legacy=previousGrade&&previousBonus&&trait.values&&preferred&&opts.find(x=>x.grade===preferred).value!==previousBonus;
 return `<option value="">Selecione o bônus recebido</option>${legacy?`<option value="__saved__" selected>Manter bônus anterior (${h(previousBonus)} · ${h(traitGradeLabel(previousGrade))})</option>`:''}${opts.map(x=>`<option value="${h(x.grade)}" ${!legacy&&x.grade===preferred?'selected':''}>${h(x.label)}</option>`).join('')}`;
}
function traitPicker(name,rarity,chosen='',grade='',bonus=''){
 const standard=!!TRAITS.byId[chosen];
 const custom=!!chosen&&!standard;
 const newlyCustom=chosen==='__custom__';
 return `<div class="trait-picker">
 <div class="field"><label>1. Habilidade que você ganhou</label><select class="select" name="trait" data-input="traitSelected">${traitOptions(name,rarity,chosen)}</select></div>
 <div class="field" data-trait-values ${standard?'':'hidden'}><label>2. Escolha uma das opções dessa habilidade (Droidex)</label><select class="select" name="traitGradeValue">${traitValueOptions(name,rarity,chosen,grade,bonus)}</select><small>Os valores e a classificação são preenchidos automaticamente. Sem precisar digitar.</small></div>
 <div class="field" data-trait-custom-name ${newlyCustom?'':'hidden'}><label>Nome da nova habilidade personalizada</label><input class="input" name="customName" maxlength="100" placeholder="Nome que aparece no jogo"></div>
 <div data-trait-custom ${custom?'':'hidden'}><div class="field"><label>Classificação da habilidade personalizada</label><select class="select" name="customGrade">${TRAITS.tiers.map(g=>`<option value="${g}" ${g===(grade||'Common')?'selected':''}>${traitGradeLabel(g)}</option>`).join('')}</select></div><div class="field"><label>Bônus da habilidade personalizada (opcional)</label><input class="input" name="customBonus" maxlength="60" value="${h(bonus)}" placeholder="Somente se não estiver no catálogo"></div></div>
 </div>`;
}
function updateTraitPicker(form,traitId,name,rarity){
 const trait=TRAITS.byId[traitId];
 const valueSection=form.querySelector('[data-trait-values]');
 const customName=form.querySelector('[data-trait-custom-name]');
 const customSection=form.querySelector('[data-trait-custom]');
 if(valueSection)valueSection.hidden=!trait;
 if(customName)customName.hidden=traitId!=='__custom__';
 if(customSection)customSection.hidden=!!trait||!traitId;
 const select=form.querySelector('select[name="traitGradeValue"]');
 if(select)select.innerHTML=traitValueOptions(name,rarity,traitId);
}
function selectedTraitData(vals,u){
 const trait=String(vals.get('trait')||'');
 const rarity=byName[u.name].rarity;
 if(!trait)return {error:'Escolha a habilidade que você ganhou.'};
 if(TRAITS.byId[trait]){
  let grade=String(vals.get('traitGradeValue')||'');
  if(grade==='__saved__'&&u.trait===trait&&TRAITS.tiers.includes(u.grade))return {trait,grade:u.grade,bonus:u.bonus};
  if(!TRAITS.tiers.includes(grade)||!TRAITS.eligible(u.name,rarity,trait,grade))return {error:'Escolha uma das opções de bônus disponíveis para esta habilidade.'};
  return {trait,grade,bonus:TRAITS.byId[trait].values?.[TRAITS.tiers.indexOf(grade)]||''};
 }
 const grade=String(vals.get('customGrade')||'Common');
 if(!TRAITS.tiers.includes(grade))return {error:'Escolha a classificação da habilidade personalizada.'};
 if(trait==='__custom__'){
  const newName=String(vals.get('customName')||'').trim();
  if(!newName||newName.length>100)return {error:'Informe o nome da habilidade personalizada.'};
  const existing=(accountsDb.customTraits||[]).find(t=>t.name.toLocaleLowerCase('pt-BR')===newName.toLocaleLowerCase('pt-BR'));
  return {trait:existing?.id||'__custom__',newName:existing?null:newName,grade,bonus:String(vals.get('customBonus')||'').slice(0,60)};
 }
 if(!(accountsDb.customTraits||[]).some(x=>x.id===trait)&&u.trait!==trait)return {error:'Esta habilidade não está cadastrada. Confira a seleção.'};
 return {trait,grade,bonus:String(vals.get('customBonus')||'').slice(0,60)};
}
function saveNewCustomTrait(selection){
 if(!selection.newName)return selection.trait;
 const id='custom:'+newId();accountsDb.customTraits.push({id,name:selection.newName});return id;
}

function traitFunctionsRow(u){const d=byName[u.name],functions=TRAITS.functionsFor(u.name,d.role);return `<div class="field"><label>Funções avaliadas (pode selecionar mais de uma)</label><div class="unit-check-grid">${functions.map(f=>`<label><input type="checkbox" name="uses" value="${h(f.id)}" ${(u.uses||[]).includes(f.id)?'checked':''}> ${h(f.name)}</label>`).join('')}</div><small>Se não marcar nenhuma, o guia avaliará todas as funções naturais conhecidas.</small></div>`}
function guideSummary(u){const d=byName[u.name],fit=unitFit(u);return `<div class="trait-evaluation">${traitStatusBadge(u)} <strong>${h(unitTrait(u))}</strong>${u.bonus?' · '+h(u.bonus):''}<p>${h(fit.explain)}</p>${(TRAITS.functionsFor(u.name,d.role)||[]).map(f=>`<small><b>${h(f.name)}:</b> ${h(f.detail)}</small>`).join('')}</div>`}
function recommendedTraits(name,chosenUses=[]){
 const d=byName[name],functions=TRAITS.functionsFor(name,d.role);
 const target=chosenUses.length?chosenUses:functions.map(f=>f.id);
 const recommended=TRAITS.candidates(name,d.rarity,d.role,target);
 const top=recommended.filter((x,i,all)=>all.findIndex(y=>y.trait.id===x.trait.id)===i).slice(0,3);
 let html=``;
 if(name==='C-3PO'&&target.every(x=>x==='credits'||x==='craft')){
  html+=`<div class="trait-caution"><b>Habilidade Perfeita: em análise.</b> Não há confirmação de habilidade sorteável que amplie diretamente os bônus especiais de fabricação (+40 s/s) e créditos (3×) do C-3PO nas estações. A exclusiva Droid Sell Master mantém o bônus de venda durante o trabalho, mas não comprova aumento dessas duas estações.</div>`;
 }else if(top.length){
  html+=`<div class="units-heading"><b>Melhores candidatas conhecidas</b><small>Avaliação por compatibilidade e efeito; “Perfeita” exige evidências adicionais.</small></div>`;
  html+=top.map(x=>`<div class="trait-recommendation"><div><b>${h(x.trait.label)}</b> ${badge(x.fit.label,x.fit.score>=5?'success':'blue')}<small>${h(x.trait.slot)} · ${h(x.trait.effect)}</small></div><div class="trait-roll"><b>${traitGradeLabel(x.grade)}</b><small>${x.odds==null?'Chance desconhecida':(x.odds*100).toFixed(2).replace('.',',')+'% / primeira leitura'}</small></div></div>`).join('');
 }else html+=`<div class="trait-caution">Nenhuma combinação com benefício comprovado suficiente para esta função. Em análise.</div>`;
  const focus=top.filter(x=>x.odds!=null);
 if(focus.length){const pExact=focus[0].odds,pGood=focus.reduce((sum,x)=>sum+x.odds,0);
  const pFormat=p=>(p*100).toFixed(2).replace('.',',')+'%';
  const row=(p,n)=>`${pFormat(1-Math.pow(1-p,n))}`;
  html+=`<div class="trait-chances"><h4>Probabilidades estimadas (primeira leitura)</h4><div class="trait-chance-rows"><span>Melhor candidata ${h(focus[0].trait.label)} (${h(traitGradeLabel(focus[0].grade))})</span><b>${pFormat(pExact)}</b><span>Uma das ${focus.length} boas alternativas listadas</span><b>${pFormat(pGood)}</b></div><div class="trait-chance-table"><div><b>Tentativas</b><b>Melhor candidata</b><b>Alguma alternativa</b></div>${[5,10,20].map(n=>`<div><span>${n}</span><span>${row(pExact,n)}</span><span>${row(pGood,n)}</span></div>`).join('')}</div><p class="mini-note">Acúmulo ilustrativo supondo sorteios independentes; os rerolls do jogo impedem repetir a combinação exata anterior e podem mudar os resultados. Não é garantia nem previsão exata.</p></div>`;
 }
 if(target.length>1){
  const segments=functions.filter(f=>target.includes(f.id));
  html+=`<details class="trait-by-function"><summary>Consultar as 3 melhores habilidades por função (${segments.length})</summary>${segments.map(fn=>{
   if(name==='C-3PO'&&['craft','credits'].includes(fn.id))return `<section><b>${h(fn.name)}</b><p class="mini-note">Habilidade Perfeita: Em análise. Não há bônus do scanner confirmado para melhorar diretamente a estação. Não recomendamos reroll por essa hipótese.</p></section>`;
   const items=TRAITS.candidates(name,d.rarity,d.role,[fn.id]).filter((x,i,all)=>all.findIndex(y=>y.trait.id===x.trait.id)===i).slice(0,3);
   return `<section><b>${h(fn.name)}</b>${items.map(x=>`<p class="mini-note">${h(x.trait.label)} (${h(traitGradeLabel(x.grade))}) · ${x.odds!=null?(x.odds*100).toFixed(2).replace('.',',')+'% na primeira leitura':'Chance desconhecida'} · ${h(x.fit.label)}</p>`).join('')||'<p class="mini-note">Em análise: nenhuma candidata com benefício comprovado.</p>'}</section>`;
  }).join('')}</details>`;
 }
 html+=`<p class="mini-note">A chance acima corresponde a uma combinação exata de habilidade + classificação na primeira leitura. Repetições impedidas pelos rerolls e atualizações do jogo podem alterar as probabilidades. Fonte independente v${h(TRAITS.version)}, verificada em ${h(TRAITS.checked)}: <a href="${h(TRAITS.SOURCE)}" target="_blank" rel="noopener">Droidex</a>.</p>`;
 return html;
}
function unitAdvice(u){const f=unitFit(u),d=byName[u.name],next=costDisplay(d.rarity,Math.max(1,u.rolls));const opt=TRAITS.candidates(u.name,d.rarity,d.role,u.uses||[]);
 if(u.traitStatus==='unknown')return 'Confira qual habilidade existe nesta unidade antes de investir.';
 if(u.traitStatus==='none')return `Primeira leitura: ${costDisplay(d.rarity,0)}. Confira o valor exibido no jogo antes de gastar.`;
 if(f.label==='Excelente')return `Conservar: combinação excelente. Próxima tentativa: ${next}. Um novo sorteio pode resultar em algo pior.`;
 if(f.score<0)return 'Em análise: dados insuficientes para recomendar gastar recursos.';
 return opt.length?`Há alternativas potencialmente melhores, mas um novo sorteio pode piorar o resultado. Compare o custo real, a chance e seu orçamento. Próxima tentativa: ${next}.`:'Não há alternativa de melhora confirmada para a função escolhida.';
}
function guideAccountRanking(){
 const protectedKeys=new Set(requireCounts().protectedEntries.map(x=>nextId(x.name,x.tier)));
 const available=state.units.filter(u=>u.traitStatus==='known');
 const ordered=available.map(u=>{const f=unitFit(u),d=byName[u.name],best=TRAITS.candidates(u.name,d.rarity,d.role,u.uses||[])[0];
  const cost=TRAITS.price(d.rarity,u.rolls||0),currency=TRAITS.currency(d.rarity),balance=state.finance[currency];
  const room=currency==='nova'&&state.finance.budget!=null?Math.min(balance??Infinity,state.finance.budget):balance;
  const affordability=cost==null?0:room!=null&&room!==Infinity&&room<cost?-18:5;
  const expected=best?.odds==null?0:Math.min(15,Math.round(best.odds*100));
  const p=(u.favorite?100:0)+(f.score<=0?35:f.score===3?20:0)+(best?expected:0)+affordability-(protectedKeys.has(nextId(u.name,u.tier))?15:0);
  return {u,f,best,cost,currency,p};
 }).filter(x=>x.f.score>=0&&x.f.score<5).sort((a,b)=>b.p-a.p||a.u.name.localeCompare(b.u.name,'pt-BR'));
 const first=state.units.filter(u=>u.traitStatus==='none').sort((a,b)=>Number(b.favorite)-Number(a.favorite)).slice(0,12);
 const future=ordered.filter(x=>!x.u.favorite).slice(0,6);
 const makeRow=({u,f,best,cost,currency})=>`<div class="trait-rank-row"><button type="button" data-action="unitProfile" data-id="${h(u.id)}"><b>${u.favorite?'★ ':''}${h(u.name)}</b><small>${h(variantLabel(u.tier))} · ${h(unitTrait(u))}</small><small>Alvo: ${best?h(best.trait.label):'Em análise'} · ${best?.odds!=null?(best.odds*100).toFixed(2).replace('.',',')+'% por leitura inicial':'Chance desconhecida'} · ${cost==null?'Custo a confirmar':nf(cost)+' '+currencyLabel(currency)}</small></button>${badge(f.label,f.score>=3?'blue':'warning')}${btn('Analisar','unitProfile',{kind:'secondary',size:'small',attrs:`data-id="${h(u.id)}"`})}</div>`;
 return `<div class="trait-guide-section"><h3>Prioridades na conta</h3><p class="mini-note">Ranking orientativo: favoritos, função e ganho potencial, chance e custo quando conhecidos. Reservas de Rebirth reduzem a prioridade, sem impedir decisões manuais. Não há trocas automáticas.</p>${ordered.slice(0,12).map(makeRow).join('')||'<p class="muted small">Cadastre habilidades para preencher o ranking.</p>'}</div><div class="trait-guide-section"><h3>Primeira habilidade · ${state.units.filter(u=>u.traitStatus==='none').length}</h3>${first.map(u=>`<div class="trait-rank-row"><b>${h(u.name)} · ${h(variantLabel(u.tier))}</b><small>${h(costDisplay(byName[u.name].rarity,0))}</small>${btn('Registrar','unitProfile',{kind:'secondary',size:'small',attrs:`data-id="${h(u.id)}"`})}</div>`).join('')||'<p class="muted small">Nenhuma unidade marcada como Sem habilidade.</p>'}</div><div class="trait-guide-section"><h3>Potencial futuro</h3>${future.map(makeRow).join('')||'<p class="muted small">Nenhuma oportunidade cadastrada fora dos favoritos.</p>'}</div>`;
}
function guidePage(){
 const term=ui.guideSearch.trim().toLocaleLowerCase('pt-BR');const names=CAT.filter(d=>!term||d.name.toLocaleLowerCase('pt-BR').includes(term));
 const total=state.units.length,scanned=state.units.filter(u=>u.traitStatus==='known').length;
 const header=titlePage('GUIA DE HABILIDADES','Avaliações por unidade e melhores combinações','Habilidades v1.35.1 · tabela comunitária e correção de custos. Progressão preservada da v1.34.0.',`${btn('Saldo e orçamento','traitFinance',{kind:'secondary'})}`);
 return header+`<div class="trait-overview"><div class="card card-pad"><span>Unidades</span><strong>${nf(total)}</strong></div><div class="card card-pad"><span>Habilidades registradas</span><strong>${nf(scanned)}</strong></div><div class="card card-pad"><span>Cristais Nova</span><strong>${financeValue('nova')}</strong></div><div class="card card-pad"><span>Créditos</span><strong>${financeValue('credits')}</strong></div></div><div class="card card-pad trait-guide-card"><h3>Recomendações de melhoria</h3><p class="mini-note">As recomendações não consomem recursos. Uma habilidade pode funcionar apenas como companheiro ou em um terminal específico.</p>${guideAccountRanking()}</div><section class="card card-pad trait-guide-card"><h3>Consultar habilidades dos 100 droids</h3><div class="field"><input class="input" data-input="guideSearch" type="search" placeholder="Pesquisar droid..." value="${h(ui.guideSearch)}" aria-label="Pesquisar droids no guia"></div><div class="trait-catalog">${names.slice(0,100).map(d=>`<button type="button" data-action="guideDroid" data-name="${h(d.name)}"><b>${h(d.name)}</b><small>${h(rarityLabel(d.rarity))} · ${h(roleLabel(d.role))}</small><span>Ver habilidades ›</span></button>`).join('')||'<p class="muted small">Droid não encontrado.</p>'}</div></section><p class="mini-note">Fontes: <a target="_blank" rel="noopener" href="${h(TRAITS.SOURCE)}">habilidades e probabilidades</a> · <a target="_blank" rel="noopener" href="${h(TRAITS.SOURCE_ROLES)}">efeitos dos droids</a>. Probabilidades de primeira leitura são estimativas comunitárias, e os custos em créditos após o patch v1.35.1 ainda precisam ser confirmados. <a target="_blank" rel="noopener" href="https://www.reddit.com/r/StarWarsDroidTycoon/comments/1xagnej/patch_notes_v1351/">Patch 1.35.1</a>.</p>`+footer();
}
function modalUnitPicker(name,tier,field,qty=1){const units=smartUnits(name,tier,unitsFor(name,tier).length);if(qty===1)return `<div class="field"><label>Qual unidade foi usada?</label>${smartUnitSelect(name,tier,field)}</div>`;return `<div class="field"><label>Selecione exatamente ${qty} unidades (Ctrl/tecla de seleção múltipla)</label><select class="select" name="${h(field)}" multiple size="${Math.min(7,Math.max(3,units.length))}">${units.map((u,i)=>`<option value="${h(u.id)}" ${i<qty?'selected':''}>${h(unitName(u))} · ${h(unitTrait(u))}${u.favorite?' ★':''}</option>`).join('')}</select></div>`}
function selectedModalUnits(vals,field,qty,name,tier){const ids=vals.getAll(field).map(String);return selectedUnits(name,tier,qty,ids)}
function ingredientPickers(parts){const hits=new Map();return `<div class="fusion-ingredient-units">${parts.map((p,i)=>{const key=nextId(p.name,p.tier),occ=hits.get(key)||0;hits.set(key,occ+1);return `<div class="field"><label>${h(p.name)} · ${variantLabel(p.tier)} — Unidade ${occ+1}</label>${smartUnitSelect(p.name,p.tier,'ingredient'+i,occ)}</div>`}).join('')}</div><p class="mini-note">Sugestões priorizam habilidades menos valiosas. Você pode alterar cada unidade antes de confirmar.</p>`}
function ingredientSelection(vals,parts){
 const ids=parts.map((p,i)=>String(vals.get('ingredient'+i)||''));
 if(ids.some(id=>!id))throw new Error('Selecione uma unidade cadastrada para cada ingrediente.');
 if(new Set(ids).size!==3)throw new Error('A mesma unidade foi selecionada mais de uma vez. Escolha três unidades individuais diferentes.');
 return parts.map((p,i)=>selectedUnits(p.name,p.tier,1,[ids[i]])[0]);
}
// ===== Fim do módulo de guia =====

function render(){requireCountsCache=null;if(storageError){app.innerHTML=`<div class="card card-pad"><h2>Armazenamento indisponível</h2><p>Não foi possível abrir suas contas: ${h(storageError)}. Seus dados antigos não foram apagados. Não faça novos cadastros neste momento; abra o site no navegador habitual ou restaure um backup em uma instalação funcional.</p></div>`;return}app.innerHTML=ui.tab==='dashboard'?dashboard():ui.tab==='simulator'?simulatorPage():ui.tab==='inventory'?inventory():ui.tab==='pathlist'?fullPathChecklist():ui.tab==='fusion'?fusionPage():ui.tab==='traits'?guidePage():settings();accountHeader();document.querySelectorAll('[data-tab]').forEach(el=>{el.classList.toggle('active',el.dataset.tab===ui.tab);if(el.dataset.tab===ui.tab)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current')});document.getElementById('top-breadcrumb').textContent={dashboard:'Meu caminho',simulator:'Simular caminho e ciclo',inventory:'Minha Base',pathlist:'Lista do caminho',fusion:'Fusões especiais',traits:'Guia de Habilidades',settings:'Configurações'}[ui.tab];renderModal();renderDetail();}
function restoreInputFocus(id,position){const q=document.querySelector(`[data-input="${id}"]`);if(q){q.focus();if(q.setSelectionRange&&position!=null)try{q.setSelectionRange(position,position)}catch(e){}}}
function openModal(kind,props={}){ui.modal={kind,...props};renderModal()}
function modalWrap(title,subtitle,content,buttons){return `<div class="modal-backdrop" data-action="closeBackdrop"><div class="modal" role="dialog" aria-modal="true" aria-label="${h(title)}"><div class="modal-header"><div><h3>${h(title)}</h3><small>${h(subtitle||'')}</small></div><button class="close-btn" type="button" aria-label="Fechar" data-action="close">×</button></div><form id="modal-form" data-form="${h(ui.modal.kind)}"><div class="modal-body">${content}</div><div class="modal-footer">${btn('Cancelar','close',{kind:'ghost'})}${buttons}</div></form></div></div>`}

function renderDetail(){const root=document.getElementById('detail-root');if(!root)return;const name=ui.detail,d=byName[name];if(!name||!d){root.innerHTML='';document.body.classList.remove('drawer-open');return;}
 document.body.classList.add('drawer-open');const tiers=Object.entries(state.inventory[name]||{}).filter(([,qty])=>qty>0).sort((a,b)=>rank(b[0])-rank(a[0]));const selected=tiers.some(x=>x[0]===ui.detailTier)?ui.detailTier:tiers[0]?.[0]||'';
 const amount=selected?(state.inventory[name]?.[selected]||0):0,counts=selected?calcRowCounts(name,selected):{keep:0,sell:0};const occur=allOccurrences(name,ui.pathFilter);
 const requirementDetail=occur.length?occur.map(x=>`<div class="detail-req-row"><span>Caminho ${x.p} · Ciclo ${x.c}</span>${variantBadge(x.tier)}</div>`).join(''):'<p class="muted small">Não exigido nos caminhos selecionados.</p>';
 const variantActions=amount?`<div class="drawer-counts"><span>Guardar <b>${counts.keep}</b></span><span>Pode Vender <b>${counts.sell}</b></span></div><div class="drawer-actions">${btn('Editar','edit',{kind:'secondary',attrs:`data-name="${h(name)}" data-tier="${h(selected)}"`})}${['Kyber','Scourge','Única'].includes(selected)?'':btn('Evoluí','evolve',{kind:'secondary',attrs:`data-name="${h(name)}" data-tier="${h(selected)}"`})}${counts.sell?btn('Registrar venda','sale',{kind:'outline-green',attrs:`data-name="${h(name)}" data-tier="${h(selected)}" data-max="${counts.sell}"` }):''}</div><div class="drawer-remove-line">${btn('Não possuo mais','removeOwned',{kind:'secondary inventory-remove-btn',size:'small',attrs:`data-name="${h(name)}" data-tier="${h(selected)}"`})}</div>`:'';
 const sellCount=selected?counts.sell:saleTotalForDroid(name),reserved=selected?(requireCounts().protectedEntries.find(x=>x.name===name&&x.tier===selected)?.fusionQty||0):0;
 const saleExplanation=!state.path?'Configure seu caminho para calcular quais unidades podem ser vendidas.':!anyOwned(name)?'Você ainda não cadastrou este droid nesta conta.':sellCount?`Você pode vender ${sellCount} unidade(s)${selected?' da variante '+variantText(selected):''} após considerar seu caminho e suas reservas.`:'Nenhuma unidade desta variante está liberada para venda no momento.';
 const detailUpgrade=selected?requireCounts().protectedEntries.find(x=>x.name===name&&x.tier===selected)?.upgrades||[]:[];
 const evolutionAdvisory=detailUpgrade.length?`<div class="evolution-drawer-advice"><strong>⚠ Guardar para evoluir</strong>${detailUpgrade.map(u=>`<div>${nf(u.qty)}× ${variantText(selected)} → ${variantText(u.to)} · Ciclo <b>${u.cycle}</b> · Chips por unidade: <strong>${nf(chips(name,selected,u.to))}</strong></div>`).join('')}<small>Este droid ainda não atende ao requisito. Registre a evolução quando ela acontecer no jogo.</small></div>`:'';
 const saleAdvisory=`<section class="drawer-section sale-advisory"><h3>↗ Pode vender?</h3><div class="advisory-status">${sellCount?badge(`Pode vender ${sellCount}`,'success'):badge(!state.path?'Sem caminho':'Guardar / sem excedentes','warning')}${reserved?badge(`${reserved} reservado(s) para fusão`,'blue'):''}</div>${evolutionAdvisory}<p class="mini-note">${saleExplanation}</p></section>`;
 const fusionAdvisory=`<section class="drawer-section fusion-advisory"><h3>⚗ Fusões especiais</h3>${fusionAlerts(name,selected)}</section>`;
 const naturalFunctions=TRAITS.functionsFor(name,d.role)||[];
 const naturalInfo=`<section class="drawer-section" id="droid-profile"><h3>✦ Perfil do droid</h3><div class="droid-profile-facts"><div><small>Raridade</small><strong>${h(rarityLabel(d.rarity))}</strong></div><div><small>Tipo</small><strong>${h(roleLabel(d.role))}</strong></div><div><small>Na minha base</small><strong>${nf(countOwned(name))} unidade(s)</strong></div></div><div class="natural-info-list"><h4>Funções e bônus naturais conhecidos</h4>${naturalFunctions.length?naturalFunctions.map(f=>`<div class="natural-info-item"><b>${h(f.name)}</b><span>${h(f.detail)}</span></div>`).join(''):'<p class="mini-note">Funções naturais específicas ainda não documentadas.</p>'}</div><p class="mini-note">Informações consultivas, não substituem testes no jogo.</p></section>`;
 const traitInfo=`<section class="drawer-section" id="droid-abilities"><h3>✧ Habilidades e recomendações</h3>${countOwned(name)?'<p class="mini-note">Escolha uma unidade em “Na minha base” para cadastrar ou avaliar a habilidade recebida.</p>':'<p class="mini-note">Cadastre o droid na sua base para acompanhar habilidades individuais.</p>'}${recommendedTraits(name)}</section>`;
 const chipsCalc=d.rarity==='Iconic'?'':`<section class="drawer-section"><h3>Chips para evoluir</h3><div class="field-inline"><div class="field"><label>De</label><select class="select variant-select" data-variant="${h(ui.chipFrom||'Default')}" data-input="chipFrom">${selects(UPGRADE_TIERS.map(value=>({value,label:variantLabel(value)})),ui.chipFrom||'Default')}</select></div><div class="field"><label>Para</label><select class="select variant-select" data-variant="${h(ui.chipTo||'Diamond')}" data-input="chipTo">${selects(UPGRADE_TIERS.map(value=>({value,label:variantLabel(value)})),ui.chipTo||'Diamond')}</select></div></div><p class="mini-note">Chips necessários: <b class="chip-highlight">${nf(chips(name,ui.chipFrom||'Default',ui.chipTo||'Diamond'))}</b></p></section>`;
 const scourgeDetailNote=selected==='Scourge'?`<section class="drawer-section scourge-help"><h3>✺ Flagelo · Scourge</h3><p><strong>Atende qualquer requisito de variante</strong> para este mesmo droid, inclusive Kyber, em todos os caminhos.</p><p class="mini-note">Não pode ser evoluído com chips; não existe Flagelo Icônico. O bônus Colmeia aumenta a renda dos Flagelos posicionados em estações, não a de companheiros ou droids na sala de descanso. Flagelo atende variantes superiores no Rebirth, mas não significa necessariamente mais créditos por segundo do que Kyber. Fusões com Flagelo não são recomendadas automaticamente até confirmação do resultado no jogo.</p></section>`:'';
 const showOwnershipSection=true;
 root.innerHTML=`<div class="detail-backdrop" data-action="closeDetailBackdrop"></div><aside class="detail-drawer" role="dialog" aria-modal="true" aria-label="Detalhes de ${h(name)}"><div class="drawer-handle"></div><div class="drawer-top"><div class="drawer-intro">${imageOf(name,true,selected||"Default")}<div><h2>${h(name)}</h2><div class="muted rarity-meta">${rarityTag(d.rarity)} <span class="role-label">${h(roleLabel(d.role))}</span></div></div></div><button type="button" class="drawer-close" data-action="closeDetail" aria-label="Fechar detalhes">×</button></div><div class="drawer-sections-nav"><a href="#droid-profile">Perfil</a><a href="#droid-abilities">Habilidades</a><a href="#droid-rebirth">Caminhos</a><a href="#droid-fusions">Fusões</a></div><div class="drawer-scroll">${naturalInfo}${scourgeDetailNote}${showOwnershipSection?`<section class="drawer-section"><h3>Na minha base</h3>${tiers.length?`<div class="drawer-variants">${tiers.map(([tier,qty])=>`<button type="button" class="variant-pill ${tier===selected?'on':''}" data-variant="${h(tier)}" data-action="detailTier" data-tier="${h(tier)}">${h(variantLabel(tier))} · ${qty}</button>`).join('')}</div>${variantActions}${selected?detailUnitsHtml(name,selected):''}`:'<p class="muted small">Este droid não está cadastrado.</p>'}${btn('+ Consegui','add',{kind:'secondary',attrs:`data-name="${h(name)}"`})}</section>`:''}${saleAdvisory}<div id="droid-fusions">${fusionAdvisory}</div><div id="droid-rebirth"><section class="drawer-section"><h3>Onde será necessário?</h3><div class="field"><label>Filtrar caminho</label><select class="select" data-input="pathFilter">${selects([{label:'Todos os caminhos',value:0},...Array.from({length:6},(_,i)=>({label:`Caminho ${i+1}`,value:i+1}))],ui.pathFilter)}</select></div><div class="detail-req-list">${requirementDetail}</div></section></div>${traitInfo}${chipsCalc}</div></aside>`;
 root.querySelector('.drawer-close')?.focus({preventScroll:true});
}

function renderModal(){const root=document.getElementById('modal-root');const m=ui.modal;if(!m){root.innerHTML='';return};let title='',subtitle='',content='',buttons='';
 switch(m.kind){
 case 'traitFinance':{
  title='Saldo e orçamento';subtitle='Por conta · atualização manual';
  content=`<p class="mini-note">No patch v1.35.1, <strong>icônicos usam Cristais Nova</strong> e <strong>não icônicos usam créditos</strong>. Os valores atualizados em créditos ainda não foram confirmados: informe o custo real de cada tentativa. Aceita números e sufixos como 500M, 2B e 3T. Campos em branco significam saldo desconhecido.</p>${[['nova','Cristais Nova'],['credits','Créditos'],['budget','Orçamento Nova para tentativas']].map(([k,label])=>`<div class="field"><label>${label}</label><input class="input" type="text" inputmode="decimal" name="${k}" placeholder="Não informado (ex.: 3T)" value="${state.finance[k]??''}"></div>`).join('')}`;
  buttons='<button class="btn" type="submit">Salvar saldo</button>';break;
 }
 case 'guideDroid':{
  const d=byName[m.name];if(!d)return;title='Melhores habilidades: '+m.name;subtitle=`${rarityLabel(d.rarity)} · ${roleLabel(d.role)}`;
  const funcs=TRAITS.functionsFor(m.name,d.role);
  content=`<p class="mini-note">Funções naturais conhecidas:</p>${funcs.map(f=>`<p><b>${h(f.name)}</b><br><small>${h(f.detail)}</small></p>`).join('')}${recommendedTraits(m.name)}<hr><p class="mini-note">Unidades nesta conta: ${unitsFor(m.name).length}. Abra a Minha Base para avaliar cada habilidade recebida.</p>`;
  buttons='<button class="btn" data-action="close" type="button">Fechar</button>';break;
 }
 case 'unitProfile':{
  const u=unitById(m.id);if(!u){ui.modal=null;root.innerHTML='';return}const d=byName[u.name];
  title=`${u.name} · ${variantLabel(u.tier)}`;subtitle='Cadastro individual de habilidade';
  content=`${guideSummary(u)}<div class="field"><label>Apelido (opcional)</label><input class="input" name="nickname" maxlength="60" placeholder="Ex.: C-3PO fabricação" value="${h(u.nickname)}"></div><label class="unit-favorite-check"><input type="checkbox" name="favorite" ${u.favorite?'checked':''}> ★ Marcar esta unidade como favorita</label>${traitFunctionsRow(u)}<div class="field"><label>Situação da habilidade</label><select class="select" name="traitStatus" data-input="traitStatus"><option value="unknown" ${u.traitStatus==='unknown'?'selected':''}>Não verificado</option><option value="none" ${u.traitStatus==='none'?'selected':''}>Sem habilidade (não escaneado)</option><option value="known" ${u.traitStatus==='known'?'selected':''}>Habilidade cadastrada</option></select></div><div data-trait-fields ${u.traitStatus==='known'?'':'hidden'}>${traitPicker(u.name,d.rarity,u.trait,u.grade,u.bonus)}</div>${recommendedTraits(u.name,u.uses)}<div class="trait-advice"><b>Vale trocar?</b><p>${h(unitAdvice(u))}</p></div><div class="unit-profile-actions">${btn('Registrar nova tentativa','unitRoll',{kind:'secondary',attrs:`data-id="${h(u.id)}"`})}${btn('Registrar teste','unitTest',{kind:'secondary',attrs:`data-id="${h(u.id)}"`})}</div>${u.history.length?`<div class="trait-history"><b>Histórico de tentativas</b>${u.history.slice(-20).reverse().map(e=>`<p class="mini-note">${h(e.date?.slice(0,10)||'')} · ${h(e.label||e.trait||'Habilidade alterada')} · ${e.cost==null?'Custo não informado':nf(e.cost)+' '+currencyLabel(e.currency||'nova')}</p>`).join('')}</div>`:''}${u.tests.length?`<div class="trait-history"><b>Testes pessoais</b>${u.tests.slice(-10).reverse().map(e=>`<p class="mini-note">${h(e.date?.slice(0,10)||'')} · ${h(e.function||'Função')} · ${h(e.before)} → ${h(e.after)}${e.note?' · '+h(e.note):''}</p>`).join('')}</div>`:''}`;
  buttons='<button class="btn" type="submit">Salvar unidade</button>';break;
 }
 case 'unitRoll':{
  const u=unitById(m.id);if(!u){ui.modal=null;root.innerHTML='';return}
  const d=byName[u.name],guess=TRAITS.price(d.rarity,Math.max(0,u.rolls)),currency=TRAITS.currency(d.rarity),label=currencyLabel(currency);
  title='Registrar tentativa realizada';subtitle=u.name+' · '+variantLabel(u.tier);
  content=`<p>Registre apenas após escanear o droid <strong>dentro do jogo</strong>. A habilidade anterior será preservada no histórico.</p><div class="hint">Habilidade atual: ${h(unitTrait(u))}. Próxima leitura: ${h(costDisplay(d.rarity,u.rolls))}. ${currency==='credits'?'O novo preço em créditos precisa ser conferido diretamente no jogo.':'O valor de Nova é referência comunitária; confirme na tela do jogo.'}</div>${traitPicker(u.name,d.rarity)}<div class="field"><label>Custo real da tentativa (${label}, opcional)</label><input class="input" name="cost" type="text" inputmode="decimal" placeholder="${currency==='credits'?'Ex.: 3T ou 2500000':'Ex.: 200'}" value="${guess??''}"></div><p class="mini-note">Saldo de ${label} na conta: ${financeValue(currency)}. Se informar o custo, ele será descontado do saldo cadastrado. Caso deixe em branco, a tentativa será registrada sem desconto. Um aviso permitirá registrar mesmo com saldo insuficiente.</p>`;
  buttons='<button class="btn" type="submit">Registrar habilidade e custo</button>';break;
 }
 case 'unitTest':{
  const u=unitById(m.id);if(!u){ui.modal=null;root.innerHTML='';return}title='Registrar teste pessoal';subtitle=u.name+' · '+unitTrait(u);
  content=`<p class="mini-note">Compare as mesmas condições de jogo. Um teste pessoal não comprova uma regra global.</p><div class="field"><label>Local ou função testada</label><input class="input" name="function" required maxlength="100" placeholder="Ex.: estação de créditos"></div><div class="field"><label>Resultado antes</label><input class="input" name="before" maxlength="70" required placeholder="Ex.: 1000 créditos/s"></div><div class="field"><label>Resultado depois</label><input class="input" name="after" maxlength="70" required placeholder="Ex.: 1200 créditos/s"></div><div class="field"><label>Duração e condições / outros bônus (opcional)</label><textarea class="input" name="note" maxlength="450" rows="3"></textarea></div>`;
  buttons='<button class="btn" type="submit">Salvar teste</button>';break;
 }
 case 'createAccount' :{title='Adicionar conta';subtitle='Os dados desta conta serão independentes.';content='<div class="field"><label for="account-name">Nome da nova conta</label><input id="account-name" class="input" name="name" maxlength="40" placeholder="Ex.: Minha segunda conta" required></div><p class="mini-note">Você poderá mudar o nome depois.</p>';buttons='<button class="btn" type="submit">Criar e usar conta</button>';break}
 case 'renameAccount':{const a=accountsDb.accounts.find(a=>a.id===m.id);if(!a){ui.modal=null;root.innerHTML='';return}title='Renomear conta';subtitle=a.name;content=`<div class="field"><label>Nome da conta</label><input class="input" name="name" maxlength="40" value="${h(a.name)}" required></div>`;buttons='<button class="btn" type="submit">Salvar novo nome</button>';break}
 case 'deleteAccount':{const a=accountsDb.accounts.find(a=>a.id===m.id);if(!a){ui.modal=null;root.innerHTML='';return}title='Excluir conta';subtitle=a.name;content=`<p>Esta ação apagará o inventário, progresso, histórico e avisos desta conta neste navegador. As demais contas não serão apagadas.</p><div class="hint"><strong>Recomendamos exportar o backup de todas as contas antes.</strong> A exclusão não tem botão de desfazer.</div><div class="field" style="margin-top:15px"><label>Digite <strong>${h(a.name)}</strong> para confirmar</label><input class="input" name="confirmName" autocomplete="off" required></div>`;buttons='<button class="btn danger" type="submit">Excluir conta definitivamente</button>';break}
 case 'add':{const d=byName[m.name],duplicate=isIconic(m.name)&&anyOwned(m.name);title=`Cadastrar ${m.name}`;subtitle=duplicate?'Este Icônico já está cadastrado nesta conta.':'Informe o que você conseguiu no jogo.';content=duplicate?`<div class="hint removal-warning">${h(iconicLimitMessage(m.name))} Para alterar a habilidade, abra a unidade existente em Minha Base.</div>`:`<div class="field"><label>Variante</label>${tierSelect(validTier(m.name,m.tier)?m.tier:(d?.rarity==='Iconic'?'Única':'Default'),d?.rarity==='Iconic','tier')}</div><div class="field"><label>Quantidade</label><input class="input" type="number" name="qty" min="1" max="${isIconic(m.name)?1:100000}" value="1" required></div>`;buttons=duplicate?'':`<button class="btn" type="submit">Salvar droid</button>`;break}
 case 'edit':{title=`Editar ${m.name}`;subtitle=`Variante atual: ${variantLabel(m.tier)}`;content=`<div class="field"><label>Variante</label>${tierSelect(m.tier,byName[m.name]?.rarity==='Iconic','tier')}</div><div class="field"><label>Quantidade total</label><input class="input" type="number" min="1" max="${isIconic(m.name)?Math.max(1,countOwned(m.name)):100000}" name="qty" value="${state.inventory[m.name]?.[m.tier]||0}" required></div><div class="hint">Editar corrige o cadastro. Não registra venda nem consumo de chips.</div>`;buttons=`${btn('Excluir cadastro','delete',{kind:'danger'})}<button class="btn" type="submit">Salvar alterações</button>`;break}
 case 'evolve':{const options=UPGRADE_TIERS.slice(rank(m.tier)+1);title=`Evoluí ${m.name}`;subtitle=`Variante atual: ${variantLabel(m.tier)}`;content=`<div class="field"><label>Variante alcançada</label><select class="select variant-select" data-variant="${h(ui.evolveDestination&&options.includes(ui.evolveDestination)?ui.evolveDestination:options[0])}" name="tier" id="evolve-tier" data-input="evolveDestination">${selects(options.map(value=>({value,label:variantLabel(value)})),ui.evolveDestination&&options.includes(ui.evolveDestination)?ui.evolveDestination:options[0])}</select></div><div class="field"><label>Quantidade evoluída (máx. ${state.inventory[m.name]?.[m.tier]||0})</label><input class="input" name="qty" min="1" max="1" type="number" value="1" required></div><div class="hint">Chips para uma unidade: <strong class="chip-highlight" id="evolve-cost">${nf(chips(m.name,m.tier,ui.evolveDestination&&options.includes(ui.evolveDestination)?ui.evolveDestination:options[0]))}</strong>. O aplicativo apenas registra a evolução feita no jogo.</div>${modalUnitPicker(m.name,m.tier,'unitIds',1)}<p class="mini-note">Para evoluir várias unidades, faça uma por vez, escolhendo qual será usada. A habilidade do resultado ficará pendente.</p>`;buttons=`<button class="btn" type="submit">Confirmar evolução</button>`;break}
 case 'removeOwned':{
  const current=state.inventory[m.name]?.[m.tier]||0;
  if(!current){ui.modal=null;root.innerHTML='';return}
  const reserved=fusionPlanNeeds()[nextId(m.name,m.tier)]||0;
  const required=calcRowCounts(m.name,m.tier).keep;
  title=`Não possuo mais: ${m.name}`;subtitle=`${variantLabel(m.tier)} · ${current} unidade(s) cadastrada(s)`;
  content=`<p>Retire do cadastro os droids que <strong>já não estão na sua base</strong>, mesmo que ainda sejam necessários no caminho.</p><div class="field"><label>Quantas unidades quer retirar?</label><input class="input" name="qty" min="1" max="${unitsFor(m.name,m.tier).some(u=>u.traitStatus==='known'||u.favorite)?1:current}" type="number" value="${unitsFor(m.name,m.tier).some(u=>u.traitStatus==='known'||u.favorite)?1:current}" required></div>${unitsFor(m.name,m.tier).some(u=>u.traitStatus==='known'||u.favorite)?modalUnitPicker(m.name,m.tier,'unitId'): ''}<div class="hint">Esta ação atualiza apenas o inventário de <strong>${h(currentAccount().name)}</strong>. Não registra uma venda nem apaga os requisitos do caminho. Você poderá desfazer logo depois de confirmar.</div>${required?`<div class="hint removal-warning">⚠ Este droid pode ser necessário no seu caminho. Ao retirá-lo, ele voltará a aparecer como pendência quando aplicável.</div>`:''}${reserved?`<div class="hint removal-warning">⚗ Existem <strong>${reserved}</strong> unidade(s) reservada(s) para fusão desta variante. As reservas que ficarem sem ingredientes serão canceladas automaticamente.</div>`:''}`;
  buttons='<button class="btn danger" type="submit">Confirmar retirada</button>';break;
 }
 case 'sale':{title=`Registrar venda: ${m.name}`;subtitle=`${variantLabel(m.tier)} · ${m.max} unidade(s) liberada(s)`;content=`<div class="field"><label>Quantidade vendida</label><input class="input" name="qty" min="1" max="${unitsFor(m.name,m.tier).some(u=>u.traitStatus==='known'||u.favorite)?1:m.max}" type="number" value="1" required></div>${modalUnitPicker(m.name,m.tier,'unitId',1)}<div class="hint"><strong>Importante:</strong> “Pode Vender” é uma indicação de progressão. A decisão de vender pode afetar renda, coleção ou fusão.</div>`;buttons=`<button class="btn" type="submit">Registrar venda</button>`;break}
 case 'cycle':{title='Corrigir meu ciclo';subtitle=`Caminho ${state.path}`;content=`<div class="field"><label>Ciclo em que está atualmente</label><select class="select" name="cycle">${selects(Array.from({length:40},(_,i)=>({label:`Ciclo ${i+1}`,value:i+1})),state.cycle)}</select></div><div class="hint">O inventário será preservado e as recomendações recalculadas. Ciclos pulados não serão marcados automaticamente como concluídos.</div>`;buttons=`<button class="btn" type="submit">Confirmar novo ciclo</button>`;break}
 case 'advance':{const bad=stageBuckets();title=state.cycle===40?'Concluir o caminho':'Avançar de ciclo';subtitle=`Caminho ${state.path} · Ciclo ${state.cycle}`;content=`<p>${(bad.confirmed.length+bad.unknown.length)?`Ainda existem <strong>${(bad.confirmed.length+bad.unknown.length)} pendência(s)</strong> no cadastro. Você pode avançar se já concluiu a etapa dentro do jogo.`:'Todos os requisitos constam como atendidos no cadastro.'}</p><div class="hint">Seus droids serão preservados. Confirme somente se concluiu esse ciclo no jogo.</div>`;buttons=`<button class="btn" type="submit">${state.cycle===40?'Registrar conclusão':'Confirmar avanço'}</button>`;break}
 case 'changePath':{title='Trocar de caminho';subtitle='Esta ação reiniciará o inventário ativo.';content=`<div class="field"><label>Novo caminho</label><select class="select" name="path">${selects(Array.from({length:6},(_,i)=>({value:i+1,label:`Caminho ${i+1}`})).filter(a=>a.value!==state.path),state.path===1?2:1)}</select></div><div class="hint"><strong>Atenção:</strong> o inventário atual será arquivado em uma cópia de segurança e zerado no novo caminho. O histórico resumido será mantido.</div>`;buttons=`<button class="btn danger" type="submit">Confirmar mudança</button>`;break}
 case 'restore':{
  title='Importar backup';const d=m.preview;
  if(m.format==='multi'){
   const collision=overwriteList(d.accounts),fresh=d.accounts.length-collision.length;
   subtitle=d.accounts.length===1?'Backup de uma conta':'Backup com '+d.accounts.length+' contas';
   content=`<p>As contas serão importadas <strong>com os mesmos nomes do backup</strong>:</p><div class="restore-account-list">${d.accounts.map(a=>{const exists=!!accountByName(a.name);return `<div class="details-line"><div><strong>${h(a.name)}</strong><br><span>Caminho ${a.data.path||'—'} · ${nf(arrInventory(a.data).reduce((n,e)=>n+e.qty,0))} droids</span></div>${badge(exists?'Já existe — substituir':'Nova conta',exists?'warning':'success')}</div>`}).join('')}</div><div class="hint"><strong>${collision.length} conta(s) existente(s)</strong> serão substituídas somente após sua confirmação; <strong>${fresh}</strong> conta(s) serão adicionadas. As outras contas deste navegador serão mantidas. Uma cópia será guardada para desfazer.</div>`;
   buttons=`<button class="btn ${collision.length?'danger':''}" type="submit">${collision.length?'Confirmar importação':'Importar conta(s)'}</button>`;
  }else{
   subtitle='Backup antigo de uma conta';const proposed=m.legacyName||uniqueImportName();
   content=`<div class="details-list"><div class="details-line"><span>Caminho / Ciclo</span><b>${d.path||'Não configurado'} / ${d.cycle}</b></div><div class="details-line"><span>Droids cadastrados</span><b>${arrInventory(d).reduce((a,b)=>a+b.qty,0)}</b></div></div><div class="field" style="margin-top:16px"><label>Nome da conta importada</label><input class="input" maxlength="40" name="name" value="${h(proposed)}" required></div><div class="hint">Este formato antigo não registra necessariamente o nome da conta. Confira ou informe o nome correto. Se ele já existir, pediremos confirmação antes de substituir. As outras contas serão mantidas.</div>`;
   buttons='<button class="btn" type="submit">Importar esta conta</button>';
  }break;
 }
 case 'auditImages':{title='Verificar imagens dos droids';subtitle='Conferência dos 100 droids do catálogo';content='<p class="small muted">Este teste tenta carregar cada foto no seu navegador. Uma falha pode ser causada pela conexão, por bloqueio do site da imagem ou por arquivo inexistente.</p><div class="image-audit-summary" id="image-audit-summary" role="status">Preparando teste...</div><div class="image-audit-track" aria-hidden="true"><div id="image-audit-fill"></div></div><div id="image-audit-errors" class="image-audit-errors"></div>';buttons=`${btn('Testar novamente','restartImageAudit',{kind:'secondary'})}${btn('Copiar falhas','copyImageIssues',{kind:'ghost'})}`;break}
 case 'fusionConfirm':{
  const recipe=FUSION_BY_ID[m.id];if(!recipe){ui.modal=null;root.innerHTML='';return}
  const availability=fusionAvailability(recipe,m.tiers),warnings=fusionRisks(recipe,m.tiers);
  title=`Confirmar fusão: ${recipe.id}`;subtitle='Registre apenas depois de realizar no jogo.';
  content=`<p>Esta operação retirará exatamente <strong>3 droids</strong> do inventário da conta <strong>${h(currentAccount().name)}</strong> e adicionará <strong>1 ${h(recipe.id)} · ${variantText(availability.tier)}</strong>.</p><div class="fusion-confirm-list">${recipe.parts.map((name,i)=>`<div class="details-line"><span>${h(name)}</span><b>${variantText(m.tiers[i])}</b></div>`).join('')}</div>${ingredientPickers(recipe.parts.map((name,i)=>({name,tier:m.tiers[i]})))}${warnings.length?`<div class="hint fusion-warning"><strong>Atenção ao seu renascimento!</strong> Consumir estes ingredientes pode prejudicar requisitos do seu caminho: ${h(warnings.join(', '))}. Confirme apenas se decidiu usá-los mesmo assim.</div>`:'<div class="hint">Os ingredientes serão consumidos no cadastro. Você poderá desfazer a alteração pelo aviso na tela.</div>'}${availability.ready?'':'<div class="hint fusion-warning">Os ingredientes não estão mais disponíveis. Cancele e confira seu inventário.</div>'}`;
  buttons=`<button class="btn" type="submit" ${availability.ready?'':'disabled'}>Sim, já fiz esta fusão</button>`;break;
 }
 case 'genericConfirm':{
  const result=genericPlanResult(m.fusionKind,m.parts),ready=!!result&&planIsFree(m.parts,m.planId?'g:'+m.planId:'');
  if(!result){ui.modal=null;root.innerHTML='';return}
  title='Registrar fusão realizada';subtitle='Somente depois de realizar a combinação dentro do jogo.';
  const eligible=result.random?CAT.filter(d=>d.rarity===result.rarity&&!FUSION_BY_ID[d.name]).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')):[];
  content=`<p>Esta operação <strong>retira 3 unidades</strong> da base de ${h(currentAccount().name)} e adiciona 1 resultado.</p><div class="fusion-confirm-list">${m.parts.map(p=>`<div class="details-line"><span>${h(p.name)}</span><b>${variantText(p.tier)}</b></div>`).join('')}</div><div class="hint">Resultado esperado: <strong>${result.random?'Droid '+h(rarityLabel(result.rarity))+' aleatório':h(result.name)} · ${variantText(result.tier)}</strong>.</div>${ingredientPickers(m.parts)}${result.random?`<div class="field"><label>Qual droid você realmente recebeu?</label><select class="select" name="resultName" required><option value="">Selecione o resultado...</option>${selects(eligible.map(d=>({value:d.name,label:d.name})),'')}</select></div>`:''}<p class="mini-note">Se o jogo indicar um resultado diferente, cancele e confira a combinação antes de registrar. Você poderá desfazer após confirmar.</p>${ready?'':'<div class="hint fusion-warning">Ingredientes indisponíveis: verifique suas reservas.</div>'}`;
  buttons=`<button class="btn" type="submit" ${ready?'':'disabled'}>Confirmar fusão realizada</button>`;break;
 }
 case 'delete':{title=`Excluir ${m.name}`;subtitle=`Variante ${variantLabel(m.tier)}`;content='<p>Deseja realmente excluir este cadastro? Se foi uma venda, use o botão “Registrar venda” na lista de excedentes.</p>';buttons='<button class="btn danger" type="submit">Excluir</button>';break}
 default:root.innerHTML='';return;
 }root.innerHTML=modalWrap(title,subtitle,content,buttons);root.querySelector('input,select,button[type=submit]')?.focus();}
// Diagnóstico executado no próprio navegador: a ferramenta não acessa inventário nem faz requisições autenticadas.
const imageAudit={runId:0,done:0,ok:0,issues:[],running:false};
function auditStatus(){
 if(ui.modal?.kind!=='auditImages')return;
 const summary=document.getElementById('image-audit-summary'),fill=document.getElementById('image-audit-fill'),issues=document.getElementById('image-audit-errors');
 if(!summary||!fill||!issues)return;
 const total=CAT.length;
 summary.textContent=imageAudit.running?`${imageAudit.done} de ${total} testados · ${imageAudit.ok} carregaram · ${imageAudit.issues.length} ${imageAudit.issues.length===1?'falhou':'falharam'}`:imageAudit.done===total?`Teste concluído: ${imageAudit.ok} carregaram e ${imageAudit.issues.length} ${imageAudit.issues.length===1?'falhou':'falharam'}.`:'Pronto para iniciar.';
 fill.style.width=`${Math.round((imageAudit.done/total)*100)}%`;
 if(imageAudit.issues.length){
  issues.innerHTML='<strong>Imagens que não carregaram:</strong><ul>'+imageAudit.issues.map(x=>`<li><b>${h(x.name)}</b> · ${h(x.reason)} <a href="${h(x.url)}" target="_blank" rel="noopener noreferrer">Abrir endereço</a></li>`).join('')+'</ul>';
 }else issues.innerHTML=imageAudit.done===total?'<span class="audit-success">Nenhuma falha identificada nesta conexão.</span>':'';
}
function checkImage(name,waitMs=14000){return new Promise(resolve=>{
 const img=new Image();let done=false;
 const complete=(reason)=>{if(done)return;done=true;clearTimeout(timer);img.onload=null;img.onerror=null;resolve(reason)};
 const timer=setTimeout(()=>complete('Tempo esgotado'),waitMs);
 img.onload=()=>complete(null);
 img.onerror=()=>complete('Erro ao carregar');
 img.referrerPolicy='no-referrer';img.src=imageUrl(name);
 if(img.complete){if(img.naturalWidth)complete(null);}
})}
async function runImageAudit(){
 const runId=++imageAudit.runId;imageAudit.done=0;imageAudit.ok=0;imageAudit.issues=[];imageAudit.running=true;auditStatus();
 let next=0;
 const worker=async()=>{
  while(runId===imageAudit.runId&&ui.modal?.kind==='auditImages'&&next<CAT.length){
   const d=CAT[next++];const error=await checkImage(d.name);
   if(runId!==imageAudit.runId||ui.modal?.kind!=='auditImages')return;
   imageAudit.done++;if(error)imageAudit.issues.push({name:d.name,url:imageUrl(d.name),reason:error});else imageAudit.ok++;
   auditStatus();
  }
 };
 await Promise.all(Array.from({length:8},worker));
 if(runId===imageAudit.runId){imageAudit.running=false;auditStatus();}
}
// Ao retirar um ingrediente da base, reservas que excedam o saldo real são canceladas.
function clearBrokenFusionReservations(){
 const committed={},released=[];
 for(const [id,plan] of Object.entries(state.fusions.plans)){
  const recipe=FUSION_BY_ID[id];if(!recipe||!plan||!Array.isArray(plan.tiers))continue;
  const wants={};recipe.parts.forEach((name,i)=>{const k=nextId(name,plan.tiers[i]);wants[k]=(wants[k]||0)+1});
  const exceeds=Object.entries(wants).some(([key,amount])=>{
   const i=key.lastIndexOf('::'),name=key.slice(0,i),tier=key.slice(i+2);
   return (committed[key]||0)+amount>(state.inventory[name]?.[tier]||0);
  });
  if(exceeds){delete state.fusions.plans[id];released.push(id)}
  else for(const [key,amount] of Object.entries(wants))committed[key]=(committed[key]||0)+amount;
 }
 state.fusions.genericPlans=(state.fusions.genericPlans||[]).filter(plan=>{
  const wants={};for(const p of plan.parts){const key=nextId(p.name,p.tier);wants[key]=(wants[key]||0)+1;}
  const valid=Object.entries(wants).every(([key,qty])=>{const i=key.lastIndexOf('::'),name=key.slice(0,i),tier=key.slice(i+2);return (committed[key]||0)+qty<=(state.inventory[name]?.[tier]||0)});
  if(valid)for(const [key,qty] of Object.entries(wants))committed[key]=(committed[key]||0)+qty;
  else released.push('sugestão de fusão');
  return valid;
 });
 return released;
}
function mutateInventory(name,tier,delta,ids=null,reason='alteração do inventário'){
 if(!validName(name)||!validTier(name,tier)||!Number.isSafeInteger(delta))throw new Error('Inventário inválido.');
 const old=state.inventory[name]?.[tier]||0;
 if(delta>0&&!canRegister(name,delta))throw new Error(iconicLimitMessage(name));
 if(old+delta<0||old+delta>100000)throw new Error('Quantidade indisponível para movimentação.');
 if(delta<0)removeUnits(name,tier,-delta,ids,reason);
 if(delta>0)for(let i=0;i<delta;i++)state.units.push(bareUnit(name,tier));
 const tiers=(state.inventory[name]??={});tiers[tier]=old+delta;
 if(!tiers[tier])delete tiers[tier];if(!Object.keys(tiers).length)delete state.inventory[name];
 if(delta>0)delete state.absent[name];
}
function nInt(value,min,max){const x=Number(value);return Number.isSafeInteger(x)&&x>=min&&x<=max?x:null}
function downloadBackup(payload,filename,message){
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);notify(message);
}
function exportBackup(onlyCurrent=false){
 if(!writeAccounts())return;
 const now=new Date(),date=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
 const stamp=date+'_'+String(now.getHours()).padStart(2,'0')+'-'+String(now.getMinutes()).padStart(2,'0');
 const selected=onlyCurrent?[currentAccount()]:accountsDb.accounts;
 const name=onlyCurrent?backupFilenamePart(currentAccount().name):'todas-contas';
 const payload={schema:2,activeId:onlyCurrent?currentAccount().id:accountsDb.activeId,accounts:selected,customTraits:accountsDb.customTraits||[],exportedAt:now.toISOString(),app:'Droid Tycoon'};
 downloadBackup(payload,`droid-tycoon-${name}-${stamp}.json`,onlyCurrent?`Backup de ${currentAccount().name} exportado.`:'Backup completo exportado com os nomes das contas.');
}
function submitModal(form){const m=ui.modal;if(!m)return;const vals=new FormData(form);const qty=nInt(vals.get('qty'),1,100000);let text='';switch(m.kind){
 case 'traitFinance':{
  const data={};for(const k of ['nova','credits','budget']){
   const v=String(vals.get(k)||'').trim();data[k]=parseGameMoney(v);
   if(v&&(!Number.isFinite(data[k])||data[k]<0))return notify('Informe um saldo válido, como 200, 2B ou 3T.');
  }
  save(()=>{ensureNova();if(data.nova!==null){const delta=data.nova-novaBalance(state.novaLedger);if(delta!==0)novaAppend(delta>0?'in':'out',Math.abs(delta),'Ajuste de saldo informado','adjustment')}state.finance={...state.finance,credits:data.credits,budget:data.budget,nova:novaBalance(state.novaLedger)}},'Saldo da conta atualizado.');break;
 }
 case 'unitProfile':{
  const u=unitById(m.id);if(!u)return notify('Unidade não encontrada nesta conta.');
  const status=String(vals.get('traitStatus')||'unknown'),oldTrait=u.trait;
  if(!['unknown','none','known'].includes(status))return notify('Estado inválido.');
  const chosen=status==='known'?selectedTraitData(vals,u):null;
  if(chosen?.error)return notify(chosen.error);
  const uses=vals.getAll('uses').filter(x=>TRAITS.functionsFor(u.name,byName[u.name].role).some(f=>f.id===x));
  save(()=>{u.nickname=String(vals.get('nickname')||'').trim().slice(0,60);u.favorite=vals.has('favorite');u.uses=uses;
   const trait=status==='known'?saveNewCustomTrait(chosen):'';
   u.traitStatus=status;u.trait=trait;u.grade=status==='known'?chosen.grade:'';u.bonus=status==='known'?chosen.bonus:'';
   if(status==='known'&&oldTrait!==trait)u.history.push({date:new Date().toISOString(),label:'Cadastro/correção manual: '+unitTrait(u),cost:0});
   u.history=u.history.slice(-80);
  },'Informações desta unidade atualizadas.');break;
 }
 case 'unitRoll':{
  const u=unitById(m.id);if(!u)return notify('Unidade não encontrada.');
  const selection=selectedTraitData(vals,u);
  if(selection.error)return notify(selection.error);
  const costValue=String(vals.get('cost')||'').trim(),cost=parseGameMoney(costValue);
  if(costValue&&(!Number.isFinite(cost)||cost<0))return notify('Informe um custo válido.');
  const currency=TRAITS.currency(byName[u.name].rarity),label=currencyLabel(currency),balance=state.finance[currency];
  if(cost!=null&&balance!=null&&balance<cost&&!window.confirm(`Seu saldo informado (${nf(balance)} ${label}) é menor que o custo (${nf(cost)} ${label}). Registrar a tentativa e zerar o saldo estimado? Depois você poderá corrigir o valor.`))return;
  save(()=>{
   const trait=saveNewCustomTrait(selection),grade=selection.grade;
   u.history.push({date:new Date().toISOString(),from:u.traitStatus==='known'?u.trait:'Não verificado',trait,grade,label:'Tentativa: '+(TRAITS.byId[trait]?.label||accountsDb.customTraits.find(x=>x.id===trait)?.name||trait),cost,currency});u.history=u.history.slice(-80);
   u.rolls++;u.traitStatus='known';u.trait=trait;u.grade=grade;u.bonus=selection.bonus;
   if(cost!=null&&state.finance[currency]!=null){if(currency==='nova'){ensureNova();if(cost>novaBalance(state.novaLedger))throw Error('Saldo Nova insuficiente. Atualize a carteira antes de registrar esta tentativa.');if(cost>0)novaAppend('out',cost,`Scanner de habilidade · ${u.name}`,'scanner');}else state.finance[currency]=Math.max(0,state.finance[currency]-cost);}
   state.financeLedger.push({date:new Date().toISOString(),unitId:u.id,spent:cost,currency,shortage:cost!=null&&balance!=null?Math.max(0,cost-balance):null});state.financeLedger=state.financeLedger.slice(-200);
   opRecord('tentativa',[u],{cost,currency});
  },'Nova habilidade e custo registrados.');break;
 }
 case 'unitTest':{
  const u=unitById(m.id);if(!u)return notify('Unidade não encontrada.');
  const fn=String(vals.get('function')||'').trim().slice(0,100),before=String(vals.get('before')||'').trim().slice(0,70),after=String(vals.get('after')||'').trim().slice(0,70);
  if(!fn||!before||!after)return notify('Informe a função e os resultados antes e depois.');
  save(()=>{u.tests.push({date:new Date().toISOString(),function:fn,before,after,note:String(vals.get('note')||'').slice(0,450)});u.tests=u.tests.slice(-50)},'Teste pessoal registrado.');break;
 }
 case 'guideDroid':ui.modal=null;render();return;

 case 'add':{const tier=String(vals.get('tier'));if(!qty||!validTier(m.name,tier))return notify('Informe uma variante e quantidade válidas.');save(()=>mutateInventory(m.name,tier,qty),`${m.name} cadastrado.`);break}
 case 'edit':{
  const tier=String(vals.get('tier'));if(!qty||!validTier(m.name,tier))return notify('Informe dados válidos.');
  if(isIconic(m.name)&&qty>Math.max(1,countOwned(m.name)))return notify(iconicLimitMessage(m.name));
  const old=state.inventory[m.name]?.[m.tier]||0;
  if(old&&tier!==m.tier&&unitsFor(m.name,m.tier).some(u=>u.traitStatus==='known'||u.favorite)&&!window.confirm('Mudar a variante pelo modo Editar cria novas unidades com habilidades pendentes. Prefira o botão Evoluí para escolher a unidade. Continuar?'))return;
  save(()=>{if(tier===m.tier)mutateInventory(m.name,tier,qty-old);else{mutateInventory(m.name,m.tier,-old);mutateInventory(m.name,tier,qty)}},'Cadastro atualizado.');break;
 }
 case 'evolve':{
  const tier=String(vals.get('tier')),current=state.inventory[m.name]?.[m.tier]||0;
  if(!qty||qty!==1||qty>current||!UPGRADE_TIERS.includes(tier)||!UPGRADE_TIERS.includes(m.tier)||rank(tier)<=rank(m.tier))return notify('Flagelo não pode ser obtido ou evoluído com chips. Confira a variante e evolua uma unidade por vez.');
  let chosen;try{chosen=selectedModalUnits(vals,'unitIds',1,m.name,m.tier)}catch(e){return notify(e.message)}
  if(!ensureValuableConsent(chosen,'evoluir e redefinir a habilidade como pendente'))return;
  save(()=>{mutateInventory(m.name,m.tier,-1,chosen.map(u=>u.id),'evolução');mutateInventory(m.name,tier,1);opRecord('evolução',chosen,{result:state.units[state.units.length-1]?.id})},`Evolução registrada: ${m.name} → ${variantLabel(tier)}. Habilidade pendente.`);break;
 }
 case 'removeOwned':{
  const current=state.inventory[m.name]?.[m.tier]||0;
  if(!qty||!current||qty>current)return notify('Confira a quantidade: ela não pode ultrapassar o que você tem cadastrado.');
  let chosen;try{chosen=selectedUnits(m.name,m.tier,qty,vals.get('unitId')?[String(vals.get('unitId'))]:null)}catch(err){return notify(err.message)}
  if(!ensureValuableConsent(chosen,'retirar do inventário'))return;
  let released=[];
  save(()=>{
   mutateInventory(m.name,m.tier,-qty,chosen.map(u=>u.id),'retirada manual');opRecord('retirada',chosen);
   released=clearBrokenFusionReservations();
   if(!anyOwned(m.name))state.absent[m.name]=true;
   state.removals??=[];
   state.removals.push({name:m.name,tier:m.tier,qty,date:new Date().toISOString()});
   state.removals=state.removals.slice(-100);
  },`${qty} unidade(s) de ${m.name} retirada(s) do inventário.${released.length?' Reservas canceladas: '+released.join(', ')+'.':''}`);
  if(!anyOwned(m.name)&&ui.tab==='inventory'){ui.detail='';renderDetail()}
  break;
 }
 case 'sale':{
  const current=state.inventory[m.name]?.[m.tier]||0,allowed=requireCounts().saleEntries.find(e=>e.name===m.name&&e.tier===m.tier)?.qty||0;
  if(!qty||qty>current||qty>allowed)return notify('A quantidade excede o que está liberado para venda.');
  const specialized=unitsFor(m.name,m.tier).some(u=>u.traitStatus==='known'||u.favorite);
  if(specialized&&qty!==1)return notify('Para proteger habilidades, registre uma unidade por vez.');
  const ids=qty===1?[String(vals.get('unitId')||'')]:null;
  let chosen;try{chosen=selectedUnits(m.name,m.tier,qty,ids)}catch(e){return notify(e.message)}
  if(!ensureValuableConsent(chosen,'vender'))return;
  save(()=>{mutateInventory(m.name,m.tier,-qty,chosen.map(u=>u.id),'venda');opRecord('venda',chosen);state.sales.push({name:m.name,tier:m.tier,qty,date:new Date().toISOString()});state.sales=state.sales.slice(-30)},'Venda registrada. Você pode desfazer.');break;
 }
 case 'cycle':{const cycle=nInt(vals.get('cycle'),1,40);if(!cycle)return;save(()=>{state.cycle=cycle},`Ciclo atualizado para ${cycle}.`);break}
 case 'advance':{const final=state.cycle===40;if(final&&state.completed.some(x=>x.path===state.path&&x.cycle===40))return;save(()=>{const currentPath=state.path,currentCycle=state.cycle;const already=state.completed.some(x=>x.path===currentPath&&x.cycle===currentCycle);if(already)throw Error('Ciclo já concluído e registrado.');state.completed.push({path:currentPath,cycle:currentCycle});const reward=NOVA_REWARDS[currentCycle]||0;if(reward)novaAppend('in',reward,`Rebirth automático · Caminho ${currentPath} · Ciclo ${currentCycle}`,'rebirth',`nova-rebirth:${currentPath}:${currentCycle}`,currentPath,currentCycle);if(final){state.history.push({path:state.path,cycle:40,date:new Date().toLocaleDateString('pt-BR'),finished:true,inventory:JSON.parse(JSON.stringify(state.inventory))});state.history=state.history.slice(-30)}else state.cycle++},final?'Caminho concluído!':'Ciclo atualizado.');break}
 case 'changePath':{const p=nInt(vals.get('path'),1,6);if(!p||p===state.path)return;try{localStorage.setItem(RESTORE,JSON.stringify(state))}catch(e){};save(()=>{for(const u of state.units)archiveUnit(u,'mudança de caminho');state.history.push({path:state.path,cycle:state.cycle,date:new Date().toLocaleDateString('pt-BR'),inventory:JSON.parse(JSON.stringify(state.inventory))});state.path=p;state.cycle=1;state.inventory={};state.units=[];state.absent={};state.completed=[];state.sales=[];state.fusions.plans={};state.fusions.genericPlans=[];state.history=state.history.slice(-30)},`Caminho ${p} iniciado. Inventário reiniciado.`);ui.open=new Set(['pending']);break}
 case 'createAccount':{
  const name=validAccountName(vals.get('name'));if(!name||!nameAvailable(name))return notify('Use um nome diferente, com até 40 caracteres.');
  if(!writeAccounts())return;
  const a={id:newId(),name,data:empty(),notices:{}};accountsDb.accounts.push(a);
  if(!writeAccounts()){accountsDb.accounts.pop();return}
  activateAccount(a.id);notify('Conta '+name+' criada. Escolha seu caminho e ciclo para começar.');break;
 }
 case 'renameAccount':{
  const target=accountsDb.accounts.find(a=>a.id===m.id),name=validAccountName(vals.get('name'));
  if(!target||!name||!nameAvailable(name,m.id))return notify('Escolha um nome válido e não utilizado.');
  const before=target.name;target.name=name;
  if(!writeAccounts()){target.name=before;return}
  notify('Conta renomeada para '+name+'.');break;
 }
 case 'deleteAccount':{
  const target=accountsDb.accounts.find(a=>a.id===m.id);
  if(!target||accountsDb.accounts.length<=1)return notify('É necessário manter pelo menos uma conta.');
  if(String(vals.get('confirmName')||'').trim()!==target.name)return notify('Digite exatamente o nome da conta para confirmar.');
  if(!writeAccounts())return;
  const previous=accountsDb;
  const remaining=accountsDb.accounts.filter(a=>a.id!==target.id);
  accountsDb={...accountsDb,accounts:remaining,activeId:target.id===accountsDb.activeId?remaining[0].id:accountsDb.activeId};
  if(!saveAccountsBlob()){accountsDb=previous;return}
  resetAccountView();notify('Conta excluída: '+target.name+'.');break;
 }
 case 'restore':{
  let incoming=[];
  if(m.format==='multi')incoming=incomingAccountList(m.preview,'multi');
  else {
   const name=validAccountName(vals.get('name'));
   if(!name)return notify('Informe um nome de conta válido, com até 40 caracteres.');
   incoming=incomingAccountList(m.preview,'legacy',name,m.legacyNotices);
  }
  // Explicit consent happens BEFORE any import or snapshot is saved.
  const conflicts=overwriteList(incoming);
  if(conflicts.length){
   const names=conflicts.map(name=>'• '+name).join('\n');
   if(!window.confirm('ATENÇÃO: já existe(m) conta(s) com o mesmo nome:\n'+names+'\n\nDeseja SUBSTITUIR todos os dados dessas contas pelos dados do backup? Essa alteração poderá ser desfeita em Configurações.'))return;
  }
  if(!writeAccounts()||!saveUndoSnapshot())return;
  const previous=accountsDb;
  try{accountsDb=mergeBackupAccounts(incoming,m.format==='legacy'||(m.format==='multi'&&incoming.length===1));if(m.format==='multi')for(const t of (m.preview.customTraits||[]))if(!accountsDb.customTraits.some(x=>x.id===t.id||x.name.toLowerCase()===t.name.toLowerCase()))accountsDb.customTraits.push(t)}
  catch(err){accountsDb=previous;return notify('Não foi possível importar: '+err.message)}
  if(!saveAccountsBlob()){accountsDb=previous;resetAccountView();return}
  resetAccountView();ui.tab='settings';
  notify(conflicts.length?`Backup importado. ${conflicts.length} conta(s) substituída(s) com confirmação. Você pode desfazer nas Configurações.`:`Backup importado: ${incoming.length} conta(s) adicionada(s).`);
  if(m.origin==='cloud')void window.DroidDrive?.onCloudImportComplete();
  break;
 }
 case 'genericConfirm':{
  const result=genericPlanResult(m.fusionKind,m.parts);
  if(!result||!planIsFree(m.parts,m.planId?'g:'+m.planId:''))return notify('Ingredientes indisponíveis ou já reservados.');
  const name=result.random?String(vals.get('resultName')||''):result.name;
  if(!validName(name)||!validTier(name,result.tier)||(result.random&&(byName[name].rarity!==result.rarity||!!FUSION_BY_ID[name])))return notify('Selecione o droid realmente recebido.');
  let chosen;try{chosen=ingredientSelection(vals,m.parts)}catch(err){return notify(err.message)}
  if(!ensureValuableConsent(chosen,'usar na fusão'))return;
  save(()=>{
   for(const u of chosen)mutateInventory(u.name,u.tier,-1,[u.id],'fusão');
   mutateInventory(name,result.tier,1);opRecord('fusão',chosen,{result:state.units[state.units.length-1]?.id});
   if(m.planId)state.fusions.genericPlans=state.fusions.genericPlans.filter(p=>p.id!==m.planId);
   state.fusions.genericHistory.push({kind:m.fusionKind,parts:m.parts.map(p=>({...p})),result:name,tier:result.tier,date:new Date().toISOString()});
   state.fusions.genericHistory=state.fusions.genericHistory.slice(-120);
  },`Fusão registrada: ${name} · ${variantLabel(result.tier)}. Você pode desfazer.`);
  break;
 }
 case 'fusionConfirm':{
  const recipe=FUSION_BY_ID[m.id];if(!recipe||!Array.isArray(m.tiers)||m.tiers.length!==3)return notify('Receita inválida.');
  const status=fusionAvailability(recipe,m.tiers);if(!status.ready)return notify('Faltam ingredientes ou alguma unidade está reservada em outra fusão.');
  let chosen;try{chosen=ingredientSelection(vals,recipe.parts.map((name,i)=>({name,tier:m.tiers[i]})))}catch(err){return notify(err.message)}
  if(!ensureValuableConsent(chosen,'usar na fusão'))return;
  save(()=>{
   chosen.forEach(u=>mutateInventory(u.name,u.tier,-1,[u.id],'fusão'));
   mutateInventory(recipe.id,status.tier,1);opRecord('fusão especial',chosen,{result:state.units[state.units.length-1]?.id});
   delete state.fusions.plans[recipe.id];
   state.fusions.history.push({id:recipe.id,tier:status.tier,tiers:[...m.tiers],cost:fusionPrice(recipe.id,m.tiers)?.display||'',date:new Date().toISOString()});
   state.fusions.history=state.fusions.history.slice(-120);
  },`Fusão ${recipe.id} · ${variantLabel(status.tier)} registrada. Você pode desfazer.`);
  delete ui.fusionDraft[recipe.id];break;
 }
 case 'delete':{const candidates=unitsFor(m.name,m.tier);if(!ensureValuableConsent(candidates,'excluir estas unidades'))return;save(()=>{const n=state.inventory[m.name]?.[m.tier]||0;mutateInventory(m.name,m.tier,-n)},'Cadastro excluído.');break}
 }ui.modal=null;render();}
function handleAction(button){const a=button.dataset.action,n=button.dataset.name,t=button.dataset.tier;
 switch(a){
 case 'traitFinance':openModal('traitFinance');break;
 case 'guideDroid':openModal('guideDroid',{name:n});break;
 case 'unitProfile':ui.detail='';renderDetail();openModal('unitProfile',{id:button.dataset.id});break;
 case 'unitRoll':openModal('unitRoll',{id:button.dataset.id});break;
 case 'unitTest':openModal('unitTest',{id:button.dataset.id});break;
 case 'favoriteUnit':{const u=unitById(button.dataset.id);if(u)save(()=>{u.favorite=!u.favorite},u.favorite?'Favorito removido.':'Favorito atualizado.');break}
 case 'createAccount':openModal('createAccount');break;
 case 'renameAccount':openModal('renameAccount',{id:button.dataset.id});break;
 case 'deleteAccount':openModal('deleteAccount',{id:button.dataset.id});break;
 case 'activateAccount':activateAccount(button.dataset.id);break;
 case 'openFusionRecipe':{
  const id=button.dataset.id,r=FUSION_BY_ID[id];if(!r)return;
  ui.fusionOpen=id;ui.fusionSearch='';ui.fusionFilter='Todas';ui.fusionDraft[id]=[...(state.fusions.plans[id]?.tiers||suggestedFusionTiers(r))];setTab('fusion');
  // Mantém o cartão visível sem obrigar o usuário a buscar outra vez.
  requestAnimationFrame(()=>document.querySelector(`[data-recipe="${id}"]`)?.scrollIntoView({block:'center',behavior:'smooth'}));break;
 }
 case 'quickFusionReserve':{
  const id=button.dataset.id,name=button.dataset.name,tier=button.dataset.tier,r=FUSION_BY_ID[id];
  if(!r||!r.parts.includes(name)||!validTier(name,tier))return notify('Fusão ou variante inválida.');
  const other=fusionPlanNeeds(id)[nextId(name,tier)]||0;
  if((state.inventory[name]?.[tier]||0)<=other)return notify('Esta variante já está reservada para outra fusão.');
  const tiers=quickFusionTiers(r,name,tier);
  const scrollY=document.querySelector('.drawer-scroll')?.scrollTop||0;
  save(()=>{state.fusions.plans[id]={tiers:[...tiers]}},`${name} · ${variantLabel(tier)} guardado para ${id}.`);
  const drawer=document.querySelector('.drawer-scroll');if(drawer)drawer.scrollTop=scrollY;
  break;
 }
 case 'fusionIdeaFilter':ui.fusionIdeaFilter=button.dataset.filter||'Todas';ui.fusionIdeaExpanded=false;render();break;
 case 'fusionIdeaMore':ui.fusionIdeaExpanded=!ui.fusionIdeaExpanded;render();break;
 case 'genericReserve':{
  const idea=fusionSuggestions()[Number(button.dataset.idea)];
  if(!idea||!planIsFree(idea.parts))return notify('Esta combinação não está mais disponível.');
  if((state.fusions.genericPlans||[]).length>=30)return notify('Limite de 30 reservas atingido.');
  save(()=>state.fusions.genericPlans.push({id:newId(),kind:idea.kind,parts:idea.parts.map(p=>({...p}))}),'Três ingredientes guardados para fusão.');break;
 }
 case 'genericUnplan':{
  const id=button.dataset.id;if(!state.fusions.genericPlans.some(p=>p.id===id))break;
  save(()=>{state.fusions.genericPlans=state.fusions.genericPlans.filter(p=>p.id!==id)},'Reserva removida.');break;
 }
 case 'genericMake':{
  const plan=state.fusions.genericPlans.find(p=>p.id===button.dataset.id);
  if(!plan||!planIsFree(plan.parts,'g:'+plan.id))return notify('Confira os ingredientes reservados.');
  openModal('genericConfirm',{fusionKind:plan.kind,parts:plan.parts.map(p=>({...p})),planId:plan.id});break;
 }
 case 'genericMakeNow':{
  const idea=fusionSuggestions()[Number(button.dataset.idea)];if(!idea||!planIsFree(idea.parts))return notify('Esta combinação não está mais disponível.');
  openModal('genericConfirm',{kind:'genericConfirm',fusionKind:idea.kind,parts:idea.parts.map(p=>({...p}))});break;
 }
 case 'fusionToggle':{
  const id=button.dataset.id,recipe=FUSION_BY_ID[id];if(!recipe)return;
  if(ui.fusionOpen===id)ui.fusionOpen='';else {ui.fusionOpen=id;if(!ui.fusionDraft[id])ui.fusionDraft[id]=[...(state.fusions.plans[id]?.tiers||suggestedFusionTiers(recipe))]}
  render();break;
 }
 case 'fusionFilter':ui.fusionFilter=button.dataset.filter;render();break;
 case 'fusionPlan':{
  const id=button.dataset.id,r=FUSION_BY_ID[id],tiers=r&&fusionTiers(r);
  if(!r||!tiers||tiers.length!==3||!tiers.every(t=>T.includes(t)))return notify('Escolha variantes válidas.');
  save(()=>{state.fusions.plans[id]={tiers:[...tiers]}},`Ingredientes de ${id} reservados nesta conta.`);break;
 }
 case 'fusionUnplan':{
  const id=button.dataset.id;if(!state.fusions.plans[id])return;
  save(()=>{delete state.fusions.plans[id]},`Reserva de ${id} removida.`);delete ui.fusionDraft[id];break;
 }
 case 'fusionMake':{
  const id=button.dataset.id,r=FUSION_BY_ID[id],tiers=r&&[...fusionTiers(r)];if(!r)return;
  if(!fusionAvailability(r,tiers).ready)return notify('Ingredientes indisponíveis. Confira suas variantes e reservas.');
  openModal('fusionConfirm',{id,tiers});break;
 }
 case 'expand':{const id=button.dataset.id;ui.open=ui.open.has(id)?new Set():new Set([id]);render();break;}
 case 'baseJump':{const id=button.dataset.id;if(id!=='base-owned'&&id!=='basemissing'&&id!=='fusionideas')break;ui.open=id==='base-owned'?new Set():new Set([id]);render();requestAnimationFrame(()=>document.getElementById(id)?.scrollIntoView({block:'start',behavior:'smooth'}));break;}
 case 'choosepath':ui.setupPath=Number(button.dataset.path);render();break;
 case 'start':{const p=nInt(ui.setupPath,1,6),c=nInt(ui.setupCycle,1,40);if(!p||!c)return notify('Escolha um caminho e ciclo válidos.');save(()=>{state.path=p;state.cycle=c},'Seu caminho está configurado.');ui.tab=ui.setupRegister?'pathlist':'inventory';ui.pathBatch={};ui.pathDraft={};render();if(ui.setupRegister)notify('Agora escolha as variantes e marque os droids que já possui.');break;}
 case 'setup':ui.tab='dashboard';state.path?openModal('changePath'):render();break;
 case 'openpathlist':setTab('pathlist');break;case 'opensearch':openGlobalSearch();break;case 'opendashboard':setTab('dashboard');break;case 'openinventory':ui.inventoryScope='all';ui.catalogVisible=false;setTab('inventory');break;case 'addpick':ui.inventoryScope='all';ui.catalogVisible=false;setTab('inventory');break;
 case 'add':openModal('add',{name:n,tier:t});break;case 'edit':openModal('edit',{name:n,tier:t});break;
 case 'delete':if(ui.modal?.kind==='edit')openModal('delete',{name:ui.modal.name,tier:ui.modal.tier});break;
 case 'evolve':ui.evolveDestination=T.includes(button.dataset.to)?button.dataset.to:'';openModal('evolve',{name:n,tier:t});break;
 case 'removeOwned':{if(!n||!t||!(state.inventory[n]?.[t]>0))return notify('Este droid não está no inventário desta conta.');openModal('removeOwned',{name:n,tier:t});break;}
 case 'sellOne':{
  if(ui.tab!=='inventory'||!validName(n)||!validTier(n,t)||!(state.inventory[n]?.[t]>0))return notify('Esse droid não está mais na sua base.');
  if(unitsFor(n,t).some(u=>u.traitStatus==='known'||u.favorite)){openModal('sale',{name:n,tier:t,max:1});return}
  let released=[];
  save(()=>{
   const chosen=smartUnits(n,t,1);mutateInventory(n,t,-1,chosen.map(u=>u.id),'venda rápida');opRecord('venda rápida',chosen);
   released=clearBrokenFusionReservations();
   if(!anyOwned(n))state.absent[n]=true;
   state.sales.push({name:n,tier:t,qty:1,date:new Date().toISOString()});
   state.sales=state.sales.slice(-30);
  },`${n} · ${variantLabel(t)}: 1 vendido.${released.length?' Reserva(s) de fusão cancelada(s): '+released.join(', ')+'.':''}`);
  ui.lastQuickSale=true;render();break;
 }
 case 'sale':openModal('sale',{name:n,tier:t,max:Number(button.dataset.max)});break;
 case 'absent':save(()=>{if(!anyOwned(n))state.absent[n]=true},`${n} marcado como não possuído.`);break;
 case 'unabsent':save(()=>{delete state.absent[n]},`${n}: informação removida.`);break;
 case 'advance':openModal('advance');break;case 'cycle':openModal('cycle');break;case 'changePath':openModal('changePath');break;
 case 'detail':closeGlobalSearch();ui.detail=n;ui.detailTier=t||'';ui.chipFrom='Default';ui.chipTo='Diamond';renderDetail();break;
 case 'detailTier':ui.detailTier=t;renderDetail();break;
 case 'closeDetail':case 'closeDetailBackdrop':ui.detail='';renderDetail();break;
 case 'inventoryScope':{
  const scope=button.dataset.scope;if(!['mine','all'].includes(scope))break;
  ui.inventoryScope=scope;ui.catalogVisible=false;render();document.querySelector('[data-input="inventorySearch"]')?.focus({preventScroll:true});break;
 }
 case 'baseRegister':{
  if(ui.inventoryScope==='mine'){ui.inventoryScope='all';ui.catalogVisible=false;render();document.querySelector('[data-input="inventorySearch"]')?.focus({preventScroll:true});}
  else{ui.catalogVisible=!ui.catalogVisible;render();}
  break;
 }
 case 'toggleCatalog':ui.catalogVisible=!ui.catalogVisible;render();break;
 case 'inventoryFilter':ui.inventoryFilter=button.dataset.filter;render();break;
 case 'pathChecklistFilter':ui.pathChecklistFilter=button.dataset.filter;render();break;
 case 'pathClear':ui.pathBatch={};render();break;
 case 'pathAdd':{const draft=pathDraft(n);const qty=nInt(draft.qty,1,100000);if(!state.path||!validTier(n,draft.tier)||!qty)return notify('Escolha uma variante e quantidade válidas.');if(!canRegister(n,qty))return notify(iconicLimitMessage(n));save(()=>mutateInventory(n,draft.tier,qty),`${n} · ${variantLabel(draft.tier)} cadastrado.`);delete ui.pathBatch[n];render();break;}
 case 'pathSaveBatch':{const entries=Object.keys(ui.pathBatch).map(name=>({name,...pathDraft(name)}));if(!entries.length)return;for(const e of entries){if(!validTier(e.name,e.tier)||!nInt(e.qty,1,100000))return notify('Revise variantes e quantidades.');if(!canRegister(e.name,Number(e.qty)))return notify(iconicLimitMessage(e.name));}save(()=>{for(const e of entries)mutateInventory(e.name,e.tier,Number(e.qty))},`${entries.length} droid(s) adicionados ao inventário.`);ui.pathBatch={};render();break;}
 case 'readSales':unreadNotices={};storeNotices();render();notify('Avisos de venda marcados como lidos.');break;
 case 'catalogMode':ui.catalogAll=button.dataset.mode==='all';render();break;
 case 'saveBatch':{const entries=Object.entries(ui.batch);if(!entries.length)return;for(const [name,v]of entries){if(!validTier(name,v.tier)||!nInt(v.qty,1,100000))return notify('Revise variante e quantidade na seleção em lote.');if(!canRegister(name,Number(v.qty)))return notify(iconicLimitMessage(name));}save(()=>{for(const [name,v]of entries)mutateInventory(name,v.tier,Number(v.qty))},`${entries.length} droids cadastrados.`);ui.batch={};render();break;}
 case 'close':ui.modal=null;renderModal();break;
 case 'closeBackdrop':if(button.classList.contains('modal-backdrop')){ui.modal=null;renderModal()}break;
 case 'undo':if(undo){const fn=undo;undo=null;ui.lastQuickSale=false;fn();document.getElementById('toast').classList.remove('show')}break;
 case 'export':exportBackup();break;case 'exportActive':exportBackup(true);break;case 'import':document.getElementById('backup-file').click();break;
 case 'auditImages':openModal('auditImages');runImageAudit();break;
 case 'restartImageAudit':runImageAudit();break;
 case 'copyImageIssues':{
   if(!imageAudit.issues.length){notify('Nenhuma falha listada.');break}
   const report=imageAudit.issues.map(x=>`${x.name} — ${x.reason} — ${x.url}`).join('\n');
   if(navigator.clipboard?.writeText)navigator.clipboard.writeText(report).then(()=>notify('Lista de falhas copiada.')).catch(()=>notify('Não foi possível copiar. Faça uma captura da tela.'));
   else notify('A cópia não está disponível neste navegador. Faça uma captura da tela.');
   break;
 }
 case 'source':window.open(DB.source,'_blank','noopener,noreferrer');break;
 case 'undoOperation':undoLastOperation();break;
 case 'undoRestore':restoreAccountsSnapshot();break;
 case 'openGlobalSearch':openGlobalSearch();break;
 case 'closeGlobalSearch':closeGlobalSearch();break;
 case 'simPrev':ui.simCycle=Math.max(1,ui.simCycle-1);render();break;
 case 'simNext':ui.simCycle=Math.min(40,ui.simCycle+1);render();break;
 case 'simNow':ui.simPath=state.path||1;ui.simCycle=state.cycle||1;render();break;
 case 'prevBrowse':ui.browseCycle=Math.max(1,ui.browseCycle-1);render();break;case 'nextBrowse':ui.browseCycle=Math.min(40,ui.browseCycle+1);render();break;
 }
}
document.addEventListener('click',e=>{const tab=e.target.closest('[data-tab]');if(tab){setTab(tab.dataset.tab);return};const el=e.target.closest('[data-action]');if(el){if(el.closest('form')&&el.type==='submit')return;if((el.dataset.action==='closeBackdrop'||el.dataset.action==='closeDetailBackdrop')&&e.target!==el)return;handleAction(el)}});
document.addEventListener('submit',e=>{if(e.target.id==='modal-form'){e.preventDefault();submitModal(e.target)}});
document.addEventListener('input',e=>{const input=e.target.dataset.input;if(!input)return;
 if(input==='globalSearch'){ui.globalSearch=e.target.value;refreshGlobalSearch();return;}
 if(input==='search'){ui.search=e.target.value;refreshSearchResults();return;}
 if(input==='inventorySearch'){ui.inventorySearch=e.target.value;refreshBaseResults();return;}
 if(input==='guideSearch'){ui.guideSearch=e.target.value;const position=e.target.selectionStart;render();restoreInputFocus('guideSearch',position);return;}
 if(input==='catalogSearch'||input==='pathSearch'||input==='fusionSearch'){ui[input]=e.target.value;const pos=e.target.selectionStart;render();restoreInputFocus(input,pos)}
 if(input==='pathQty'){const n=e.target.dataset.name;ui.pathDraft[n]={...pathDraft(n),qty:e.target.value}}
 if(input==='batchQty'){const name=e.target.dataset.name;const qty=Number(e.target.value);if(ui.batch[name]&&qty>=1)ui.batch[name].qty=qty}
 });
document.addEventListener('change',e=>{if(e.target.matches?.('select.variant-select'))e.target.dataset.variant=e.target.value;const inp=e.target.dataset.input;if(!inp)return;const value=e.target.value;
 switch(inp){case 'traitSelected':if(ui.modal&&['unitProfile','unitRoll'].includes(ui.modal.kind)){const u=unitById(ui.modal.id),form=e.target.closest('form');if(u&&form)updateTraitPicker(form,value,u.name,byName[u.name].rarity)}break;
 case 'traitStatus':{const form=e.target.closest('form'),fields=form?.querySelector('[data-trait-fields]');if(fields)fields.hidden=value!=='known';break;}case 'activeAccount':activateAccount(value);break;case 'setupCycle':ui.setupCycle=Number(value);break;case 'setupRegister':ui.setupRegister=value==='yes';break;case 'simPath':ui.simPath=Math.min(6,Math.max(1,Number(value)||1));render();break;case 'simCycle':ui.simCycle=Math.min(40,Math.max(1,Number(value)||1));render();break;case 'browsePath':ui.browsePath=Number(value);render();break;case 'browseCycle':ui.browseCycle=Number(value);render();break;case 'pathFilter':ui.pathFilter=Number(value);if(ui.detail)renderDetail();else render();break;
 case 'chipFrom':ui.chipFrom=value;if(ui.detail)renderDetail();else render();break;case 'chipTo':ui.chipTo=value;if(ui.detail)renderDetail();else render();break;
 case 'catalogRarity':ui.catalogRarity=value;render();break;
  case 'fusionTier':{const r=FUSION_BY_ID[e.target.dataset.id],i=Number(e.target.dataset.index);if(!r||!Number.isInteger(i)||i<0||i>2||!FUSION_TIERS.includes(value))break;ui.fusionDraft[r.id]=[...fusionTiers(r)];ui.fusionDraft[r.id][i]=value;render();break;}
 case 'pathToggle':{const n=e.target.dataset.name;if(e.target.checked)ui.pathBatch[n]=true;else delete ui.pathBatch[n];render();break}
 case 'pathTier':{const n=e.target.dataset.name;if(validTier(n,value)){ui.pathDraft[n]={...pathDraft(n),tier:value};const thumb=e.target.closest('.path-check-row')?.querySelector('.droid-thumb');if(thumb&&!anyOwned(n)){thumb.dataset.variant=value;thumb.setAttribute('aria-label',variantLabel(value));}}break}
 case 'batchToggle':{const n=e.target.dataset.name;if(e.target.checked){if(!canRegister(n)){e.target.checked=false;return notify(iconicLimitMessage(n))}ui.batch[n]={tier:byName[n].rarity==='Iconic'?'Única':'Default',qty:1}}else delete ui.batch[n];render();break}
 case 'batchTier':if(ui.batch[e.target.dataset.name])ui.batch[e.target.dataset.name].tier=value;break;
 case 'evolveDestination':ui.evolveDestination=value;document.getElementById('evolve-cost').textContent=nf(chips(ui.modal.name,ui.modal.tier,value));break;
 }});
document.getElementById('backup-file').addEventListener('change',async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;if(file.size>10e6)return notify('Arquivo de backup muito grande (máximo de 10 MB).');try{const raw=JSON.parse(await file.text());if(raw?.schema===2)openModal('restore',{format:'multi',preview:sanitizeAccounts(raw)});else openModal('restore',{format:'legacy',preview:sanitize(raw),legacyName:validAccountName(raw?.accountName)||validAccountName(raw?.name)||'',legacyNotices:sanitizeNotices(raw.saleNotices)});}catch(err){notify(`Backup inválido: ${err.message}`)}});
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();ui.globalSearchOpen?closeGlobalSearch():openGlobalSearch();return;}if(e.key==='Escape'){if(ui.globalSearchOpen){closeGlobalSearch();return;}if(ui.modal){ui.modal=null;renderModal()}else if(ui.detail){ui.detail='';renderDetail()}}});
document.addEventListener('load',e=>{if(e.target.matches?.('img[data-site-logo]'))e.target.parentElement.classList.add('logo-loaded')},true);
document.querySelectorAll('img[data-site-logo]').forEach(img=>{if(img.complete&&img.naturalWidth)img.parentElement.classList.add('logo-loaded');else if(img.complete&&img.naturalWidth===0){img.hidden=true;img.parentElement.classList.add('logo-failed')}});
document.addEventListener('error',e=>{if(e.target.matches('img[data-droid-img]')){e.target.hidden=true;e.target.parentElement.classList.add('img-failed')}if(e.target.matches('img[data-site-logo]')){e.target.hidden=true;e.target.parentElement.classList.add('logo-failed')}},true);
if(!DB||CAT.length!==100||R.length!==720)alert('Erro: base de droids incompleta. Atualize os arquivos do site.');
document.addEventListener('submit',e=>{if(e.target?.id!=='nova-wallet-form')return;e.preventDefault();const data=new FormData(e.target),type=String(data.get('type')),amount=Number(data.get('amount')),note=String(data.get('note')||'').trim();if(!['in','out'].includes(type)||!Number.isSafeInteger(amount)||amount<=0)return notify('Informe uma quantidade inteira maior que zero.');save(()=>novaAppend(type,amount,note|| (type==='in'?'Ganho Nova':'Gasto Nova')),'Cristais Nova atualizados e incluídos no backup.');});
// A integração usa os mesmos backups schema 2 e a importação existente,
 // que pede confirmação antes de substituir contas com nomes coincidentes.
 window.DroidDrive?.init({
  snapshot(){const a=currentAccount();a.data=state;a.notices=unreadNotices;return JSON.parse(JSON.stringify(accountsDb))},
  validate(raw){try{sanitizeAccounts(raw);return true}catch(e){return false}},
  importCloud(raw){openModal('restore',{format:'multi',preview:sanitizeAccounts(raw),origin:'cloud'})},
  canAutoApply(){
   const el=document.activeElement;
   return !ui.modal && !(el?.matches?.('input,select,textarea') && el.closest?.('#app'));
  },
  applyCloud(raw){
   // Cópia local para desfazer, antes de aceitar alterações vindas de outro aparelho.
   try{
    const imported=sanitizeAccounts(raw);
    if(!writeAccounts()||!saveUndoSnapshot())return false;
    const old=accountsDb;
    if(imported.accounts.some(x=>x.id===old.activeId))imported.activeId=old.activeId;
    localStorage.setItem(ACCOUNTS_KEY,JSON.stringify(imported));
    accountsDb=imported;resetAccountView();render();return true;
   }catch(err){notify('Não foi possível aplicar a atualização do Drive: '+err.message);return false}
  },
  toast(message){notify(message)}
 });
 // Materializa os identificadores individuais no primeiro carregamento, depois de salvar a cópia v26.
 if(!storageError && localStorage.getItem(PRE_TRAITS_BACKUP)){
  try{const stored=JSON.parse(localStorage.getItem(ACCOUNTS_KEY)||'{}');if(stored.accounts?.some(a=>!Array.isArray(a.data?.units)))writeAccounts()}catch(e){notify('Confira o backup da migração antes de continuar.');}
 }
 render();

 document.addEventListener('submit',e=>{const form=e.target.closest('form[data-fusion-price]');if(!form)return;e.preventDefault();const id=form.dataset.fusionPrice,recipe=FUSION_BY_ID[id];if(!recipe)return;const tiers=[...fusionTiers(recipe)],value=String(new FormData(form).get('fusion-price')||'').trim();if(!/^(?:\d+(?:[.,]\d+)?)(?:\s?(?:K|M|B|T|Qa|Qi|Sx|Sp|Oc|No|Dc))?$/i.test(value))return notify('Valor inválido. Exemplo: 400K, 2.5B ou 6.38T.');save(()=>{state.fusions.prices??={};state.fusions.prices[fusionPriceKey(id,tiers)]={display:value,source:'informado pelo usuário',verifiedAt:new Date().toISOString()}},`Preço de ${id} salvo para as variantes escolhidas, na conta ativa.`);});
})();