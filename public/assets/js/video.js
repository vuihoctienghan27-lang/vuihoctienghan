// video.js v6 — 2-col flex, 4 round actions, 2x2 mode buttons, timeline notes
;(function(){
'use strict';

var ytPlayer=null,playerReady=false,videoId='',lessonId='',subtitles=[];
var currentSubIdx=-1,isPlaying=false,videoDuration=0,currentTime=0;
var currentMode='listen',ccMode='bilingual',eyeHidden=false,starFilter=false;
var loopSegment=null,dictTargetIdx=-1,dictInputEl=null,shLoop=false;
var timePoller=null,subListEl=null,notes=[],localMap=null;

window._currentSubIdx=-1;

window.initVideoLesson=function(){
 var L=window._videoLesson;
 if(!L||!L.videoId||!L.subtitles){console.warn('[video] No data');return;}
 videoId=L.videoId;subtitles=L.subtitles.sort(function(a,b){return a.start-b.start;});
 lessonId=L.id||(new URLSearchParams(window.location.search)).get('id')||videoId;
 subListEl=document.getElementById('subtitle-list');
 loadNotes();renderSubtitles();renderNotes();renderTimelineDots();
 bindCtrls();bindCC();bindEye();bindStar();bindModeBtns();bindActionBtns();bindNotesUI();bindKeys();bindDictationUI();
 bindGear();loadSubSettings();
 injectYT();window.learningActive=true;
 setMode('listen'); // apply initial mode state
};

document.addEventListener('DOMContentLoaded',function(){if(window._videoLesson&&window._videoLesson.videoId&&!playerReady)window.initVideoLesson();});
if(window._videoLesson&&window._videoLesson.videoId&&!playerReady)window.initVideoLesson();

// ── Render ──
function renderSubtitles(){if(!subListEl)return;var sv=loadSaved(),h='';subtitles.forEach(function(s,i){var t=fmt(s.start),is=sv.has(i);h+='<div class="sub-item'+(is?' saved':'')+'" data-idx="'+i+'" onclick="window._seekSub('+i+')"><span class="sub-idx">'+(i+1)+'</span><span class="sub-time">'+t+'</span><div class="sub-text-wrap"><div class="sub-ko">'+esc(s.ko)+'</div>';if(s.vi)h+='<div class="sub-vi">'+esc(s.vi)+'</div>';h+='</div><button class="sub-star'+(is?' active':'')+'" data-idx="'+i+'" onclick="event.stopPropagation();window._toggleSave('+i+')">'+(is?'★':'☆')+'</button></div>';});subListEl.innerHTML=h;subListEl.addEventListener('click',onSubClick);updFooter();applyFilters();}
function onSubClick(e){var idx=e.currentTarget.getAttribute('data-idx');if(idx)window._seekSub(parseInt(idx));}
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
  if(currentMode==='dictation'){eyeHidden=true;var btn=document.getElementById('btn-eye-toggle');if(btn){btn.classList.add('active');btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';}applyFilters();}
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
  if(ck){if(currentMode==='dictation'){var wA=s.ko.split(' '),wH='';wA.forEach(function(w){wH+='<span class="dict-blank-word" data-word="'+esc(w)+'">___</span> ';});ck.innerHTML=wH;}else{ck.textContent=s.ko;}}
  if(cv)cv.textContent=s.vi||'';
  var next=idx+1;
  if(next<subtitles.length){if(nk)nk.textContent=subtitles[next].ko;if(nv)nv.textContent=subtitles[next].vi||'';}
  else{if(nk)nk.textContent='';if(nv)nv.textContent='';}
  if(sk)sk.textContent=s.ko;if(sv)sv.textContent=s.vi||'';
  updateCtx(idx);
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
function onReady(){playerReady=true;videoDuration=ytPlayer.getDuration()||0;document.getElementById('vb-time-total').textContent=fmt(videoDuration);updateProgress();renderTimelineDots();}

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
function updateProgress(){document.getElementById('vb-time-current').textContent=fmt(currentTime);var b=document.getElementById('vb-progress');if(b&&videoDuration>0)b.value=Math.floor((currentTime/videoDuration)*1000);}
function updatePlayBtn(){var p=document.getElementById('icon-vplay'),a=document.getElementById('icon-vpause');if(p&&a){p.style.display=isPlaying?'none':'';a.style.display=isPlaying?'':'';}}

// ── Controls ──
function bindCtrls(){
 document.getElementById('vb-play-pause').addEventListener('click',togglePlay);
 document.getElementById('vb-stop').addEventListener('click',stopVideo);
 document.getElementById('vb-back5').addEventListener('click',function(){seekBy(-5);});
 document.getElementById('vb-fwd5').addEventListener('click',function(){seekBy(5);});
 document.getElementById('vb-progress').addEventListener('input',function(){if(!ytPlayer||!playerReady||!videoDuration)return;var t=(parseFloat(this.value)/1000)*videoDuration;window._lastSeekTime=Date.now();window.lastPausedIdx=-1;ytPlayer.seekTo(t,true);currentTime=t;updateProgress();highlight(t,true);});
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
function bindEye(){var b=document.getElementById('btn-eye-toggle');if(!b)return;b.addEventListener('click',function(){eyeHidden=!eyeHidden;b.classList.toggle('active',eyeHidden);b.textContent=eyeHidden?'🙈':'👁️';applyFilters();});}
function bindStar(){var b=document.getElementById('btn-star-filter');if(!b)return;b.addEventListener('click',function(){starFilter=!starFilter;b.classList.toggle('active',starFilter);applyFilters();});}

// ── 2x2 Mode Buttons (right column) ──
function bindModeBtns(){
 document.querySelectorAll('.mbtn-card').forEach(function(b){b.addEventListener('click',function(){setMode(b.getAttribute('data-mode'));});});
 document.querySelectorAll('.mobile-tab-btn').forEach(function(b){b.addEventListener('click',function(){setMode(b.getAttribute('data-mode'));});});
}
function setMode(mode){var oldMode=currentMode;currentMode=mode;shLoop=false;var lb=document.getElementById('vact-loop');if(lb)lb.classList.remove('active');
// Enlarge subtitle in listen/speak mode, keep same look
var curSub=document.getElementById('video-current-sub');if(curSub){curSub.classList.toggle('sub-listen',mode==='listen' || mode==='dictation' || mode==='speak');curSub.classList.toggle('speak-mode-active',mode==='speak');}
var colLeft=document.querySelector('.video-grid');if(colLeft){colLeft.classList.toggle('vmode-listen-mode',mode==='listen');colLeft.classList.toggle('show-sublist',mode==='sublist');}
document.querySelectorAll('.mbtn-card').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-mode')===mode);});
document.querySelectorAll('.mobile-tab-btn').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-mode')===mode);});
document.querySelectorAll('.vmode-pane').forEach(function(p){p.classList.remove('active');});
var pane=document.getElementById('mode-'+mode);if(pane)pane.classList.add('active');
var cs=document.getElementById('video-current-sub');if(cs)cs.classList.toggle('dict-mode-active',mode==='dictation');
var cvw=document.querySelector('.video-player-wrap');if(cvw)cvw.classList.toggle('dict-mode-active',mode==='dictation');
if(mode==='dictation'&&oldMode!=='dictation'){window._preDictEyeHidden=eyeHidden;eyeHidden=true;var btn=document.getElementById('btn-eye-toggle');if(btn){btn.classList.add('active');btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';}applyFilters();}
else if(mode!=='dictation'&&oldMode==='dictation'){if(typeof window._preDictEyeHidden!=='undefined')eyeHidden=window._preDictEyeHidden;else eyeHidden=false;var btn=document.getElementById('btn-eye-toggle');if(btn){btn.classList.toggle('active',eyeHidden);btn.innerHTML=eyeHidden?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';}applyFilters();}
if(mode==='dictation'){applyFilters();}
if((mode==='dictation'||mode==='speak') && ytPlayer && playerReady && currentSubIdx>=0){
    window._lastAutoPausedIdx=currentSubIdx-1;
    window._lastPausedSentence = -1;
}
var vhw=document.getElementById('dict-vi-hint-wrapper');if(vhw)vhw.style.display=mode==='dictation'?'flex':'none';
if(mode!=='dictation'){var ck=document.getElementById('cur-sub-ko');if(ck&&currentSubIdx>=0)ck.textContent=subtitles[currentSubIdx].ko;var dr=document.getElementById('dict-result');if(dr)dr.innerHTML='';var ds=document.getElementById('dict-score');if(ds)ds.textContent='';}
if(mode==='dictation'&&currentSubIdx>=0)prepareDict(currentSubIdx);
if(mode==='speak'&&currentSubIdx>=0)prepareSh(currentSubIdx);
if(mode==='notes'){renderNotes();renderTimelineDots();}
if(mode==='listen'&&currentSubIdx>=0&&ytPlayer&&playerReady&&oldMode!=='sublist'){var t=subtitles[currentSubIdx].start;window._lastSeekTime=Date.now();ytPlayer.seekTo(t,true);currentTime=t;highlight(t);ytPlayer.playVideo();}}
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
function prepareDict(idx){dictTargetIdx=idx;var s=subtitles[idx];
var vhw=document.getElementById('dict-vi-hint-wrapper');if(vhw)vhw.style.display='flex';
var vh=document.getElementById('dict-vi-hint');if(vh){vh.textContent=s.vi||'(không có gợi ý)';vh.classList.add('dict-hidden-text');vh.classList.remove('revealed');vh.style.display='block';}
document.getElementById('dict-check-btn').style.display='';document.getElementById('dict-result').innerHTML='';document.getElementById('dict-score').textContent='';
var ck=document.getElementById('cur-sub-ko');if(ck){var wA=s.ko.split(' '),wH='';wA.forEach(function(w){wH+='<span contenteditable="true" class="dict-blank-input" data-word="'+esc(w)+'"></span> ';});ck.innerHTML=wH;
setTimeout(function(){var f=ck.querySelector('.dict-blank-input');if(f)f.focus();},50);}
}
function bindDictationUI(){var ck=document.getElementById('cur-sub-ko');if(ck){ck.addEventListener('keydown',function(e){if(currentMode!=='dictation')return;if(e.target.classList.contains('dict-blank-input')){if(e.key==='Enter'){e.preventDefault();checkDict();}else if(e.key==='Backspace'){var txt=e.target.textContent;if(!txt||txt.length===0){e.preventDefault();var all=Array.from(ck.querySelectorAll('.dict-blank-input')),idx=all.indexOf(e.target);if(idx>0){var prev=all[idx-1];prev.focus();var range=document.createRange(),sel=window.getSelection();if(prev.childNodes.length>0){range.setStartAfter(prev.lastChild);range.collapse(true);sel.removeAllRanges();sel.addRange(range);}}}}}});ck.addEventListener('input',function(e){if(currentMode!=='dictation')return;if(e.target.classList.contains('dict-blank-input')){var txt=e.target.textContent;if(/[\s\u3000]/.test(txt)){e.target.textContent=txt.replace(/[\s\u3000]+/g,'');var all=Array.from(ck.querySelectorAll('.dict-blank-input')),idx=all.indexOf(e.target);if(idx>=0&&idx<all.length-1){var nx=all[idx+1];nx.focus();var r=document.createRange(),s=window.getSelection();if(nx.childNodes.length>0)r.setStartAfter(nx.lastChild);else r.selectNodeContents(nx);r.collapse(true);s.removeAllRanges();s.addRange(r);}}}});}
var vhw=document.getElementById('dict-vi-hint-wrapper');if(vhw){vhw.addEventListener('click',function(e){if(currentMode==='dictation'){e.stopPropagation();var vh=document.getElementById('dict-vi-hint');if(vh)vh.classList.toggle('revealed');}});}}
function checkDict(){if(dictTargetIdx<0)return;var ck=document.getElementById('cur-sub-ko'),re=document.getElementById('dict-result'),se=document.getElementById('dict-score');if(!ck)return;
var inputs=ck.querySelectorAll('.dict-blank-input'),correct=0,total=0,allC=true;
inputs.forEach(function(span){
var w=span.getAttribute('data-word'),u=span.textContent;
// Strip all Unicode spaces/ZWSP from input and reference word
var wN=w.replace(/[\s\u200b\u3000\ufeff.。,，!！?？~～]+/g,''),uN=u.replace(/[\s\u200b\u3000\ufeff.。,，!！?？~～]+/g,'');
if(!uN){span.contentEditable='false';span.style.borderBottom='none';allC=false;total+=wN.length;return;}
var html='',len=Math.max(wN.length,uN.length),wordAllC=true;
for(var i=0;i<len;i++){var wc=wN[i]||'',uc=uN[i]||'';total++;if(wc===uc){html+='<span style="color:#10b981;">'+esc(uc)+'</span>';correct++;}else if(uc){html+='<span style="color:#ef4444;">'+esc(uc)+'</span>';wordAllC=false;}else{html+='<span style="color:#ef4444;font-weight:bold;">_</span>';wordAllC=false;}}
span.innerHTML=html;span.contentEditable='false';span.style.borderBottom='none';if(!wordAllC)allC=false;});
document.getElementById('dict-check-btn').style.display='none';
var vhw=document.getElementById('dict-vi-hint-wrapper');if(vhw)vhw.style.display='none';
var html='<div style="margin-top:14px;">';
html+='<div style="font-size:0.85em;color:#64748b;font-weight:600;margin-bottom:6px;">Đáp án:</div>';
html+='<div style="font-size:1.25em;font-weight:700;color:#4f46e5;margin-bottom:4px;word-break:keep-all;line-height:1.5;">'+esc(subtitles[dictTargetIdx].ko)+'</div>';
if(subtitles[dictTargetIdx].vi)html+='<div style="font-size:0.88em;color:#475569;line-height:1.4;">'+esc(subtitles[dictTargetIdx].vi)+'</div>';
html+='</div>';
re.innerHTML=html;
if(allC){se.textContent='';
if(typeof confetti==='function'){var r=ck.getBoundingClientRect(),xl=r.left/window.innerWidth,xr=r.right/window.innerWidth,yb=r.bottom/window.innerHeight;
confetti({particleCount:60,angle:60,spread:55,origin:{x:xl,y:yb},zIndex:9999});confetti({particleCount:60,angle:120,spread:55,origin:{x:xr,y:yb},zIndex:9999});}
}else{se.textContent='';}}

// "Nghe lại" giữ nguyên nội dung người dùng đã nhập dở
function replayDict(){
  if(dictTargetIdx<0)return;
  var ck=document.getElementById('cur-sub-ko');
  var vals=[],focusIdx=-1;
  if(ck){
    var inputs=Array.from(ck.querySelectorAll('.dict-blank-input'));
    for(var i=0;i<inputs.length;i++){
      vals.push(inputs[i].textContent);
      if(document.activeElement===inputs[i])focusIdx=i;
    }
  }
  window._seekSub(dictTargetIdx);
  if(ck){
    var spans=Array.from(ck.querySelectorAll('.dict-blank-input'));
    for(var j=0;j<spans.length&&j<vals.length;j++){
      var v=vals[j];
      if(v)spans[j].textContent=v;
    }
    if(focusIdx>=0&&focusIdx<spans.length){
      setTimeout(function(){
        var target=ck.querySelectorAll('.dict-blank-input')[focusIdx];
        if(!target)return;
        target.focus();
        var range=document.createRange(),sel=window.getSelection();
        if(target.childNodes.length>0)range.setStartAfter(target.lastChild);
        else range.selectNodeContents(target);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      },80);
    }
  }
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
  if(ra)ra.innerHTML='<div style="display:flex;align-items:center;gap:8px;justify-content:center;color:#8b5cf6;font-weight:700;"><span class="speak-mic-pulse"></span>Đang nghe...</div>';
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
      if(ra) ra.innerHTML = '<span style="color:#94a3b8;font-style:italic;">' + esc(interimTranscript) + '</span>';
  }
 };
 sr.onerror=function(e){
  var ra=document.getElementById('speak-result-in-sub');
  if(ra)ra.innerHTML='<span style="color:#ef4444;font-weight:600;">Không nghe rõ. Thử lại! <small>('+( e.error||'')+')</small></span>';
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
 
 var m = tA.length, n = rA.length;
 var dp = Array(m + 1);
 for(var r=0; r<=m; r++) dp[r] = new Int32Array(n + 1);
 for (var i = 1; i <= m; i++) {
  for (var j = 1; j <= n; j++) {
   if (tA[i - 1] === rA[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
   else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
  }
 }
 var op = [];
 var i = m, j = n;
 while (i > 0 || j > 0) {
  if (i > 0 && j > 0 && tA[i - 1] === rA[j - 1]) { op.push({ type: 'match', rIdx: j-1 }); i--; j--; }
  else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) { op.push({ type: 'extra', rIdx: j-1 }); j--; }
  else if (i > 0 && (j === 0 || dp[i - 1][j] > dp[i][j - 1])) { op.push({ type: 'missing' }); i--; }
 }
 op.reverse();
 
 var finalHtml='';
 var matchCount=0;
 var rawCur=0;
 
 for (var k = 0; k < op.length; k++) {
  var curOp = op[k];
  if (curOp.type === 'missing') {
   finalHtml += '<span style="color:#ef4444;font-weight:700;margin:0 1px;">_</span>';
  } else {
   var targetRawIdx = rInfo[curOp.rIdx].rawIdx;
   while (rawCur < targetRawIdx) { finalHtml += esc(rawTrans[rawCur]); rawCur++; }
   if (curOp.type === 'match') {
    finalHtml += '<span style="color:#10b981;font-weight:700;">' + esc(rawTrans[rawCur]) + '</span>';
    matchCount++;
   } else {
    finalHtml += '<span style="color:#ef4444;font-weight:700;">' + esc(rawTrans[rawCur]) + '</span>';
   }
   rawCur++;
  }
 }
 while (rawCur < rawTrans.length) { finalHtml += esc(rawTrans[rawCur]); rawCur++; }
 
 var ra=document.getElementById('speak-result-in-sub');
 if(ra) ra.innerHTML = '<div>' + finalHtml + '</div>';
 
 var isPerfect = (matchCount === tA.length && matchCount === rA.length);
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
function seekToNote(time){if(!ytPlayer||!playerReady)return;window._lastSeekTime=Date.now();window.lastPausedIdx=-1;var t=Math.max(0,time-.3);ytPlayer.seekTo(t,true);currentTime=t;highlight(t);if(!isPlaying)ytPlayer.playVideo();}
function renderNotes(){var el=document.getElementById('notes-list');if(!el)return;if(!notes.length){el.innerHTML='<div class="practice-empty"><div class="empty-icon">📝</div><div>Chưa có ghi chú nào</div><div style="font-size:.78em;">Ghi chú hiển thị dạng chấm trên timeline</div></div>';return;}var h='';notes.forEach(function(n,i){h+='<div class="note-card"><div class="note-time" onclick="window._seekNote('+n.time+')">⏱ '+n.subTime+'</div>';if(n.subKo)h+='<div class="note-sub-ko">'+esc(n.subKo)+'</div>';h+='<div>'+esc(n.text)+'</div><button class="note-delete" onclick="event.stopPropagation();window._deleteNote('+i+')">✕</button></div>';});el.innerHTML=h;}
window._seekNote=seekToNote;window._deleteNote=deleteNote;

// ── Timeline dots ──
function renderTimelineDots(){var l=document.getElementById('progress-notes-layer');if(!l||!videoDuration||videoDuration<=0)return;var w=l.clientWidth;if(w<=0){setTimeout(renderTimelineDots,200);return;}var h='';notes.forEach(function(n,i){var p=(n.time/videoDuration)*100;if(p<0)p=0;if(p>100)p=100;h+='<div class="timeline-note-dot" data-note-idx="'+i+'" data-note-time="'+n.time+'" style="left:'+p+'%;"></div>';});l.innerHTML=h;var tt=document.getElementById('note-tooltip');l.querySelectorAll('.timeline-note-dot').forEach(function(d){d.addEventListener('mouseenter',function(e){var idx=parseInt(d.getAttribute('data-note-idx'));if(isNaN(idx)||idx>=notes.length)return;var n=notes[idx];tt.innerHTML='<div class="note-tip-time">⏱ '+n.subTime+'</div>'+esc(n.text);tt.style.display='block';posTT(e,tt);});d.addEventListener('mouseleave',function(){tt.style.display='none';});d.addEventListener('mousemove',function(e){posTT(e,tt);});d.addEventListener('click',function(e){e.stopPropagation();var t=parseFloat(d.getAttribute('data-note-time'));if(!isNaN(t))seekToNote(t);});});window.addEventListener('resize',function(){clearTimeout(window._rtd);window._rtd=setTimeout(renderTimelineDots,300);});}
function posTT(e,tt){var x=e.clientX+14,y=e.clientY-10;if(x+tt.offsetWidth>window.innerWidth-10)x=e.clientX-tt.offsetWidth-14;if(y<10)y=e.clientY+20;tt.style.left=x+'px';tt.style.top=y+'px';}

function bindNotesUI(){var ab=document.getElementById('notes-add-btn'),ie=document.getElementById('notes-input');if(!ab||!ie)return;ab.addEventListener('click',function(){var t=ie.value.trim();if(!t)return;addNote(t);ie.value='';});ie.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();var t=ie.value.trim();if(!t)return;addNote(t);ie.value='';}});}

// ── Legacy ──
window._toggleSubList=function(){eyeHidden=!eyeHidden;var b=document.getElementById('btn-eye-toggle');if(b){b.classList.toggle('active',eyeHidden);b.textContent=eyeHidden?'🙈':'👁️';}applyFilters();};

// ── Keyboard ──
function bindKeys(){document.addEventListener('keydown',function(e){var el=document.activeElement,t=el.tagName;if(t==='INPUT'||t==='TEXTAREA'||el.isContentEditable)return;if(e.key===' '||e.code==='Space'){e.preventDefault();togglePlay();}else if(e.key==='ArrowRight'){e.preventDefault();seekBy(5);}else if(e.key==='ArrowLeft'){e.preventDefault();seekBy(-5);}else if(e.key==='ArrowDown'){e.preventDefault();seekBy(-2);}else if(e.key==='ArrowUp'){e.preventDefault();seekBy(2);}});}
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
function stopVideo(){if(!ytPlayer||!playerReady)return;ytPlayer.pauseVideo();ytPlayer.seekTo(0,true);currentTime=0;currentSubIdx=-1;updateProgress();highlight(0);updatePlayBtn();}
function seekBy(sec){if(!ytPlayer||!playerReady)return;var t=Math.max(0,Math.min(videoDuration,currentTime+sec));window._lastSeekTime=Date.now();window.lastPausedIdx=-1;ytPlayer.seekTo(t,true);currentTime=t;updateProgress();highlight(t,true);}

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
