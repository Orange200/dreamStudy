import 'dotenv/config';
import { isAuthorized, createSession, validSession } from './auth.js';
import Fastify from 'fastify';
import staticPlugin from '@fastify/static';
import mysql from 'mysql2/promise';
import {fileURLToPath} from 'node:url';
import {existsSync} from 'node:fs';
import {concepts,outline,grade} from './content.js';
import {prepareWorkspace,registerWorkspace} from './workspace.js';
const app=Fastify({logger:{redact:['req.headers.authorization']},bodyLimit:1024*1024});
if (!process.env.AUTH_USER || !process.env.AUTH_PASSWORD || !process.env.DB_HOST || !process.env.DB_PASSWORD || !process.env.DB_CA) throw new Error('Cloud credentials and database CA certificate are required');
const secret=process.env.AUTH_PASSWORD+'\0'+process.env.AUTH_USER;
const attempts=new Map();
let dbReady=false;
app.addHook('onRequest', async (req, reply) => {
 if (!req.url.startsWith('/api/')) return;
 if (!['GET','HEAD'].includes(req.method) && req.headers['sec-fetch-site']==='cross-site') return reply.code(403).send({message:'请求来源不允许'});
 if (req.url === '/api/login' && req.method==='POST') return;
 const token=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('study_session='))?.slice(14);
 if (!validSession(token, secret)) return reply.code(401).send({message:'请先登录'});
 if (!dbReady && !['/api/session','/api/logout'].includes(req.url)) return reply.code(503).send({message:'数据库暂时不可用，请稍后重试'});
});
app.post('/api/login', async (req,reply)=>{
 const ip=req.ip, now=Date.now(), recent=(attempts.get(ip)||[]).filter(t=>now-t<15*60*1000);
 if(recent.length>=10) return reply.code(429).send({message:'尝试次数过多，请稍后再试'});
 const {username,password}=req.body||{};
 if(typeof username!=='string'||typeof password!=='string'||!isAuthorized('Basic '+Buffer.from(username+':'+password).toString('base64'),process.env.AUTH_USER,process.env.AUTH_PASSWORD)){
  recent.push(now);attempts.set(ip,recent);return reply.code(401).send({message:'用户名或密码不正确'});
 }
 attempts.delete(ip);reply.header('Set-Cookie','study_session='+createSession(secret)+'; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800');return {ok:true};
});
app.get('/api/session',async()=>({ok:true}));
app.post('/api/logout',async(_req,reply)=>{reply.header('Set-Cookie','study_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0');return {ok:true};});
app.get('/healthz', async () => ({ok:true}));
const db=mysql.createPool({ssl:{rejectUnauthorized:true,ca:process.env.DB_CA.replace(/\\n/g,'\n')},host:process.env.DB_HOST,port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'avnadmin',password:process.env.DB_PASSWORD,database:process.env.DB_NAME||'defaultdb',charset:'utf8mb4',dateStrings:true,connectionLimit:5});
const entrySchema={type:'object',required:['title','day','category','content'],additionalProperties:false,properties:{title:{type:'string',minLength:1,maxLength:160},day:{type:'string',pattern:'^\\d{4}-\\d{2}-\\d{2}$'},category:{type:'string',minLength:1,maxLength:50},content:{type:'string',minLength:1,maxLength:50000},published:{type:'boolean'}}};
app.get('/api/health',async()=>{await db.query('SELECT 1');return {ok:true,database:'MySQL'};});
app.get('/api/entries',async()=>{const [rows]=await db.query(`SELECT e.*, (SELECT COUNT(*) FROM reviews r WHERE r.entry_id=e.id) review_count,(SELECT MAX(created_at) FROM reviews r WHERE r.entry_id=e.id) last_review FROM entries e ORDER BY day DESC,id DESC`);return rows.map(e=>({...e,concepts:concepts(e.content),outline:outline(e.content)}));});
app.post('/api/entries',{schema:{body:entrySchema}},async(req,reply)=>{const e=req.body;const [r]=await db.execute('INSERT INTO entries(title,day,category,content,published) VALUES(?,?,?,?,?)',[e.title.trim(),e.day,e.category.trim(),e.content,e.published||false]);reply.code(201);return {id:r.insertId};});
app.put('/api/entries/:id',{schema:{body:entrySchema}},async(req,reply)=>{const e=req.body;const [r]=await db.execute('UPDATE entries SET title=?,day=?,category=?,content=?,published=? WHERE id=?',[e.title.trim(),e.day,e.category.trim(),e.content,e.published||false,req.params.id]);if(!r.affectedRows)return reply.code(404).send({message:'笔记不存在'});return {ok:true};});
app.delete('/api/entries/:id',async(req)=>{await db.execute('DELETE FROM entries WHERE id=?',[req.params.id]);return {ok:true};});
app.post('/api/entries/:id/reviews',{schema:{body:{type:'object',required:['mode','answer'],properties:{mode:{enum:['cloze','recall']},answer:{type:'string',maxLength:50000}}}}},async(req,reply)=>{const [rows]=await db.execute('SELECT * FROM entries WHERE id=?',[req.params.id]);if(!rows.length)return reply.code(404).send({message:'笔记不存在'});const keys=concepts(rows[0].content),answer=req.body.answer;let feedback;try{feedback=grade(keys,req.body.mode,answer);}catch(e){return reply.code(400).send({message:e.message});}const score=feedback.score;await db.execute('INSERT INTO reviews(entry_id,mode,answer,score) VALUES(?,?,?,?)',[req.params.id,req.body.mode,answer,score]);return feedback;});
app.get('/api/reviews',async()=>{const [rows]=await db.query('SELECT r.*,e.title FROM reviews r JOIN entries e ON e.id=r.entry_id ORDER BY r.id DESC LIMIT 100');return rows;});
registerWorkspace(app,db);
const dist=fileURLToPath(new URL('../dist/',import.meta.url));
if(existsSync(dist)){await app.register(staticPlugin,{root:dist});app.setNotFoundHandler((req,reply)=>req.url.startsWith('/api/')?reply.code(404).send({message:'接口不存在'}):reply.sendFile('index.html'));}
let retryTimer;
async function prepareDatabase(){
 try{
  await db.query(`CREATE TABLE IF NOT EXISTS entries (id INT AUTO_INCREMENT PRIMARY KEY,title VARCHAR(160) NOT NULL,day DATE NOT NULL,category VARCHAR(50) NOT NULL,content MEDIUMTEXT NOT NULL,published BOOLEAN NOT NULL DEFAULT FALSE,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  await db.query(`CREATE TABLE IF NOT EXISTS reviews (id INT AUTO_INCREMENT PRIMARY KEY,entry_id INT NOT NULL,mode VARCHAR(20) NOT NULL,answer MEDIUMTEXT NOT NULL,score INT NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(entry_id) REFERENCES entries(id) ON DELETE CASCADE)`);
  await prepareWorkspace(db);
  dbReady=true;
  app.log.info('Database is ready');
 }catch(err){
  dbReady=false;
  app.log.error({err},'Database unavailable; retrying in 30 seconds');
  retryTimer=setTimeout(prepareDatabase,30000);
  retryTimer.unref();
 }
}
app.addHook('onClose',async()=>{if(retryTimer)clearTimeout(retryTimer);await db.end();});
await app.listen({port:Number(process.env.PORT||3000),host:'0.0.0.0'});
void prepareDatabase();
