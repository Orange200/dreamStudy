import {test} from 'node:test';
import assert from 'node:assert/strict';
import {concepts,outline,grade} from './content.js';
test('从中文学习内容生成填空与地图，保留普通文本',()=>{
 const content='# 响应式\n通过 [[Proxy]] 追踪 [[依赖]]。\n# 应用\n- 更新视图';
 assert.deepEqual(concepts(content),['Proxy','依赖']);
 assert.deepEqual(outline(content),[{title:'响应式',children:['通过 Proxy 追踪 依赖。']},{title:'应用',children:['更新视图']}]);
});
test('填空按位置准确匹配，不能用错位答案或包含答案的长句得分',()=>{
 assert.equal(grade(['ref','Proxy'],'cloze','["Proxy","ref"]').score,0);
 assert.equal(grade(['ref','Proxy'],'cloze','[" REF ","proxy"]').score,100);
 assert.equal(grade(['ref'],'cloze','["prefer"]').score,0);
 assert.throws(()=>grade(['ref'],'cloze','{}'));
});
test('完整回忆输出覆盖关键词和遗漏，未标记关键词也能记录',()=>{
 assert.deepEqual(grade(['Proxy','依赖'],'recall','Proxy 拦截对象'),{score:50,hits:['Proxy'],missing:['依赖'],hasKeywords:true});
 assert.equal(grade([],'recall','自由回忆').hasKeywords,false);
});
test('无标题的笔记仍生成知识地图，空内容不生成无效分支',()=>{
 assert.deepEqual(outline('普通学习记录'),[{title:'学习笔记',children:['普通学习记录']}]);
 assert.deepEqual(outline(''),[]);
 assert.deepEqual(concepts('[[未闭合'),[]);
});
