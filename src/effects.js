export function installEffects(){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 function move(e){if(reduced.matches||e.pointerType==='touch')return;const el=e.target.closest('.note-card,.todo-row,.focus-card');if(!el)return;const r=el.getBoundingClientRect();el.style.setProperty('--mx',e.clientX-r.left+'px');el.style.setProperty('--my',e.clientY-r.top+'px');}
 function click(e){if(reduced.matches)return;const el=e.target.closest('button');if(!el||el.disabled)return;const rect=el.getBoundingClientRect(),ripple=document.createElement('span');ripple.className='click-ripple';ripple.setAttribute('aria-hidden','true');ripple.style.left=e.clientX-rect.left+'px';ripple.style.top=e.clientY-rect.top+'px';el.append(ripple);setTimeout(()=>ripple.remove(),650);}
 document.addEventListener('pointermove',move,{passive:true});document.addEventListener('click',click);return()=>{document.removeEventListener('pointermove',move);document.removeEventListener('click',click);};
}
