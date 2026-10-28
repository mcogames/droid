/* v28.4.1 - atalho global: usa exclusivamente o fluxo de cadastro existente */
(()=>{'use strict';
 const norm=s=>(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
 function isAddButton(el){
   if(!el || el.matches('[data-global-add-droid]'))return false;
   const label=norm([el.textContent,el.getAttribute('aria-label'),el.getAttribute('title')].filter(Boolean).join(' '));
   const action=norm(el.getAttribute('data-action'));
   return /^(\+\s*)?(adicionar|cadastrar|novo|nova)\s+(um\s+)?(droid|droide)(s)?(\b|$)/.test(label)||/^(adddroid|newdroid|createdroid|openadddroid|openadddroidmodal|addunit|openaddunit)$/.test(action);
 }
 function locate(){
   const app=document.getElementById('app');if(!app)return null;
   return [...app.querySelectorAll('button,[role="button"]')].find(el=>isAddButton(el) && el.getClientRects().length>0 && !el.disabled) || null;
 }
 function notice(msg){const t=document.getElementById('toast');if(t){t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),5000);}else alert(msg);}
 let busy=false;
 function addDroid(){
   if(busy)return;busy=true;
   const direct=locate();if(direct){busy=false;direct.click();return;}
   const tab=document.querySelector('#side-nav [data-tab="inventory"]')||document.querySelector('.bottom-nav [data-tab="inventory"]');
   if(tab)tab.click();
   let tries=0;
   const tryOpen=()=>{const btn=locate();if(btn){busy=false;btn.click();return;}if(++tries<25){setTimeout(tryOpen,80);return;}busy=false;notice('Minha Base aberta. Use o botão de adicionar droid desta tela.');};
   setTimeout(tryOpen,50);
 }
 document.addEventListener('click',e=>{const trigger=e.target.closest('[data-global-add-droid]');if(trigger){e.preventDefault();addDroid();}});
})();
