import 'dotenv/config';
import Fastify from 'fastify';
import staticPlugin from '@fastify/static';
import mysql from 'mysql2/promise';
import {fileURLToPath} from 'node:url';
import {existsSync} from 'node:fs';
import {concepts,outline,grade} from './content.js';
const app=Fastify({logger:true,bodyLimit:1024*1024});
const db=await mysql.createPool({host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3307),user:process.env.DB_USER||'study',password:process.env.DB_PASSWORD,database:process.env.DB_NAME||'study_garden',charset:'utf8mb4',dateStrings:true,connectionLimit:5});
await db.query(`CREATE TABLE IF NOT EXISTS entries (id INT AUTO_INCREMENT PRIMARY KEY,title VARCHAR(160) NOT NULL,day DATE NOT NULL,category VARCHAR(50) NOT NULL,content MEDIUMTEXT NOT NULL,published BOOLEAN NOT NULL DEFAULT FALSE,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
await db.query(`CREATE TABLE IF NOT EXISTS reviews (id INT AUTO_INCREMENT PRIMARY KEY,entry_id INT NOT NULL,mode VARCHAR(20) NOT NULL,answer MEDIUMTEXT NOT NULL,score INT NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(entry_id) REFERENCES entries(id) ON DELETE CASCADE)`);
const entrySchema={type:'object',required:['title','day','category','content'],additionalProperties:false,properties:{title:{type:'string',minLength:1,maxLength:160},day:{type:'string',pattern:'^\\d{4}-\\d{2}-\\d{2}$'},category:{type:'string',minLength:1,maxLength:50},content:{type:'string',minLength:1,maxLength:50000},published:{type:'boolean'}}};
app.get('/api/health',async()=>{await db.query('SELECT 1');return {ok:true,database:'MySQL'};});
app.get('/api/entries',async()=>{const [rows]=await db.query(`SELECT e.*, (SELECT COUNT(*) FROM reviews r WHERE r.entry_id=e.id) review_count,(SELECT MAX(created_at) FROM reviews r WHERE r.entry_id=e.id) last_review FROM entries e ORDER BY day DESC,id DESC`);return rows.map(e=>({...e,concepts:concepts(e.content),outline:outline(e.content)}));});
app.post('/api/entries',{schema:{body:entrySchema}},async(req,reply)=>{const e=req.body;const [r]=await db.execute('INSERT INTO entries(title,day,category,content,published) VALUES(?,?,?,?,?)',[e.title.trim(),e.day,e.category.trim(),e.content,e.published||false]);reply.code(201);return {id:r.insertId};});
app.put('/api/entries/:id',{schema:{body:entrySchema}},async(req,reply)=>{const e=req.body;const [r]=await db.execute('UPDATE entries SET title=?,day=?,category=?,content=?,published=? WHERE id=?',[e.title.trim(),e.day,e.category.trim(),e.content,e.published||false,req.params.id]);if(!r.affectedRows)return reply.code(404).send({message:'笔记不存在'});return {ok:true};});
app.delete('/api/entries/:id',async(req)=>{await db.execute('DELETE FROM entries WHERE id=?',[req.params.id]);return {ok:true};});
app.post('/api/entries/:id/reviews',{schema:{body:{type:'object',required:['mode','answer'],properties:{mode:{enum:['cloze','recall']},answer:{type:'string',maxLength:50000}}}}},async(req,reply)=>{const [rows]=await db.execute('SELECT * FROM entries WHERE id=?',[req.params.id]);if(!rows.length)return reply.code(404).send({message:'笔记不存在'});const keys=concepts(rows[0].content),answer=req.body.answer;let feedback;try{feedback=grade(keys,req.body.mode,answer);}catch(e){return reply.code(400).send({message:e.message});}const score=feedback.score;await db.execute('INSERT INTO reviews(entry_id,mode,answer,score) VALUES(?,?,?,?)',[req.params.id,req.body.mode,answer,score]);return feedback;});
app.get('/api/reviews',async()=>{const [rows]=await db.query('SELECT r.*,e.title FROM reviews r JOIN entries e ON e.id=r.entry_id ORDER BY r.id DESC LIMIT 100');return rows;});
const dist=fileURLToPath(new URL('../dist/',import.meta.url));
if(existsSync(dist)){await app.register(staticPlugin,{root:dist});app.setNotFoundHandler((req,reply)=>req.url.startsWith('/api/')?reply.code(404).send({message:'接口不存在'}):reply.sendFile('index.html'));}
app.addHook('onClose',()=>db.end());
await app.listen({port:Number(process.env.PORT||3000),host:'127.0.0.1'});

