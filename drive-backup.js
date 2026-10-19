/* Droid Tycoon v21 — Backup Google Drive. Não usa Firebase nem armazena senhas/tokens no navegador. */
(()=>{'use strict';
 const CLIENT_STORE='droidtycoon_google_oauth_client_id_v1';
 const CLOUD_NAME='droid-tycoon-todas-contas.json';
 const SCOPE='https://www.googleapis.com/auth/drive.appdata';
 const ROOT='https://www.googleapis.com/drive/v3/files';
 const UPLOAD_ROOT='https://www.googleapis.com/upload/drive/v3/files';
 const WAIT_MS=15000;
 const d={clientId:'',token:'',expiresAt:0,tokenClient:null,connected:false,auto:false,busy:false,remote:null,latest:null,lastSaved:'',lastError:'',pending:false,timer:null,serial:0,host:null};
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const configured=()=>document.querySelector('meta[name="droid-google-client-id"]')?.content?.trim()||'';
 const validId=v=>/^[0-9]+-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(String(v||'').trim());
 try{d.clientId=validId(configured())?configured():localStorage.getItem(CLIENT_STORE)||'';}catch(e){d.clientId=validId(configured())?configured():'';}
 function status(){
  if(!validId(d.clientId))return ['Configuração pendente','Cadastre o Client ID do Google Cloud para usar o Drive.'];
  if(d.busy)return ['Sincronizando…','Aguarde a conclusão da operação no Google Drive.'];
  if(d.lastError)return ['Atenção',d.lastError];
  if(!d.connected)return ['Desconectado','Clique em Conectar ao Google para autorizar o backup.'];
  if(!activeToken())return ['Autorização expirada','Conecte novamente para continuar os backups. Seus dados locais seguem salvos.'];
  if(!d.auto)return ['Backup automático pausado',d.remote?'Já existe um backup no Drive. Escolha restaurá-lo ou autorize usar os dados deste navegador.':'Verifique a conexão antes de ativar o backup automático.'];
  return ['Backup automático ativo',d.lastSaved?'Último envio: '+new Date(d.lastSaved).toLocaleString('pt-BR'):'O backup será salvo em breve.'];
 }
 function panelHtml(){
  const [label,desc]=status(),ready=d.connected&&activeToken(),origin=location.origin;
  return `<section class="card card-pad drive-backup-card" id="drive-backup-panel" style="margin-top:17px" aria-label="Backup Google Drive">
   <div class="drive-heading"><div><h3>☁ Backup no Google Drive</h3><p class="muted small">Backup de todas as contas, sem Firebase. O inventário continua salvo neste navegador.</p></div><span class="drive-state ${d.auto?'on':d.lastError?'warning':''}">${esc(label)}</span></div>
   <p class="drive-status" id="drive-backup-status" role="status">${esc(desc)}</p>
   ${!validId(d.clientId)?`<div class="field drive-config"><label for="drive-client-id">Client ID OAuth do Google (Aplicativo da Web)</label><input id="drive-client-id" class="input" placeholder="1234567890-xxxx.apps.googleusercontent.com" autocomplete="off" spellcheck="false"><p class="mini-note">Você criará esse ID no Google Cloud. Origem JavaScript autorizada: <code>${esc(origin)}</code>. Use somente o <strong>Client ID público</strong>; nunca informe um Client Secret.</p><button type="button" class="btn secondary small" data-drive-action="configure">Salvar Client ID neste navegador</button></div>`:`<p class="mini-note">Autorização para: <strong>${esc(origin)}</strong>. As cópias ficam na pasta oculta de dados do aplicativo no seu Drive. ${d.remote?.modifiedTime?'Backup remoto: '+esc(new Date(d.remote.modifiedTime).toLocaleString('pt-BR'))+'.':''}</p>`}
   <div class="drive-actions">
    ${!ready?`<button type="button" class="btn" data-drive-action="connect" ${!validId(d.clientId)||d.busy?'disabled':''}>Conectar ao Google</button>`:`
     <button type="button" class="btn" data-drive-action="save" ${d.busy?'disabled':''}>Salvar agora no Drive</button>
     <button type="button" class="btn secondary" data-drive-action="restore" ${!d.remote||d.busy?'disabled':''}>Restaurar do Drive</button>
     ${!d.auto&&d.remote?`<button type="button" class="btn secondary" data-drive-action="use-local" ${d.busy?'disabled':''}>Usar esta base e ativar backup</button>`:''}
     <button type="button" class="btn ghost" data-drive-action="disconnect" ${d.busy?'disabled':''}>Desconectar</button>`}
   </div>
   <p class="mini-note">Quando conectado, as alterações são enviadas após alguns segundos com a página aberta. Se a autorização expirar, o backup pausa; nenhuma alteração local é perdida. A nuvem não substitui automaticamente sua base.</p>
  </section>`;
 }
 function updatePanel(){const el=document.querySelector('#drive-backup-panel');if(el)el.outerHTML=panelHtml();}
 function report(msg){d.lastError=msg;updatePanel()}
 function activeToken(){return !!d.token&&Date.now()<d.expiresAt-90000}
 function requireToken(){if(!d.connected||!activeToken()){d.auto=false;throw new Error('A autorização do Google expirou. Clique em Conectar ao Google novamente.')}return d.token}
 async function api(url,opts={}){
  const token=requireToken();const r=await fetch(url,{...opts,headers:{Authorization:'Bearer '+token,...opts.headers},cache:'no-store'});
  if(!r.ok){let reason='';try{const data=await r.json();reason=data?.error?.message||''}catch(e){};
   if(r.status===401||r.status===403){d.auto=false;if(r.status===401){d.token='';d.connected=false;}}
   throw new Error('Google Drive HTTP '+r.status+(reason?': '+reason:''));}
  return r.json();
 }
 async function listFile(){
  const params=new URLSearchParams({spaces:'appDataFolder',pageSize:'100',fields:'nextPageToken,files(id,name,mimeType,modifiedTime,size)',q:"name = '"+CLOUD_NAME+"' and trashed = false"});
  const res=await api(ROOT+'?'+params.toString());
  const files=(res.files||[]).filter(f=>f.name===CLOUD_NAME).sort((a,b)=>new Date(b.modifiedTime)-new Date(a.modifiedTime));
  if(res.nextPageToken||files.length>1)throw new Error('Foram encontrados vários backups do aplicativo no Drive. Evite sobrescrever; verifique os arquivos antes de continuar.');
  return files[0]||null;
 }
 async function fileMetadata(id){return api(ROOT+'/'+encodeURIComponent(id)+'?fields=id,name,modifiedTime,size,mimeType');}
 async function readFile(){
  if(!d.remote)throw new Error('Nenhum backup foi encontrado no Drive.');
  const raw=await api(ROOT+'/'+encodeURIComponent(d.remote.id)+'?alt=media');
  if(!d.host?.validate(raw))throw new Error('O arquivo do Drive não é um backup válido.');
  return raw;
 }
 function normalized(payload){return JSON.stringify({schema:2,activeId:payload.activeId,accounts:payload.accounts})}
 function snapshot(){return d.host.snapshot()}
 async function connect(){
  d.lastError='';if(!validId(d.clientId))return report('Client ID inválido. Verifique o ID OAuth do tipo Aplicativo da Web.');
  if(!window.google?.accounts?.oauth2?.initTokenClient)return report('O script de autenticação do Google não carregou. Verifique sua conexão e recarregue o site.');
  // O popup deve ser iniciado diretamente pelo clique do usuário.
  try{
   d.tokenClient=google.accounts.oauth2.initTokenClient({client_id:d.clientId,scope:SCOPE,callback:async result=>{
    if(!result?.access_token||!String(result.scope||'').includes(SCOPE)){report('Autorização não concedida ao backup do Google Drive.');return}
    d.token=result.access_token;d.expiresAt=Date.now()+Math.max(0,Number(result.expires_in||3600))*1000;d.connected=true;d.lastError='';d.auto=false;d.busy=true;updatePanel();
    try{
     d.remote=await listFile();
     if(!d.remote){d.auto=true;d.busy=false;updatePanel();await send(true);return}
     const remoteData=await readFile();d.auto=normalized(remoteData)===normalized(snapshot());
     d.lastError='';
    }catch(e){d.auto=false;d.lastError='Não foi possível conferir o backup remoto: '+e.message}
    finally{d.busy=false;updatePanel()}
   },error_callback:()=>report('Janela de autorização fechada ou bloqueada. Permita pop-ups para continuar.')});
   d.tokenClient.requestAccessToken({prompt:'consent'});
  }catch(e){report('Não foi possível iniciar o login Google: '+e.message)}
 }
 function releasePending(){if(d.timer){clearTimeout(d.timer);d.timer=null}}
 function noteLocalChange(){if(!d.auto||!d.connected)return;d.pending=true;releasePending();d.timer=setTimeout(()=>{d.timer=null;send(false)},WAIT_MS)}
 async function send(manual=false){
  if(!d.connected||!activeToken()){d.auto=false;updatePanel();return}
  if(d.busy){d.pending=true;return}
  if(!d.auto&&!manual)return;
  d.busy=true;d.lastError='';releasePending();d.pending=false;updatePanel();
  const payload=snapshot(),signature=normalized(payload);
  try{
   const remoteNow=await listFile();
   if(d.remote&&(!remoteNow||remoteNow.id!==d.remote.id||remoteNow.modifiedTime!==d.remote.modifiedTime)){
    d.auto=false;d.remote=remoteNow;throw new Error('O backup foi alterado em outro aparelho. Confira e restaure antes de substituir.');
   }
   if(!d.remote&&remoteNow){d.auto=false;d.remote=remoteNow;throw new Error('Existe um backup na nuvem que não foi conferido. Escolha restaurar ou confirmar substituição.');}
   if(signature===d.latest&&!manual){d.pending=false;return}
   const text=JSON.stringify({...payload,exportedAt:new Date().toISOString(),app:'Droid Tycoon'});
   if(new Blob([text]).size>4_800_000)throw new Error('Backup superior a 4,8 MB; baixe um JSON local e reduza históricos antes de sincronizar.');
   if(d.remote){
    const result=await api(UPLOAD_ROOT+'/'+encodeURIComponent(d.remote.id)+'?uploadType=media&fields=id,name,modifiedTime,size',{method:'PATCH',headers:{'Content-Type':'application/json; charset=UTF-8'},body:text});
    d.remote=result;
   }else{
    const boundary='droidtycoon'+Math.random().toString(36).slice(2);
    const body=new Blob([`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,JSON.stringify({name:CLOUD_NAME,mimeType:'application/json',parents:['appDataFolder']}),`\r\n--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,text,`\r\n--${boundary}--\r\n`],{type:'multipart/related; boundary='+boundary});
    const result=await api(UPLOAD_ROOT+'?uploadType=multipart&fields=id,name,modifiedTime,size',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+boundary},body});
    d.remote=result;
   }
   d.latest=signature;d.lastSaved=new Date().toISOString();d.lastError='';
   if(manual)d.host.toast('Backup salvo no Google Drive.');
  }catch(e){d.auto=false;d.lastError=e.message;d.host.toast('Backup no Drive não concluído. Seus dados locais continuam salvos.');}
  finally{
   d.busy=false;updatePanel();
   if(d.auto&&(d.pending||normalized(snapshot())!==signature))noteLocalChange();
  }
 }
 async function restore(){
  if(!d.remote)return report('Não há backup no Drive para restaurar.');
  d.busy=true;d.lastError='';updatePanel();
  try{
   const metadata=await fileMetadata(d.remote.id);if(metadata.modifiedTime!==d.remote.modifiedTime){d.remote=metadata;d.auto=false;}
   const payload=await readFile();d.auto=false;releasePending();d.host.importCloud(payload);
  }catch(e){d.lastError='Erro ao abrir o backup do Drive: '+e.message;}
  finally{d.busy=false;updatePanel()}
 }
 async function useLocal(){
  if(!d.connected||!activeToken())return report('Conecte ao Google novamente.');
  if(d.remote&&!confirm('ATENÇÃO: o backup existente no Google Drive será substituído pelos dados deste navegador.\n\nIsso NÃO importa as contas da nuvem. Se precisar delas, escolha Restaurar do Drive antes.\n\nDeseja continuar?'))return;
  d.lastError='';d.auto=true;await send(true);
 }
 function disconnect(){releasePending();d.serial++;d.token='';d.connected=false;d.auto=false;d.expiresAt=0;d.remote=null;d.lastSaved='';d.lastError='';updatePanel();}
 function configure(){
  const value=document.getElementById('drive-client-id')?.value?.trim()||'';
  if(!validId(value))return report('O Client ID deve terminar com .apps.googleusercontent.com e ser do tipo Aplicativo da Web.');
  try{localStorage.setItem(CLIENT_STORE,value)}catch(e){return report('Não foi possível salvar o Client ID neste navegador.')}
  d.clientId=value;d.lastError='';updatePanel();
 }
 async function action(action){
  switch(action){case 'configure':configure();break;case 'connect':connect();break;case 'save':if(!d.auto&&d.remote)await useLocal();else await send(true);break;case 'restore':await restore();break;case 'use-local':await useLocal();break;case 'disconnect':disconnect();break;}
 }
 document.addEventListener('click',e=>{const b=e.target.closest('[data-drive-action]');if(b){e.preventDefault();void action(b.dataset.driveAction)}});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&d.auto&&d.pending)noteLocalChange()});
 window.DroidDrive={init(host){d.host=host},panelHtml,noteLocalChange,debugState:()=>({connected:d.connected,auto:d.auto,busy:d.busy,remote:d.remote?{...d.remote}:null,lastError:d.lastError,lastSaved:d.lastSaved})};
})();
