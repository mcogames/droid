/* v28.4.2: painel seguro. NÃO calcula faltantes sem acesso aos dados do app. */
(()=>{'use strict';
 let currentTab='all'; let snapshot=null; let activeIdentity=null;
 const escaped=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const account=()=>{const e=document.getElementById('account-select');return e?.value??null};
 function isInventory(){const n=document.querySelector('#side-nav .nav-item.active, .bottom-nav .active');return n?.dataset?.tab==='inventory' || (document.querySelector('#top-breadcrumb')?.textContent||'').toLowerCase().includes('minha base')}
 function render(){const app=document.getElementById('app');if(!app)return;let root=document.getElementById('droid-watchlist');
   if(!isInventory()){root?.remove();return} if(!root){root=document.createElement('section');root.id='droid-watchlist';root.className='watchlist-section';app.prepend(root)}
   const valid=snapshot&&snapshot.accountId===account()&&Array.isArray(snapshot.items);
   const items=valid?snapshot.items.filter(x=>currentTab==='all'||(currentTab==='missing'?x.missing:true)):[];
   root.innerHTML='<h2>👁 Fique de olho nesses droids</h2><p>Droids que você ainda precisa conseguir para os próximos Rebirths da conta ativa.</p><div class="watchlist-tabs" role="tablist"><button type="button" data-wtab="all" aria-selected="'+(currentTab==='all')+'">Todos os necessários</button><button type="button" data-wtab="missing" aria-selected="'+(currentTab==='missing')+'">Ainda não cadastrados</button></div><div class="watchlist-items">'+(valid?(items.length?items.map(x=>'<div class="watchlist-item"><strong>'+escaped(x.name)+' · '+escaped(x.variant)+'</strong><small>Caminho '+escaped(x.path)+' · Ciclo '+escaped(x.cycle)+' · Faltam '+escaped(x.missingCount)+'</small></div>').join(''):'<div class="watchlist-empty">Nenhum item para este filtro.</div>'):'<div class="watchlist-empty">A lista será liberada quando o cálculo de requisitos do app.js for conectado ao inventário da conta ativa. Nenhum droid foi classificado como faltante sem essa conferência.</div>')+'</div>';
 }
 /* Integração esperada de app.js: enviar somente resultados já calculados, nunca dados persistidos.
  * window.DroidWatchlist.setSnapshot({accountId: document.querySelector('#account-select').value, items:[{name,variant,path,cycle,missing,missingCount}]})
  */
 window.DroidWatchlist=Object.freeze({setSnapshot(data){if(!data||!Array.isArray(data.items)||data.accountId!==account())return false;snapshot={accountId:data.accountId,items:data.items.map(x=>({name:String(x.name||''),variant:String(x.variant||''),path:Number(x.path)||0,cycle:Number(x.cycle)||0,missing:Boolean(x.missing),missingCount:Number(x.missingCount)||0}))};render();return true},refresh:render});
 document.addEventListener('click',e=>{const b=e.target.closest('[data-wtab]');if(b){currentTab=b.dataset.wtab;render()}});
 document.addEventListener('DOMContentLoaded',()=>{const app=document.getElementById('app');if(app){let pending=false;new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;render()})}).observe(app,{childList:true});}document.getElementById('account-select')?.addEventListener('change',()=>{snapshot=null;setTimeout(render,0)});render()});
})();
