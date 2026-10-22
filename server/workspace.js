export async function registerWorkspace(app,db){
 await db.query(`CREATE TABLE IF NOT EXISTS folders (path VARCHAR(50) PRIMARY KEY,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
 await db.query(`CREATE TABLE IF NOT EXISTS todos (id INT AUTO_INCREMENT PRIMARY KEY,title VARCHAR(300) NOT NULL,done BOOLEAN NOT NULL DEFAULT FALSE,priority VARCHAR(10) NOT NULL DEFAULT 'normal',due DATE NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
 const [existing]=await db.query('SELECT DISTINCT category FROM entries');
 for(const row of existing){const parts=row.category.split('/');for(let i=1;i<=parts.length;i++)await db.execute('INSERT IGNORE INTO folders(path) VALUES(?)',[parts.slice(0,i).join('/')]);}
 const nameSchema={type:'string',minLength:1,maxLength:50,pattern:'^[^/\\\\]+$'};
 app.get('/api/folders',async()=>{const [rows]=await db.query('SELECT path FROM folders ORDER BY path');return rows;});
 app.post('/api/folders',{schema:{body:{type:'object',required:['name'],additionalProperties:false,properties:{name:nameSchema,parent:{type:'string',maxLength:50}}}}},async(req,reply)=>{
  const name=req.body.name.trim(),parent=req.body.parent||'',path=parent?parent+'/'+name:name;
  if(!name||path.length>50)return reply.code(400).send({message:'名称不能为空，完整路径不能超过 50 字'});
  if(parent){const [rows]=await db.execute('SELECT path FROM folders WHERE path=?',[parent]);if(!rows.length)return reply.code(400).send({message:'父文件夹不存在'});}
  try{await db.execute('INSERT INTO folders(path) VALUES(?)',[path]);}catch(e){if(e.code==='ER_DUP_ENTRY')return reply.code(409).send({message:'同名文件夹已存在'});throw e;}
  return reply.code(201).send({path});
 });
 app.put('/api/folders',{schema:{body:{type:'object',required:['path','name'],additionalProperties:false,properties:{path:{type:'string',minLength:1,maxLength:50},name:nameSchema}}}},async(req,reply)=>{
  const old=req.body.path,name=req.body.name.trim(),parent=old.includes('/')?old.slice(0,old.lastIndexOf('/')):'',next=parent?parent+'/'+name:name;
  if(!name)return reply.code(400).send({message:'名称不能为空'});
  const conn=await db.getConnection();
  try{await conn.beginTransaction();const [rows]=await conn.execute('SELECT path FROM folders WHERE path=? OR LEFT(path,?)=? FOR UPDATE',[old,old.length+1,old+'/']);
   if(!rows.some(r=>r.path===old)){await conn.rollback();return reply.code(404).send({message:'文件夹不存在'});}
   if(rows.some(r=>next.length+r.path.length-old.length>50)){await conn.rollback();return reply.code(400).send({message:'重命名后路径超过 50 字'});}
   for(const r of rows)await conn.execute('UPDATE folders SET path=? WHERE path=?',[next+r.path.slice(old.length),r.path]);
   await conn.execute('UPDATE entries SET category=CONCAT(?,SUBSTRING(category,?)) WHERE category=? OR LEFT(category,?)=?',[next,old.length+1,old,old.length+1,old+'/']);
   await conn.commit();return {path:next};
  }catch(e){await conn.rollback();if(e.code==='ER_DUP_ENTRY')return reply.code(409).send({message:'文件夹名称冲突'});throw e;}finally{conn.release();}
 });
 app.delete('/api/folders',{schema:{body:{type:'object',required:['path'],properties:{path:{type:'string',minLength:1,maxLength:50}}}}},async(req,reply)=>{
  const path=req.body.path,conn=await db.getConnection();
  try{await conn.beginTransaction();await conn.execute('SELECT path FROM folders WHERE path=? FOR UPDATE',[path]);
   const [children]=await conn.execute('SELECT path FROM folders WHERE LEFT(path,?)=? LIMIT 1',[path.length+1,path+'/']);
   const [notes]=await conn.execute('SELECT id FROM entries WHERE category=? OR LEFT(category,?)=? LIMIT 1',[path,path.length+1,path+'/']);
   if(children.length||notes.length){await conn.rollback();return reply.code(409).send({message:'请先移出笔记并删除子文件夹，再删除空文件夹'});}
   await conn.execute('DELETE FROM folders WHERE path=?',[path]);await conn.commit();return {ok:true};
  }catch(e){await conn.rollback();throw e;}finally{conn.release();}
 });
 const todoBody={type:'object',required:['title','priority','due','done'],additionalProperties:false,properties:{title:{type:'string',minLength:1,maxLength:300,pattern:'\\S'},priority:{enum:['normal','high','low']},due:{anyOf:[{type:'null'},{type:'string',format:'date'}]},done:{type:'boolean'}}};
 app.get('/api/todos',async()=>{const [rows]=await db.query('SELECT * FROM todos ORDER BY done, due IS NULL, due, id DESC');return rows;});
 app.post('/api/todos',{schema:{body:todoBody}},async(req,reply)=>{const t=req.body;const [r]=await db.execute('INSERT INTO todos(title,priority,due,done) VALUES(?,?,?,?)',[t.title.trim(),t.priority,t.due,t.done]);return reply.code(201).send({id:r.insertId});});
 app.put('/api/todos/:id',{schema:{body:todoBody}},async(req,reply)=>{const t=req.body;const [r]=await db.execute('UPDATE todos SET title=?,priority=?,due=?,done=? WHERE id=?',[t.title.trim(),t.priority,t.due,t.done,req.params.id]);if(!r.affectedRows)return reply.code(404).send({message:'任务不存在'});return {ok:true};});
 app.delete('/api/todos/:id',async(req)=>{await db.execute('DELETE FROM todos WHERE id=?',[req.params.id]);return {ok:true};});
}
