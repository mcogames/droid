/* Droid Tycoon — v20: droids e variantes faltantes no caminho em Minha Base. */
(()=>{'use strict';
const DB=window.DROID_DB;
const STORE='droidtycoon_local_v1', RESTORE='droidtycoon_restore_undo_v1', NOTICE_KEY='droidtycoon_sale_notices_v2';
const ACCOUNTS_KEY='droidtycoon_accounts_v1', ACCOUNTS_UNDO='droidtycoon_accounts_restore_v1';
const T=DB.tiers, CAT=DB.catalog, R=DB.requirements, byName=Object.fromEntries(CAT.map(d=>[d.name,d]));
// Traduções apenas para apresentação; os identificadores originais permanecem intactos.
const RARITY_PT={Common:'Comum',Rare:'Raro',Epic:'Épico',Legendary:'Lendário',Mythic:'Mítico',Iconic:'Icônico'};
const ROLE_PT={Astromech:'Astromecânico',Worker:'Operário',Battle:'Combate',Protocol:'Protocolo'};
const rarityLabel=rarity=>RARITY_PT[rarity]||rarity||'';
// Cores somente nas etiquetas de raridade. Comum e Icônico não têm fundo.
const rarityTag=rarity=>rarity?`<span class="rarity-label" data-rarity="${h(rarity)}">${h(rarityLabel(rarity))}</span>`:'';
const roleLabel=role=>ROLE_PT[role]||role||'';
// Traduzir somente o que é exibido; manter os identificadores originais no inventário e nos backups.
const VARIANT_PT={Default:'Padrão',Gold:'Ouro',Diamond:'Diamante',Rainbow:'Arco-íris',Beskar:'Beskar',Galactic:'Galáctica',Stellar:'Estelar',Kyber:'Kyber','Única':'Única'};
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
 const out={plans:{},history:[],genericPlans:[],genericHistory:[]};if(!raw||typeof raw!=='object')return out;
 if(raw.plans&&typeof raw.plans==='object'&&!Array.isArray(raw.plans))for(const [id,p] of Object.entries(raw.plans)){
  const r=FUSION_BY_ID[id];if(r&&p&&Array.isArray(p.tiers)&&p.tiers.length===3&&p.tiers.every(t=>T.includes(t)))out.plans[id]={tiers:[...p.tiers]};
 }
 if(Array.isArray(raw.history))out.history=raw.history.filter(x=>FUSION_BY_ID[x?.id]&&T.includes(x?.tier)&&Array.isArray(x?.tiers)&&x.tiers.length===3&&x.tiers.every(t=>T.includes(t))).slice(-120).map(x=>({id:x.id,tier:x.tier,tiers:[...x.tiers],date:typeof x.date==='string'?x.date.slice(0,40):''}));
 // Compatível com os backups antigos: as reservas comuns são opcionais.
 const validParts=parts=>Array.isArray(parts)&&parts.length===3&&parts.every(p=>p&&validName(p.name)&&validTier(p.name,p.tier)&&p.tier!=='Única');
 if(Array.isArray(raw.genericPlans))for(const row of raw.genericPlans.slice(0,40)){
  if(row&&typeof row.id==='string'&&row.id.length<=100&&['special','variant','rarity'].includes(row.kind)&&validParts(row.parts)&&!out.genericPlans.some(p=>p.id===row.id))
   out.genericPlans.push({id:row.id,kind:row.kind,parts:row.parts.map(p=>({name:p.name,tier:p.tier}))});
 }
 if(Array.isArray(raw.genericHistory))out.genericHistory=raw.genericHistory.filter(x=>x&&['special','variant','rarity'].includes(x.kind)&&validParts(x.parts)&&validName(x.result)&&validTier(x.result,x.tier)).slice(-120).map(x=>({kind:x.kind,parts:x.parts.map(p=>({name:p.name,tier:p.tier})),result:x.result,tier:x.tier,date:typeof x.date==='string'?x.date.slice(0,40):''}));
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
const empty=()=>({schema:1,path:0,cycle:1,inventory:{},absent:{},sales:[],removals:[],history:[],completed:[],fusions:{plans:{},history:[],genericPlans:[],genericHistory:[]},lastModified:Date.now()});
function sanitize(raw){if(!raw||typeof raw!=='object'||raw.schema!==1)throw new Error('Arquivo incompatível ou sem dados válidos.');
 const x=empty();x.path=Number(raw.path)||0;if(!Number.isInteger(x.path)||x.path<0||x.path>6)throw new Error('Caminho inválido.');
 x.cycle=Number(raw.cycle)||1;if(!Number.isInteger(x.cycle)||x.cycle<1||x.cycle>40)throw new Error('Ciclo inválido.');
 if(raw.inventory&&typeof raw.inventory==='object')for(const [n,ts]of Object.entries(raw.inventory)){if(!validName(n)||!ts||typeof ts!=='object')continue;for(const [t,q]of Object.entries(ts)){if(!validTier(n,t)||!Number.isSafeInteger(q)||q<1||q>100000)continue;(x.inventory[n]??={})[t]=q}}
 if(raw.absent&&typeof raw.absent==='object')for(const [n,v]of Object.entries(raw.absent))if(validName(n)&&v===true&&!x.inventory[n])x.absent[n]=true;
 for(const [k,max]of [['sales',30],['history',30],['completed',40],['removals',100]]) if(Array.isArray(raw[k]))x[k]=raw[k].filter(a=>a&&typeof a==='object').slice(-max).map(a=>JSON.parse(JSON.stringify(a))).filter(a=>JSON.stringify(a).length<25000);
 x.fusions=cleanFusion(raw.fusions);x.lastModified=Number(raw.lastModified)||Date.now();return x;
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
 return {schema:2,activeId:a.some(x=>x.id===raw.activeId)?raw.activeId:a[0].id,accounts:a};
}
function loadAccounts(){
 const old=localStorage.getItem(ACCOUNTS_KEY);
 if(old!==null)return sanitizeAccounts(JSON.parse(old));
 const initial={schema:2,activeId:newId(),accounts:[]};
 initial.accounts.push({id:initial.activeId,name:'Minha conta',data:readLegacy(),notices:readLegacyNotices()});
 // Falha de gravação bloqueia alterações para evitar falsa sensação de segurança.
 localStorage.setItem(ACCOUNTS_KEY,JSON.stringify(initial));
 return initial;
}
let accountsDb=null,storageError='';
try{accountsDb=loadAccounts()}catch(e){storageError=e.message||'Armazenamento indisponível.';accountsDb={schema:2,activeId:'bloqueada',accounts:[{id:'bloqueada',name:'Recuperação',data:readLegacy(),notices:{}}]}}
function currentAccount(){return accountsDb.accounts.find(a=>a.id===accountsDb.activeId)||accountsDb.accounts[0]}
let state=currentAccount().data,unreadNotices=currentAccount().notices;
let ui={tab:state.path?'dashboard':'search',open:new Set(['pending']),search:'',pathFilter:0,detail:'',detailTier:'',browsePath:1,browseCycle:1,catalogSearch:'',catalogRarity:'Todos',catalogAll:false,batch:{},batchMode:true,setupPath:1,setupCycle:1,setupRegister:true,pathSearch:'',pathChecklistFilter:'Todos',pathBatch:{},pathDraft:{},fusionFilter:'Todas',fusionSearch:'',fusionOpen:'',fusionDraft:{},inventorySearch:'',inventoryScope:'mine',inventoryFilter:'Todos',catalogVisible:false,lastQuickSale:false,modal:null},undo=null,toastTimer=null;
function saveAccountsBlob(){
 if(storageError){notify('Salvamento bloqueado: '+storageError);return false}
 try{localStorage.setItem(ACCOUNTS_KEY,JSON.stringify(accountsDb));return true}
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
 undo=null;ui.modal=null;ui.detail='';ui.detailTier='';ui.batch={};ui.pathBatch={};ui.pathDraft={};ui.pathSearch='';ui.pathChecklistFilter='Todos';ui.fusionFilter='Todas';ui.fusionSearch='';ui.fusionOpen='';ui.fusionDraft={};ui.catalogVisible=false;ui.lastQuickSale=false;
 render();notify('Conta ativa: '+next.name);
}
function resetAccountView(){state=currentAccount().data;unreadNotices=currentAccount().notices;undo=null;ui.modal=null;ui.detail='';ui.detailTier='';ui.batch={};ui.pathBatch={};ui.pathDraft={};ui.pathSearch='';ui.pathChecklistFilter='Todos';ui.fusionFilter='Todas';ui.fusionSearch='';ui.fusionOpen='';ui.fusionDraft={};ui.catalogVisible=false;ui.lastQuickSale=false;}
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
function salesMap(){return new Map(requireCounts().saleEntries.map(x=>[nextId(x.name,x.tier),x.qty]))}
function reconcileNotices(before){const after=salesMap();for(const [key,v] of Object.entries(unreadNotices)){const left=after.get(key)||0;if(left<=0)delete unreadNotices[key];else v.qty=Math.min(v.qty,left)}
 for(const e of requireCounts().saleEntries){const k=nextId(e.name,e.tier),newly=e.qty-(before.get(k)||0);if(newly>0)unreadNotices[k]={name:e.name,tier:e.tier,qty:Math.min(e.qty,(unreadNotices[k]?.qty||0)+newly),createdAt:new Date().toISOString()}}
 storeNotices();}
function listNewSales(){const available=salesMap();return Object.values(unreadNotices).filter(x=>available.has(nextId(x.name,x.tier))).map(x=>({...x,qty:Math.min(x.qty,available.get(nextId(x.name,x.tier)))})).filter(x=>x.qty>0)}
const app=document.getElementById('app');
function persist(){state.lastModified=Date.now();return writeAccounts()}
function notify(message,withUndo=false){const el=document.getElementById('toast');el.innerHTML=h(message)+(withUndo?` <button type="button" data-action="undo">Desfazer</button>`:'');el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),5700)}
function save(mutator,message){ui.lastQuickSale=false;const before=JSON.stringify(state),oldNotices=JSON.stringify(unreadNotices),oldSales=salesMap();mutator();persist();reconcileNotices(oldSales);undo=()=>{state=sanitize(JSON.parse(before));unreadNotices=JSON.parse(oldNotices);persist();storeNotices();render();notify('Alteração desfeita.')};render();if(message)notify(message,!!undo)}
const reqFor=(name,path=state.path,from=state.cycle)=>R.filter(x=>x.name===name&&x.p===path&&x.c>=from).sort((a,b)=>a.c-b.c);
const needAt=(name,p,c)=>pick(p,c).filter(x=>x.name===name);
function countOwned(name){return Object.values(state.inventory[name]||{}).reduce((s,n)=>s+n,0)}
function anyOwned(name){return countOwned(name)>0}
function best(name){const entries=Object.keys(state.inventory[name]||{});return entries.sort((a,b)=>rank(b)-rank(a))[0]||null}
function meets(name,tier){return Object.entries(state.inventory[name]||{}).reduce((s,[t,q])=>s+(rank(t)>=rank(tier)?q:0),0)}
function chips(name,from,to){const r=byName[name]?.rarity, costs=DB.costs[r];if(!costs||!T.includes(from)||!T.includes(to)||rank(from)>=rank(to))return 0;return costs.slice(rank(from)+1,rank(to)+1).reduce((s,n)=>s+n,0)}
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
function requireCounts(){
 const owned=arrInventory(state),protectedEntries=[],saleEntries=[];
 const fusionDemand=fusionPlanNeeds(),kept={},maxNeed={};
 if(state.path)for(const r of R){if(r.p!==state.path||r.c<state.cycle)continue;const key=nextId(r.name,r.c),n=(maxNeed[key]||0)+1;maxNeed[key]=n;}
 for(const [key,q] of Object.entries(maxNeed)){const name=key.slice(0,key.lastIndexOf('::'));kept[name]=Math.max(kept[name]||0,q)}
 for(const e of owned){
  const fused=Math.min(e.qty,fusionDemand[nextId(e.name,e.tier)]||0),other=e.qty-fused;
  const forPath=state.path?Math.min(other,kept[e.name]||0):0;
  kept[e.name]=Math.max(0,(kept[e.name]||0)-forPath);
  const take=fused+forPath;
  if(take)protectedEntries.push({...e,qty:take,fusionQty:fused,pathQty:forPath,current:!!state.path&&needAt(e.name,state.path,state.cycle).length>0,requirements:reqFor(e.name)});
  if(state.path&&e.qty>take)saleEntries.push({...e,qty:e.qty-take});
 }
 return {protectedEntries,saleEntries};
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
function setTab(tab){ui.tab=tab==='pathlist'&&!state.path?'dashboard':tab;ui.modal=null;ui.detail='';render();window.scrollTo({top:0,behavior:'instant'})}
function section(id,symbol,title,desc,count,body){return `<section class="card section"><button type="button" class="section-toggle" data-action="expand" data-id="${id}" aria-expanded="${ui.open.has(id)}"><span class="section-icon">${symbol}</span><span class="section-title-wrap"><span class="section-title">${h(title)}</span><span class="section-caption" style="display:block">${h(desc)}</span></span><span class="counter">${h(count)}</span><span class="chevron">${ui.open.has(id)?'⌃':'⌄'}</span></button>${ui.open.has(id)?`<div class="section-body">${body}</div>`:''}</section>`}
function statusText(entry,kept){if(!kept)return badge('Pode Vender','success');if(entry.current)return badge('Necessário agora','danger');const future=entry.requirements[0];return badge(`Precisa no Ciclo ${future.c} — Variante ${variantLabel(future.tier)}`,'warning')}
function entryInventory(e,baseQuickSale=false){
 const split=calcRowCounts(e.name,e.tier),needed=reqFor(e.name),now=needAt(e.name,state.path,state.cycle).length>0;
 const later=needed.filter(x=>x.c>state.cycle),nextCycle=later[0],future=nextCycle?`Precisa no Ciclo ${nextCycle.c} — Variante ${variantLabel(nextCycle.tier)}`:'';
 // Destaque visual só para o aviso de ciclo futuro; o nome da variante permanece legível.
 const futureHtml=nextCycle?`<strong class="future-cycle-emphasis">Precisa no Ciclo <span class="future-cycle-number">${h(nextCycle.c)}</span></strong><span class="future-variant-text"> — Variante ${variantText(nextCycle.tier)}</span>`:'';
 const fusionReserved=requireCounts().protectedEntries.find(x=>x.name===e.name&&x.tier===e.tier)?.fusionQty||0;
 const status=split.keep?(now?'Necessário agora':future||'Reservado para fusão / guardar'):'Pode Vender';
 const statusHtml=split.keep&&!now&&nextCycle?futureHtml:h(status);
 // A ação de venda fica FORA do botão que abre detalhes: evita dois cliques concorrentes.
 const sellQuick=baseQuickSale?`<div class="base-quick-actions"><button type="button" class="base-sell-one" data-action="sellOne" data-name="${h(e.name)}" data-tier="${h(e.tier)}" title="Registrar a venda de 1 unidade no jogo e atualizar a base imediatamente" aria-label="Registrar venda de 1 unidade de ${h(e.name)} ${h(variantLabel(e.tier))}">Registrar venda</button>${fusionReserved?'<small class="base-risk" title="Há reserva ativa para fusão">⚗ Reservado para fusão</small>':split.keep?'<small class="base-risk" title="Pode ser necessário no seu caminho">⚠ Necessário no caminho</small>':''}</div>`:'';
 return `<div class="entry droid-entry ${baseQuickSale?'base-owned-row':''}"><button type="button" ${panelButton(e.name,e.tier)}>${imageOf(e.name,false,e.tier)}<span class="droid-info"><span class="droid-heading">${h(e.name)} ${rarityTag(byName[e.name]?.rarity)} ${variantBadge(e.tier)}</span><span class="entry-sub">${nf(e.qty)} unidade(s) · ${statusHtml}</span>${split.keep&&now&&future?`<span class="entry-sub future-line">${futureHtml}</span>`:''}<span class="quantities">${split.keep?`<span class="keep-label">Guardar ${split.keep}</span>`:''}${fusionReserved?`<span class="fusion-keep-label">Fusão ${fusionReserved}</span>`:''}${split.sell?`<span class="sell-label">Pode Vender ${split.sell}</span>`:''}${FUSION_INGREDIENTS[e.name]?.length?`<span class="fusion-keep-label">⚗ Fusão especial · ${FUSION_INGREDIENTS[e.name].length}</span>`:''}</span></span>${!baseQuickSale?'<span class="entry-arrow">›</span>':''}</button>${sellQuick}</div>`;
}
function requirementRow(r){const count=meets(r.name,r.tier),currBest=best(r.name),owned=anyOwned(r.name),isAbsent=state.absent[r.name]===true,good=count>=needAt(r.name,state.path,state.cycle).length;
 let info=good?`Requisito ${variantText(r.tier)} atendido`:owned?`Necessário ${variantText(r.tier)} — Possui ${variantText(currBest)}`:`Necessário ${variantText(r.tier)} — ${isAbsent?'Não possui':'Não cadastrado'}`;
 const exp=owned&&currBest&&rank(currBest)<rank(r.tier)?`<div class="entry-sub">Chips para evoluir: <strong class="chip-highlight">${nf(chips(r.name,currBest,r.tier))}</strong></div>`:'';
 const actions=good?'':owned?btn('Evoluí','evolve',{kind:'secondary',size:'small',attrs:`data-name="${h(r.name)}" data-tier="${h(currBest)}" ${currBest==='Kyber'?'disabled':''}`}):`${btn('Consegui','add',{kind:'outline-green',size:'small',attrs:`data-name="${h(r.name)}"`})}${isAbsent?btn('Desmarcar','unabsent',{kind:'ghost',size:'small',attrs:`data-name="${h(r.name)}"`}):btn('Não possuo','absent',{kind:'ghost',size:'small',attrs:`data-name="${h(r.name)}"`})}`;
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
 const sellSection=section('sell','↗','Pode Vender','Excedentes após caminho e reservas para fusões',recent.length?`${stat.sale} · ${recent.reduce((n,x)=>n+x.qty,0)} novos`:stat.sale,`${newBlock}${stat.anal.saleEntries.length?arrInventory(state).filter(e=>calcRowCounts(e.name,e.tier).sell>0).map(entryInventory).join(''):'<div class="empty">Nenhuma unidade disponível para venda.</div>'}<div class="hint" style="margin-top:12px">“Pode Vender” considera suas reservas de fusão, mas não considera renda nem coleção.</div>`);
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
      <label class="path-control path-qty"><span>Qtd.</span><input class="input" type="number" min="1" max="100000" value="${h(draft.qty)}" data-input="pathQty" data-name="${h(e.name)}" aria-label="Quantidade de ${h(e.name)}"></label>
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
function search(){
 const matching=findCatalogDroids(ui.search);
 return titlePage('CONSULTA LIVRE','Consultar droids','Pesquise os 100 droids e veja os avisos de venda e as possíveis fusões especiais.')+`<div class="card card-pad"><div class="field"><label for="search-all">PESQUISAR DROID</label><div class="searchbox"><input id="search-all" class="input search-input" data-input="search" value="${h(ui.search)}" placeholder="Nome do droid..." autocomplete="off"></div></div><div class="small muted results-count">${searchCountText(matching,ui.search)}</div><p class="mini-note">Busca em todos os ${CAT.length} droids, incluindo os que você não cadastrou nesta conta.</p><div class="results-grid">${searchResultsHTML(matching)}</div></div><h2 class="subheading">Consultar caminhos e ciclos</h2>${browseCycles(ui.browsePath,ui.browseCycle)}`+footer();
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
  if(!group.has(r.name))group.set(r.name,{name:r.name,cycles:new Map(),requirements:[]});
  const entry=group.get(r.name);
  if(!entry.cycles.has(r.c))entry.cycles.set(r.c,[]);
  entry.cycles.get(r.c).push(r.tier);
  entry.requirements.push(r);
 }
 const missing=[];
 for(const row of group.values()){
  const iconic=byName[row.name]?.rarity==='Iconic';
  const owned=state.inventory[row.name]||{};
  const levels=iconic?['Única']:T;
  const deficit=[];
  let acquiredHigher=0;
  // Cada limiar precisa estar coberto pelo estoque da mesma variante ou superior.
  for(let i=levels.length-1;i>=0;i--){
   const atLeast=tiers=>tiers.filter(t=>iconic||rank(t)>=i).length;
   const peak=Math.max(...[...row.cycles.values()].map(atLeast));
   const inBase=iconic?(owned['Única']||0):Object.entries(owned).reduce((sum,[tier,qty])=>sum+(rank(tier)>=i?qty:0),0);
   const shortage=Math.max(0,peak-inBase-acquiredHigher);
   if(shortage){
    const variant=levels[i];
    const relatedCycles=[...new Set(row.requirements.filter(r=>r.tier===variant).map(r=>r.c))].sort((a,b)=>a-b);
    deficit.push({tier:variant,qty:shortage,cycles:relatedCycles});
    acquiredHigher+=shortage;
   }
  }
  if(!deficit.length)continue;
  row.requirements.sort((a,b)=>a.c-b.c||rank(b.tier)-rank(a.tier));
  const existing=Object.entries(owned).filter(([,qty])=>qty>0).sort((a,b)=>rank(b[0])-rank(a[0]));
  missing.push({name:row.name,deficit,existing,firstCycle:row.requirements[0].c,requirements:row.requirements});
 }
 return missing.sort((a,b)=>a.firstCycle-b.firstCycle||a.name.localeCompare(b.name,'pt-BR'));
}
function missingBasePanel(){
 if(!state.path)return '';
 const list=missingBaseRequirements();
 const count=list.reduce((sum,item)=>sum+item.deficit.reduce((n,d)=>n+d.qty,0),0);
 const cards=list.map(item=>{
  const earliest=item.firstCycle;
  const own=item.existing.length?`<span class="base-missing-owned">Na base: ${item.existing.map(([tier,qty])=>`${nf(qty)} × ${variantText(tier)}`).join(' · ')}</span>`:'<span class="base-missing-owned">Ainda não possui nenhuma variante</span>';
  const requirements=[...new Map(item.requirements.map(r=>[`${r.c}:${r.tier}`,r])).values()].map(r=>`<span class="base-missing-cycle">Ciclo <b>${r.c}</b> · ${variantText(r.tier)}</span>`).join('');
  return `<article class="base-missing-item"><div class="base-missing-head"><button type="button" ${panelButton(item.name,'','path-droid-link')}>${imageOf(item.name,false,item.deficit[0].tier)}<span class="droid-info"><span class="droid-heading">${h(item.name)} ${rarityTag(byName[item.name]?.rarity)}</span><span class="entry-sub">Próxima exigência no ciclo <strong>${earliest}</strong></span></span></button></div><div class="base-missing-need"><span class="base-missing-label">Falta na base:</span>${item.deficit.map(d=>`<div class="base-missing-variant">${variantBadge(d.tier)} <b>${nf(d.qty)} unidade(s)</b> ${btn('+ Cadastrar','add',{kind:'secondary',size:'small',attrs:`data-name="${h(item.name)}" data-tier="${h(d.tier)}"`})}</div>`).join('')}</div><div class="base-missing-cycles"><span class="base-missing-label">Ciclos e variantes exigidos:</span><div class="base-missing-cycle-list">${requirements}</div></div>${own}</article>`;
 }).join('');
 return section('basemissing','◈','Droids que ainda preciso',`Caminho ${state.path} · do ciclo ${state.cycle} ao 40`,`${nf(list.length)} droids`,list.length?`<div class="base-missing-intro">Faltam <strong>${nf(count)} unidade(s)</strong> distribuídas em <strong>${nf(list.length)} droid(s)</strong>. A lista considera as variantes que você já possui: uma variante superior também atende às inferiores. Os droids são reutilizados entre ciclos.</div><div class="base-missing-list">${cards}</div>`:'<div class="success-state">✓ Sua base já atende aos requisitos de droids dos ciclos restantes deste caminho.</div>');
}
function inventory(){
 const s=getStats(),result=baseResultsHTML();
 const isAll=ui.inventoryScope==='all';
 const myDroids=`<div class="card card-pad base-own-card"><div class="wizard-path-title"><h2 style="margin:0">${isAll?'Buscar qualquer droid':'Droids na minha base'}</h2>${badge(isAll?`${CAT.length} no catálogo`:`${s.total} unidades`,'blue')}</div>
 <p class="mini-note">${isAll?'Consulte ou cadastre qualquer um dos 100 droids, mesmo que não esteja na sua base.':'Mostra somente os droids que você possui na conta '+h(currentAccount().name)+'. Ao vender no jogo, toque em Registrar venda.'}</p>
 ${ui.lastQuickSale&&undo?`<div class="base-undo-bar"><span>✓ Venda registrada. Base atualizada.</span>${btn('↶ Desfazer última venda','undo',{kind:'secondary',size:'small'})}</div>`:''}
 <div class="base-scope-switch" role="group" aria-label="Onde pesquisar droids"><button type="button" data-action="inventoryScope" data-scope="mine" aria-pressed="${!isAll}" class="${!isAll?'on':''}">▣ Minha Base</button><button type="button" data-action="inventoryScope" data-scope="all" aria-pressed="${isAll}" class="${isAll?'on':''}">⌕ Todos os droids</button></div>
 <label class="base-search-label" for="base-search">PESQUISAR DROID</label><div class="searchbox base-unified-search"><input id="base-search" class="input search-input" data-input="inventorySearch" value="${h(ui.inventorySearch)}" placeholder="${isAll?'Buscar nos 100 droids...':'Buscar na minha base...'}" autocomplete="off" spellcheck="false"></div>
 ${!isAll?`<div class="quick-filters base-filter-pills">${['Todos','Pode Vender','Necessários','Futuros'].map(f=>`<button type="button" class="filter-pill ${ui.inventoryFilter===f?'on':''}" data-action="inventoryFilter" data-filter="${f}">${f}</button>`).join('')}</div>`:''}
 <p class="mini-note base-result-count" id="base-count" aria-live="polite">${isAll?`${result.count} de ${CAT.length} droids do catálogo`:`${result.count} registros na base`}</p>
 <div id="base-live-results" class="${isAll?'base-all-results':'base-owned-results'}">${result.html}</div>
 <div class="base-catalog-trigger">${btn(isAll?'＋ Cadastro em lote':'＋ Cadastrar Droid','baseRegister',{kind:'secondary'})}<span class="mini-note">${isAll?'Para adicionar vários de uma só vez, abra o cadastro em lote.':'A busca em “Todos os droids” permite cadastrar sem mudar de aba.'}</span></div></div>`;
 let pool=state.path&&!ui.catalogAll?CAT.filter(d=>reqFor(d.name).length):CAT;pool=pool.filter(d=>(ui.catalogRarity==='Todos'||d.rarity===ui.catalogRarity)&&normSearch(d.name).includes(normSearch(ui.catalogSearch)));
 const catalog=`<section class="card card-pad" style="margin-top:17px"><div class="wizard-path-title"><h2 style="margin:0">Cadastro em lote</h2>${badge(`${pool.length} resultados`,'blue')}</div><div class="utility-bar"><div class="searchbox"><input class="input search-input" data-input="catalogSearch" value="${h(ui.catalogSearch)}" placeholder="Buscar droids para cadastrar..."></div><div class="field"><label class="hidden" for="catalog-rarity">Raridade</label><select class="select" id="catalog-rarity" data-input="catalogRarity">${selects([{value:'Todos',label:'Todas as raridades'},...['Common','Rare','Epic','Legendary','Mythic','Iconic'].map(value=>({value,label:rarityLabel(value)}))],ui.catalogRarity)}</select></div></div><div class="filter-row"><div class="seg"><button type="button" data-action="catalogMode" data-mode="current" class="${!ui.catalogAll?'on':''}">Do meu caminho</button><button type="button" data-action="catalogMode" data-mode="all" class="${ui.catalogAll?'on':''}">Todos os 100</button></div></div><div class="catalog-items">${pool.map(d=>`<div class="catalog-item"><button type="button" ${panelButton(d.name)}>${imageOf(d.name,false,best(d.name)||'Default')}<span class="droid-info"><span class="name">${h(d.name)}</span><span class="info rarity-meta">${rarityTag(d.rarity)} <span class="role-label">${h(roleLabel(d.role))}</span></span></span></button><div class="catalog-actions"><label class="batch-check"><input class="checkbox" type="checkbox" data-input="batchToggle" data-name="${h(d.name)}" ${ui.batch[d.name]?'checked':''}> Lote</label>${btn('+ Adicionar','add',{kind:'secondary',size:'small',attrs:`data-name="${h(d.name)}"`})}</div>${ui.batch[d.name]?`<div class="batch-box"><span class="small muted">Variante</span>${tierSelect(ui.batch[d.name].tier,d.rarity==='Iconic','batchTier',`data-input="batchTier" data-name="${h(d.name)}"`)}<span class="small muted">Quantidade</span><input class="input" type="number" min="1" max="10000" value="${ui.batch[d.name].qty}" data-input="batchQty" data-name="${h(d.name)}" aria-label="Quantidade de ${h(d.name)}"></div>`:''}</div>`).join('')||'<div class="empty">Nenhum droid corresponde aos filtros.</div>'}</div></section>`;
 return titlePage('INVENTÁRIO ATUAL','Minha Base','Sua base e o catálogo completo em um único lugar.',state.path?`${btn('Lista completa do caminho','openpathlist',{kind:'secondary'})}${btn('Meu caminho','opendashboard',{kind:'ghost'})}`:btn('Escolher caminho','setup'))+(!state.path?'<div class="hint" style="margin-bottom:18px">Selecione um caminho para ativar as recomendações de venda e fusão.</div>':'')+myDroids+(!isAll?missingBasePanel():'')+(!isAll?fusionSuggestionsPanel():'')+(ui.catalogVisible?catalog:'')+(ui.catalogVisible&&Object.keys(ui.batch).length?`<div class="sticky-batch"><span><b>${Object.keys(ui.batch).length} selecionado(s)</b></span>${btn('Salvar em lote','saveBatch')}</div>`:'')+footer();
}


// Propostas conservadoras: três excedentes da MESMA variante. Sem mexer em reservas ou requisitos.
function genericPlanResult(kind,parts){
 if(!Array.isArray(parts)||parts.length!==3)return null;
 const common=parts[0].tier,rarity=byName[parts[0].name]?.rarity;
 if(parts.some(p=>!validTier(p.name,p.tier)||p.tier==='Única'))return null;
 if(kind==='special'){
  const match=FUSIONS.find(r=>r.parts.slice().sort().join('|')===parts.map(p=>p.name).sort().join('|'));
  return match?{name:match.id,tier:parts.reduce((lowest,p)=>rank(p.tier)<rank(lowest)?p.tier:lowest,parts[0].tier),random:false}:null;
 }
 if(parts.some(p=>p.tier!==common))return null;
 // Receitas exclusivas prevalecem sobre fusões aleatórias, mesmo com três raridades iguais.
 if(FUSIONS.some(r=>r.parts.slice().sort().join('|')===parts.map(p=>p.name).sort().join('|')))return null;
 if(kind==='variant'&&parts.every(p=>p.name===parts[0].name)&&common!=='Kyber')return {name:parts[0].name,tier:T[rank(common)+1],random:false};
 if(kind==='rarity'&&parts.every(p=>byName[p.name].rarity===rarity)&&new Set(parts.map(p=>p.name)).size===3){
  const next={Common:'Rare',Rare:'Epic',Epic:'Legendary',Legendary:'Mythic'}[rarity];
  if(!next)return null;
  return {rarity:next,tier:common,random:true};
 }
 return null;
}
function availableFusionStock(){
 const result={};if(!state.path)return result;
 for(const row of requireCounts().saleEntries)result[nextId(row.name,row.tier)]=row.qty;
 return result;
}
function safeForProgress(parts){
 // Cada requisito que já era atendido deve permanecer atendido após a fusão.
 const byConsumed={};for(const p of parts)byConsumed[nextId(p.name,p.tier)]=(byConsumed[nextId(p.name,p.tier)]||0)+1;
 for(const name of new Set(parts.map(p=>p.name))){
  const cycles=new Map();for(const req of reqFor(name)){if(!cycles.has(req.c))cycles.set(req.c,[]);cycles.get(req.c).push(req);}
  for(const reqs of cycles.values())for(const req of reqs){
   const threshold=rank(req.tier);
   const required=reqs.filter(x=>rank(x.tier)>=threshold).length;
   const before=Object.entries(state.inventory[name]||{}).reduce((sum,[tier,q])=>sum+(rank(tier)>=threshold?q:0),0);
   const taken=parts.filter(x=>x.name===name&&rank(x.tier)>=threshold).length;
   if(before>=required&&before-taken<required)return false;
  }
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
 const stock=availableFusionStock(),ideas=[],max=24;
 const enough=parts=>{const used={};for(const p of parts){const key=nextId(p.name,p.tier);used[key]=(used[key]||0)+1;if(used[key]>(stock[key]||0))return false}return safeForProgress(parts)};
 const push=(kind,parts)=>{const result=genericPlanResult(kind,parts);if(!result||!enough(parts))return;ideas.push({kind,parts,result})};
 // Receitas especiais: prioriza três ingredientes da mesma variante para não reduzir o resultado.
 for(const recipe of FUSIONS){
  for(const tier of [...T].reverse()){
   const parts=recipe.parts.map(name=>({name,tier}));if(enough(parts)){push('special',parts);break;}
  }
 }
 for(const d of CAT){if(d.rarity==='Iconic')continue;for(const tier of [...T].reverse()){
  if(tier==='Kyber')continue;
  const parts=Array.from({length:3},()=>({name:d.name,tier}));
  if(enough(parts))push('variant',parts);
 }}
 const rarityOrder=['Legendary','Epic','Rare','Common'];
 for(const rarity of rarityOrder)for(const tier of [...T].reverse()){
  const names=CAT.filter(d=>d.rarity===rarity&&(stock[nextId(d.name,tier)]||0)>0).map(d=>d.name);
  if(names.length<3)continue;
  // Encontra os três primeiros diferentes, sem sugerir uma receita especial por engano.
  let selected=null;
  outer:for(let i=0;i<names.length;i++)for(let j=i+1;j<names.length;j++)for(let k=j+1;k<names.length;k++){
   const parts=[names[i],names[j],names[k]].map(name=>({name,tier}));
   if(genericPlanResult('rarity',parts)&&enough(parts)){selected=parts;break outer;}
  }
  if(selected)push('rarity',selected);
 }
 const priority={special:2,variant:1,rarity:0};
 return ideas.sort((a,b)=>rank(b.result.tier)-rank(a.result.tier)||priority[b.kind]-priority[a.kind]||['Legendary','Epic','Rare','Common'].indexOf(byName[a.parts[0].name].rarity)-['Legendary','Epic','Rare','Common'].indexOf(byName[b.parts[0].name].rarity)).slice(0,max);
}
const fusionKindName={special:'Fusão especial',variant:'Evoluir variante',rarity:'Evoluir raridade'};
function fusionPartsSummary(parts){return parts.map(p=>`${h(p.name)} · ${variantText(p.tier)}`).join(' <span class="fusion-plus">+</span> ')}
function fusionSuggestionsPanel(){
 const ideas=fusionSuggestions(),plans=state.fusions.genericPlans||[];
 const saved=plans.map(plan=>{const result=genericPlanResult(plan.kind,plan.parts),ready=!!result&&planIsFree(plan.parts,'g:'+plan.id);
  return `<article class="smart-fusion-card smart-fusion-reserved"><div class="smart-fusion-meta">${badge('Reservada','success')} <b>${h(fusionKindName[plan.kind])}</b></div><div class="smart-fusion-parts">${fusionPartsSummary(plan.parts)}</div><div class="smart-fusion-outcome">→ ${result?.random?`Droid ${h(rarityLabel(result.rarity))} aleatório`:h(result?.name||'—')} · ${result?variantText(result.tier):''}</div><div class="smart-fusion-actions">${btn('Já fiz esta fusão','genericMake',{kind:'outline-green',size:'small',attrs:`data-id="${h(plan.id)}" ${ready?'':'disabled'}`})}${btn('Cancelar reserva','genericUnplan',{kind:'ghost',size:'small',attrs:`data-id="${h(plan.id)}"`})}</div>${ready?'':'<small class="base-risk">Ingredientes indisponíveis; confira a reserva.</small>'}</article>`;
 }).join('');
 const cards=ideas.slice(0,12).map((idea,i)=>`<article class="smart-fusion-card"><div class="smart-fusion-meta"><b>${h(fusionKindName[idea.kind])}</b>${idea.kind==='special'?badge('Exclusiva','blue'):''}</div><div class="smart-fusion-parts">${fusionPartsSummary(idea.parts)}</div><div class="smart-fusion-outcome">→ ${idea.result.random?`1 ${h(rarityLabel(idea.result.rarity))} aleatório`:`1 ${h(idea.result.name)}`} · ${variantText(idea.result.tier)}</div><div class="smart-fusion-actions">${btn('Guardar para fusão','genericReserve',{kind:'secondary',size:'small',attrs:`data-idea="${i}"`})}${btn('Já fiz esta fusão','genericMakeNow',{kind:'ghost',size:'small',attrs:`data-idea="${i}"`})}</div></article>`).join('');
 return `<section class="card card-pad base-fusion-panel"><div class="wizard-path-title"><div><h2 style="margin:0">⚗ Sugestões de fusão</h2><p class="mini-note">Combinações com 3 unidades <strong>excedentes</strong>, sem usar droids protegidos do caminho ou de outras reservas.</p></div>${badge(`${ideas.length} sugestão(ões)`,'blue')}</div>
 ${saved?`<h3 class="smart-fusion-subtitle">Ingredientes que você reservou</h3><div class="smart-fusion-grid">${saved}</div>`:''}
 ${ideas.length?`<h3 class="smart-fusion-subtitle">Combinações disponíveis</h3><div class="smart-fusion-grid">${cards}</div>`:'<div class="empty">Nenhuma combinação segura com três excedentes neste momento.</div>'}
 <p class="mini-note">As propostas são alternativas: os mesmos excedentes podem aparecer em mais de uma sugestão. Ao reservar uma delas, as outras são recalculadas. Resultados aleatórios precisam ser confirmados após a fusão no jogo. Kyber colorido não é controlado pelo aplicativo.</p></section>`;
}

// ----- Fusion Lab: receitas, escolhas e reservas independentes por conta -----
function suggestedFusionTiers(recipe){
 const held=fusionPlanNeeds(recipe.id),taken={};
 return recipe.parts.map(name=>{
  for(const tier of T){const key=nextId(name,tier),free=(state.inventory[name]?.[tier]||0)-(held[key]||0)-(taken[key]||0);
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
 // Considera o consumo dos três ingredientes simultaneamente, inclusive cópias do mesmo droid.
 const consumed={},risk=new Set();
 recipe.parts.forEach((name,i)=>{const key=nextId(name,tiers[i]);consumed[key]=(consumed[key]||0)+1;});
 for(const name of new Set(recipe.parts)){
  const remaining={...(state.inventory[name]||{})};
  for(const [key,qty] of Object.entries(consumed))if(key.startsWith(name+'::')){
   const tier=key.slice(name.length+2);remaining[tier]=(remaining[tier]||0)-qty;
  }
  const byCycle={};for(const r of reqFor(name))(byCycle[r.c]??=[]).push(r);
  for(const [cycle,list] of Object.entries(byCycle)){
   if(list.some(r=>{
    const available=Object.entries(remaining).reduce((n,[t,q])=>n+(rank(t)>=rank(r.tier)?Math.max(q,0):0),0);
    return available<list.filter(x=>rank(x.tier)>=rank(r.tier)).length;
   })){risk.add(`${name} (ciclo ${cycle})`);break;}
  }
 }
 return [...risk];
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
   const options=[existing[i],...T].filter((t,j,a)=>T.includes(t)&&a.indexOf(t)===j);
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

function fusionCard(recipe){
 const plan=state.fusions.plans[recipe.id],tiers=fusionTiers(recipe),status=fusionAvailability(recipe,tiers),expanded=ui.fusionOpen===recipe.id,rarity=byName[recipe.id]?.rarity;
 const saved=fusionHistoryCount(recipe.id),present=countOwned(recipe.id);
 const slots=expanded?`<div class="fusion-slots">${status.slots.map((part,i)=>`<div class="fusion-slot ${part.have?'slot-ready':'slot-missing'}">${imageOf(part.name,false,part.tier)}<div class="fusion-slot-name"><button type="button" ${panelButton(part.name)}>${h(part.name)}</button><small>${part.have?'✓ Disponível':'Falta esta variante'} · ${part.stock} no inventário</small></div><label class="fusion-slot-choice"><span>Variante</span><select class="select variant-select" data-variant="${h(part.tier)}" data-input="fusionTier" data-id="${h(recipe.id)}" data-index="${i}" aria-label="Variante de ${h(part.name)}, ingrediente ${i+1}">${selects(T.map(value=>({value,label:variantLabel(value)})),part.tier)}</select></label></div>`).join('')}</div>`:'';
 return `<article class="card fusion-card ${expanded?'fusion-expanded':''}" data-recipe="${h(recipe.id)}">
 <div class="fusion-card-head">${imageOf(recipe.id,true,status.tier)}<div class="fusion-card-title"><div class="fusion-name-line"><strong>${h(recipe.id)}</strong>${rarityTag(rarity)}</div><span class="muted small">${h(roleLabel(byName[recipe.id]?.role))} · Resultado ${variantText(status.tier)}</span><div class="fusion-tags">${plan?badge('Reservada','blue'):''}${status.ready?badge('Pronta','success'):badge(`Faltam ${3-status.owned} ingrediente(s)`,'warning')}${saved?badge(`${saved} feita(s)`,'success'):''}${present?badge(`${present} no inventário`,'blue'):''}</div></div></div>
 <div class="fusion-recipe-line"><span>Receita</span><b>${h(fusionIngredientText(recipe))}</b></div>
 <div class="fusion-progress"><div style="width:${Math.round(100*status.owned/3)}%"></div></div>
 ${btn(expanded?'Ocultar ingredientes':'Ver ingredientes e variantes','fusionToggle',{kind:'secondary',size:'small',attrs:`data-id="${h(recipe.id)}"`})}
 ${expanded?`<div class="fusion-expanded-area"><p class="mini-note">Escolha a variante <strong>real</strong> de cada ingrediente. A fusão produz a menor das três variantes. Reservas de outras receitas reduzem a disponibilidade.</p>${slots}<div class="fusion-result"><span>Resultado previsto</span><strong>${h(recipe.id)} · ${variantText(status.tier)}</strong></div><div class="fusion-buttons">${btn(plan?'Atualizar reserva':'Reservar ingredientes','fusionPlan',{kind:'secondary',attrs:`data-id="${h(recipe.id)}"`})}${plan?btn('Cancelar reserva','fusionUnplan',{kind:'ghost',attrs:`data-id="${h(recipe.id)}"`}):''}${btn('Registrar fusão feita','fusionMake',{attrs:`data-id="${h(recipe.id)}" ${status.ready?'':'disabled'}`})}</div>${plan?'<p class="mini-note">Reserva ativa: estas unidades deixam de aparecer como disponíveis para venda.</p>':''}</div>`:''}
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
 return {schema:2,activeId:chosen,accounts:list};
}
function accountSettings(){return `<section class="card card-pad account-settings"><div class="wizard-path-title"><div><h2 style="margin:0">Minhas contas</h2><p class="muted small">Cada conta possui inventário, progresso e avisos próprios.</p></div>${btn('+ Nova conta','createAccount',{kind:'secondary'})}</div><div class="account-list">${accountsDb.accounts.map(a=>{const active=a.id===accountsDb.activeId,qty=arrInventory(a.data).reduce((n,e)=>n+e.qty,0);return `<div class="account-row ${active?'account-current':''}"><div class="account-row-info"><strong>${h(a.name)}</strong>${active?'<span class="account-active-tag">Ativa</span>':''}<small>Caminho ${a.data.path||'não definido'} · Ciclo ${a.data.cycle} · ${nf(qty)} droid(s)</small></div><div class="account-row-buttons">${!active?btn('Usar','activateAccount',{kind:'secondary',size:'small',attrs:`data-id="${h(a.id)}"` }):''}${btn('Renomear','renameAccount',{kind:'ghost',size:'small',attrs:`data-id="${h(a.id)}"`})}${accountsDb.accounts.length>1?btn('Excluir','deleteAccount',{kind:'ghost',size:'small',attrs:`data-id="${h(a.id)}"` }):''}</div></div>`}).join('')}</div><p class="mini-note">A última conta utilizada será aberta automaticamente. Para trocar de conta em qualquer tela, use o seletor no topo.</p></section>`}
function settings(){let s=getStats();return titlePage('CONFIGURAÇÕES','Seus dados, sob seu controle','Sem cadastro. Tudo fica neste navegador e você pode fazer backup quando quiser.')+accountSettings()+`<div class="grid-3" style="margin-top:17px"><div class="card card-pad"><h3>⇩ Backup da conta ativa</h3><p class="muted small">Baixe apenas <strong>${h(currentAccount().name)}</strong>, com o nome no arquivo. Ao importar, o nome será mantido.</p>${btn('Baixar backup desta conta','exportActive',{kind:'secondary'})}</div><div class="card card-pad"><h3>⇩ Backup completo</h3><p class="muted small">Salve todas as contas, seus nomes, inventários, ciclos e históricos em um único arquivo JSON.</p>${btn('Baixar todas as contas','export',{kind:'secondary'})}</div><div class="card card-pad"><h3>⇧ Importar backup</h3><p class="muted small">Mantém o nome da conta do arquivo. Se já existir, perguntaremos antes de substituir; as demais contas serão preservadas.</p>${btn('Escolher arquivo','import',{kind:'secondary'})}</div></div><section class="card card-pad" style="margin-top:17px"><h3>Meu progresso</h3><div class="small muted">Caminho: <b>${state.path||'Não configurado'}</b> · Ciclo: <b>${state.cycle}</b> · Droids cadastrados: <b>${s.total}</b></div><div class="utility-bar">${state.path?`${btn('Corrigir ciclo','cycle',{kind:'secondary'})}${btn('Trocar de caminho','changePath',{kind:'ghost'})}`:btn('Configurar caminho','setup',{kind:'secondary'})}</div>${state.history.length?`<h4 class="subheading">Caminhos anteriores</h4>${state.history.slice(-5).reverse().map(x=>`<div class="details-line">Caminho ${h(x.path)} · Ciclo ${h(x.cycle)} <span class="small">${h(x.date||'')}</span></div>`).join('')}`:''}</section>${state.sales?.length?`<section class="card card-pad base-sales-history" style="margin-top:17px"><h3>Últimas vendas registradas</h3><p class="mini-note">Movimentações registradas pelo botão Registrar venda, nesta base ou nos detalhes.</p>${state.sales.slice(-10).reverse().map(e=>`<div class="details-line"><span>${h(e.name)} · ${variantText(e.tier)}</span><b>−${nf(e.qty)}</b></div>`).join('')}</section>`:''}${state.fusions?.genericHistory?.length?`<section class="card card-pad" style="margin-top:17px"><h3>Últimas fusões sugeridas realizadas</h3>${state.fusions.genericHistory.slice(-10).reverse().map(x=>`<div class="details-line"><span>${h(x.result)} · ${variantText(x.tier)}</span><b>${h(fusionKindName[x.kind])}</b></div>`).join('')}</section>`:''}${state.removals?.length?`<section class="card card-pad removal-history" style="margin-top:17px"><h3>Últimas retiradas do inventário</h3><p class="mini-note">Registros do botão “Não possuo mais”, por conta. Vendas e fusões têm registros separados.</p>${state.removals.slice(-10).reverse().map(e=>`<div class="details-line"><span>${h(e.name)} · ${variantText(e.tier)}</span><b>−${nf(e.qty)}</b></div>`).join('')}</section>`:''}<section class="card card-pad" style="margin-top:17px"><h3>Verificar fotos dos droids</h3><p class="small muted">Confira se as imagens dos 100 droids carregam na sua conexão. O teste não altera seu inventário.</p>${btn('Testar as 100 imagens','auditImages',{kind:'secondary'})}</section><section class="card card-pad" style="margin-top:17px"><h3>Privacidade e armazenamento</h3><p class="small muted">Os dados pessoais não são enviados ao Google Sheets nem ao GitHub. Eles ficam apenas no armazenamento deste navegador. Em outro aparelho, importe seu backup para continuar. Na navegação anônima ou após limpar dados do navegador, você pode perder informações sem backup.</p><div class="utility-bar">${btn('Conferir fonte dos requisitos','source',{kind:'ghost'})}${localStorage.getItem(ACCOUNTS_UNDO)?btn('Desfazer última restauração','undoRestore',{kind:'secondary'}):''}</div></section>`+footer();}
function footer(){return `<footer class="footer-note">Referência comunitária: <a href="${h(DB.source)}" target="_blank" rel="noopener noreferrer">Droidex · 6 caminhos</a> e <a href="${h(DB.catalogSource)}" target="_blank" rel="noopener noreferrer">Droid Tycoon Helper · 100 droids e chips</a>. Base ${h(DB.version)}. Informações de progressão podem mudar com atualizações do jogo. “Pode Vender” respeita as reservas de fusão, mas não considera renda nem coleção.</footer>`}
function render(){if(storageError){app.innerHTML=`<div class="card card-pad"><h2>Armazenamento indisponível</h2><p>Não foi possível abrir suas contas: ${h(storageError)}. Seus dados antigos não foram apagados. Não faça novos cadastros neste momento; abra o site no navegador habitual ou restaure um backup em uma instalação funcional.</p></div>`;return}app.innerHTML=ui.tab==='dashboard'?dashboard():ui.tab==='search'?search():ui.tab==='inventory'?inventory():ui.tab==='pathlist'?fullPathChecklist():ui.tab==='fusion'?fusionPage():settings();accountHeader();document.querySelectorAll('[data-tab]').forEach(el=>{el.classList.toggle('active',el.dataset.tab===ui.tab);if(el.dataset.tab===ui.tab)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current')});document.getElementById('top-breadcrumb').textContent={dashboard:'Meu caminho',search:'Consulta livre',inventory:'Minha Base',pathlist:'Lista do caminho',fusion:'Fusões especiais',settings:'Configurações'}[ui.tab];renderModal();renderDetail();}
function restoreInputFocus(id,position){const q=document.querySelector(`[data-input="${id}"]`);if(q){q.focus();if(q.setSelectionRange&&position!=null)try{q.setSelectionRange(position,position)}catch(e){}}}
function openModal(kind,props={}){ui.modal={kind,...props};renderModal()}
function modalWrap(title,subtitle,content,buttons){return `<div class="modal-backdrop" data-action="closeBackdrop"><div class="modal" role="dialog" aria-modal="true" aria-label="${h(title)}"><div class="modal-header"><div><h3>${h(title)}</h3><small>${h(subtitle||'')}</small></div><button class="close-btn" type="button" aria-label="Fechar" data-action="close">×</button></div><form id="modal-form" data-form="${h(ui.modal.kind)}"><div class="modal-body">${content}</div><div class="modal-footer">${btn('Cancelar','close',{kind:'ghost'})}${buttons}</div></form></div></div>`}

function renderDetail(){const root=document.getElementById('detail-root');if(!root)return;const name=ui.detail,d=byName[name];if(!name||!d){root.innerHTML='';document.body.classList.remove('drawer-open');return;}
 document.body.classList.add('drawer-open');const tiers=Object.entries(state.inventory[name]||{}).filter(([,qty])=>qty>0).sort((a,b)=>rank(b[0])-rank(a[0]));const selected=tiers.some(x=>x[0]===ui.detailTier)?ui.detailTier:tiers[0]?.[0]||'';
 const amount=selected?(state.inventory[name]?.[selected]||0):0,counts=selected?calcRowCounts(name,selected):{keep:0,sell:0};const occur=allOccurrences(name,ui.pathFilter);
 const requirementDetail=occur.length?occur.map(x=>`<div class="detail-req-row"><span>Caminho ${x.p} · Ciclo ${x.c}</span>${variantBadge(x.tier)}</div>`).join(''):'<p class="muted small">Não exigido nos caminhos selecionados.</p>';
 const variantActions=amount?`<div class="drawer-counts"><span>Guardar <b>${counts.keep}</b></span><span>Pode Vender <b>${counts.sell}</b></span></div><div class="drawer-actions">${btn('Editar','edit',{kind:'secondary',attrs:`data-name="${h(name)}" data-tier="${h(selected)}"`})}${selected==='Kyber'||selected==='Única'?'':btn('Evoluí','evolve',{kind:'secondary',attrs:`data-name="${h(name)}" data-tier="${h(selected)}"`})}${counts.sell?btn('Registrar venda','sale',{kind:'outline-green',attrs:`data-name="${h(name)}" data-tier="${h(selected)}" data-max="${counts.sell}"` }):''}</div><div class="drawer-remove-line">${btn('Não possuo mais','removeOwned',{kind:'secondary inventory-remove-btn',size:'small',attrs:`data-name="${h(name)}" data-tier="${h(selected)}"`})}</div>`:'';
 const sellCount=selected?counts.sell:saleTotalForDroid(name),reserved=selected?(requireCounts().protectedEntries.find(x=>x.name===name&&x.tier===selected)?.fusionQty||0):0;
 const saleExplanation=!state.path?'Configure seu caminho para calcular quais unidades podem ser vendidas.':!anyOwned(name)?'Você ainda não cadastrou este droid nesta conta.':sellCount?`Você pode vender ${sellCount} unidade(s)${selected?' da variante '+variantText(selected):''} após considerar seu caminho e suas reservas.`:'Nenhuma unidade desta variante está liberada para venda no momento.';
 const saleAdvisory=`<section class="drawer-section sale-advisory"><h3>↗ Pode vender?</h3><div class="advisory-status">${sellCount?badge(`Pode vender ${sellCount}`,'success'):badge(!state.path?'Sem caminho':'Guardar / sem excedentes','warning')}${reserved?badge(`${reserved} reservado(s) para fusão`,'blue'):''}</div><p class="mini-note">${saleExplanation}</p></section>`;
 const fusionAdvisory=`<section class="drawer-section fusion-advisory"><h3>⚗ Fusões especiais</h3>${fusionAlerts(name,selected)}</section>`;
 const chipsCalc=d.rarity==='Iconic'?'':`<section class="drawer-section"><h3>Chips para evoluir</h3><div class="field-inline"><div class="field"><label>De</label><select class="select variant-select" data-variant="${h(ui.chipFrom||'Default')}" data-input="chipFrom">${selects(T.map(value=>({value,label:variantLabel(value)})),ui.chipFrom||'Default')}</select></div><div class="field"><label>Para</label><select class="select variant-select" data-variant="${h(ui.chipTo||'Diamond')}" data-input="chipTo">${selects(T.map(value=>({value,label:variantLabel(value)})),ui.chipTo||'Diamond')}</select></div></div><p class="mini-note">Chips necessários: <b class="chip-highlight">${nf(chips(name,ui.chipFrom||'Default',ui.chipTo||'Diamond'))}</b></p></section>`;
 root.innerHTML=`<div class="detail-backdrop" data-action="closeDetailBackdrop"></div><aside class="detail-drawer" role="dialog" aria-modal="true" aria-label="Detalhes de ${h(name)}"><div class="drawer-handle"></div><div class="drawer-top"><div class="drawer-intro">${imageOf(name,true,selected||"Default")}<div><h2>${h(name)}</h2><div class="muted rarity-meta">${rarityTag(d.rarity)} <span class="role-label">${h(roleLabel(d.role))}</span></div></div></div><button type="button" class="drawer-close" data-action="closeDetail" aria-label="Fechar detalhes">×</button></div><div class="drawer-scroll">${state.path||tiers.length?`<section class="drawer-section"><h3>Na minha base</h3>${tiers.length?`<div class="drawer-variants">${tiers.map(([tier,qty])=>`<button type="button" class="variant-pill ${tier===selected?'on':''}" data-variant="${h(tier)}" data-action="detailTier" data-tier="${h(tier)}">${h(variantLabel(tier))} · ${qty}</button>`).join('')}</div>${variantActions}`:'<p class="muted small">Este droid não está cadastrado.</p>'}${btn('+ Consegui','add',{kind:'secondary',attrs:`data-name="${h(name)}"`})}</section>`:''}${saleAdvisory}${fusionAdvisory}<section class="drawer-section"><h3>Onde será necessário?</h3><div class="field"><label>Filtrar caminho</label><select class="select" data-input="pathFilter">${selects([{label:'Todos os caminhos',value:0},...Array.from({length:6},(_,i)=>({label:`Caminho ${i+1}`,value:i+1}))],ui.pathFilter)}</select></div><div class="detail-req-list">${requirementDetail}</div></section>${chipsCalc}</div></aside>`;
 root.querySelector('.drawer-close')?.focus({preventScroll:true});
}

function renderModal(){const root=document.getElementById('modal-root');const m=ui.modal;if(!m){root.innerHTML='';return};let title='',subtitle='',content='',buttons='';
 switch(m.kind){case 'createAccount':{title='Adicionar conta';subtitle='Os dados desta conta serão independentes.';content='<div class="field"><label for="account-name">Nome da nova conta</label><input id="account-name" class="input" name="name" maxlength="40" placeholder="Ex.: Minha segunda conta" required></div><p class="mini-note">Você poderá mudar o nome depois.</p>';buttons='<button class="btn" type="submit">Criar e usar conta</button>';break}
 case 'renameAccount':{const a=accountsDb.accounts.find(a=>a.id===m.id);if(!a){ui.modal=null;root.innerHTML='';return}title='Renomear conta';subtitle=a.name;content=`<div class="field"><label>Nome da conta</label><input class="input" name="name" maxlength="40" value="${h(a.name)}" required></div>`;buttons='<button class="btn" type="submit">Salvar novo nome</button>';break}
 case 'deleteAccount':{const a=accountsDb.accounts.find(a=>a.id===m.id);if(!a){ui.modal=null;root.innerHTML='';return}title='Excluir conta';subtitle=a.name;content=`<p>Esta ação apagará o inventário, progresso, histórico e avisos desta conta neste navegador. As demais contas não serão apagadas.</p><div class="hint"><strong>Recomendamos exportar o backup de todas as contas antes.</strong> A exclusão não tem botão de desfazer.</div><div class="field" style="margin-top:15px"><label>Digite <strong>${h(a.name)}</strong> para confirmar</label><input class="input" name="confirmName" autocomplete="off" required></div>`;buttons='<button class="btn danger" type="submit">Excluir conta definitivamente</button>';break}
 case 'add':{const d=byName[m.name];title=`Cadastrar ${m.name}`;subtitle='Informe o que você conseguiu no jogo.';content=`<div class="field"><label>Variante</label>${tierSelect(validTier(m.name,m.tier)?m.tier:(d?.rarity==='Iconic'?'Única':'Default'),d?.rarity==='Iconic','tier')}</div><div class="field"><label>Quantidade</label><input class="input" type="number" name="qty" min="1" max="100000" value="1" required></div>`;buttons=`<button class="btn" type="submit">Salvar droid</button>`;break}
 case 'edit':{title=`Editar ${m.name}`;subtitle=`Variante atual: ${variantLabel(m.tier)}`;content=`<div class="field"><label>Variante</label>${tierSelect(m.tier,byName[m.name]?.rarity==='Iconic','tier')}</div><div class="field"><label>Quantidade total</label><input class="input" type="number" min="1" max="100000" name="qty" value="${state.inventory[m.name]?.[m.tier]||0}" required></div><div class="hint">Editar corrige o cadastro. Não registra venda nem consumo de chips.</div>`;buttons=`${btn('Excluir cadastro','delete',{kind:'danger'})}<button class="btn" type="submit">Salvar alterações</button>`;break}
 case 'evolve':{const options=T.slice(rank(m.tier)+1);title=`Evoluí ${m.name}`;subtitle=`Variante atual: ${variantLabel(m.tier)}`;content=`<div class="field"><label>Variante alcançada</label><select class="select variant-select" data-variant="${h(ui.evolveDestination&&options.includes(ui.evolveDestination)?ui.evolveDestination:options[0])}" name="tier" id="evolve-tier" data-input="evolveDestination">${selects(options.map(value=>({value,label:variantLabel(value)})),ui.evolveDestination&&options.includes(ui.evolveDestination)?ui.evolveDestination:options[0])}</select></div><div class="field"><label>Quantidade evoluída (máx. ${state.inventory[m.name]?.[m.tier]||0})</label><input class="input" name="qty" min="1" max="${state.inventory[m.name]?.[m.tier]||0}" type="number" value="1" required></div><div class="hint">Chips para uma unidade: <strong class="chip-highlight" id="evolve-cost">${nf(chips(m.name,m.tier,ui.evolveDestination&&options.includes(ui.evolveDestination)?ui.evolveDestination:options[0]))}</strong>. O aplicativo apenas registra a evolução feita no jogo.</div>`;buttons=`<button class="btn" type="submit">Confirmar evolução</button>`;break}
 case 'removeOwned':{
  const current=state.inventory[m.name]?.[m.tier]||0;
  if(!current){ui.modal=null;root.innerHTML='';return}
  const reserved=fusionPlanNeeds()[nextId(m.name,m.tier)]||0;
  const required=calcRowCounts(m.name,m.tier).keep;
  title=`Não possuo mais: ${m.name}`;subtitle=`${variantLabel(m.tier)} · ${current} unidade(s) cadastrada(s)`;
  content=`<p>Retire do cadastro os droids que <strong>já não estão na sua base</strong>, mesmo que ainda sejam necessários no caminho.</p><div class="field"><label>Quantas unidades quer retirar?</label><input class="input" name="qty" min="1" max="${current}" type="number" value="${current}" required></div><div class="hint">Esta ação atualiza apenas o inventário de <strong>${h(currentAccount().name)}</strong>. Não registra uma venda nem apaga os requisitos do caminho. Você poderá desfazer logo depois de confirmar.</div>${required?`<div class="hint removal-warning">⚠ Este droid pode ser necessário no seu caminho. Ao retirá-lo, ele voltará a aparecer como pendência quando aplicável.</div>`:''}${reserved?`<div class="hint removal-warning">⚗ Existem <strong>${reserved}</strong> unidade(s) reservada(s) para fusão desta variante. As reservas que ficarem sem ingredientes serão canceladas automaticamente.</div>`:''}`;
  buttons='<button class="btn danger" type="submit">Confirmar retirada</button>';break;
 }
 case 'sale':{title=`Registrar venda: ${m.name}`;subtitle=`${variantLabel(m.tier)} · ${m.max} unidade(s) liberada(s)`;content=`<div class="field"><label>Quantidade vendida</label><input class="input" name="qty" min="1" max="${m.max}" type="number" value="1" required></div><div class="hint"><strong>Importante:</strong> “Pode Vender” é uma indicação de progressão. A decisão de vender pode afetar renda, coleção ou fusão.</div>`;buttons=`<button class="btn" type="submit">Registrar venda</button>`;break}
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
  content=`<p>Esta operação retirará exatamente <strong>3 droids</strong> do inventário da conta <strong>${h(currentAccount().name)}</strong> e adicionará <strong>1 ${h(recipe.id)} · ${variantText(availability.tier)}</strong>.</p><div class="fusion-confirm-list">${recipe.parts.map((name,i)=>`<div class="details-line"><span>${h(name)}</span><b>${variantText(m.tiers[i])}</b></div>`).join('')}</div>${warnings.length?`<div class="hint fusion-warning"><strong>Atenção ao seu renascimento!</strong> Consumir estes ingredientes pode prejudicar requisitos do seu caminho: ${h(warnings.join(', '))}. Confirme apenas se decidiu usá-los mesmo assim.</div>`:'<div class="hint">Os ingredientes serão consumidos no cadastro. Você poderá desfazer a alteração pelo aviso na tela.</div>'}${availability.ready?'':'<div class="hint fusion-warning">Os ingredientes não estão mais disponíveis. Cancele e confira seu inventário.</div>'}`;
  buttons=`<button class="btn" type="submit" ${availability.ready?'':'disabled'}>Sim, já fiz esta fusão</button>`;break;
 }
 case 'genericConfirm':{
  const result=genericPlanResult(m.fusionKind,m.parts),ready=!!result&&planIsFree(m.parts,m.planId?'g:'+m.planId:'');
  if(!result){ui.modal=null;root.innerHTML='';return}
  title='Registrar fusão realizada';subtitle='Somente depois de realizar a combinação dentro do jogo.';
  const eligible=result.random?CAT.filter(d=>d.rarity===result.rarity&&!FUSION_BY_ID[d.name]).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')):[];
  content=`<p>Esta operação <strong>retira 3 unidades</strong> da base de ${h(currentAccount().name)} e adiciona 1 resultado.</p><div class="fusion-confirm-list">${m.parts.map(p=>`<div class="details-line"><span>${h(p.name)}</span><b>${variantText(p.tier)}</b></div>`).join('')}</div><div class="hint">Resultado esperado: <strong>${result.random?'Droid '+h(rarityLabel(result.rarity))+' aleatório':h(result.name)} · ${variantText(result.tier)}</strong>.</div>${result.random?`<div class="field"><label>Qual droid você realmente recebeu?</label><select class="select" name="resultName" required><option value="">Selecione o resultado...</option>${selects(eligible.map(d=>({value:d.name,label:d.name})),'')}</select></div>`:''}<p class="mini-note">Se o jogo indicar um resultado diferente, cancele e confira a combinação antes de registrar. Você poderá desfazer após confirmar.</p>${ready?'':'<div class="hint fusion-warning">Ingredientes indisponíveis: verifique suas reservas.</div>'}`;
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
function mutateInventory(name,tier,delta){if(!validName(name)||!validTier(name,tier))return;const tiers=(state.inventory[name]??={});tiers[tier]=Math.max(0,(tiers[tier]||0)+delta);if(!tiers[tier])delete tiers[tier];if(!Object.keys(tiers).length)delete state.inventory[name];if(delta>0)delete state.absent[name]}
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
 const payload={schema:2,activeId:onlyCurrent?currentAccount().id:accountsDb.activeId,accounts:selected,exportedAt:now.toISOString(),app:'Droid Tycoon'};
 downloadBackup(payload,`droid-tycoon-${name}-${stamp}.json`,onlyCurrent?`Backup de ${currentAccount().name} exportado.`:'Backup completo exportado com os nomes das contas.');
}
function submitModal(form){const m=ui.modal;if(!m)return;const vals=new FormData(form);const qty=nInt(vals.get('qty'),1,100000);let text='';switch(m.kind){
 case 'add':{const tier=String(vals.get('tier'));if(!qty||!validTier(m.name,tier))return notify('Informe uma variante e quantidade válidas.');save(()=>mutateInventory(m.name,tier,qty),`${m.name} cadastrado.`);break}
 case 'edit':{const tier=String(vals.get('tier'));if(!qty||!validTier(m.name,tier))return notify('Informe dados válidos.');save(()=>{const old=state.inventory[m.name]?.[m.tier]||0;mutateInventory(m.name,m.tier,-old);mutateInventory(m.name,tier,qty)},'Cadastro atualizado.');break}
 case 'evolve':{const tier=String(vals.get('tier'));const current=state.inventory[m.name]?.[m.tier]||0;if(!qty||qty>current||!T.includes(tier)||rank(tier)<=rank(m.tier))return notify('Verifique a variante de destino e a quantidade.');save(()=>{mutateInventory(m.name,m.tier,-qty);mutateInventory(m.name,tier,qty)},`Evolução registrada: ${m.name} → ${variantLabel(tier)}.`);break}
 case 'removeOwned':{
  const current=state.inventory[m.name]?.[m.tier]||0;
  if(!qty||!current||qty>current)return notify('Confira a quantidade: ela não pode ultrapassar o que você tem cadastrado.');
  let released=[];
  save(()=>{
   mutateInventory(m.name,m.tier,-qty);
   released=clearBrokenFusionReservations();
   if(!anyOwned(m.name))state.absent[m.name]=true;
   state.removals??=[];
   state.removals.push({name:m.name,tier:m.tier,qty,date:new Date().toISOString()});
   state.removals=state.removals.slice(-100);
  },`${qty} unidade(s) de ${m.name} retirada(s) do inventário.${released.length?' Reservas canceladas: '+released.join(', ')+'.':''}`);
  if(!anyOwned(m.name)&&ui.tab==='inventory'){ui.detail='';renderDetail()}
  break;
 }
 case 'sale':{const current=state.inventory[m.name]?.[m.tier]||0;const allowed=requireCounts().saleEntries.find(e=>e.name===m.name&&e.tier===m.tier)?.qty||0;if(!qty||qty>current||qty>allowed)return notify('A quantidade excede o que está liberado para venda.');save(()=>{mutateInventory(m.name,m.tier,-qty);state.sales.push({name:m.name,tier:m.tier,qty,date:new Date().toISOString()});state.sales=state.sales.slice(-30)},'Venda registrada. Você pode desfazer.');break}
 case 'cycle':{const cycle=nInt(vals.get('cycle'),1,40);if(!cycle)return;save(()=>{state.cycle=cycle},`Ciclo atualizado para ${cycle}.`);break}
 case 'advance':{const final=state.cycle===40;if(final&&state.completed.some(x=>x.path===state.path&&x.cycle===40))return;save(()=>{state.completed.push({path:state.path,cycle:state.cycle});if(final){state.history.push({path:state.path,cycle:40,date:new Date().toLocaleDateString('pt-BR'),finished:true,inventory:JSON.parse(JSON.stringify(state.inventory))});state.history=state.history.slice(-30)}else state.cycle++},final?'Caminho concluído!':'Ciclo atualizado.');break}
 case 'changePath':{const p=nInt(vals.get('path'),1,6);if(!p||p===state.path)return;try{localStorage.setItem(RESTORE,JSON.stringify(state))}catch(e){};save(()=>{state.history.push({path:state.path,cycle:state.cycle,date:new Date().toLocaleDateString('pt-BR'),inventory:JSON.parse(JSON.stringify(state.inventory))});state.path=p;state.cycle=1;state.inventory={};state.absent={};state.completed=[];state.sales=[];state.fusions.plans={};state.fusions.genericPlans=[];state.history=state.history.slice(-30)},`Caminho ${p} iniciado. Inventário reiniciado.`);ui.open=new Set(['pending']);break}
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
  try{accountsDb=mergeBackupAccounts(incoming,m.format==='legacy'||(m.format==='multi'&&incoming.length===1))}
  catch(err){accountsDb=previous;return notify('Não foi possível importar: '+err.message)}
  if(!saveAccountsBlob()){accountsDb=previous;resetAccountView();return}
  resetAccountView();ui.tab='settings';
  notify(conflicts.length?`Backup importado. ${conflicts.length} conta(s) substituída(s) com confirmação. Você pode desfazer nas Configurações.`:`Backup importado: ${incoming.length} conta(s) adicionada(s).`);
  break;
 }
 case 'genericConfirm':{
  const result=genericPlanResult(m.fusionKind,m.parts);
  if(!result||!planIsFree(m.parts,m.planId?'g:'+m.planId:''))return notify('Ingredientes indisponíveis ou já reservados.');
  const name=result.random?String(vals.get('resultName')||''):result.name;
  if(!validName(name)||!validTier(name,result.tier)||(result.random&&(byName[name].rarity!==result.rarity||!!FUSION_BY_ID[name])))return notify('Selecione o droid realmente recebido.');
  save(()=>{
   for(const part of m.parts)mutateInventory(part.name,part.tier,-1);
   mutateInventory(name,result.tier,1);
   if(m.planId)state.fusions.genericPlans=state.fusions.genericPlans.filter(p=>p.id!==m.planId);
   state.fusions.genericHistory.push({kind:m.fusionKind,parts:m.parts.map(p=>({...p})),result:name,tier:result.tier,date:new Date().toISOString()});
   state.fusions.genericHistory=state.fusions.genericHistory.slice(-120);
  },`Fusão registrada: ${name} · ${variantLabel(result.tier)}. Você pode desfazer.`);
  break;
 }
 case 'fusionConfirm':{
  const recipe=FUSION_BY_ID[m.id];if(!recipe||!Array.isArray(m.tiers)||m.tiers.length!==3)return notify('Receita inválida.');
  const status=fusionAvailability(recipe,m.tiers);if(!status.ready)return notify('Faltam ingredientes ou alguma unidade está reservada em outra fusão.');
  save(()=>{
   recipe.parts.forEach((name,i)=>mutateInventory(name,m.tiers[i],-1));
   mutateInventory(recipe.id,status.tier,1);
   delete state.fusions.plans[recipe.id];
   state.fusions.history.push({id:recipe.id,tier:status.tier,tiers:[...m.tiers],date:new Date().toISOString()});
   state.fusions.history=state.fusions.history.slice(-120);
  },`Fusão ${recipe.id} · ${variantLabel(status.tier)} registrada. Você pode desfazer.`);
  delete ui.fusionDraft[recipe.id];break;
 }
 case 'delete':{save(()=>{const n=state.inventory[m.name]?.[m.tier]||0;mutateInventory(m.name,m.tier,-n)},'Cadastro excluído.');break}
 }ui.modal=null;render();}
function handleAction(button){const a=button.dataset.action,n=button.dataset.name,t=button.dataset.tier;
 switch(a){
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
 case 'expand':ui.open.has(button.dataset.id)?ui.open.delete(button.dataset.id):ui.open.add(button.dataset.id);render();break;
 case 'choosepath':ui.setupPath=Number(button.dataset.path);render();break;
 case 'start':{const p=nInt(ui.setupPath,1,6),c=nInt(ui.setupCycle,1,40);if(!p||!c)return notify('Escolha um caminho e ciclo válidos.');save(()=>{state.path=p;state.cycle=c},'Seu caminho está configurado.');ui.tab=ui.setupRegister?'pathlist':'dashboard';ui.pathBatch={};ui.pathDraft={};render();if(ui.setupRegister)notify('Agora escolha as variantes e marque os droids que já possui.');break;}
 case 'setup':ui.tab='dashboard';state.path?openModal('changePath'):render();break;
 case 'openpathlist':setTab('pathlist');break;case 'opensearch':setTab('search');break;case 'opendashboard':setTab('dashboard');break;case 'openinventory':ui.inventoryScope='all';ui.catalogVisible=false;setTab('inventory');break;case 'addpick':ui.inventoryScope='all';ui.catalogVisible=false;setTab('inventory');break;
 case 'add':openModal('add',{name:n,tier:t});break;case 'edit':openModal('edit',{name:n,tier:t});break;
 case 'delete':if(ui.modal?.kind==='edit')openModal('delete',{name:ui.modal.name,tier:ui.modal.tier});break;
 case 'evolve':ui.evolveDestination='';openModal('evolve',{name:n,tier:t});break;
 case 'removeOwned':{if(!n||!t||!(state.inventory[n]?.[t]>0))return notify('Este droid não está no inventário desta conta.');openModal('removeOwned',{name:n,tier:t});break;}
 case 'sellOne':{
  if(ui.tab!=='inventory'||!validName(n)||!validTier(n,t)||!(state.inventory[n]?.[t]>0))return notify('Esse droid não está mais na sua base.');
  let released=[];
  save(()=>{
   mutateInventory(n,t,-1);
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
 case 'detail':ui.detail=n;ui.detailTier=t||'';ui.chipFrom='Default';ui.chipTo='Diamond';renderDetail();break;
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
 case 'pathAdd':{const draft=pathDraft(n);const qty=nInt(draft.qty,1,100000);if(!state.path||!validTier(n,draft.tier)||!qty)return notify('Escolha uma variante e quantidade válidas.');save(()=>mutateInventory(n,draft.tier,qty),`${n} · ${variantLabel(draft.tier)} cadastrado.`);delete ui.pathBatch[n];render();break;}
 case 'pathSaveBatch':{const entries=Object.keys(ui.pathBatch).map(name=>({name,...pathDraft(name)}));if(!entries.length)return;for(const e of entries)if(!validTier(e.name,e.tier)||!nInt(e.qty,1,100000))return notify('Revise variantes e quantidades.');save(()=>{for(const e of entries)mutateInventory(e.name,e.tier,Number(e.qty))},`${entries.length} droid(s) adicionados ao inventário.`);ui.pathBatch={};render();break;}
 case 'readSales':unreadNotices={};storeNotices();render();notify('Avisos de venda marcados como lidos.');break;
 case 'catalogMode':ui.catalogAll=button.dataset.mode==='all';render();break;
 case 'saveBatch':{const entries=Object.entries(ui.batch);if(!entries.length)return;for(const [name,v]of entries)if(!validTier(name,v.tier)||!nInt(v.qty,1,100000))return notify('Revise variante e quantidade na seleção em lote.');save(()=>{for(const [name,v]of entries)mutateInventory(name,v.tier,Number(v.qty))},`${entries.length} droids cadastrados.`);ui.batch={};render();break;}
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
 case 'undoRestore':restoreAccountsSnapshot();break;
 case 'prevBrowse':ui.browseCycle=Math.max(1,ui.browseCycle-1);render();break;case 'nextBrowse':ui.browseCycle=Math.min(40,ui.browseCycle+1);render();break;
 }
}
document.addEventListener('click',e=>{const tab=e.target.closest('[data-tab]');if(tab){setTab(tab.dataset.tab);return};const el=e.target.closest('[data-action]');if(el){if(el.closest('form')&&el.type==='submit')return;if((el.dataset.action==='closeBackdrop'||el.dataset.action==='closeDetailBackdrop')&&e.target!==el)return;handleAction(el)}});
document.addEventListener('submit',e=>{if(e.target.id==='modal-form'){e.preventDefault();submitModal(e.target)}});
document.addEventListener('input',e=>{const input=e.target.dataset.input;if(!input)return;
 if(input==='search'){ui.search=e.target.value;refreshSearchResults();return;}
 if(input==='inventorySearch'){ui.inventorySearch=e.target.value;refreshBaseResults();return;}
 if(input==='catalogSearch'||input==='pathSearch'||input==='fusionSearch'){ui[input]=e.target.value;const pos=e.target.selectionStart;render();restoreInputFocus(input,pos)}
 if(input==='pathQty'){const n=e.target.dataset.name;ui.pathDraft[n]={...pathDraft(n),qty:e.target.value}}
 if(input==='batchQty'){const name=e.target.dataset.name;const qty=Number(e.target.value);if(ui.batch[name]&&qty>=1)ui.batch[name].qty=qty}
 });
document.addEventListener('change',e=>{if(e.target.matches?.('select.variant-select'))e.target.dataset.variant=e.target.value;const inp=e.target.dataset.input;if(!inp)return;const value=e.target.value;
 switch(inp){case 'activeAccount':activateAccount(value);break;case 'setupCycle':ui.setupCycle=Number(value);break;case 'setupRegister':ui.setupRegister=value==='yes';break;case 'browsePath':ui.browsePath=Number(value);render();break;case 'browseCycle':ui.browseCycle=Number(value);render();break;case 'pathFilter':ui.pathFilter=Number(value);if(ui.detail)renderDetail();else render();break;
 case 'chipFrom':ui.chipFrom=value;if(ui.detail)renderDetail();else render();break;case 'chipTo':ui.chipTo=value;if(ui.detail)renderDetail();else render();break;
 case 'catalogRarity':ui.catalogRarity=value;render();break;
  case 'fusionTier':{const r=FUSION_BY_ID[e.target.dataset.id],i=Number(e.target.dataset.index);if(!r||!Number.isInteger(i)||i<0||i>2||!T.includes(value))break;ui.fusionDraft[r.id]=[...fusionTiers(r)];ui.fusionDraft[r.id][i]=value;render();break;}
 case 'pathToggle':{const n=e.target.dataset.name;if(e.target.checked)ui.pathBatch[n]=true;else delete ui.pathBatch[n];render();break}
 case 'pathTier':{const n=e.target.dataset.name;if(validTier(n,value)){ui.pathDraft[n]={...pathDraft(n),tier:value};const thumb=e.target.closest('.path-check-row')?.querySelector('.droid-thumb');if(thumb&&!anyOwned(n)){thumb.dataset.variant=value;thumb.setAttribute('aria-label',variantLabel(value));}}break}
 case 'batchToggle':{const n=e.target.dataset.name;if(e.target.checked){ui.batch[n]={tier:byName[n].rarity==='Iconic'?'Única':'Default',qty:1}}else delete ui.batch[n];render();break}
 case 'batchTier':if(ui.batch[e.target.dataset.name])ui.batch[e.target.dataset.name].tier=value;break;
 case 'evolveDestination':ui.evolveDestination=value;document.getElementById('evolve-cost').textContent=nf(chips(ui.modal.name,ui.modal.tier,value));break;
 }});
document.getElementById('backup-file').addEventListener('change',async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;if(file.size>10e6)return notify('Arquivo de backup muito grande (máximo de 10 MB).');try{const raw=JSON.parse(await file.text());if(raw?.schema===2)openModal('restore',{format:'multi',preview:sanitizeAccounts(raw)});else openModal('restore',{format:'legacy',preview:sanitize(raw),legacyName:validAccountName(raw?.accountName)||validAccountName(raw?.name)||'',legacyNotices:sanitizeNotices(raw.saleNotices)});}catch(err){notify(`Backup inválido: ${err.message}`)}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(ui.modal){ui.modal=null;renderModal()}else if(ui.detail){ui.detail='';renderDetail()}}});
document.addEventListener('load',e=>{if(e.target.matches?.('img[data-site-logo]'))e.target.parentElement.classList.add('logo-loaded')},true);
document.querySelectorAll('img[data-site-logo]').forEach(img=>{if(img.complete&&img.naturalWidth)img.parentElement.classList.add('logo-loaded');else if(img.complete&&img.naturalWidth===0){img.hidden=true;img.parentElement.classList.add('logo-failed')}});
document.addEventListener('error',e=>{if(e.target.matches('img[data-droid-img]')){e.target.hidden=true;e.target.parentElement.classList.add('img-failed')}if(e.target.matches('img[data-site-logo]')){e.target.hidden=true;e.target.parentElement.classList.add('logo-failed')}},true);
if(!DB||CAT.length!==100||R.length!==720)alert('Erro: base de droids incompleta. Atualize os arquivos do site.');
render();
})();
