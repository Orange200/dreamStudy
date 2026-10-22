import assert from 'node:assert/strict';
const base='http://127.0.0.1:3000/api';
async function request(path,method='GET',body){const r=await fetch(base+path,{method,headers:body?{'content-type':'application/json'}:{},body:body?JSON.stringify(body):undefined});const value=await r.json();assert.ok(r.ok,JSON.stringify(value));return value;}
const note={title:'临时端到端验证',day:'2026-10-21',category:'测试',content:'# 测试主题\n掌握 [[Proxy]] 和 [[ref]]。',published:false};
const {id}=await request('/entries','POST',note);
try{
 let entry=(await request('/entries')).find(e=>e.id===id);assert.deepEqual(entry.concepts,['Proxy','ref']);assert.equal(entry.outline[0].title,'测试主题');
 assert.equal((await request(`/entries/${id}/reviews`,'POST',{mode:'cloze',answer:'["Proxy","wrong"]'})).score,50);
 assert.equal((await request(`/entries/${id}/reviews`,'POST',{mode:'recall',answer:'Proxy 配合 ref 完成响应式'})).score,100);
 await request(`/entries/${id}`,'PUT',{...note,title:'修改后的测试'});
 entry=(await request('/entries')).find(e=>e.id===id);assert.equal(entry.title,'修改后的测试');assert.equal(entry.review_count,2);
 const invalid=await fetch(base+'/entries',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});assert.equal(invalid.status,400);
 const malicious=await request('/entries','POST',{...note,title:"测试'); DROP TABLE entries; --"});await request(`/entries/${malicious.id}`,'DELETE');
 console.log('通过：MySQL 笔记增改查、结构解析、填空与回忆记录、输入校验、参数化 SQL。');
}finally{await request(`/entries/${id}`,'DELETE');}
assert.ok(!(await request('/reviews')).some(r=>r.entry_id===id));
console.log('通过：删除笔记级联清理复习记录；临时测试数据已清理。');

