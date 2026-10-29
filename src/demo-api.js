import {concepts,outline,grade} from './demo-content.js';

export function createDemoApi() {
 const day=new Date().toLocaleDateString('sv-SE');
 let next=2, entries=[{id:1,title:'主动回忆：让知识真正留下来',day,category:'学习方法',published:true,content:'# 什么是主动回忆\n不看笔记，试着从记忆中提取知识，这就是 [[主动回忆]]。\n# 如何实践\n- 合上资料，用自己的话解释。\n- 通过 [[间隔复习]] 巩固记忆。'}], reviews=[],folders=[{path:'学习方法'}],todos=[{id:1,title:'尝试完成一次主动回忆',priority:'normal',due:null,done:false}];
 return async (path,options={})=>{
  const method=options.method||'GET',body=options.body?JSON.parse(options.body):{},id=Number(path.split('/')[2]),now=new Date().toISOString().slice(0,19).replace('T',' ');
  if(path==='/entries'&&method==='GET')return entries.map(e=>({...e,concepts:concepts(e.content),outline:outline(e.content),review_count:reviews.filter(r=>r.entry_id===e.id).length,last_review:reviews.find(r=>r.entry_id===e.id)?.created_at||null}));
  if(path==='/entries'&&method==='POST'){const entry={...body,id:next++};entries.unshift(entry);return {id:entry.id};}
  if(/^\/entries\/\d+$/.test(path)){const i=entries.findIndex(e=>e.id===id);if(i<0)throw Error('笔记不存在');if(method==='PUT')entries[i]={...entries[i],...body};if(method==='DELETE'){entries.splice(i,1);reviews=reviews.filter(r=>r.entry_id!==id);}return {ok:true};}
  if(/^\/entries\/\d+\/reviews$/.test(path)&&method==='POST'){const e=entries.find(e=>e.id===id);if(!e)throw Error('笔记不存在');const result=grade(concepts(e.content),body.mode,body.answer);reviews.unshift({id:next++,entry_id:id,title:e.title,mode:body.mode,score:result.score,created_at:now});return result;}
  if(path==='/reviews')return reviews;
  if(path==='/folders'&&method==='GET')return folders;
  if(path==='/folders'&&method==='POST'){let name=body.name.trim(),parent=body.parent||'',path=parent?parent+'/'+name:name;if(!name||path.length>50||name.includes('/')||name.includes('\\'))throw Error('文件夹名称无效');if(parent&&!folders.some(f=>f.path===parent))throw Error('父文件夹不存在');if(folders.some(f=>f.path===path))throw Error('同名文件夹已存在');folders.push({path});return {path};}
  if(path==='/folders'&&method==='PUT'){const old=body.path,parent=old.includes('/')?old.slice(0,old.lastIndexOf('/')):'',name=body.name.trim(),updated=parent?parent+'/'+name:name;if(!name||!folders.some(f=>f.path===old))throw Error('文件夹不存在或名称为空');let affected=folders.filter(f=>f.path===old||f.path.startsWith(old+'/'));if(affected.some(f=>updated.length+f.path.length-old.length>50))throw Error('重命名后路径超过 50 字');if(affected.some(f=>folders.some(other=>!affected.includes(other)&&other.path===updated+f.path.slice(old.length))))throw Error('文件夹名称冲突');affected.forEach(f=>f.path=updated+f.path.slice(old.length));entries.forEach(e=>{if(e.category===old||e.category.startsWith(old+'/'))e.category=updated+e.category.slice(old.length);});return {path:updated};}
  if(path==='/folders'&&method==='DELETE'){if(folders.some(f=>f.path.startsWith(body.path+'/'))||entries.some(e=>e.category===body.path||e.category.startsWith(body.path+'/')))throw Error('请先移出笔记并删除子文件夹');folders=folders.filter(f=>f.path!==body.path);return {ok:true};}
  if(path==='/todos'&&method==='GET')return todos;
  if(path==='/todos'&&method==='POST'){const task={...body,id:next++};todos.push(task);return {id:task.id};}
  if(/^\/todos\/\d+$/.test(path)){const i=todos.findIndex(t=>t.id===id);if(i<0)throw Error('待办不存在');if(method==='PUT')todos[i]={...todos[i],...body};if(method==='DELETE')todos.splice(i,1);return {ok:true};}
  throw Error('不支持的演示操作');
 };
}
