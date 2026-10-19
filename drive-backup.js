/* Droid Tycoon v24 — sincronização entre dispositivos via Google Drive appDataFolder.
   O token OAuth de curta duração permanece somente em sessionStorage para sobreviver ao F5
   na mesma aba. Não usamos localStorage para tokens, nem refresh tokens, senhas ou Client Secret.
   Divergência na mesma conta exige decisão explícita. */
(()=>{'use strict';
 const CLIENT_STORE='droidtycoon_google_oauth_client_id_v1';
 const TAB_TOKEN_STORE='droidtycoon_drive_tab_token_v24';
 const CLOUD_NAME='droid-tycoon-todas-contas.json';
 const BASE_PREFIX='droidtycoon_sync_baseline_v23_';
 const SCOPE='https://www.googleapis.com/auth/drive.appdata';
 const ROOT='https://www.googleapis.com/drive/v3/files';
 const UPLOAD_ROOT='https://www.googleapis.com/upload/drive/v3/files';
 const SAVE_DELAY=12000,POLL_DELAY=45000;
 const d={clientId:'',token:'',expiresAt:0,tokenClient:null,connected:false,auto:false,busy:false,remote:null,base:null,conflicts:[],reason:'',lastSaved:'',lastError:'',pending:false,timer:null,interval:null,host:null,loadingCloud:null,suppress:false};
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const configured=()=>document.querySelector('meta[name="droid-google-client-id"]')?.content?.trim()||'';
 const validId=v=>/^[0-9]+-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(String(v||'').trim());
 try{d.clientId=validId(configured())?configured():localStorage.getItem(CLIENT_STORE)||'';}catch(e){d.clientId=validId(configured())?configured():'';}
 // Token efêmero, guardado apenas para recargas desta aba; nunca em localStorage.
 function forgetTabToken(){try{sessionStorage.removeItem(TAB_TOKEN_STORE)}catch(e){}}
 function rememberTabToken(){
  if(!activeToken())return forgetTabToken();
  try{sessionStorage.setItem(TAB_TOKEN_STORE,JSON.stringify({clientId:d.clientId,accessToken:d.token,expiresAt:d.expiresAt,scope:SCOPE}))}catch(e){}
 }
 function restoreTabToken(){
  try{
   const raw=sessionStorage.getItem(TAB_TOKEN_STORE);if(!raw)return false;
   const prior=JSON.parse(raw);
   if(prior.clientId!==d.clientId||!prior.scope?.split(/\s+/).includes(SCOPE)||
      typeof prior.accessToken!=='string'||!prior.accessToken||
      !Number.isFinite(prior.expiresAt)||Date.now()>=prior.expiresAt-90000){forgetTabToken();return false}
   d.token=prior.accessToken;d.expiresAt=prior.expiresAt;d.connected=true;d.auto=true;return true;
  }catch(e){forgetTabToken();return false}
 }
 const activeToken=()=>!!d.token&&Date.now()<d.expiresAt-90000;
 function token(){if(!d.connected||!activeToken()){d.auto=false;forgetTabToken();throw new Error('A autorização do Google expirou. Conecte novamente para sincronizar.')}return d.token}
 async function api(url,opts={}){
  const r=await fetch(url,{...opts,headers:{Authorization:'Bearer '+token(),...opts.headers},cache:'no-store'});
  if(!r.ok){let reason='';try{const p=await r.json();reason=p?.error?.message||''}catch(e){}
   if(r.status===401){d.token='';d.connected=false;d.auto=false;forgetTabToken();}
   throw new Error('Google Drive HTTP '+r.status+(reason?': '+reason:''));}
  return r.json();
 }
 async function listFile(){
  const p=new URLSearchParams({spaces:'appDataFolder',pageSize:'100',fields:'nextPageToken,files(id,name,modifiedTime,version,size)',q:"name = '"+CLOUD_NAME+"' and trashed = false"});
  const r=await api(ROOT+'?'+p);
  const files=(r.files||[]).filter(x=>x.name===CLOUD_NAME);
  if(files.length>1||r.nextPageToken)throw new Error('Foram encontrados backups duplicados no Drive. A sincronização foi pausada para evitar perda de dados.');
  return files[0]||null;
 }
 const rev=(m)=>m?String(m.version||m.modifiedTime||''):'';
 async function readFile(m){if(!m)throw new Error('Nenhum backup encontrado no Drive.');const raw=await api(ROOT+'/'+encodeURIComponent(m.id)+'?alt=media');if(!d.host?.validate(raw))throw new Error('O arquivo remoto não contém um backup válido.');return raw}
 const snapshot=()=>d.host.snapshot();
 // Hash de cada conta separadamente: mudanças em contas diferentes podem ser combinadas.
 async function index(payload){
  const rows=payload.accounts||[];const out={};
  for(const row of rows){
   const raw=JSON.stringify({name:row.name,data:row.data,notices:row.notices});
   const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw));
   out[row.id]=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
  }
  return out;
 }
 const key=id=>BASE_PREFIX+id;
 function loadBase(meta){try{const x=JSON.parse(localStorage.getItem(key(meta.id))||'null');return x&&x.fileId===meta.id&&x.index&&typeof x.index==='object'?x.index:null}catch(e){return null}}
 function keepBase(meta,idx){try{localStorage.setItem(key(meta.id),JSON.stringify({fileId:meta.id,index:idx,at:new Date().toISOString()}));d.base=idx}catch(e){d.auto=false;throw new Error('Não foi possível guardar o controle de sincronização localmente. Verifique o espaço do navegador.')}}
 function status(){
  if(!validId(d.clientId))return ['Configuração pendente','Informe o Client ID OAuth do aplicativo Google.'];
  if(d.busy)return ['Verificando a nuvem…','Aguarde o fim da sincronização.'];
  if(d.lastError)return ['Atenção',d.lastError];
  if(!d.connected)return ['Desconectado','Conecte sua conta Google para sincronizar dispositivos.'];
  if(!activeToken())return ['Autorização expirada','Reconecte para continuar. O inventário local está preservado.'];
  if(!d.auto)return [d.reason==='conflict'?'Conflito entre aparelhos':'Aguardando sua escolha',
   d.reason==='conflict'?`A mesma conta mudou em dois aparelhos: ${d.conflicts.join(', ')}. Escolha qual versão manter ou importe por conta.`:
   'Os dados deste aparelho são diferentes dos salvos no Drive. Escolha como iniciar a sincronização.'];
  return ['Sincronização ativa',d.lastSaved?'Última conferência: '+new Date(d.lastSaved).toLocaleString('pt-BR'):'Conferindo alterações entre aparelhos automaticamente.'];
 }
 function panelHtml(){
  const [label,desc]=status(),ready=d.connected&&activeToken(),origin=location.origin;
  return `<section class="card card-pad drive-backup-card" id="drive-backup-panel" style="margin-top:17px" aria-label="Sincronização Google Drive">
   <div class="drive-heading"><div><h3>☁ Sincronização com Google Drive</h3><p class="muted small">Suas contas e droids ficam no navegador e são sincronizados entre dispositivos autorizados, sem Firebase.</p></div><span class="drive-state ${d.auto?'on':d.lastError||d.reason?'warning':''}">${esc(label)}</span></div>
   <p class="drive-status" id="drive-backup-status" role="status">${esc(desc)}</p>
   ${!validId(d.clientId)?`<div class="field drive-config"><label for="drive-client-id">Client ID OAuth Google</label><input id="drive-client-id" class="input" placeholder="123456.apps.googleusercontent.com" spellcheck="false"><p class="mini-note">Cadastre a origem <code>${esc(origin)}</code> no Google Cloud. Nunca informe um Client Secret.</p><button class="btn secondary small" type="button" data-drive-action="configure">Salvar Client ID</button></div>`:
   `<p class="mini-note">Google autorizado para: <strong>${esc(origin)}</strong>. Dados guardados em área privada do aplicativo no Drive. ${d.remote?.modifiedTime?'Última alteração remota: '+esc(new Date(d.remote.modifiedTime).toLocaleString('pt-BR'))+'.':''}</p>`}
   <div class="drive-actions">
   ${!ready?`<button type="button" class="btn" data-drive-action="connect" ${!validId(d.clientId)||d.busy?'disabled':''}>Conectar ao Google</button>`:
     `${d.auto?`<button type="button" class="btn" data-drive-action="sync" ${d.busy?'disabled':''}>Sincronizar agora</button>`:
       `<button type="button" class="btn" data-drive-action="remote" ${!d.remote||d.busy?'disabled':''}>Trazer dados do Drive</button><button type="button" class="btn secondary" data-drive-action="local" ${d.busy?'disabled':''}>Usar dados deste aparelho</button>${d.remote?`<button type="button" class="btn secondary" data-drive-action="merge" ${d.busy?'disabled':''}>Importar contas separadamente</button>`:''}`}
      <button type="button" class="btn ghost" data-drive-action="disconnect" ${d.busy?'disabled':''}>Desconectar</button>`}
   </div>
   <p class="mini-note">A conexão é mantida ao atualizar esta aba (F5) enquanto a autorização temporária estiver válida. Quando expirar ou a sessão for encerrada, clique em Conectar ao Google novamente. Com o site aberto e autorizado, busca mudanças de outros aparelhos a cada 45 segundos e envia alterações locais após alguns segundos. Alterações simultâneas na <strong>mesma conta</strong> exigem sua escolha. Não apague seu backup JSON de segurança.</p>
  </section>`;
 }
 function updatePanel(){
  const el=document.getElementById('drive-backup-panel');if(el)el.outerHTML=panelHtml();
  const shortcut=document.getElementById('sync-shortcut');
  if(shortcut){
   shortcut.textContent=d.auto?'☁ Sincronizado':d.connected?(d.reason||d.lastError?'☁ Atenção':'☁ Conectando'):'☁ Local';
   shortcut.title=d.auto?'Google Drive ativo — abrir configurações':d.connected?'Conferir sincronização — abrir configurações':'Backup local — conectar Google Drive';
   shortcut.classList.toggle('cloud-active',d.auto);
   shortcut.classList.toggle('cloud-attention',!!d.reason||!!d.lastError);
  }
 }
 function report(e){d.auto=false;d.lastError=String(e?.message||e);updatePanel()}
 function cancelTimer(){if(d.timer){clearTimeout(d.timer);d.timer=null}}
 function stopPoll(){if(d.interval){clearInterval(d.interval);d.interval=null}}
 function startPoll(){stopPoll();d.interval=setInterval(()=>{if(d.auto&&!document.hidden)void sync()},POLL_DELAY)}
 function changed(base,idx){const all=new Set([...Object.keys(base||{}),...Object.keys(idx||{})]);return [...all].some(id=>(base||{})[id]!==idx[id]);}
 function threeWay(base,local,remote,li,ri){
  const l=new Map(local.accounts.map(a=>[a.id,a])),r=new Map(remote.accounts.map(a=>[a.id,a]));
  const ids=new Set([...Object.keys(base),...l.keys(),...r.keys()]);
  const merged=[],conflicts=[];
  for(const id of ids){
   const lc=li[id]!==base[id],rc=ri[id]!==base[id];
   const value=lc&&rc?(li[id]===ri[id]?l.get(id):null):lc?l.get(id):r.get(id);
   if(lc&&rc&&li[id]!==ri[id]){conflicts.push(l.get(id)?.name||r.get(id)?.name||id);continue}
   if(value)merged.push(value);
  }
  const names=new Map();
  for(const a of merged){const n=a.name.toLocaleLowerCase('pt-BR');if(names.has(n))conflicts.push(a.name+' (nome duplicado)');else names.set(n,a.id)}
  if(!merged.length)conflicts.push('todas as contas foram removidas');
  return {conflicts,merged:{schema:2,activeId:merged.some(a=>a.id===local.activeId)?local.activeId:(merged.some(a=>a.id===remote.activeId)?remote.activeId:merged[0]?.id),accounts:merged}};
 }
 function pause(reason,conflicts=[]){d.auto=false;d.reason=reason;d.conflicts=conflicts;cancelTimer();updatePanel()}
 async function createOrUpload(payload,meta){
  const text=JSON.stringify({...payload,exportedAt:new Date().toISOString(),app:'Droid Tycoon'});
  if(new Blob([text]).size>4800000)throw new Error('Backup acima de 4,8 MB. Exporte o JSON local e reduza históricos antes de sincronizar.');
  // Verificação otimista da revisão antes de cada gravação. Não garante transações simultâneas perfeitas.
  const current=await listFile();
  if(meta && (!current||current.id!==meta.id||rev(current)!==rev(meta)))throw new Error('O backup mudou durante a sincronização. Tente novamente antes de substituir.');
  if(!meta&&current)throw new Error('Foi criado um backup remoto neste intervalo. Confira antes de enviar dados locais.');
  if(meta)return api(UPLOAD_ROOT+'/'+encodeURIComponent(meta.id)+'?uploadType=media&fields=id,name,modifiedTime,version,size',{method:'PATCH',headers:{'Content-Type':'application/json; charset=UTF-8'},body:text});
  const boundary='droidtycoon'+Math.random().toString(36).slice(2);
  const body=new Blob([`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,JSON.stringify({name:CLOUD_NAME,mimeType:'application/json',parents:['appDataFolder']}),`\r\n--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,text,`\r\n--${boundary}--\r\n`],{type:'multipart/related; boundary='+boundary});
  return api(UPLOAD_ROOT+'?uploadType=multipart&fields=id,name,modifiedTime,version,size',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+boundary},body});
 }
 async function sync(){
  if(!d.connected||!activeToken()){d.auto=false;forgetTabToken();updatePanel();return}
  if(d.busy){d.pending=true;return}
  if(!d.auto&&d.reason)return;
  d.busy=true;d.pending=false;d.lastError='';updatePanel();
  try{
   const meta=await listFile();
   if(!meta){
    if(d.remote||d.base){pause('missing');throw new Error('O backup remoto anterior não foi encontrado. Confira antes de criar um novo.');}
    const local=snapshot(),newFile=await createOrUpload(local,null);d.remote=newFile;keepBase(newFile,await index(local));d.auto=true;d.reason='';d.lastSaved=new Date().toISOString();return;
   }
   const remote=await readFile(meta),ri=await index(remote),local=snapshot(),li=await index(local);
   d.remote=meta;
   if(!d.base)d.base=loadBase(meta);
   if(!d.base){
    if(!changed(li,ri)){keepBase(meta,ri);d.auto=true;d.reason='';d.lastSaved=new Date().toISOString();return}
    pause('initial');return;
   }
   const lc=changed(d.base,li),rc=changed(d.base,ri);
   if(!lc&&!rc){d.auto=true;d.reason='';d.lastSaved=new Date().toISOString();return}
   if(!lc&&rc){
    if(!d.host.canAutoApply()){d.lastError='Há um formulário aberto. Feche-o para trazer as alterações de outro aparelho.';return}
    d.suppress=true;
    try{if(!d.host.applyCloud(remote))throw new Error('Não foi possível preservar os dados locais antes de atualizar do Drive.')}finally{d.suppress=false}
    keepBase(meta,ri);d.auto=true;d.reason='';d.lastSaved=new Date().toISOString();d.host.toast('Dados atualizados a partir do Google Drive.');return;
   }
   if(lc&&rc){
    const result=threeWay(d.base,local,remote,li,ri);
    if(result.conflicts.length){pause('conflict',result.conflicts);return}
    if(!d.host.canAutoApply()){d.lastError='Há um formulário aberto. Termine a edição para combinar as contas.';return}
    d.suppress=true;
    try{if(!d.host.applyCloud(result.merged))throw new Error('Não foi possível salvar a combinação das contas.')}finally{d.suppress=false}
   }
   const fresh=snapshot();const saved=await createOrUpload(fresh,meta);
   d.remote=saved;keepBase(saved,await index(fresh));d.auto=true;d.reason='';d.lastSaved=new Date().toISOString();
  }catch(e){report(e)}finally{
   d.busy=false;updatePanel();
   if(d.auto&&d.pending){d.pending=false;noteLocalChange()}
  }
 }
 function noteLocalChange(){if(d.suppress||!d.connected||!d.auto)return;d.pending=true;cancelTimer();d.timer=setTimeout(()=>{d.timer=null;void sync()},SAVE_DELAY)}
 async function connect(){
  d.lastError='';if(!validId(d.clientId))return report('Client ID inválido.');
  if(!window.google?.accounts?.oauth2?.initTokenClient)return report('O Google Identity Services não carregou. Reabra o site.');
  try{
   d.tokenClient=google.accounts.oauth2.initTokenClient({client_id:d.clientId,scope:SCOPE,callback:async response=>{
    if(!response?.access_token||!String(response.scope||'').includes(SCOPE))return report('A permissão para o Google Drive não foi autorizada.');
    d.token=response.access_token;d.expiresAt=Date.now()+Number(response.expires_in||3600)*1000;d.connected=true;d.lastError='';d.reason='';d.base=null;d.remote=null;d.auto=true;rememberTabToken();updatePanel();startPoll();await sync();
   },error_callback:()=>report('Janela de autorização Google fechada ou bloqueada.')});
   // Não exigir novo consentimento a cada reconexão. O Google pedirá acesso se necessário.
   d.tokenClient.requestAccessToken({prompt:''});
  }catch(e){report(e)}
 }
 async function useRemote(){
  if(!d.remote)return report('Nenhum backup remoto encontrado.');
  if(!confirm('ATENÇÃO: usar os dados do Google Drive substituirá TODAS as contas deste navegador.\n\nUma cópia para DESFAZER será guardada aqui, mas recomendamos baixar um backup JSON antes.\n\nDeseja continuar?'))return;
  d.busy=true;updatePanel();try{
   const meta=await listFile();if(!meta||meta.id!==d.remote.id||rev(meta)!==rev(d.remote))throw new Error('O backup remoto mudou. Confira a versão mais recente antes de continuar.');
   const remote=await readFile(meta);d.suppress=true;
   try{if(!d.host.applyCloud(remote))throw new Error('Não foi possível atualizar as contas com segurança.')}finally{d.suppress=false}
   keepBase(meta,await index(remote));d.auto=true;d.reason='';d.lastError='';d.lastSaved=new Date().toISOString();d.host.toast('Contas sincronizadas com o Drive.');
  }catch(e){report(e)}finally{d.busy=false;updatePanel()}
 }
 async function useLocal(){
  if(!confirm('ATENÇÃO: esta ação substituirá TODAS as contas guardadas no backup do Google Drive pelos dados deste navegador.\n\nSe houver alterações de outro aparelho, elas poderão ser perdidas. Faça backup JSON antes.\n\nDeseja continuar?'))return;
  d.busy=true;updatePanel();try{
   const meta=await listFile();if((meta?.id||null)!==(d.remote?.id||null)||rev(meta)!==rev(d.remote))throw new Error('O Drive mudou depois da última conferência. Reabra a conexão antes de substituir.');
   const local=snapshot(),saved=await createOrUpload(local,meta);d.remote=saved;keepBase(saved,await index(local));d.auto=true;d.reason='';d.lastError='';d.lastSaved=new Date().toISOString();d.host.toast('Backup deste aparelho enviado e sincronização ativada.');
  }catch(e){report(e)}finally{d.busy=false;updatePanel()}
 }
 async function importByAccount(){
  if(!d.remote)return;
  d.busy=true;updatePanel();try{
   const meta=await listFile();if(!meta||meta.id!==d.remote.id||rev(meta)!==rev(d.remote))throw new Error('O backup remoto mudou. Confira a nova versão antes de importar.');
   const remote=await readFile(meta);d.loadingCloud={meta,remote};d.host.importCloud(remote);
  }catch(e){report(e)}finally{d.busy=false;updatePanel()}
 }
 async function cloudImportDone(){
  const incoming=d.loadingCloud;d.loadingCloud=null;if(!incoming)return;
  try{
   const meta=await listFile();if(!meta||rev(meta)!==rev(incoming.meta)||meta.id!==incoming.meta.id)throw new Error('O backup remoto mudou durante a importação. Reconnecte e confira antes de enviar.');
   keepBase(meta,await index(incoming.remote));d.remote=meta;d.reason='';d.auto=true;d.lastError='';noteLocalChange();updatePanel();
  }catch(e){report(e)}
 }
 function disconnect(){cancelTimer();stopPoll();forgetTabToken();d.token='';d.connected=false;d.auto=false;d.remote=null;d.base=null;d.loadingCloud=null;d.expiresAt=0;d.lastSaved='';d.reason='';d.lastError='';updatePanel()}
 function configure(){const id=document.getElementById('drive-client-id')?.value?.trim()||'';if(!validId(id))return report('Client ID inválido.');try{localStorage.setItem(CLIENT_STORE,id)}catch(e){return report('Não foi possível salvar o Client ID.')};d.clientId=id;d.lastError='';updatePanel()}
 async function action(a){switch(a){case 'configure':configure();break;case 'connect':await connect();break;case 'sync':await sync();break;case 'remote':await useRemote();break;case 'local':await useLocal();break;case 'merge':await importByAccount();break;case 'disconnect':disconnect();break;}}
 document.addEventListener('click',e=>{const b=e.target.closest('[data-drive-action]');if(b){e.preventDefault();void action(b.dataset.driveAction)}});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&d.connected&&d.auto)void sync()});
 window.DroidDrive={init(host){d.host=host;if(restoreTabToken()){startPoll();Promise.resolve().then(()=>{updatePanel();void sync()})}},panelHtml,noteLocalChange,onCloudImportComplete:cloudImportDone,
  debugState:()=>({connected:d.connected,auto:d.auto,busy:d.busy,reason:d.reason,conflicts:[...d.conflicts],remote:d.remote?{...d.remote}:null,lastError:d.lastError,lastSaved:d.lastSaved})};
})();
