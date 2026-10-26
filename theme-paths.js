/* Droid Tycoon v28.4 — somente leitura da conta ativa, sem escrita no localStorage */
(()=>{'use strict';
 const KEY='droidtycoon_accounts_v1';
 const LABELS=['','Arco-Íris','Beskar','Galáctico','Estelar','Kyber','Flagelo'];
 let lastPath=-1;
 function activePath(){
   try{
     const db=JSON.parse(localStorage.getItem(KEY)||'null');
     const account=db?.accounts?.find(a=>a.id===db.activeId);
     const path=Number(account?.data?.path||0);
     return Number.isInteger(path)&&path>=1&&path<=6?path:0;
   }catch(_){return 0;}
 }
 function apply(){
   const path=activePath();
   if(path===lastPath && document.getElementById('theme-path-marker'))return;
   lastPath=path;
   document.documentElement.dataset.rebirthTheme=String(path);
   const header=document.querySelector('.topbar-left');
   let marker=document.getElementById('theme-path-marker');
   if(!marker&&header){marker=document.createElement('span');marker.id='theme-path-marker';marker.className='theme-path-marker';marker.setAttribute('aria-label','Tema visual do caminho ativo');header.appendChild(marker);}
   if(marker){marker.textContent=path?`Caminho ${path} · ${LABELS[path]}`:'Tema neutro';marker.title='Identidade visual da conta ativa. Não altera o simulador nem o inventário.';}
   const meta=document.querySelector('meta[name="theme-color"]');
   if(meta)meta.setAttribute('content','#040309');
 }
 // Mudanças de conta/caminho feitas pelo aplicativo renderizam conteúdo novo.
 let queued=false;
 function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply()});}
 document.addEventListener('DOMContentLoaded',()=>{
   apply();
   const app=document.getElementById('app');
   if(app)new MutationObserver(schedule).observe(app,{childList:true,subtree:false});
   const account=document.getElementById('account-select');
   if(account)account.addEventListener('change',()=>setTimeout(apply,0));
   document.addEventListener('click',event=>{if(event.target.closest('[data-action="changePath"],[data-action="advance"],[data-action="setPath"]'))setTimeout(apply,0);});
   window.addEventListener('storage',event=>{if(event.key===KEY)apply()});
   document.addEventListener('visibilitychange',()=>{if(!document.hidden)apply()});
 });
})();
