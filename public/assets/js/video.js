// video.js v6 — 2-col flex, 4 round actions, 2x2 mode buttons, timeline notes
;(function(){
'use strict';

var ytPlayer=null,playerReady=false,videoId='',lessonId='',subtitles=[];
var currentSubIdx=-1,isPlaying=false,videoDuration=0,currentTime=0;
var currentMode='listen',ccMode='bilingual',eyeHidden=false,starFilter=false;
var loopSegment=null,dictTargetIdx=-1,dictInputEl=null,shLoop=false;
var timePoller=null,subListEl=null,notes=[],localMap=null;
var dictChecked=false,dictDone={},inited=false;
// Ký tự bỏ qua khi chấm (khoảng trắng, zero-width, dấu câu)
var PUNCT=/[\s​　﻿.。,，!！?？~～]+/g;
var MODE_LABELS={listen:'Luyện nghe',speak:'Luyện nói',dictation:'Chính tả',notes:'Ghi chú',sublist:'Phụ đề'};
var EYE_ON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
var EYE_OFF='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
function setEyeIcon(){var b=document.getElementById('btn-eye-toggle');if(!b)return;b.classList.toggle('active',eyeHidden);b.innerHTML=eyeHidden?EYE_OFF:EYE_ON;b.title=eyeHidden?'Hiện nội dung':'Ẩn nội dung';}

window._currentSubIdx=-1;

window.initVideoLesson=function(){
 var L=window._videoLesson;
 if(!L||!L.videoId||!L.subtitles){console.warn('[video] No data');return;}
 subtitles=L.subtitles.sort(function(a,b){return a.start-b.start;});
 var th=document.getElementById('video-title');if(th)th.textContent=L.title||'Bài học video';
 var tm=document.getElementById('video-title-meta');if(tm)tm.textContent=subtitles.length+' câu thoại';
 // Gọi lần 2 (VD: dữ liệu local rồi tới Firestore) → chỉ cập nhật dữ liệu, không gắn listener/khởi tạo player lại
 if(inited){renderSubtitles();if(L.videoId!==videoId&&ytPlayer&&playerReady){videoId=L.videoId;ytPlayer.cueVideoById(videoId);}return;}
 inited=true;
 videoId=L.videoId;
 lessonId=L.id||(new URLSearchParams(window.location.search)).get('id')||videoId;
 subListEl=document.getElementById('subtitle-list');
 loadDictDone();setEyeIcon();
 loadNotes();renderSubtitles();renderNotes();renderTimelineDots();
 bindCtrls();bindCC();bindEye();bindStar();bindModeBtns();bindActionBtns();bindNotesUI();bindKeys();bindDictationUI();
 bindGear();loadSubSettings();
 injectYT();window.learningActive=true;
 setMode('listen'); // apply initial mode state
};

document.addEventListener('DOMContentLoaded',function(){if(window._videoLesson&&window._videoLesson.videoId&&!inited)window.initVideoLesson();});
if(window._videoLesson&&window._videoLesson.videoId&&!inited)window.initVideoLesson();

// ── Render ──
function renderSubtitles(){
 if(!subListEl)return;
 if(!subtitles.length){subListEl.innerHTML='<div class="sub-empty">Bài học chưa có phụ đề</div>';updFooter();return;}
 var sv=loadSaved(),h='';
 subtitles.forEach(function(s,i){
  var is=sv.has(i),dd=dictDone[i],w1=Math.min(100,30+s.ko.length*3);
  h+='<div class="sub-item'+(is?' saved':'')+(dd!==undefined?' revealed':'')+(i===currentSubIdx?' active':'')+'" data-idx="'+i+'" onclick="window._seekSub('+i+')">'
   +'<span class="sub-idx">'+(i+1)+'</span><span class="sub-time">'+fmt(s.start)+'</span>'
   +'<div class="sub-text-wrap"><div class="sub-ko">'+esc(s.ko)+'</div>'+(s.vi?'<div class="sub-vi">'+esc(s.vi)+'</div>':'')+'</div>'
   +'<div class="sub-mask" aria-hidden="true"><i style="width:'+w1+'%"></i><i style="width:'+Math.round(w1*.6)+'%"></i></div>'
   +scoreBadge(dd)
   +'<button class="sub-star'+(is?' active':'')+'" data-idx="'+i+'" title="'+(is?'Bỏ lưu':'Lưu câu này')+'" onclick="event.stopPropagation();window._toggleSave('+i+')">'+(is?'★':'☆')+'</button></div>';
 });
 subListEl.innerHTML=h;updFooter();applyFilters();
}
function scoreBadge(p){return p===undefined?'':'<span class="sub-score '+lvl(p)+'" title="Điểm chính tả tốt nhất">'+p+'%</span>';}
function lvl(p){return p>=100?'lv-perfect':p>=80?'lv-good':p>=50?'lv-mid':'lv-low';}

// ── Điểm chính tả theo câu (lưu trên máy) ──
function dictKey(){return'video_dict_'+(lessonId||'unknown');}
function loadDictDone(){try{var r=localStorage.getItem(dictKey());dictDone=r?JSON.parse(r):{};}catch(e){dictDone={};}}
function saveDictScore(i,p){
 var prev=dictDone[i];dictDone[i]=prev===undefined?p:Math.max(prev,p);
 try{localStorage.setItem(dictKey(),JSON.stringify(dictDone));}catch(e){}
 var el=subListEl&&subListEl.querySelector('.sub-item[data-idx="'+i+'"]');
 if(el){el.classList.add('revealed');var b=el.querySelector('.sub-score');if(b)b.remove();el.insertAdjacentHTML('beforeend',scoreBadge(dictDone[i]));}
}
function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function fmt(sec){if(isNaN(sec)||sec<0)return'0:00';var m=Math.floor(sec/60),s=Math.floor(sec%60);return m+':'+(s<10?'0':'')+s;}

// ── Highlight ──
window._lastPausedSentence = -1;

window._seekSub=function(idx){
  if(!ytPlayer||!playerReady||idx<0||idx>=subtitles.length)return;
  if(shLoop) loopSegment = {start: idx, end: idx};
  window._lastAutoPausedIdx=idx-1;
  window._lastPausedSentence = -1;
  // Cập nhật UI ngay lập tức
  if(currentMode==='dictation'){eyeHidden=true;setEyeIcon();applyFilters();}
  currentSubIdx=idx;
  window._currentSubIdx=idx;
  currentTime=subtitles[idx].start;
  updateSubUI(idx);
  ytPlayer.seekTo(subtitles[idx].start,true);
  if(currentMode==='dictation'||currentMode==='speak'){
    if(!isPlaying)ytPlayer.playVideo();
  } else {
    if(!isPlaying)ytPlayer.playVideo();
  };
};

// Cập nhật UI subtitle (scroll, text) không reset currentSubIdx
function updateSubUI(idx){
  if(!subListEl)return;
  subListEl.querySelectorAll('.sub-item').forEach(function(e){e.classList.remove('active');});
  var act=subListEl.querySelector('.sub-item[data-idx="'+idx+'"]');
  if(act){act.classList.add('active');var lt=subListEl.scrollTop,lh=subListEl.clientHeight,et=act.offsetTop,eh=act.offsetHeight;if(et<lt||et+eh>lt+lh)subListEl.scrollTo({top:et-lh/3,behavior:'smooth'});}
  if(idx<0||idx>=subtitles.length)return;
  var s=subtitles[idx];
  var ck=document.getElementById('cur-sub-ko'),cv=document.getElementById('cur-sub-vi'),nk=document.getElementById('cur-sub-next-ko'),nv=document.getElementById('cur-sub-next-vi'),sk=document.getElementById('shadow-ko'),sv=document.getElementById('shadow-vi-hint');
  if(ck&&currentMode!=='dictation')ck.textContent=s.ko; // chế độ chính tả: prepareDict() dựng ô nhập
  var pos=document.getElementById('cur-sub-pos');if(pos)pos.textContent='Câu '+(idx+1)+' / '+subtitles.length;
  if(cv)cv.textContent=s.vi||'';
  var next=idx+1;
  if(next<subtitles.length){if(nk)nk.textContent=subtitles[next].ko;if(nv)nv.textContent=subtitles[next].vi||'';}
  else{if(nk)nk.textContent='';if(nv)nv.textContent='';}
  if(sk)sk.textContent=s.ko;if(sv)sv.textContent=s.vi||'';
  saveProgress(idx);
  updateCtx(idx);
}

// ── Tiến độ xem (đọc bởi video/home.html: thanh tiến độ & "Tiếp tục học") ──
function progressKey(){return'video_progress_'+(lessonId||'unknown');}
function readProgress(){try{return JSON.parse(localStorage.getItem(progressKey())||'null');}catch(e){return null;}}
function saveProgress(idx){
  if(idx<0||!lessonId)return;
  try{
    var p=readProgress()||{};
    p.idx=idx;p.maxIdx=Math.max(p.maxIdx==null?-1:p.maxIdx,idx);p.total=subtitles.length;p.ts=Date.now();
    localStorage.setItem(progressKey(),JSON.stringify(p));
    localStorage.setItem('video_last',lessonId);
  }catch(e){}
  var rp=document.getElementById('resume-pill');if(rp)rp.hidden=true;
}
// Lần trước đang học dở → hiện nút "Tiếp tục từ câu X" (không tự tua để tránh video tự phát)
function offerResume(){
  var p=readProgress(),rp=document.getElementById('resume-pill');
  if(!rp||!p||!(p.idx>0)||p.idx>=subtitles.length||currentSubIdx>=0)return;
  rp.textContent='↻ Tiếp tục từ câu '+(p.idx+1);rp.hidden=false;
  rp.onclick=function(){rp.hidden=true;window._seekSub(p.idx);};
}

// Dictionary handled globally by hover-lookup.js

// ── Save/bookmark ──
function getSaveKey(){return'video_saved_'+(lessonId||'unknown');}
function loadSaved(){try{var r=localStorage.getItem(getSaveKey());return new Set(r?JSON.parse(r):[]);}catch(e){return new Set();}}
function saveStore(s){try{localStorage.setItem(getSaveKey(),JSON.stringify(Array.from(s)));}catch(e){}}
window._toggleSave=function(idx){var s=loadSaved();s.has(idx)?s.delete(idx):s.add(idx);saveStore(s);var items=subListEl.querySelectorAll('.sub-item');items.forEach(function(el){var i=parseInt(el.getAttribute('data-idx')),st=el.querySelector('.sub-star');if(!st)return;if(s.has(i)){st.textContent='★';st.classList.add('active');st.title='Bỏ lưu';el.classList.add('saved');}else{st.textContent='☆';st.classList.remove('active');st.title='Lưu câu này';el.classList.remove('saved');}});applyFilters();updFooter();};

// ── Filters ──
function filterSubs(q){var items=subListEl.querySelectorAll('.sub-item');if(!q){items.forEach(function(e){e.classList.remove('filtered-out');});}else{var lq=q.toLowerCase();items.forEach(function(e,i){var s=subtitles[i],m=(s.ko.toLowerCase().indexOf(lq)!==-1)||(s.vi&&s.vi.toLowerCase().indexOf(lq)!==-1);m?e.classList.remove('filtered-out'):e.classList.add('filtered-out');});}applyFilters();}
function applyFilters(){if(!subListEl)return;eyeHidden?subListEl.classList.add('eye-hidden'):subListEl.classList.remove('eye-hidden');if(starFilter){var s=loadSaved();subListEl.querySelectorAll('.sub-item').forEach(function(e){var i=parseInt(e.getAttribute('data-idx'));s.has(i)?e.classList.remove('filtered-out'):e.classList.add('filtered-out');});}else{var q=document.getElementById('sub-search');if(!q||!q.value.trim())subListEl.querySelectorAll('.sub-item').forEach(function(e){e.classList.remove('filtered-out');});}updFooter();}
function updFooter(){var c=document.getElementById('sub-foot-count'),f=document.getElementById('sub-foot-filter');if(c)c.textContent=subtitles.length+' câu';if(f)f.style.display=starFilter?'':'none';}

// ── Korean unfold ──
function isKorean(ch){var c=ch.charCodeAt(0);return(c>=0xAC00&&c<=0xD7AF)||(c>=0x1100&&c<=0x11FF)||(c>=0x3130&&c<=0x318F);}
function simpleUnfold(word){var set=[word],ns=word.replace(/\s+/g,'');if(ns!==word)set.push(ns);var P='에서부터,으로부터,에게서는,한테서는,에게서,한테서,으로서,으로써,에서는,부터는,까지는,에게는,한테는,으로는,께서는,에서,에게,한테,으로,부터,까지,처럼,같이,만큼,밖에,조차,마저,대로,보다,께서,더러,보고,라고,이라는,이야,는,은,가,이,를,을,에,의,와,과,도,만,나,랑,야,들,께,요,이나,든지,라도,나마'.split(',');for(var i=0;i<P.length;i++){var p=P[i];if(word.endsWith(p)&&word.length>p.length)set.push(word.slice(0,-p.length));}var V='습니다,ㅂ니다,습니까,ㅂ니까,았습니다,었습니다,였습니다,았어요,었어요,였어요,았다,었다,였다,겠습니다,겠어요,겠다,지만,으면서,면서,으며,며,으니까,니까,으므로,므로,느라고,더니,다가,자마자,으려고,려고,으러,러,도록,으면,면,거든,아요,어요,여요,해요,네요,데요,군요,잖아요,지요,죠,더라고요,더군요,는가,은가,ㄴ가,니,냐,나요,네,데,군,지,고,구나,잖아,자,다,아,어,여,해,는,은,ㄴ,을,ㄹ,던,았,었,였,시,셔,실,신,셨,음,ㅁ,기,게,기도,기에는,기에,기를,기가,기로,기까지,기보다,기만,기위해,기위해서,기때문에'.split(',');var a1=set.slice();for(var si=0;si<a1.length;si++){var w=a1[si];for(var j=0;j<V.length;j++){var v=V[j];if(w.endsWith(v)&&w.length>v.length){var stem=w.slice(0,-v.length);set.push(stem+'다');set.push(stem);}}}var I={'했':'하','해':'하','줘':'주','봐':'보','놔':'놓','둬':'두','됐':'되','켰':'키','갔':'가','왔':'오','줬':'주','샀':'사','섰':'서','컸':'크','났':'나','썼':'쓰','렸':'리','겼':'기','혔':'히','폈':'피','졌':'지','쳤':'치','볐':'비','셨':'시','들었':'듣','물었':'묻','걸었':'걷','들어':'듣','물어':'묻','걸어':'걷','불렀':'부르','몰랐':'모르','흘렀':'흐르','올랐':'오르','빨랐':'빠르','길렀':'기르','불러':'부르','몰라':'모르','더워':'덥','추워':'춥','매워':'맵','쉬워':'쉽','고마워':'고맙','어려워':'어렵','무서워':'무섭','더웠':'덥','추웠':'춥','매웠':'맵','쉬웠':'쉽','고마웠':'고맙','어려웠':'어렵','누웠':'눕','누워':'눕','예뻐':'예쁘','아파':'아프','바빠':'바쁘','랐':'라','놀랐':'놀라','건넜':'건너','일어났':'일어나'};var a2=set.slice();for(var m=0;m<a2.length;m++){var c=a2[m];for(var k in I){var idx=c.indexOf(k);if(idx!==-1){var pre=c.substring(0,idx);set.push(pre+I[k]+'다');set.push(pre+I[k]);}}}return set;}

// ── YouTube ──
function injectYT(){if(window.YT&&window.YT.Player){initPlayer();return;}var t=document.createElement('script');t.src='https://www.youtube.com/iframe_api';document.getElementsByTagName('script')[0].parentNode.insertBefore(t,document.getElementsByTagName('script')[0]);window.onYouTubeIframeAPIReady=function(){initPlayer();if(typeof window.onYouTubeIframeAPIReady_old==='function')window.onYouTubeIframeAPIReady_old();};}
function initPlayer(){var e=document.getElementById('youtube-player');if(!e||!videoId)return;e.innerHTML='';ytPlayer=new YT.Player('youtube-player',{height:'100%',width:'100%',videoId:videoId,playerVars:{autoplay:0,controls:0,playsinline:1,rel:0,modestbranding:1,fs:0},events:{onReady:onReady,onStateChange:onState}});}
function onReady(){playerReady=true;videoDuration=ytPlayer.getDuration()||0;document.getElementById('vb-time-total').textContent=fmt(videoDuration);updateProgress();renderTimelineDots();offerResume();}

function highlight(time, force){
  var f=-1;
  for(var i=subtitles.length-1;i>=0;i--){if(time>=subtitles[i].start-.3){f=i;break;}}
  if(!force&&(currentMode==='speak'||currentMode==='dictation')&&typeof window._lastAutoPausedIdx!=='undefined'){
    var maxIdx=window._lastAutoPausedIdx+1;
    if(f>maxIdx)f=maxIdx;
  }
  if(f===currentSubIdx)return;
  var prev=currentSubIdx;currentSubIdx=f;window._currentSubIdx=f;
  if(!subListEl)return;
  updateSubUI(f);
  if(f!==prev&&prev>=0){
      var curSub=document.getElementById('video-current-sub');
      if(curSub){curSub.classList.add('cur-sub-slide');setTimeout(function(){curSub.classList.remove('cur-sub-slide');},360);}
      if(currentMode==='dictation') prepareDict(f);
      if(currentMode==='speak') prepareSh(f);
  }
  if(force && (currentMode==='dictation'||currentMode==='speak')) {
    if(ytPlayer&&!isPlaying)ytPlayer.playVideo();
  }
}
function onState(e){
  isPlaying=(e.data===YT.PlayerState.PLAYING);
  updatePlayBtn();
  isPlaying?startPoller():stopPoller();
  if(e.data===YT.PlayerState.PLAYING){
    var sp=document.getElementById('vb-speed');if(sp)ytPlayer.setPlaybackRate(parseFloat(sp.value));
  }
  if(e.data===YT.PlayerState.ENDED&&shLoop&&loopSegment){ytPlayer.seekTo(subtitles[loopSegment.start].start,true);ytPlayer.playVideo();}
}
function startPoller(){if(timePoller)return;timePoller=setInterval(function(){
  if(!ytPlayer||!playerReady)return;
  currentTime=ytPlayer.getCurrentTime()||0;
  updateProgress();
  // Đang phát video = đang học (iframe YouTube không bắn sự kiện chuột ra trang)
  if(typeof window.markLearningActivity==='function')window.markLearningActivity();

  if (!shLoop && (currentMode==='speak' || currentMode==='dictation')) {
      if (typeof window._lastAutoPausedIdx==='undefined') window._lastAutoPausedIdx=-1;
      var nextToPause=window._lastAutoPausedIdx+1;
      if(nextToPause<subtitles.length){
          var s=subtitles[nextToPause];
          var nextStart=(nextToPause<subtitles.length-1)?subtitles[nextToPause+1].start:videoDuration;
          var endT=(s.end&&s.end>s.start)?s.end:nextStart;
          var effectiveEnd=Math.min(endT,nextStart-0.05);
          if(currentTime>=effectiveEnd){
              ytPlayer.pauseVideo();
              window._lastAutoPausedIdx=nextToPause;
              window._lastPausedSentence=nextToPause;
              currentSubIdx=nextToPause;
              window._currentSubIdx=nextToPause;
              updateSubUI(nextToPause);
              if(currentMode==='speak')autoStartShadowMic();
              return;
          }
      }
  }

  highlight(currentTime);

  // Loop logic (shadowing)
  if(shLoop&&loopSegment){
    var li=loopSegment.end;
    if(li>=0&&li<subtitles.length){
      var sl=subtitles[li];
      var nlStart=(li<subtitles.length-1)?subtitles[li+1].start:videoDuration;
      var endTl=(sl.end&&sl.end>sl.start)?sl.end:nlStart;
      if(currentTime>=Math.min(endTl,nlStart-0.05)){
        ytPlayer.seekTo(Math.max(0,subtitles[loopSegment.start].start),true);
      }
    }
  }
},150);}
function stopPoller(){if(timePoller){clearInterval(timePoller);timePoller=null;}}
function updateProgress(){document.getElementById('vb-time-current').textContent=fmt(currentTime);var b=document.getElementById('vb-progress');if(b&&videoDuration>0){b.value=Math.floor((currentTime/videoDuration)*1000);b.style.setProperty('--pct',(currentTime/videoDuration*100).toFixed(2)+'%');}}
function updatePlayBtn(){var p=document.getElementById('icon-vplay'),a=document.getElementById('icon-vpause');if(p&&a){p.style.display=isPlaying?'none':'';a.style.display=isPlaying?'':'none';}}
// Sau khi tua tự do: đặt lại mốc tự dừng (Chính tả/Luyện nói) theo câu tại thời điểm t
function subIdxAt(t){for(var i=subtitles.length-1;i>=0;i--){if(t>=subtitles[i].start-.3)return i;}return -1;}
function resetAutoPause(t){window._lastAutoPausedIdx=subIdxAt(t)-1;window._lastPausedSentence=-1;}

// ── Controls ──
function bindCtrls(){
 document.getElementById('vb-play-pause').addEventListener('click',togglePlay);
 document.getElementById('vb-stop').addEventListener('click',stopVideo);
 document.getElementById('vb-back5').addEventListener('click',function(){seekBy(-5);});
 document.getElementById('vb-fwd5').addEventListener('click',function(){seekBy(5);});
 document.getElementById('vb-progress').addEventListener('input',function(){if(!ytPlayer||!playerReady||!videoDuration)return;var t=(parseFloat(this.value)/1000)*videoDuration;window._lastSeekTime=Date.now();resetAutoPause(t);ytPlayer.seekTo(t,true);currentTime=t;updateProgress();highlight(t,true);});
 document.getElementById('vb-speed').addEventListener('change',function(){if(ytPlayer&&playerReady)ytPlayer.setPlaybackRate(parseFloat(this.value));});
 var se=document.getElementById('sub-search');if(se)se.addEventListener('input',function(){filterSubs(this.value.trim());});
  var dcb=document.getElementById('dict-check-btn');if(dcb)dcb.addEventListener('click',checkDict);

  var drb=document.getElementById('vact-dict-replay');if(drb)drb.addEventListener('click',replayDict);
  var dnb=document.getElementById('vact-dict-next');if(dnb)dnb.addEventListener('click',function(){if(dictTargetIdx>=0&&dictTargetIdx<subtitles.length-1)window._seekSub(dictTargetIdx+1);});
  var wrap=document.querySelector('.video-player-wrap');if(wrap)wrap.addEventListener('click',togglePlay);
}

// ── CC ──
function bindCC(){var btn=document.getElementById('cc-toggle-btn'),dd=document.getElementById('cc-dropdown');if(!btn||!dd)return;btn.addEventListener('click',function(e){e.stopPropagation();dd.classList.toggle('open');});dd.querySelectorAll('.cc-option').forEach(function(o){o.addEventListener('click',function(e){e.stopPropagation();setCC(o.getAttribute('data-cc'));dd.classList.remove('open');});});document.addEventListener('click',function(){dd.classList.remove('open');});setCC('bilingual');}
function setCC(m){ccMode=m;var cs=document.getElementById('video-current-sub');if(cs){cs.classList.remove('cc-off','cc-kr','cc-vn');if(m==='off')cs.classList.add('cc-off');else if(m==='kr')cs.classList.add('cc-kr');else if(m==='vn')cs.classList.add('cc-vn');}var dd=document.getElementById('cc-dropdown');if(dd)dd.querySelectorAll('.cc-option').forEach(function(o){o.classList.toggle('active',o.getAttribute('data-cc')===m);});var btn=document.getElementById('cc-toggle-btn');if(btn)btn.classList.toggle('active',m!=='bilingual');}

// ── Eye / Star ──
function bindEye(){var b=document.getElementById('btn-eye-toggle');if(!b)return;b.addEventListener('click',function(){eyeHidden=!eyeHidden;setEyeIcon();applyFilters();});}
function bindStar(){var b=document.getElementById('btn-star-filter');if(!b)return;b.addEventListener('click',function(){starFilter=!starFilter;b.classList.toggle('active',starFilter);applyFilters();});}

// ── 2x2 Mode Buttons (right column) ──
function bindModeBtns(){
 document.querySelectorAll('.mbtn-card').forEach(function(b){b.addEventListener('click',function(){setMode(b.getAttribute('data-mode'));});});
 document.querySelectorAll('.mobile-tab-btn').forEach(function(b){b.addEventListener('click',function(){setMode(b.getAttribute('data-mode'));});});
}
function setMode(mode){
 var oldMode=currentMode;currentMode=mode;
 shLoop=false;var lb=document.getElementById('vact-loop');if(lb)lb.classList.remove('active');
 if(sr&&sr._running&&mode!=='speak')sr.stop();
 // data-mode trên .video-grid điều khiển toàn bộ giao diện theo chế độ (xem video.css)
 var grid=document.querySelector('.video-grid');
 if(grid){grid.setAttribute('data-mode',mode);grid.classList.toggle('vmode-listen-mode',mode==='listen');grid.classList.toggle('show-sublist',mode==='sublist');}
 var ml=document.getElementById('cur-sub-mode');if(ml)ml.textContent=MODE_LABELS[mode]||'';
 document.querySelectorAll('.mbtn-card').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-mode')===mode);});
 document.querySelectorAll('.mobile-tab-btn').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-mode')===mode);});
 document.querySelectorAll('.vmode-pane').forEach(function(p){p.classList.remove('active');});
 var pane=document.getElementById('mode-'+mode);if(pane)pane.classList.add('active');
 var cs=document.getElementById('video-current-sub');if(cs){cs.classList.toggle('dict-mode-active',mode==='dictation');cs.classList.toggle('speak-mode-active',mode==='speak');}
 var cvw=document.querySelector('.video-player-wrap');if(cvw)cvw.classList.toggle('dict-mode-active',mode==='dictation');
 // Chính tả: tự ẩn nội dung danh sách phụ đề (khôi phục trạng thái cũ khi thoát)
 if(mode==='dictation'&&oldMode!=='dictation'){window._preDictEyeHidden=eyeHidden;eyeHidden=true;setEyeIcon();applyFilters();}
 else if(mode!=='dictation'&&oldMode==='dictation'){eyeHidden=(typeof window._preDictEyeHidden!=='undefined')?window._preDictEyeHidden:false;setEyeIcon();applyFilters();}
 if((mode==='dictation'||mode==='speak')&&ytPlayer&&playerReady&&currentSubIdx>=0){window._lastAutoPausedIdx=currentSubIdx-1;window._lastPausedSentence=-1;}
 if(mode!=='dictation'){
  var ck=document.getElementById('cur-sub-ko');if(ck&&currentSubIdx>=0)ck.textContent=subtitles[currentSubIdx].ko;
  var dr=document.getElementById('dict-result');if(dr)dr.innerHTML='';
  dictChecked=false;
 }
 if(mode!=='speak'){var rs=document.getElementById('speak-result-in-sub');if(rs)rs.innerHTML='';}
 if(mode==='dictation'&&currentSubIdx>=0)prepareDict(currentSubIdx,true);
 if(mode==='speak'&&currentSubIdx>=0)prepareSh(currentSubIdx);
 if(mode==='notes'){renderNotes();renderTimelineDots();}
 if(mode==='listen'&&currentSubIdx>=0&&ytPlayer&&playerReady&&oldMode!=='sublist'&&oldMode!=='listen'){var t=subtitles[currentSubIdx].start;window._lastSeekTime=Date.now();ytPlayer.seekTo(t,true);currentTime=t;highlight(t);ytPlayer.playVideo();}
}
window.setMode=setMode;
function updateCtx(idx){if(idx<0)return;if(currentMode==='dictation')prepareDict(idx);if(currentMode==='speak')prepareSh(idx);}

// ── 4 Round Action Buttons (left column bottom) ──
function bindActionBtns(){
 document.getElementById('vact-prev').addEventListener('click',function(){if(currentSubIdx>0)window._seekSub(currentSubIdx-1);});
 document.getElementById('vact-next').addEventListener('click',function(){if(currentSubIdx>=0&&currentSubIdx<subtitles.length-1)window._seekSub(currentSubIdx+1);});
 document.getElementById('vact-mic').addEventListener('click',function(){
  if(currentMode==='speak'){if(typeof toggleShadowMic==='function')toggleShadowMic();}
  else{Swal.fire({icon:'info',title:'🎤 Ghi âm',text:'Chuyển sang chế độ Luyện nói để dùng microphone.',confirmButtonText:'OK'});}
 });
 document.getElementById('vact-loop').addEventListener('click',function(){
  shLoop=!shLoop;
  var b=document.getElementById('vact-loop');
  if(b)b.classList.toggle('active',shLoop);
  if(shLoop){
    loopSegment={start:currentSubIdx,end:currentSubIdx};
    if(ytPlayer&&playerReady&&currentSubIdx>=0){
      var t=subtitles[currentSubIdx].start;
      window._lastSeekTime=Date.now();
      ytPlayer.seekTo(t,true);currentTime=t;
      highlight(t,true);
      ytPlayer.playVideo();
    }
  }
 });
}

// ── Dictation ──
// force=false: nếu đang làm dở đúng câu này thì giữ nguyên chữ đã gõ
// (VD: video tự dừng cuối câu gọi lại updateSubUI → trước đây bị xoá trắng)
function prepareDict(idx,force){
 if(idx<0||idx>=subtitles.length)return;
 var ck=document.getElementById('cur-sub-ko');
 if(!force&&idx===dictTargetIdx&&!dictChecked&&ck&&ck.querySelector('.dict-blank-input'))return;
 dictTargetIdx=idx;dictChecked=false;
 var s=subtitles[idx];
 var hw=document.getElementById('dict-vi-hint-wrapper');if(hw)hw.classList.remove('revealed','is-hidden');
 var hb=document.getElementById('dict-hint-btn');if(hb)hb.textContent='💡 Xem nghĩa tiếng Việt';
 var vh=document.getElementById('dict-vi-hint');if(vh)vh.textContent=s.vi||'(Câu này chưa có nghĩa tiếng Việt)';
 var cb=document.getElementById('dict-check-btn');if(cb)cb.style.display='';
 var nb=document.getElementById('vact-dict-next');if(nb)nb.classList.remove('dict-next-ready');
 var dr=document.getElementById('dict-result');if(dr)dr.innerHTML='';
 if(ck){
  var h='';
  s.ko.split(' ').forEach(function(w){
   if(!w)return;
   var n=w.replace(PUNCT,'').length;
   h+='<span contenteditable="true" spellcheck="false" autocapitalize="off" class="dict-blank-input" data-word="'+esc(w)+'" style="min-width:'+Math.max(1.6,n*1.1).toFixed(2)+'em"></span> ';
  });
  ck.innerHTML=h;
  setTimeout(function(){var f=ck.querySelector('.dict-blank-input');if(f&&currentMode==='dictation')f.focus();},50);
 }
}
function bindDictationUI(){
 var ck=document.getElementById('cur-sub-ko');
 if(ck){
  ck.addEventListener('keydown',function(e){
   if(currentMode!=='dictation'||!e.target.classList.contains('dict-blank-input'))return;
   if(e.key==='Enter'){e.preventDefault();checkDict();}
   else if(e.key==='Backspace'&&!e.target.textContent){
    e.preventDefault();
    var all=Array.from(ck.querySelectorAll('.dict-blank-input')),i=all.indexOf(e.target);
    if(i>0)focusEnd(all[i-1]);
   }
  });
  ck.addEventListener('input',function(e){
   if(currentMode!=='dictation'||!e.target.classList.contains('dict-blank-input'))return;
   var txt=e.target.textContent;
   if(/[\s　]/.test(txt)){
    e.target.textContent=txt.replace(/[\s　]+/g,'');
    var all=Array.from(ck.querySelectorAll('.dict-blank-input')),i=all.indexOf(e.target);
    if(i>=0&&i<all.length-1)focusEnd(all[i+1]);else focusEnd(e.target);
   }
  });
 }
 var hb=document.getElementById('dict-hint-btn');
 if(hb)hb.addEventListener('click',function(e){
  e.stopPropagation();
  var w=document.getElementById('dict-vi-hint-wrapper');if(!w)return;
  w.classList.toggle('revealed');
  hb.textContent=w.classList.contains('revealed')?'Ẩn gợi ý':'💡 Xem nghĩa tiếng Việt';
 });
}
function focusEnd(el){
 el.focus();
 var r=document.createRange(),s=window.getSelection();
 if(el.childNodes.length>0)r.setStartAfter(el.lastChild);else r.selectNodeContents(el);
 r.collapse(true);s.removeAllRanges();s.addRange(r);
}

function checkDict(){
 if(dictTargetIdx<0||dictChecked)return;
 var ck=document.getElementById('cur-sub-ko'),re=document.getElementById('dict-result');
 if(!ck)return;
 var inputs=Array.from(ck.querySelectorAll('.dict-blank-input'));
 if(!inputs.length)return;
 var correct=0,total=0,allC=true;
 inputs.forEach(function(span){
  var w=span.getAttribute('data-word')||'',u=span.textContent||'';
  var wN=w.replace(PUNCT,''),uN=u.replace(PUNCT,''),html='',ok;
  if(!uN){
   html='<span class="dc-miss">'+(Array(wN.length+1).join('_')||'_')+'</span>';
   ok=!wN.length;total+=wN.length;
  }else{
   // So khớp theo LCS: thiếu/thừa 1 ký tự không làm đỏ cả phần phía sau
   var ops=lcsOps(wN.split(''),uN.split('')),m=0;
   ops.forEach(function(o){
    if(o.type==='match'){html+='<span class="dc-ok">'+esc(uN[o.rIdx])+'</span>';m++;}
    else if(o.type==='extra'){html+='<span class="dc-bad">'+esc(uN[o.rIdx])+'</span>';}
    else{html+='<span class="dc-miss">_</span>';}
   });
   correct+=m;total+=Math.max(wN.length,uN.length);
   ok=(m===wN.length&&m===uN.length);
  }
  if(!ok)allC=false;
  var out=document.createElement('span');
  out.className='dict-word '+(ok?'ok':'bad');
  out.setAttribute('data-input',u);
  out.innerHTML=html;
  span.parentNode.replaceChild(out,span);
 });
 dictChecked=true;
 var pct=allC?100:(total>0?Math.round(correct/total*100):0);
 var cb=document.getElementById('dict-check-btn');if(cb)cb.style.display='none';
 var hw=document.getElementById('dict-vi-hint-wrapper');if(hw)hw.classList.add('is-hidden');
 var s=subtitles[dictTargetIdx];
 // Kết quả gọn 2 dòng, nằm đúng chỗ của nút gợi ý → khung không phình ra
 if(re)re.innerHTML=miniResult(pct,
  '<span class="v-mini-label">Đáp án</span>'+esc(s.ko),
  '<b>'+resultTitle(pct)+'</b> · '+correct+'/'+total+' ký tự'+(s.vi?' · '+esc(s.vi):''));
 var nb=document.getElementById('vact-dict-next');if(nb)nb.classList.add('dict-next-ready');
 saveDictScore(dictTargetIdx,pct);
 revealResult(re);
 if(allC&&typeof confetti==='function'){
  var r=ck.getBoundingClientRect(),xl=r.left/window.innerWidth,xr=r.right/window.innerWidth,yb=r.bottom/window.innerHeight;
  confetti({particleCount:60,angle:60,spread:55,origin:{x:xl,y:yb},zIndex:9999});
  confetti({particleCount:60,angle:120,spread:55,origin:{x:xr,y:yb},zIndex:9999});
 }
}

// Khung câu cuộn bên trong → tự cuộn tới thẻ kết quả (chỉ cuộn khung, không cuộn trang)
function revealResult(el){
 if(!el)return;
 setTimeout(function(){
  var box=el.closest('.video-grid-cursub');if(!box)return;
  var r=el.getBoundingClientRect(),b=box.getBoundingClientRect();
  if(r.bottom>b.bottom)box.scrollBy({top:r.bottom-b.bottom+12,behavior:'smooth'});
 },60);
}

// Thẻ kết quả dùng chung cho Chính tả & Luyện nói
function resultTitle(p){return p>=100?'Hoàn hảo! 🎉':p>=80?'Rất tốt!':p>=50?'Gần đúng rồi':'Cố lên nhé!';}
function miniResult(p,main,sub){
 return '<div class="v-mini '+lvl(p)+'"><div class="v-ring" style="--p:'+p+'"><span>'+p+'%</span></div>'
  +'<div class="v-mini-body"><div class="v-mini-main">'+main+'</div><div class="v-mini-sub">'+sub+'</div></div></div>';
}

// LCS giữa mảng ký tự đích tA và mảng ký tự người dùng rA.
// Trả về dãy thao tác theo thứ tự: {type:'match',rIdx} | {type:'extra',rIdx} | {type:'missing'}
function lcsOps(tA,rA){
 var m=tA.length,n=rA.length,dp=Array(m+1);
 for(var r=0;r<=m;r++)dp[r]=new Int32Array(n+1);
 for(var i=1;i<=m;i++)for(var j=1;j<=n;j++){
  if(tA[i-1]===rA[j-1])dp[i][j]=dp[i-1][j-1]+1;
  else dp[i][j]=Math.max(dp[i-1][j],dp[i][j-1]);
 }
 var op=[];i=m;j=n;
 while(i>0||j>0){
  if(i>0&&j>0&&tA[i-1]===rA[j-1]){op.push({type:'match',rIdx:j-1});i--;j--;}
  else if(j>0&&(i===0||dp[i][j-1]>=dp[i-1][j])){op.push({type:'extra',rIdx:j-1});j--;}
  else{op.push({type:'missing'});i--;}
 }
 return op.reverse();
}

// "Nghe lại": giữ nguyên chữ đã gõ (kể cả sau khi đã kiểm tra → cho làm lại với bài cũ)
function replayDict(){
 if(dictTargetIdx<0)return;
 var ck=document.getElementById('cur-sub-ko'),vals=[],focusIdx=-1;
 if(ck){
  Array.from(ck.querySelectorAll('.dict-blank-input,.dict-word')).forEach(function(el,i){
   vals.push(el.hasAttribute('data-input')?el.getAttribute('data-input'):el.textContent);
   if(document.activeElement===el)focusIdx=i;
  });
 }
 var wasChecked=dictChecked;
 window._seekSub(dictTargetIdx);
 if(!ck||!wasChecked)return; // chưa kiểm tra → ô nhập vẫn còn nguyên
 var spans=Array.from(ck.querySelectorAll('.dict-blank-input'));
 for(var j=0;j<spans.length&&j<vals.length;j++){if(vals[j])spans[j].textContent=vals[j];}
 setTimeout(function(){var t=spans[focusIdx>=0?focusIdx:0];if(t)focusEnd(t);},80);
}

// ── Shadowing ──
function prepareSh(idx){var s=subtitles[idx];var sk=document.getElementById('shadow-ko');if(sk)sk.textContent=s.ko;var sv=document.getElementById('shadow-vi-hint');if(sv)sv.textContent=s.vi||'';loopSegment={start:idx,end:idx};var rs=document.getElementById('speak-result-in-sub');if(rs)rs.innerHTML='';}

// Shadowing controls (called from old APIs if needed + action buttons)
function nextSh(){if(!loopSegment)return;var n=loopSegment.start+1;if(n>=subtitles.length)n=0;prepareSh(n);if(ytPlayer&&playerReady){var t=subtitles[n].start;window._lastSeekTime=Date.now();ytPlayer.seekTo(t,true);currentTime=t;highlight(t);ytPlayer.playVideo();}}
function replaySh(){if(!loopSegment||!ytPlayer||!playerReady)return;var t=subtitles[loopSegment.start].start;window._lastSeekTime=Date.now();ytPlayer.seekTo(t,true);currentTime=t;highlight(t);ytPlayer.playVideo();}
function listenSh(){if(!loopSegment||!ytPlayer||!playerReady)return;var t=subtitles[loopSegment.start].start;window._lastSeekTime=Date.now();ytPlayer.seekTo(t,true);currentTime=t;highlight(t);ytPlayer.playVideo();var et=subtitles[loopSegment.start].end,ch=setInterval(function(){if(!ytPlayer||!playerReady){clearInterval(ch);return;}var t=ytPlayer.getCurrentTime();if(t>=et-.1){ytPlayer.pauseVideo();clearInterval(ch);}},100);setTimeout(function(){clearInterval(ch);},(et-currentTime+2)*1000);}
function toggleShadowingLoop(){shLoop=!shLoop;var b=document.getElementById('vact-loop');if(b)b.classList.toggle('active',shLoop);}

// ── Speech ──
var sr=null;
var iconMic = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="20" height="20"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>';
var iconStop = '<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><rect x="6" y="6" width="12" height="12"></rect></svg>';

window.toggleShadowMic=function(){
 if(!('webkitSpeechRecognition' in window)&&!('SpeechRecognition' in window)){if(typeof Swal!=='undefined')Swal.fire("Không hỗ trợ","Trình duyệt không hỗ trợ nhận diện giọng nói.","error");return;}
 if(sr&&sr._running){sr.stop();return;}
 var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
 sr=new SR();sr.lang='ko-KR';sr.continuous=false;sr.interimResults=true;
 sr._running=false;
 sr.onstart=function(){
  sr._running=true;
  var b=document.getElementById('vact-mic');if(b){b.classList.add('active');var ic=b.querySelector('.vact-icon');if(ic)ic.innerHTML=iconStop;}
  var ra=document.getElementById('speak-result-in-sub');
  if(ra)ra.innerHTML='<div class="speak-listening"><span class="speak-mic-pulse"></span>Đang nghe... hãy đọc theo câu trên</div>';
  if(ytPlayer&&isPlaying)ytPlayer.pauseVideo();
 };
 sr.onresult=function(e){
  var interimTranscript = '';
  var finalTranscript = '';
  for (var i = e.resultIndex; i < e.results.length; ++i) {
      if (e.results[i].isFinal) finalTranscript += e.results[i][0].transcript;
      else interimTranscript += e.results[i][0].transcript;
  }
  if(finalTranscript !== '') {
      evalShRes(finalTranscript.trim());
  } else if(interimTranscript !== '') {
      var ra = document.getElementById('speak-result-in-sub');
      if(ra) ra.innerHTML = '<div class="speak-interim"><span class="speak-mic-pulse"></span>' + esc(interimTranscript) + '</div>';
  }
 };
 sr.onerror=function(e){
  var ra=document.getElementById('speak-result-in-sub');
  var msg=e.error==='not-allowed'?'Trình duyệt chưa cho phép dùng micro. Hãy cấp quyền rồi thử lại.':e.error==='no-speech'?'Chưa nghe thấy giọng bạn. Bấm Nói theo và đọc to hơn nhé!':'Không nghe rõ, thử lại nhé!';
  if(ra)ra.innerHTML='<div class="speak-msg err">'+msg+'</div>';
  resetMicUI();
 };
 sr.onend=function(){sr._running=false;resetMicUI();};
 try{sr.start();}catch(ex){resetMicUI();}
};

function resetMicUI(){var b=document.getElementById('vact-mic');if(b){b.classList.remove('active');var ic=b.querySelector('.vact-icon');if(ic)ic.innerHTML=iconMic;}if(sr)sr._running=false;}

// Tự động kích hoạt micro khi hệ thống đọc xong câu
function autoStartShadowMic(){
  if(currentMode!=='speak')return;
  if(sr&&sr._running)return;
  setTimeout(function(){
    if(currentMode!=='speak')return;
    if(sr&&sr._running)return;
    if(ytPlayer&&isPlaying)return;
    if(typeof window.toggleShadowMic==='function')window.toggleShadowMic();
  },300);
}

function evalShRes(transcript){
 if(currentSubIdx<0)return;
 var target=subtitles[currentSubIdx].ko;
 var tc=target.replace(/[\s.。,，!！?？~～]+/g,'');
 var tA=tc.split('');
 
 var rInfo = [];
 var rawTrans = transcript.split('');
 for(var i=0; i<rawTrans.length; i++){
  var char = rawTrans[i];
  if(!/[\s.。,，!！?？~～]/.test(char)) rInfo.push({ char: char, rawIdx: i });
 }
 var rA = rInfo.map(function(x){return x.char;});
 
 var op = lcsOps(tA, rA);

 var finalHtml='';
 var matchCount=0;
 var rawCur=0;
 
 for (var k = 0; k < op.length; k++) {
  var curOp = op[k];
  if (curOp.type === 'missing') {
   finalHtml += '<span class="dc-miss">_</span>';
  } else {
   var targetRawIdx = rInfo[curOp.rIdx].rawIdx;
   while (rawCur < targetRawIdx) { finalHtml += esc(rawTrans[rawCur]); rawCur++; }
   if (curOp.type === 'match') {
    finalHtml += '<span class="dc-ok">' + esc(rawTrans[rawCur]) + '</span>';
    matchCount++;
   } else {
    finalHtml += '<span class="dc-bad">' + esc(rawTrans[rawCur]) + '</span>';
   }
   rawCur++;
  }
 }
 while (rawCur < rawTrans.length) { finalHtml += esc(rawTrans[rawCur]); rawCur++; }
 
 var ra=document.getElementById('speak-result-in-sub');
 var isPerfect = (matchCount === tA.length && matchCount === rA.length);
 var pct = isPerfect ? 100 : Math.round(matchCount / Math.max(tA.length, rA.length, 1) * 100);
 if(ra) ra.innerHTML = miniResult(pct, '<span class="v-mini-label">Bạn nói</span>' + finalHtml,
   '<b>' + resultTitle(pct) + '</b> · ' + matchCount + '/' + tA.length + ' âm tiết khớp · bấm 🎤 để thử lại');
 revealResult(ra);

 if(isPerfect && typeof confetti === 'function') {
  var curSub = document.getElementById('video-current-sub');
  if(curSub) {
   var rect = curSub.getBoundingClientRect();
   var x = (rect.left + rect.width / 2) / window.innerWidth;
   var y = rect.bottom / window.innerHeight;
   confetti({particleCount:100, angle:90, spread:80, origin:{x:x, y:y}, zIndex:9999, startVelocity:35});
  }
 }
}

// ── Notes ──
function getNotesKey(){return'video_notes_'+(lessonId||'unknown');}
function loadNotes(){try{var r=localStorage.getItem(getNotesKey());notes=r?JSON.parse(r):[];}catch(e){notes=[];}}
function saveNotes(){try{localStorage.setItem(getNotesKey(),JSON.stringify(notes));}catch(e){}}
function addNote(text){var s=(currentSubIdx>=0&&currentSubIdx<subtitles.length)?subtitles[currentSubIdx]:null;notes.push({time:currentTime,ts:Date.now(),subTime:s?fmt(s.start):fmt(currentTime),subIdx:currentSubIdx,subKo:s?s.ko:'',text:text});notes.sort(function(a,b){return a.time-b.time;});saveNotes();renderNotes();renderTimelineDots();}
function deleteNote(idx){notes.splice(idx,1);saveNotes();renderNotes();renderTimelineDots();}
function seekToNote(time){if(!ytPlayer||!playerReady)return;window._lastSeekTime=Date.now();var t=Math.max(0,time-.3);resetAutoPause(t);ytPlayer.seekTo(t,true);currentTime=t;highlight(t);if(!isPlaying)ytPlayer.playVideo();}
function renderNotes(){var nc=document.getElementById('notes-count');if(nc)nc.textContent=notes.length;var el=document.getElementById('notes-list');if(!el)return;if(!notes.length){el.innerHTML='<div class="practice-empty"><div class="empty-icon">📝</div><div>Chưa có ghi chú nào</div><div class="practice-empty-sub">Ghi chú gắn với câu đang phát và hiện thành chấm vàng trên thanh thời gian</div></div>';return;}var h='';notes.forEach(function(n,i){h+='<div class="note-card"><div class="note-time" onclick="window._seekNote('+n.time+')">⏱ '+n.subTime+'</div>';if(n.subKo)h+='<div class="note-sub-ko">'+esc(n.subKo)+'</div>';h+='<div>'+esc(n.text)+'</div><button class="note-delete" onclick="event.stopPropagation();window._deleteNote('+i+')">✕</button></div>';});el.innerHTML=h;}
window._seekNote=seekToNote;window._deleteNote=deleteNote;

// ── Timeline dots ──
function renderTimelineDots(){var l=document.getElementById('progress-notes-layer');if(!l||!videoDuration||videoDuration<=0)return;var w=l.clientWidth;if(w<=0){setTimeout(renderTimelineDots,200);return;}var h='';notes.forEach(function(n,i){var p=(n.time/videoDuration)*100;if(p<0)p=0;if(p>100)p=100;h+='<div class="timeline-note-dot" data-note-idx="'+i+'" data-note-time="'+n.time+'" style="left:'+p+'%;"></div>';});l.innerHTML=h;var tt=document.getElementById('note-tooltip');l.querySelectorAll('.timeline-note-dot').forEach(function(d){d.addEventListener('mouseenter',function(e){var idx=parseInt(d.getAttribute('data-note-idx'));if(isNaN(idx)||idx>=notes.length)return;var n=notes[idx];tt.innerHTML='<div class="note-tip-time">⏱ '+n.subTime+'</div>'+esc(n.text);tt.style.display='block';posTT(e,tt);});d.addEventListener('mouseleave',function(){tt.style.display='none';});d.addEventListener('mousemove',function(e){posTT(e,tt);});d.addEventListener('click',function(e){e.stopPropagation();var t=parseFloat(d.getAttribute('data-note-time'));if(!isNaN(t))seekToNote(t);});});if(!window._rtdBound){window._rtdBound=true;window.addEventListener('resize',function(){clearTimeout(window._rtd);window._rtd=setTimeout(renderTimelineDots,300);});}}
function posTT(e,tt){var x=e.clientX+14,y=e.clientY-10;if(x+tt.offsetWidth>window.innerWidth-10)x=e.clientX-tt.offsetWidth-14;if(y<10)y=e.clientY+20;tt.style.left=x+'px';tt.style.top=y+'px';}

function bindNotesUI(){var ab=document.getElementById('notes-add-btn'),ie=document.getElementById('notes-input');if(!ab||!ie)return;ab.addEventListener('click',function(){var t=ie.value.trim();if(!t)return;addNote(t);ie.value='';});ie.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();var t=ie.value.trim();if(!t)return;addNote(t);ie.value='';}});}

// ── Legacy ──
window._toggleSubList=function(){eyeHidden=!eyeHidden;setEyeIcon();applyFilters();};

// ── Keyboard ──
function bindKeys(){document.addEventListener('keydown',function(e){var el=document.activeElement,t=el.tagName;if(t==='INPUT'||t==='TEXTAREA'||el.isContentEditable)return;if(e.key==='Enter'&&currentMode==='dictation'&&dictChecked){e.preventDefault();if(dictTargetIdx>=0&&dictTargetIdx<subtitles.length-1)window._seekSub(dictTargetIdx+1);return;}if(e.key===' '||e.code==='Space'){e.preventDefault();togglePlay();}else if(e.key==='ArrowRight'){e.preventDefault();seekBy(5);}else if(e.key==='ArrowLeft'){e.preventDefault();seekBy(-5);}else if(e.key==='ArrowDown'){e.preventDefault();seekBy(-2);}else if(e.key==='ArrowUp'){e.preventDefault();seekBy(2);}});}
function togglePlay(){
    if(!ytPlayer||!playerReady)return;
    if((currentMode==='speak'||currentMode==='dictation')&&!isPlaying){
        var nextIdx=currentSubIdx+1;
        if(nextIdx<subtitles.length){
            window._seekSub(nextIdx);
        }else if(currentSubIdx<0&&subtitles.length>0){
            window._seekSub(0);
        }else if(currentSubIdx>=0){
            window._seekSub(currentSubIdx);
        }
        return;
    }
    isPlaying?ytPlayer.pauseVideo():ytPlayer.playVideo();
}
function stopVideo(){if(!ytPlayer||!playerReady)return;ytPlayer.pauseVideo();ytPlayer.seekTo(0,true);currentTime=0;currentSubIdx=-1;window._lastAutoPausedIdx=-1;window._lastPausedSentence=-1;updateProgress();highlight(0);updatePlayBtn();}
function seekBy(sec){if(!ytPlayer||!playerReady)return;var t=Math.max(0,Math.min(videoDuration,currentTime+sec));window._lastSeekTime=Date.now();resetAutoPause(t);ytPlayer.seekTo(t,true);currentTime=t;updateProgress();highlight(t,true);}

// ── Gear Settings ──
var SUB_SETTINGS_KEY='video_sub_settings';
function bindGear(){
 var btn=document.getElementById('gear-toggle-btn'),dd=document.getElementById('gear-dropdown');
 if(!btn||!dd)return;
 btn.addEventListener('click',function(e){e.stopPropagation();dd.classList.toggle('open');});
 document.addEventListener('click',function(e){if(!dd.contains(e.target)&&e.target!==btn)dd.classList.remove('open');});
 ['set-font','set-size','set-color','set-spacing'].forEach(function(id){
  var el=document.getElementById(id);if(!el)return;
  el.addEventListener('change',function(){applySubSettings();saveSubSettings();});
 });
 var ns=document.getElementById('set-nextsub');if(ns)ns.addEventListener('change',function(){applySubSettings();saveSubSettings();});
 var cc=document.getElementById('set-cover-cc');if(cc)cc.addEventListener('change',function(){applySubSettings();saveSubSettings();});
}
function loadSubSettings(){
 try{var raw=localStorage.getItem(SUB_SETTINGS_KEY);if(raw){
  var s=JSON.parse(raw);
  if(s.font)document.getElementById('set-font').value=s.font;
  if(s.size)document.getElementById('set-size').value=s.size;
  if(s.color)document.getElementById('set-color').value=s.color;
  if(s.spacing)document.getElementById('set-spacing').value=s.spacing;
  if(s.nextsub!==undefined)document.getElementById('set-nextsub').checked=s.nextsub;
  if(s.covercc!==undefined){var ccc=document.getElementById('set-cover-cc');if(ccc)ccc.checked=s.covercc;}
 }}catch(e){}
 applySubSettings();
}
function saveSubSettings(){
 var s={font:document.getElementById('set-font').value,size:document.getElementById('set-size').value,color:document.getElementById('set-color').value,spacing:document.getElementById('set-spacing').value,nextsub:document.getElementById('set-nextsub').checked,covercc:document.getElementById('set-cover-cc')?document.getElementById('set-cover-cc').checked:false};
 try{localStorage.setItem(SUB_SETTINGS_KEY,JSON.stringify(s));}catch(e){}
}
function applySubSettings(){
 var cs=document.getElementById('video-current-sub'),root=document.documentElement;
 if(!cs)return;
 var f=document.getElementById('set-font').value,sz=document.getElementById('set-size').value,co=document.getElementById('set-color').value,sp=document.getElementById('set-spacing').value;
 cs.style.setProperty('--sub-font',f||'');
 cs.style.setProperty('--sub-color',co||'');
 cs.style.setProperty('--sub-spacing',sp||'');
 cs.style.setProperty('--sub-listen-size',sz||'');
 var ns=document.getElementById('set-nextsub'),next=document.getElementById('cur-sub-next');
 if(ns&&next)next.style.display=ns.checked?'':'none';
 var cvw=document.querySelector('.video-player-wrap');if(cvw){var cv=document.getElementById('set-cover-cc');if(cv&&cv.checked)cvw.classList.add('cc-covered');else cvw.classList.remove('cc-covered');}
}

})();
