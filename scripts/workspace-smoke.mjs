import assert from 'node:assert/strict';
const base='http://127.0.0.1:3000/api',prefix='验证'+Date.now();let noteId,todoId;
async function req(path,method='GET',body,status=200){const r=await fetch(base+path,{method,headers:body?{'content-type':'application/json'}:{},body:body?JSON.stringify(body):undefined});const data=await r.json();assert.equal(r.status,status,JSON.stringify(data));return data;}
try{
 await req('/folders','POST',{name:prefix},201);
 await req('/folders','POST',{name:'子文件夹',parent:prefix},201);
 await req('/folders','POST',{name:'子文件夹',parent:prefix},409);
 await req('/folders','POST',{name:'a/b'},400);
 const entry={title:'文件夹验证笔记',day:'2026-10-22',category:prefix+'/子文件夹',content:'# 知识点\n[[Vue]]',published:false};
 noteId=(await req('/entries','POST',entry,201)).id;
 await req('/folders','DELETE',{path:prefix},409);
 await req('/folders','PUT',{path:prefix,name:prefix+'改名'});
 let e=(await req('/entries')).find(e=>e.id===noteId);assert.equal(e.category,prefix+'改名/子文件夹');
 await req('/folders','PUT',{path:prefix+'改名',name:prefix});
 const todo={title:'临时待办验证',priority:'high',due:'2026-10-23',done:false};
 todoId=(await req('/todos','POST',todo,201)).id;
 await req('/todos/'+todoId,'PUT',{...todo,title:'已更新任务',done:true});
 let t=(await req('/todos')).find(t=>t.id===todoId);assert.equal(t.done,1);assert.equal(t.title,'已更新任务');assert.equal(t.due,'2026-10-23');
 await req('/todos','POST',{...todo,title:'   '},400);
 await req('/todos','POST',{...todo,due:'2026-02-30'},400);
 await req('/todos/2147483647','PUT',todo,404);
 console.log('通过：多级文件夹、新增冲突检测、非空删除保护、重命名同步笔记、待办增改查与日期/空白校验。');
}finally{
 if(noteId)await req('/entries/'+noteId,'DELETE');
 if(todoId)await req('/todos/'+todoId,'DELETE');
 for(const path of [prefix+'/子文件夹',prefix+'改名/子文件夹',prefix,prefix+'改名'])await req('/folders','DELETE',{path});
}
console.log('测试数据已清理。');
