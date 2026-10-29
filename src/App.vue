<script setup>
import {ref,computed,onMounted,onUnmounted} from 'vue';
import NoteEditor from './NoteEditor.vue';
import FolderManager from './FolderManager.vue';
import TodoBoard from './TodoBoard.vue';
import {installEffects} from './effects.js';
import {createDemoApi} from './demo-api.js';
const props=defineProps({demo:{type:Boolean,default:false}});
const demoApi=props.demo?createDemoApi():null;
async function logout(){await fetch('/api/logout',{method:'POST'});location.assign('/');}
import {BookOpen, Sprout, LayoutDashboard, Network, Plus, ArrowUpRight, ArrowRight, X, Search, ChevronLeft, Check, Pencil, Trash2, Download, RotateCcw, CalendarDays, Flame, Brain, FileText,Folder,FolderPlus,ListTodo,Settings2} from 'lucide-vue-next';
const entries=ref([]),reviews=ref([]),page=ref('dashboard'),search=ref(''),category=ref('全部'),selected=ref(null),editing=ref(false),editId=ref(null),busy=ref(false),error=ref(''),toast=ref(''),mode=ref('cloze'),answers=ref([]),recall=ref(''),result=ref(null);
const today=()=>new Date().toLocaleDateString('sv-SE');
const form=ref({title:'',day:today(),category:'编程开发',content:'',published:true});
const folders=ref([]),manageFolders=ref(false),noteEditor=ref(null);
const categories=computed(()=>['全部',...new Set([...folders.value.map(f=>f.path),...entries.value.map(e=>e.category)])]);
const folderTree=computed(()=>folders.value.map(f=>({...f,name:f.path.split('/').at(-1),depth:f.path.split('/').length-1,count:entries.value.filter(e=>e.category===f.path||e.category.startsWith(f.path+'/')).length})));
const filtered=computed(()=>entries.value.filter(e=>(category.value==='全部'||e.category===category.value||e.category.startsWith(category.value+'/'))&&`${e.title} ${e.content}`.toLowerCase().includes(search.value.toLowerCase())));
const published=computed(()=>filtered.value.filter(e=>e.published));
const due=computed(()=>entries.value.filter(e=>!e.last_review||Date.now()-new Date(e.last_review.replace(' ','T')).getTime()>86400000));
const totalKeys=computed(()=>entries.value.reduce((a,e)=>a+e.concepts.length,0));
const pieces=computed(()=>selected.value?.content.split(/\[\[([^\[\]\n]+)\]\]/g)||[]);
const days=computed(()=>Array.from({length:28},(_,i)=>{const d=new Date();d.setDate(d.getDate()-27+i);const day=d.toLocaleDateString('sv-SE');return {day,n:entries.value.filter(e=>e.day===day).length};}));
async function api(path,options){if(demoApi)return demoApi(path,options);const r=await fetch('/api'+path,{...options,headers:options?.body?{'Content-Type':'application/json'}:{}});const data=await r.json();if(r.status===401){window.location.assign('/login');throw new Error('请先登录');}if(!r.ok)throw new Error(data.message||'操作失败');return data;}
async function load(){try{[entries.value,reviews.value,folders.value]=await Promise.all([api('/entries'),api('/reviews'),api('/folders')]);error.value='';}catch(e){error.value='服务连接失败：'+e.message;}}
async function foldersChanged(change){await load();noteEditor.value?.selectFolder(change);if(category.value!=='全部'&&!folders.value.some(f=>f.path===category.value))category.value='全部';if(selected.value)selected.value=entries.value.find(e=>e.id===selected.value.id);notify('文件夹已更新');}
function notify(s){toast.value=s;setTimeout(()=>toast.value='',3000);}
function newEntry(){editId.value=null;form.value={title:'',day:today(),category:category.value!=='全部'?category.value:folders.value[0]?.path||'',content:'',published:true};editing.value=true;}
function edit(e){editId.value=e.id;form.value={title:e.title,day:e.day,category:e.category,content:e.content,published:!!e.published};editing.value=true;}
async function save(value){busy.value=true;try{await api('/entries'+(editId.value?'/'+editId.value:''),{method:editId.value?'PUT':'POST',body:JSON.stringify(value)});noteEditor.value?.clearDraft();editing.value=false;await load();if(selected.value)selected.value=entries.value.find(e=>e.id===selected.value.id);notify('学习笔记已保存，复习题与知识地图已同步');}catch(e){notify(e.message);}finally{busy.value=false;}}
const basePath=props.demo?'/demo':'/app';
function showPage(next){page.value=next;selected.value=null;if(location.pathname===basePath&&location.search)history.replaceState({},'',basePath);}
function showEntry(e,next){selected.value=e;page.value=next;if(location.pathname===basePath){const target=`${basePath}?${next==='article'?'note':'review'}=${encodeURIComponent(e.id)}`;if(location.pathname+location.search!==target)history.pushState({},'',target);}}
function syncHistory(){
 if(location.pathname!==basePath)return;
 const params=new URLSearchParams(location.search),kind=params.has('note')?'note':params.has('review')?'review':null;
 const entry=kind&&entries.value.find(e=>String(e.id)===params.get(kind));
 if(entry){selected.value=entry;page.value=kind==='note'?'article':'practice';return;}
 selected.value=null;page.value='dashboard';
}
function open(e){showEntry(e,'article');}
function review(e){answers.value=[];recall.value='';result.value=null;showEntry(e,'practice');}
async function submit(){busy.value=true;try{result.value=await api(`/entries/${selected.value.id}/reviews`,{method:'POST',body:JSON.stringify({mode:mode.value,answer:mode.value==='cloze'?JSON.stringify(Array.from({length:selected.value.concepts.length},(_,i)=>answers.value[i]||'')):recall.value})});await load();}catch(e){notify(e.message);}finally{busy.value=false;}}
async function remove(e){if(!confirm('确定删除这篇笔记及其复习记录吗？'))return;try{await api('/entries/'+e.id,{method:'DELETE'});showPage('notes');await load();notify('笔记已删除');}catch(e){notify(e.message);}}
function exportNote(e){const text=`# ${e.title}\n\n${e.day} · ${e.category}\n\n${e.content.replace(/\[\[([^\]]+)\]\]/g,'$1')}`;const u=URL.createObjectURL(new Blob([text],{type:'text/markdown;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download=e.title.replace(/[\\/:*?"<>|]/g,'-')+'.md';a.click();URL.revokeObjectURL(u);}
function demo(){form.value={title:'理解 Vue 响应式：从数据到视图',day:today(),category:'编程开发',published:true,content:'# 响应式的核心\nVue 通过 [[Proxy]] 拦截对象的读取和修改，实现依赖追踪与更新。\n# 两种常用 API\n- [[ref]] 可以包装基本类型，通过 .value 访问。\n- [[reactive]] 用于创建对象的响应式代理。\n# 更新机制\n- 读取数据时进行 [[依赖收集]]。\n- 修改数据时 [[触发更新]]，视图随之刷新。\n# 我的理解\n响应式像一条自动连接数据与视图的线，让开发者更专注于状态。'};}
let cleanupEffects;
onMounted(()=>{load().then(syncHistory);window.addEventListener('popstate',syncHistory);cleanupEffects=installEffects();});
onUnmounted(()=>{window.removeEventListener('popstate',syncHistory);cleanupEffects?.();});
</script>

<template>
<div class="shell">
 <aside class="sidebar">
  <a class="brand" href="#" @click.prevent="showPage('dashboard')"><span class="brand-icon"><img src="/shizhi-logo.svg" alt="" width="41" height="41"/></span>拾知<span class="brand-dot">.</span></a>
  <div class="workspace">PERSONAL LEARNING SPACE</div>
  <nav><button v-for="item in [['dashboard','学习概览',LayoutDashboard],['notes','我的笔记',BookOpen],['review','每日复习',Brain],['blog','知识博客',Network],['todos','待办清单',ListTodo]]" :class="{active:page===item[0]}" @click="showPage(item[0]);search='';category='全部'"><component :is="item[2]" :size="19"/>{{item[1]}}<span v-if="item[0]==='review'&&due.length" class="badge">{{due.length}}</span></button></nav>
  <div class="sidebar-note"><Sprout :size="24"/><p>知识需要沉淀，<br>成长自有回声。</p><span>MAKE LEARNING STICK.</span></div>
  <div class="profile"><div class="avatar"><img src="/shizhi-logo.svg" alt="拾知头像" width="36" height="36"/></div><div><b>我的学习空间</b><small>每天进步一点点</small></div><span class="online"></span></div>
 </aside>
 <main>
  <header><div class="breadcrumb">{{demo?'演示空间':'我的空间'}} <span>/</span> {{ {dashboard:'学习概览',notes:'我的笔记',review:'每日复习',blog:'知识博客',article:'笔记详情',practice:'专注复习',todos:'待办清单'}[page] }}</div><div class="header-right"><template v-if="demo"><span class="local-dot"></span> 演示模式 · 刷新后重置</template> <a href="/" style="margin-left:12px">返回首页</a> <button v-if="!demo" class="text-button" @click="logout">退出登录</button> <span class="header-line"></span><CalendarDays :size="16"/>{{new Date().toLocaleDateString('zh-CN',{month:'long',day:'numeric',weekday:'long'})}}</div></header>
  <div class="content">
   <div v-if="error" class="error">{{error}} <button @click="load">重试</button></div>
   <template v-if="page==='dashboard'">
    <div class="page-title"><div><div class="eyebrow">YOUR GROWTH, ONE DAY AT A TIME</div><h1>把学过的，变成自己的<span class="green">。</span></h1><p>记录、回忆、连接。让每一天的学习，都留下生长的痕迹。</p></div><button class="primary" @click="newEntry"><Plus :size="18"/>记录今天的学习</button></div>
    <div class="stats"><div><span>积累的学习笔记 <BookOpen :size="18"/></span><b>{{entries.length}}<small>篇</small></b><p>每一篇，都是成长的脚印</p></div><div><span>提炼的知识点 <Sprout :size="18"/></span><b>{{totalKeys}}<small>个</small></b><p>让零散知识，慢慢连成体系</p></div><div><span>完成的主动回忆 <RotateCcw :size="18"/></span><b>{{reviews.length}}<small>次</small></b><p>记住的秘诀，是再次想起</p></div><div><span>等待温习的笔记 <Flame :size="18"/></span><b>{{due.length}}<small>篇</small></b><p>给记忆一点恰好的提醒</p></div></div>
    <div class="dashboard-grid"><section class="focus-card"><div class="pill">✦ 今日学习仪式</div><h2>输入之后，<br>留一点时间给输出。</h2><p>合上笔记，试着回忆。<br>你主动想起的，才是真正留下的。</p><button @click="due.length?review(due[0]):newEntry()">{{due.length?'开始今日复习':entries.length?'记录新的学习':'记录第一篇笔记'}} <ArrowRight :size="17"/></button><div class="orbit orbit-a"></div><div class="orbit orbit-b"></div><div class="orbit-center"><Brain :size="48" stroke-width="1.2"/></div><span class="float-label">回忆 · 理解 · 连接</span></section>
    <section class="activity panel"><div class="section-top"><h3>学习的足迹</h3><span>近 28 天</span></div><div class="activity-head"><b>{{days.filter(d=>d.n).length}}<small> 天记录了学习</small></b><span>慢慢来，也是在前进 ↗</span></div><div class="heatmap"><div v-for="d in days" :key="d.day" :class="{filled:d.n}" :title="`${d.day}：${d.n} 篇笔记`"></div></div><div class="heatmap-foot"><span>每一次记录，都算数</span><span>少 <i></i><i class="filled"></i> 多</span></div></section></div>
    <div class="section-top recent-title"><h2>最近的学习 <span class="count">{{entries.length}}</span></h2><button class="text-button" @click="showPage('notes')">全部笔记 <ArrowUpRight :size="16"/></button></div>
    <div v-if="!entries.length" class="empty panel"><Sprout :size="35"/><h3>从今天的一个新发现开始</h3><p>写下所学，标记关键词，拾知会帮你生成复习与知识地图。</p><button class="primary" @click="newEntry">写下第一篇笔记 <Plus :size="16"/></button></div>
    <div class="note-grid"><article v-for="e in entries.slice(0,3)" :key="e.id" class="note-card" @click="open(e)" tabindex="0" @keydown.enter="open(e)"><div class="card-top"><span class="tag">{{e.category}}</span><ArrowUpRight :size="18"/></div><h3>{{e.title}}</h3><p>{{e.content.replace(/[#\[\]*-]/g,'').slice(0,84)}}</p><div class="card-bottom"><span>{{e.day}}</span><span>{{e.concepts.length}} 个知识点 · {{e.review_count}} 次复习</span></div></article></div>
   </template>
   <template v-if="['notes','blog','review'].includes(page)">
    <div class="page-title"><div><div class="eyebrow">{{page==='blog'?'CONNECT THE DOTS':page==='review'?'RECALL, REFLECT, REMEMBER':'A GARDEN OF IDEAS'}}</div><h1>{{page==='notes'?'我的学习笔记':page==='blog'?'让知识，连成一片森林。':'今天，再想起一次。'}}</h1><p>{{page==='blog'?'从每日记录中，长出属于你的知识地图。':page==='review'?'用填空或完整回忆，检验真正留下了多少。':'收藏每天的新发现，给思考一个安放的地方。'}}</p></div><button class="primary" @click="newEntry"><Plus :size="18"/>新建笔记</button></div>
    <div class="filters"><div class="library-caption"><Folder :size="17"/>{{category==='全部'?'全部文件夹':category}}<span class="muted">{{filtered.length}} 篇笔记</span></div><label class="search"><Search :size="17"/><input v-model="search" placeholder="搜索学习内容…"/></label></div>
    <div class="library-layout"><aside class="folder-browser"><div class="section-top"><b>知识文件夹</b><button class="icon-button" aria-label="管理文件夹" @click="manageFolders=true"><Settings2 :size="16"/></button></div><button class="folder-nav" :class="{selected:category==='全部'}" @click="category='全部'"><BookOpen :size="16"/><span>全部笔记</span><small>{{entries.length}}</small></button><button v-for="f in folderTree" :key="f.path" class="folder-nav" :class="{selected:category===f.path}" :style="{paddingLeft:12+f.depth*15+'px'}" @click="category=f.path"><Folder :size="16"/><span>{{f.name}}</span><small>{{f.count}}</small></button><button class="new-folder-button" @click="manageFolders=true"><FolderPlus :size="16"/>新建文件夹</button></aside><div class="note-grid library-notes"><div v-if="!(page==='blog'?published:filtered).length" class="empty panel"><BookOpen :size="34"/><h3>这里还没有笔记</h3><p>{{page==='blog'?'将笔记发布到博客，即可查看知识地图。':'记录所学，开始你的知识积累。'}}</p></div><article v-for="e in page==='blog'?published:filtered" :key="e.id" class="note-card"><div class="card-top"><span class="tag">{{e.category}}</span><span class="muted">{{e.published?'已发布':'草稿'}}</span></div><h3><button class="title-link" @click="open(e)">{{e.title}}</button></h3><p>{{e.content.replace(/[#\[\]*-]/g,'').slice(0,110)}}</p><div class="mini-map" v-if="page==='blog'"><Network :size="18"/><span v-for="branch in e.outline.slice(0,3)">{{branch.title}}</span></div><div class="card-bottom"><span>{{e.day}} · {{e.concepts.length}} 个知识点</span><button class="text-button" @click="page==='review'?review(e):open(e)">{{page==='review'?'开始复习':'阅读笔记'}} <ArrowRight :size="15"/></button></div></article></div></div>
    <section v-if="page==='review'&&reviews.length" class="panel history"><h3>最近复习记录</h3><div v-for="r in reviews.slice(0,10)"><span>{{r.title}} <small>{{r.mode==='cloze'?'填空练习':'完整回忆'}}</small></span><span>{{r.score}}% 关键词覆盖 <small>{{r.created_at}}</small></span></div></section>
   </template>
   <template v-if="page==='article'&&selected">
    <button class="text-button" @click="showPage('notes')"><ChevronLeft :size="17"/>返回笔记</button><div class="article-heading"><span class="tag">{{selected.category}}</span><h1>{{selected.title}}</h1><p>{{selected.day}} · {{selected.concepts.length}} 个知识点 · {{selected.review_count}} 次复习</p><div class="actions"><button class="primary" @click="review(selected)"><Brain :size="17"/>复习这篇笔记</button><button class="secondary" @click="edit(selected)"><Pencil :size="16"/>编辑</button><button class="secondary" @click="exportNote(selected)"><Download :size="16"/>导出 Markdown</button><button class="icon-button" aria-label="删除笔记" @click="remove(selected)"><Trash2 :size="17"/></button></div></div>
    <section class="panel map-panel"><div class="section-top"><h3><Network :size="20"/> 今日知识地图</h3><span>由笔记结构自动生成</span></div><div class="knowledge-map"><div class="root-node"><Sprout :size="22"/>{{selected.title}}</div><div class="branches"><div class="branch" v-for="b in selected.outline"><details open><summary>{{b.title}}</summary><div class="leaf" v-for="c in b.children">{{c}}</div></details></div></div></div></section>
    <section class="panel note-body"><template v-for="(line,i) in selected.content.split('\n')" :key="i"><h2 v-if="line.startsWith('#')">{{line.replace(/^#+\s*/,'')}}</h2><p v-else>{{line.replace(/\[\[([^\]]+)\]\]/g,'「$1」')}}</p></template></section>
   </template>
   <template v-if="page==='practice'&&selected">
    <button class="text-button" @click="showPage('review')"><ChevronLeft :size="17"/>返回复习列表</button><div class="article-heading"><div class="eyebrow">A LITTLE EFFORT, A LASTING MEMORY</div><h1>{{selected.title}}</h1><p>给自己一点安静的时间，让知识重新浮现。</p></div><div class="practice panel"><div class="tabs"><button :class="{chosen:mode==='cloze'}" @click="mode='cloze';result=null">填空练习</button><button :class="{chosen:mode==='recall'}" @click="mode='recall';result=null">完整回忆</button></div><p class="hint">{{mode==='cloze'?'补全笔记中标记的关键词，再查看反馈。':'先不看原文，用自己的话写下你记得的知识。'}}</p><div v-if="mode==='cloze'" class="cloze"><template v-for="(p,i) in pieces"><span v-if="i%2===0">{{p.replace(/^#+ /gm,'')}}</span><input v-else v-model="answers[(i-1)/2]" :aria-label="`第 ${(i+1)/2} 个填空`" :placeholder="`填空 ${(i+1)/2}`" :disabled="!!result"/></template><p v-if="!selected.concepts.length" class="hint">这篇笔记尚未标记关键词，请编辑笔记，使用 [[关键词]] 标记后练习，或切换完整回忆。</p></div><textarea v-else v-model="recall" class="recall" placeholder="不急，先从你记得的第一个概念开始……" :disabled="!!result"></textarea><button v-if="!result" class="primary" @click="submit" :disabled="busy||(mode==='cloze'&&!selected.concepts.length)||(mode==='recall'&&!recall.trim())">{{busy?'正在保存…':'完成回忆，查看反馈'}} <Check :size="17"/></button><div v-if="result" class="feedback"><h2>{{result.hasKeywords?`${result.score}% 关键词覆盖`:'回忆已记录'}}</h2><p>这是关键词匹配反馈，用于自我检查，不代表理解程度评分。</p><p v-if="result.hits.length">已想起：{{result.hits.join('、')}}</p><p v-if="result.missing.length">再巩固：{{result.missing.join('、')}}</p><details><summary>展开原文，对照复盘</summary><pre>{{selected.content.replace(/\[\[([^\]]+)\]\]/g,'$1')}}</pre></details><button class="secondary" @click="review(selected)">再练一次</button></div></div>
   </template>
   <TodoBoard v-if="page==='todos'" :api="api"/>
   <footer>拾知 · 让学习发生，也让成长可见 <span>BUILT FOR YOUR CURIOUS MIND</span></footer>
  </div>
 </main>
 <NoteEditor v-if="editing" ref="noteEditor" :demo="demo" :initial="form" :edit-id="editId" :folders="folders" :busy="busy" @close="editing=false" @save="save" @folders="manageFolders=true"/>
 <FolderManager v-if="manageFolders" :folders="folders" :api="api" @close="manageFolders=false" @changed="foldersChanged"/> <div v-if="toast" class="toast">{{toast}}</div>
</div>
</template>
