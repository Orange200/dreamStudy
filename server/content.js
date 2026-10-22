export function concepts(content) {
  return [...content.matchAll(/\[\[([^\[\]\n]+)\]\]/g)].map(m=>m[1]);
}
export function plain(content) { return content.replace(/\[\[([^\]]+)\]\]/g,'$1'); }
export function grade(keys,mode,answer) {
  let slots=[];
  if(mode==='cloze'){try{slots=JSON.parse(answer);}catch{throw new Error('填空答案格式错误');}if(!Array.isArray(slots)||slots.some(s=>typeof s!=='string'))throw new Error('填空答案格式错误');}
  const normalize=s=>s.trim().toLowerCase();
  const hits=keys.filter((k,i)=>mode==='cloze'?normalize(slots[i]||'')===normalize(k):normalize(answer).includes(normalize(k)));
  return {score:keys.length?Math.round(hits.length/keys.length*100):0,hits,missing:keys.filter((k,i)=>mode==='cloze'?normalize(slots[i]||'')!==normalize(k):!normalize(answer).includes(normalize(k))),hasKeywords:keys.length>0};
}
export function outline(content) {
  const branches=[]; let current=null;
  for(const line of content.split('\n').map(s=>s.trim()).filter(Boolean)) {
    if(/^#{1,3}\s/.test(line)) {current={title:plain(line.replace(/^#+\s*/,'')),children:[]};branches.push(current);}
    else {if(!current){current={title:'学习笔记',children:[]};branches.push(current);}current.children.push(plain(line.replace(/^[-*]\s*/,'')));}
  }
  return branches;
}
