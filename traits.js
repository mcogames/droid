/* Guia de habilidades v27 — traits 1.35.0 + custos corrigidos no patch 1.35.1 (20/10/2026).
 * Nunca confundir variante do droid com classificação da habilidade.
 * Probabilidades da primeira leitura; rerolls impedem repetição da mesma combinação.
 */
(()=>{'use strict';
const SOURCE='https://droidex.dubtrackr.win/guides/droid-tycoon-droid-traits/';
const SOURCE_ROLES='https://droidex.dubtrackr.win/guides/droid-tycoon-companions-droid-types/';
const tiers=['Common','Gold','Diamond','Rainbow'];
const t=(id,label,slot,effect,values,category)=>({id,label,slot,effect,values:values||null,category:category||'standard'});
const traits=[
 t('Credit Per Second Multiplier','Multiplicador de créditos/s','Estação Operário/Astromecânico','Aumenta os créditos por segundo da própria unidade.',['+10%','+20%','+35%','+50%']),
 t('Pickaxe Level','Nível de picareta','Companheiro','Aumenta o nível da picareta.',['+2','+4','+6','+10']),
 t('Health','Vida máxima','Companheiro','Aumenta a vida máxima.',['+50','+100','+150','+250']),
 t('Crafting Speed','Velocidade de fabricação','Companheiro','Aumenta a velocidade de fabricação como companheiro; não foi confirmado que aumenta o efeito da estação do C-3PO.',['+5%','+10%','+15%','+25%']),
 t('Critical Chance','Chance crítica','Companheiro','Aumenta a chance de crítico.',['+5%','+10%','+15%','+25%']),
 t('Critical Amount','Dano crítico','Companheiro','Aumenta o efeito crítico.',['+10%','+20%','+30%','+50%']),
 t('Upgrade Chip Bonus','Bônus de chips','Companheiro','Aumenta os chips de melhoria.',['+20%','+40%','+60%','+100%']),
 t('Scrap Specialist','Mestre da Sucata (Especialista em sucata)','Companheiro','Aumenta créditos em estações de sucata.',['+10%','+20%','+30%','+50%']),
 t('Fusion Expert','Especialista em fusão','Companheiro','Aumenta a quantidade de picareta em fusões.',['+20%','+40%','+70%','+100%']),
 t('Mission Efficiency','Eficiência em missões','Estação Operário/Astromecânico','Acelera missão astromecânica da unidade.',['+5%','+10%','+15%','+25%']),
 t('Offline Earnings','Ganhos offline','Estação Operário/Astromecânico','Aumenta os ganhos offline totais.',['+2%','+4%','+6%','+10%']),
 t('Passive Credits','Créditos passivos','Companheiro','25% dos créditos a cada 5 segundos como companheiro.',null,'rainbow'),
 t('Overclocked','Overclock','Companheiro','Dobra o bônus do companheiro.',null,'rainbow'),
 t('Chip Finder','Localizador de chips','Companheiro','100% de chips extras ao fabricar droids.',null,'rainbow'),
 t('Fusion Preservation','Preservação de fusão','Fusão','Pode preservar o droid consumido, mas a habilidade volta ao estado desconhecido.',null,'rainbow'),
 t('Golden Splash Refill','Recarga de Golden Splash','Companheiro','Concede Golden Splash a cada 2 minutos ao atingir o depósito.',null,'rainbow'),
 t('Lifesteal','Roubo de vida','Companheiro','Cura 20% de HP após eliminar inimigos.',null,'iconic'),
 t('Blueprint Protector','Proteção de projetos','Companheiro','Outros não podem pegar seus projetos.',null,'iconic'),
 t('Fusion Master','Mestre da fusão','Estação Operário/Astromecânico','Bônus de companheiro continua ativo enquanto trabalha.',null,'iconic'),
 t('Crit Expert','Especialista em crítico','Companheiro','+1 Multi Crit.',null,'iconic'),
 t('Double Crate Chance','Chance de caixa dupla','Astromecânico','50% de chance de duas caixas numa missão.',null,'iconic'),
 t('Droid Sell Master','Mestre das vendas','Estação Operário/Astromecânico','Bônus de companheiro continua ativo enquanto trabalha.',null,'iconic'),
 t('Upgrade Chip Master','Mestre dos chips','Estação Operário/Astromecânico','Bônus de companheiro continua ativo enquanto trabalha.',null,'iconic'),
 t('World Mission Master','Mestre de missões mundiais','Estação Operário/Astromecânico','Bônus de companheiro continua ativo enquanto trabalha.',null,'iconic'),
 t('Flawless Duplicator','Duplicador impecável','Companheiro','Fabricação Flawless fornece projeto.',null,'iconic'),
 t('Hyperdrive','Hipermotor','Astromecânico','Triplica as recompensas das missões do CB-23.',null,'iconic')
];
const unique={'MISTER BONES':'Lifesteal','IG-11 MARSHAL':'Blueprint Protector','D-O':'Fusion Master','CHOPPER':'Crit Expert','R2-D2':'Double Crate Chance','C-3PO':'Droid Sell Master','BB-8':'Upgrade Chip Master','DJ R-3X':'World Mission Master','WG-22':'Flawless Duplicator','CB-23':'Hyperdrive'};
const iconicExclude=new Set(['Credit Per Second Multiplier','Upgrade Chip Bonus','Mission Efficiency','Passive Credits','Overclocked','Fusion Preservation']);
const byId=Object.fromEntries(traits.map(x=>[x.id,x]));
const help={
 'C-3PO':{functions:[{id:'craft',name:'Estação de fabricação',detail:'Bônus natural de progresso de fabricação (+40 s por segundo, relatos comunitários). Não há habilidade sorteável comprovada que multiplique esse efeito.'},{id:'credits',name:'Estação de créditos',detail:'Bônus natural de créditos (3× no setor, relatos comunitários). Não há habilidade sorteável comprovada que multiplique esse efeito.'}],note:'Droid Sell Master mantém seu bônus de venda como companheiro enquanto trabalha; não foi comprovado que aumente diretamente a fabricação ou os créditos da estação.'},
 'CHOPPER':{functions:[{id:'combat',name:'Combate com companheiro',detail:'Bônus natural de +50% chance crítica e +50% crítico.'}],note:'Critical Chance e Critical Amount reforçam a especialidade de combate. Crit Expert é uma alternativa exclusiva forte (+1 Multi Crit).'},
 'BB-8':{functions:[{id:'chips',name:'Obter chips',detail:'Bônus natural de chips como companheiro.'}]},
 'R2-D2':{functions:[{id:'missions',name:'Missões astromecânicas',detail:'Efeito natural de recompensas de missões.'}]},
 'CB-23':{functions:[{id:'missions',name:'Missões astromecânicas',detail:'Possui missões especiais.'}]},
 'DJ R-3X':{functions:[{id:'missions',name:'Missões mundiais',detail:'Bônus natural de missões.'}]},
 'D-O':{functions:[{id:'fusion',name:'Fusões',detail:'Efeito natural relacionado a fusões.'}]},
 'MISTER BONES':{functions:[{id:'combat',name:'Combate',detail:'Efeito natural de dano.'}]},
 'WG-22':{functions:[{id:'craft',name:'Fabricação Flawless',detail:'Efeito natural relacionado a droids impecáveis.'}]},
 'IG-11 MARSHAL':{functions:[{id:'combat',name:'Combate e projetos',detail:'Efeito de proteção de projetos.'}]}
};
const roleFunctions={Worker:[{id:'craft',name:'Fabricação (companheiro)',detail:'Aceleração de fabricação como companheiro.'},{id:'credits',name:'Geração de créditos',detail:'Renda quando colocado na estação.'}],Astromech:[{id:'scrap',name:'Coleta de sucata (companheiro)',detail:'Aprimora a picareta como companheiro.'},{id:'missions',name:'Missões astromecânicas',detail:'Estação de missões.'}],Battle:[{id:'combat',name:'Combate (companheiro)',detail:'Aumenta vida máxima como companheiro.'}],Protocol:[{id:'credits',name:'Geração de créditos (companheiro)',detail:'Multiplicador de créditos como companheiro.'}]};
const synergy={
 craft:['Crafting Speed','Chip Finder','Overclocked'],credits:['Credit Per Second Multiplier','Offline Earnings','Passive Credits','Overclocked'],
 scrap:['Pickaxe Level','Scrap Specialist','Overclocked'],missions:['Mission Efficiency','Offline Earnings'],combat:['Critical Chance','Critical Amount','Health','Overclocked'],
 fusion:['Fusion Expert','Fusion Preservation'],chips:['Upgrade Chip Bonus','Chip Finder','Overclocked']
};
const specialSynergy={'CHOPPER':['Critical Chance','Critical Amount','Crit Expert'],'BB-8':['Upgrade Chip Master','Chip Finder'],'R2-D2':['Double Crate Chance'],'CB-23':['Hyperdrive'],'DJ R-3X':['World Mission Master'],'D-O':['Fusion Master','Fusion Expert'],'MISTER BONES':['Lifesteal','Critical Amount'],'IG-11 MARSHAL':['Blueprint Protector'],'WG-22':['Flawless Duplicator'],'C-3PO':['Droid Sell Master']};
const pool=(name,rarity,grade)=>traits.filter(x=>rarity==='Iconic'?
 (x.category==='standard'&&!iconicExclude.has(x.id)||x.category==='rainbow'&&!iconicExclude.has(x.id)&&grade==='Rainbow'||x.category==='iconic'&&unique[name]===x.id&&grade==='Rainbow'):
 (x.category==='standard'||x.category==='rainbow'&&grade==='Rainbow'));
const eligible=(name,rarity,id,grade)=>pool(name,rarity,grade).some(x=>x.id===id);
const odds=(name,rarity,id,grade)=>eligible(name,rarity,id,grade)?0.25/pool(name,rarity,grade).length:null;
const scanBase={Common:5,Rare:10,Epic:20,Legendary:35,Mythic:55,Iconic:200};
const rerollBase={Common:2,Rare:4,Epic:6,Legendary:8,Mythic:10,Iconic:200};
const oldNovaPrice=(rarity,rolls)=>rolls===0?scanBase[rarity]??null:rarity==='Iconic'?200:(rerollBase[rarity]??null)*rolls;
// v1.35.1: não icônicos custam créditos; valores NOVOS não documentados com segurança.
const currency=rarity=>rarity==='Iconic'?'nova':'credits';
const price=(rarity,rolls)=>rarity==='Iconic'?200:null;
const functionsFor=(name,role)=>help[name]?.functions||roleFunctions[role]||[];
// Não inferir que habilidades do modo companheiro operam quando o droid está numa estação.
function fit(name,role,trait,grade,uses){
 if(!trait)return {score:-1,label:'Não verificado',explain:'Habilidade ainda não cadastrada.'};
 if(!byId[trait])return {score:-1,label:'Em análise',explain:'Habilidade personalizada: efeito ainda não verificado.'};
 const target=Array.isArray(uses)&&uses.length?uses:functionsFor(name,role).map(x=>x.id);
 const special=specialSynergy[name]||[];
 // Casos em que similaridade temática NÃO comprova efeito em estações especiais.
 if(name==='C-3PO'&&target.every(x=>['craft','credits'].includes(x))){return {score:-1,label:'Em análise',explain:'Nenhum efeito adicional sobre o bônus especial das estações do C-3PO está comprovado. '+(trait==='Droid Sell Master'?'Essa habilidade mantém o bônus de venda como companheiro enquanto trabalha, mas não acelera a estação.':'Essa habilidade opera em uma função diferente ou ainda precisa de teste nesta estação.')};}
 const matching=target.filter(x=>(synergy[x]||[]).includes(trait));
 const named=special.includes(trait);
 if(!matching.length&&!named)return {score:0,label:'Situacional',explain:'A habilidade não reforça diretamente as funções escolhidas. Pode ser útil se mudar o uso.'};
 const strength=grade==='Rainbow'?3:grade==='Diamond'?2:grade==='Gold'?1:0;
 const score=Math.min(5,2+(matching.length>1?1:0)+(named?2:0)+(strength>=2?1:0));
 const label=score>=5?'Excelente':score>=3?'Boa':'Situacional';
 return {score,label,explain:`${matching.length?'Combina com '+matching.map(x=>functionsFor(name,role).find(f=>f.id===x)?.name||x).join(' e ')+'. ':''}${named?'Reforça um efeito específico desta unidade. ':''}${grade==='Rainbow'?'Classificação Arco-íris.':'A classificação da habilidade influencia sua potência.'}`};
}
function candidates(name,rarity,role,uses){
 const target=Array.isArray(uses)&&uses.length?uses:functionsFor(name,role).map(x=>x.id);
 return traits.flatMap(trait=>tiers.filter(grade=>eligible(name,rarity,trait.id,grade)).map(grade=>({trait,grade,odds:odds(name,rarity,trait.id,grade),fit:fit(name,role,trait.id,grade,target)})))
 .filter(x=>x.fit.score>=3).sort((a,b)=>b.fit.score-a.fit.score||(b.grade==='Rainbow')-(a.grade==='Rainbow')||a.trait.label.localeCompare(b.trait.label,'pt-BR'));
}
window.DROID_TRAITS={SOURCE,SOURCE_ROLES,version:'1.35.1',checked:'2026-10-20',tiers,traits,unique,byId,eligible,pool,odds,price,currency,oldNovaPrice,functionsFor,fit,candidates};
})();
