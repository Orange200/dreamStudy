<script setup>
import {ref,onMounted} from 'vue';
import App from './App.vue';
import {ArrowRight,BookOpen,LockKeyhole,Sprout} from 'lucide-vue-next';
import './welcome.css';
const route=ref(location.pathname),username=ref(''),password=ref(''),error=ref(''),busy=ref(false),checking=ref(location.pathname==='/app');
function go(path){history.pushState({},'',path);route.value=path;if(path==='/app')check();}
window.addEventListener('popstate',()=>{route.value=location.pathname;if(route.value==='/app')check();});
async function check(){checking.value=true;try{const res=await fetch('/api/session');if(!res.ok){history.replaceState({},'','/login');route.value='/login';}}catch{error.value='连接失败，请稍后重试';}finally{checking.value=false;}}
async function login(){busy.value=true;error.value='';try{const res=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:username.value,password:password.value})});const data=await res.json();if(!res.ok)throw new Error(data.message||'登录失败');password.value='';go('/app');}catch(e){error.value=e.message;}finally{busy.value=false;}}
onMounted(()=>{if(route.value==='/app')check();});
</script>
<template>
 <App v-if="route==='/demo'" :demo="true"/>
 <App v-else-if="route==='/app'&&!checking" />
 <div v-else class="welcome">
  <header class="welcome-head"><a href="/" class="welcome-brand" @click.prevent="go('/')"><img src="/shizhi-logo.svg" alt="" />拾知<span>.</span></a><a v-if="route==='/login'" href="/" @click.prevent="go('/')">返回首页</a><a v-else href="/login" @click.prevent="go('/login')">个人空间 <ArrowRight :size="16"/></a></header>
  <main v-if="route==='/login'" class="welcome-login">
   <div class="login-icon"><LockKeyhole :size="23"/></div><div class="welcome-eyebrow">YOUR PERSONAL SPACE</div><h1>欢迎回到拾知<span>。</span></h1><p>登录你的学习空间，继续记录与成长。</p>
   <form @submit.prevent="login"><label>用户名<input v-model="username" autocomplete="username" required placeholder="输入用户名"/></label><label>密码<input v-model="password" type="password" autocomplete="current-password" required placeholder="输入密码"/></label><p v-if="error" class="login-error" role="alert">{{error}}</p><button class="welcome-primary" :disabled="busy">{{busy?'正在登录…':'登录个人空间'}} <ArrowRight :size="18"/></button></form>
   <button class="welcome-link" @click="go('/demo')">先体验演示空间 <ArrowRight :size="15"/></button>
  </main>
  <main v-else-if="route!=='/app'" class="welcome-main"><div class="welcome-eyebrow"><Sprout :size="16"/> A LITTLE MORE EVERY DAY</div><h1>把学过的，<br>变成自己的<span>。</span></h1><p>记录每一次发现，在回忆中整理思考。<br>让知识慢慢生长，留下属于你的学习足迹。</p><div class="welcome-actions"><button class="welcome-primary" @click="go('/demo')"><BookOpen :size="18"/> 体验演示空间 <ArrowRight :size="18"/></button><button class="welcome-secondary" @click="go('/login')"><LockKeyhole :size="17"/> 登录个人空间</button></div><div class="welcome-note">演示空间可自由尝试，刷新或离开后内容会重置。</div><div class="welcome-art"><div class="art-ring"></div><div class="art-paper"><span>拾知 · 学习札记</span><strong>每一次回忆，<br>都是新的连接。</strong><i></i><i></i><i></i><div>✦ &nbsp; RECORD &nbsp; · &nbsp; RECALL &nbsp; · &nbsp; GROW</div></div><div class="art-leaf"><Sprout :size="38"/></div></div></main>
  <main v-else class="welcome-login"><p>正在进入个人空间…</p></main>
  <footer class="welcome-footer">拾知 · 让学习发生，也让成长可见 <span>MADE FOR CURIOUS MINDS</span></footer>
 </div>
</template>
