import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDemoApi} from '../src/demo-api.js';
import {createSession,validSession} from './auth.js';

test('演示数据增删改查和复习仅保留在实例内',async()=>{
 const api=createDemoApi(),initial=await api('/entries');
 const created=await api('/entries',{method:'POST',body:JSON.stringify({title:'测试',day:'2026-10-29',category:'学习方法',content:'[[概念]]',published:true})});
 assert.equal((await api('/entries')).length,initial.length+1);
 await api('/entries/'+created.id,{method:'PUT',body:JSON.stringify({title:'更新',day:'2026-10-29',category:'学习方法',content:'[[概念]]',published:true})});
 const result=await api('/entries/'+created.id+'/reviews',{method:'POST',body:JSON.stringify({mode:'recall',answer:'概念'})});
 assert.equal(result.score,100);assert.equal((await api('/reviews')).length,1);
 await api('/entries/'+created.id,{method:'DELETE'});assert.equal((await api('/reviews')).length,0);
 assert.equal((await createDemoApi()('/entries')).length,initial.length);
});
test('会话具有完整性和过期校验',()=>{
 const token=createSession('secret',1700000000000);
 assert.equal(validSession(token,'secret',1700000000000),true);
 assert.equal(validSession(token,'other',1700000000000),false);
 assert.equal(validSession(token,'secret',1700000000000+8*86400000),false);
 assert.equal(validSession(token+'x','secret',1700000000000),false);
});
