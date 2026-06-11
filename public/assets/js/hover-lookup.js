/* hover-lookup.js — Click Korean word → full popup panel with 49K KRDict */
(function() {
    'use strict';

    var rootPath = '';
    (function() {
        var p = window.location.pathname;
        var idx = p.indexOf('/public/');
        if (idx !== -1) {
            var sub = p.substring(idx + 8);
            var depth = sub.split('/').length - 1;
            rootPath = depth > 0 ? '../'.repeat(depth) : '';
        } else {
            var parts = p.split('/');
            var depth = parts.filter(function(x){return x!=='';}).length - 1;
            if (depth < 0) depth = 0;
            rootPath = depth > 0 ? '../'.repeat(depth) : '';
        }
    })();

    // ── SVG icons ──
    var svgSpk = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#64748b" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>';
    var svgSearch = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#64748b" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
    var svgClose = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#94a3b8" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    var svgExpand = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#94a3b8" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
    var svgCollapse = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#94a3b8" stroke-width="2"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';

    // ── Panel ──
    var panel = document.createElement('div');
    panel.id = 'hover-vocab-panel';
    panel.style.cssText = 'display:none;position:fixed;z-index:99999;right:16px;bottom:16px;width:380px;min-width:300px;max-width:90vw;max-height:80vh;overflow:auto;resize:both;background:#fff;border:1px solid #e2e8f0;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);font-family:Pretendard,sans-serif;font-size:0.92em;';
    panel.innerHTML = '<div id="hv-hdr" style="padding:10px 14px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:6px;position:sticky;top:0;background:#fff;z-index:10;border-radius:16px 16px 0 0;cursor:grab;user-select:none;">'+
        '<img src="'+rootPath+'assets/img/logo-navbar.png" style="width:22px;height:22px;flex-shrink:0;" alt="">'+
        '<span id="hv-word" style="font-weight:700;font-size:1.05em;color:#1e293b;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">—</span>'+
        '<input id="hv-search-inp" style="display:none;flex:1;border:1px solid #bfdbfe;border-radius:8px;padding:5px 10px;font-size:0.95em;outline:none;font-family:Pretendard,sans-serif;color:#1e293b;min-width:0;" placeholder="Nhập từ Hàn để tra...">'+
        '<button id="hv-speak" title="Phát âm" style="background:none;border:none;cursor:pointer;padding:4px;flex-shrink:0;border-radius:6px;">'+svgSpk+'</button>'+
        '<button id="hv-search" title="Tra từ khác" style="background:none;border:none;cursor:pointer;padding:4px;flex-shrink:0;border-radius:6px;">'+svgSearch+'</button>'+
        '<button id="hv-expand" title="Mở rộng" style="display:none;background:none;border:none;cursor:pointer;padding:4px;flex-shrink:0;border-radius:6px;">'+svgExpand+'</button>'+
        '<button id="hv-close" title="Đóng" style="background:none;border:none;cursor:pointer;padding:4px;flex-shrink:0;border-radius:6px;">'+svgClose+'</button>'+
        '</div><div style="padding:10px 16px 14px 16px;" id="hv-body"></div>';
    document.body.appendChild(panel);

    // ── Mobile CSS ──
    var mobileCSS = document.createElement('style');
    mobileCSS.textContent = '@media(max-width:768px){#hover-vocab-panel{left:0!important;right:0!important;bottom:0!important;top:auto!important;width:100%!important;max-width:100%!important;min-width:unset!important;height:66vh!important;max-height:66vh!important;border-radius:20px 20px 0 0!important;resize:none!important;box-shadow:0 -4px 24px rgba(0,0,0,0.12)!important;transition:height 0.35s cubic-bezier(0.4,0,0.2,1),max-height 0.35s cubic-bezier(0.4,0,0.2,1)!important;will-change:height}#hover-vocab-panel.hv-exp{height:80vh!important;max-height:80vh!important}#hover-vocab-panel.hv-shrink{height:15vh!important;max-height:15vh!important}#hover-vocab-panel #hv-hdr{border-radius:20px 20px 0 0!important;cursor:default!important}#hover-vocab-panel #hv-expand{display:inline-block!important}}';
    document.head.appendChild(mobileCSS);

    // ── Button handlers ──
    document.getElementById('hv-close').addEventListener('click',function(e){e.stopPropagation();panel.style.display='none';});
    document.getElementById('hv-speak').addEventListener('click',function(e){
        e.stopPropagation();
        var w=document.getElementById('hv-word').textContent;
        if(!w||w==='—'||!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        var u=new SpeechSynthesisUtterance(w);u.lang='ko-KR';u.rate=0.85;window.speechSynthesis.speak(u);
    });
    var hvExpanded=false;
    document.getElementById('hv-expand').addEventListener('click',function(e){
        e.stopPropagation();
        hvExpanded=!hvExpanded;
        panel.classList.toggle('hv-exp',hvExpanded);
        this.innerHTML=hvExpanded?svgCollapse:svgExpand;
        this.title=hvExpanded?'Thu nhỏ':'Mở rộng';
    });
    // Search toggle
    document.getElementById('hv-search').addEventListener('click',function(e){
        e.stopPropagation();
        var wordSpan=document.getElementById('hv-word');
        var inp=document.getElementById('hv-search-inp');
        var spk=document.getElementById('hv-speak');
        if(inp.style.display==='none'){
            inp.style.display='block';inp.value='';inp.focus();
            wordSpan.style.display='none';spk.style.display='none';
        }else{
            inp.style.display='none';wordSpan.style.display='';spk.style.display='';
        }
    });
    document.getElementById('hv-search-inp').addEventListener('keydown',async function(e){
        if(e.key!=='Enter') return;
        var q=this.value.trim();if(!q) return;
        var result=lookup(q);
        if(result){showPanel(result);resetSearchUI();return;}
        if(!fullLoaded){await loadDict();result=lookup(q);if(result){showPanel(result);resetSearchUI();return;}}
        document.getElementById('hv-body').innerHTML='<div style="color:#94a3b8;text-align:center;padding:20px;">Không tìm thấy "'+q+'"</div>';
    });
    function resetSearchUI(){
        document.getElementById('hv-search-inp').style.display='none';
        document.getElementById('hv-word').style.display='';
        document.getElementById('hv-speak').style.display='';
    }

    // ── Drag (desktop) ──
    var dragInfo=null;
    document.getElementById('hv-hdr').addEventListener('mousedown',function(e){
        if(window.innerWidth<=768) return;
        if(e.target.tagName==='BUTTON'||e.target.tagName==='INPUT'||e.target.closest('button')) return;
        dragInfo={sx:e.clientX,sy:e.clientY,l:panel.offsetLeft,t:panel.offsetTop};
        e.preventDefault();
    });
    document.addEventListener('mousemove',function(e){
        if(!dragInfo) return;
        panel.style.right='auto';panel.style.bottom='auto';
        panel.style.left=(dragInfo.l+e.clientX-dragInfo.sx)+'px';
        panel.style.top=(dragInfo.t+e.clientY-dragInfo.sy)+'px';
    });
    document.addEventListener('mouseup',function(){dragInfo=null;});

    // ── Korean helpers ──
    function isKorean(ch){var c=ch.charCodeAt(0);return(c>=0xAC00&&c<=0xD7AF)||(c>=0x1100&&c<=0x11FF)||(c>=0x3130&&c<=0x318F);}
    function getWord(e){
        if(!document.caretRangeFromPoint) return null;
        var r=document.caretRangeFromPoint(e.clientX,e.clientY);
        if(!r||!r.startContainer||r.startContainer.nodeType!==3) return null;
        var t=r.startContainer.textContent,o=r.startOffset;
        var s=o;while(s>0&&isKorean(t[s-1]))s--;
        var end=o;while(end<t.length&&isKorean(t[end]))end++;
        var w=t.substring(s,end).trim();
        return(w&&isKorean(w[0]))?w:null;
    }

    // ── Dict ──
    var fullMap=null,fullLoaded=false,fullLoading=false,loadQueue=[],fullFailed=false;
    function buildMap(){
        if(fullMap||!window.AutoVocabDictFull||!Array.isArray(window.AutoVocabDictFull)) return;
        fullMap=new Map();
        for(var i=0;i<window.AutoVocabDictFull.length;i++){var e=window.AutoVocabDictFull[i];if(!fullMap.has(e.w))fullMap.set(e.w,e);}
        fullLoaded=true;var q=loadQueue;loadQueue=[];q.forEach(function(cb){cb();});
    }
    window.addEventListener('fulldictready',buildMap);
    if(window.AutoVocabDictFull) buildMap();
    function loadDict(){
        return new Promise(function(resolve){
            if(fullLoaded||fullFailed){resolve();return;}
            if(fullLoading){loadQueue.push(resolve);return;}
            fullLoading=true;loadQueue.push(resolve);
            var s=document.createElement('script');
            s.src=rootPath+'assets/js/vocab-dictionary-full.js';
            s.onload=function(){buildMap();fullLoading=false;var q=loadQueue;loadQueue=[];q.forEach(function(cb){cb();});};
            s.onerror=function(){fullFailed=true;fullLoading=false;var q=loadQueue;loadQueue=[];q.forEach(function(cb){cb();});};
            document.head.appendChild(s);
        });
    }

    // ── Unfold ──
    function unfold(word){
        var set=[word];
        // Particles — comprehensive, including combinations
        var P=[
            // Compound particles (longest first)
            '에서부터','으로부터','에게서는','한테서는','에게서','한테서','으로서는','으로써는',
            '보다는','에서는','부터는','까지는','에게는','한테는','으로는','께서는','라고는',
            '이라는','이라는','이라는',
            // Combined particles
            '들보다','들만','들도','들의','들에','들은','들를','들과','들로','들께','들조차','들마저','들까지','들처럼',
            '만은','만도','만이','만의','만을',
            '까지는','까지도','까지의','까지를',
            '보다도','보다는','보다를',
            '처럼도','처럼은',
            '대로는','대로도',
            '밖에는','밖에도',
            '조차도','마저도',
            '에서','에게','한테','으로','부터','까지','처럼','같이','만큼','밖에','조차','마저','대로','보다',
            '께서','더러','보고','라고','이라는','이야','라는',
            '는','은','가','이','를','을','에','의','와','과','도','만','나','랑','야','들','께','요','로',
            '이나','든지','라도','나마','야말로',
            '하고','이며','이고','이나마',
            // Honorific combinations
            '께서는','께서도','께서의',
            // Quotative
            '라고요','이라고요','라는군요','이랍니다',
            // Sentence-final particle combos
            '에는요','은요','는요','가요','이요',
        ];
        for(var i=0;i<P.length;i++){var p=P[i];if(word.endsWith(p)&&word.length>p.length)set.push(word.slice(0,-p.length));}
        
        // Verb/Adj endings — comprehensive
        var V=[
            // Honorific + tense combos (longest)
            '으셨습니까','셨습니까','으셨습니다','셨습니다','으셨어요','셨어요',
            '으셨다','셨다','으셨니','셨니','으셨나요','셨나요',
            '으십시오','십시오','으십니다','십니다','으십니까','십니까',
            '으세요','세요','으셔요','셔요','으셔','셔',
            '으실래요','실래요','으실게요','실게요','으실까요','실까요',
            '으시겠어요','시겠어요','으시겠습니까','시겠습니까',
            '으시죠','시죠','으시지요','시지요',
            '으시네요','시네요','으시군요','시군요',
            '으시더라고요','시더라고요','으시잖아요','시잖아요',
            '으시는','시는','으신','신','으실','실','으시면','시면',
            '으시며','시며','으시고','시고','으시니까','시니까',
            // Formal polite
            '습니다','ㅂ니다','습니까','ㅂ니까','읍시다','ㅂ시다',
            // Past
            '았습니다','었습니다','였습니다','았습니까','었습니까','였습니까',
            '았어요','었어요','였어요','았어','었어','였어',
            '았다','었다','였다','았니','었니','였니',
            '았던','었던','였던','았더라','었더라','였더라',
            '았더니','었더니','였더니','았네요','었네요','였네요',
            '았군요','었군요','였군요','았지요','었지요','였지요',
            '았잖아요','었잖아요','였잖아요',
            // Future/presumptive
            '겠습니다','겠습니까','겠어요','겠어','겠다','겠네요','겠군요','겠죠','겠지요',
            '을것입니다','ㄹ것입니다','을겁니다','ㄹ겁니다',
            '을거예요','ㄹ거예요','을거야','ㄹ거야','을거','ㄹ거',
            '을게요','ㄹ게요','을래요','ㄹ래요','을까요','ㄹ까요',
            '을까','ㄹ까','을래','ㄹ래','을게','ㄹ게',
            // Question forms
            '니','냐','나요','는가','은가','ㄴ가','나',
            '는지','은지','ㄴ지','더냐','더니','디','느냐',
            '습디까','ㅂ디까','더이다','디까',
            // Imperative/suggestive
            '으라고','라고','으라','라','아라','어라','여라','자',
            '으렴','렴','으려무나','려무나','게나','구려',
            '으십사','십사','으소서','소서',
            // Connective
            '지만','으나','거나','든지','든가','거니와','건만',
            '으면서','면서','으며','며','으니','니',
            '으니까','니까','으므로','므로','길래','느라고',
            '더니','더라도','더라','다가','자마자','느니',
            '을수록','ㄹ수록','을지라도','ㄹ지라도',
            '으려고','려고','으러','러','도록','게끔','게',
            '으되','되','거든','거늘','으련만','련만',
            // Conditional
            '으면','면','어야','아야','여야','어야만','아야만','여야만',
            '었으면','았으면','였으면','더면','더라면',
            '은들','ㄴ들','을망정','ㄹ망정','을지언정','ㄹ지언정',
            // Sentence endings
            '아요','어요','여요','해요','네요','데요','군요','구나',
            '잖아','잖아요','지요','죠','지','고요','구요',
            '네','데','군','더라고요','더라고','더군요',
            '나봐요','은가봐요','는가봐요','나보다','은가보다',
            '을걸요','ㄹ걸요','을걸','ㄹ걸',
            '을텐데','ㄹ텐데','을텐데요','ㄹ텐데요',
            '을뻔했다','ㄹ뻔했다','을뻔했어요','ㄹ뻔했어요',
            // Honorific short
            '시','셔','실','신','셨','시겠','시는','실게',
            // Basic endings (short ones last)
            '다','아','어','여','고','면','며','니','나',
            '는','은','ㄴ','을','ㄹ','던','음','ㅁ','기','게',
            '았','었','였',
            // Plain declarative (ㄴ다/는다/다)
            '는다','ㄴ다','는단다','ㄴ단다','는담','ㄴ담',
            '는군','ㄴ군','는구나','ㄴ구나','는구만','ㄴ구만',
            '는구려','ㄴ구려',
            // More combined quotative
            '다고','라고','냐고','자고','는다고','ㄴ다고','는다는','ㄴ다는',
            '다는','냐는','라는','자는','잔','단','냔','잔',
            '대','냬','재','래','는대','ㄴ대','는댔','ㄴ댔',
            // Passive/Causative common patterns
            '되다','된다','됩니다','돼요','됐다','됐어요','됐습니다',
            '되','돼','됐','될','되는',
            '게되다','게된다','게됩니다','게돼요','게됐다',
            '게하다','게한다','게합니다','게해요','게했다',
            '시키다','시킨다','시킵니다','시켜요','시켰다',
            '시켜','시킬','시키는',
            // 기 nominalizer combos
            '기로','기로는','기로써','기로도','기로만',
            '기에','기에는','기에는','기도',
            '기를','기는','기가','기의',
            '기때문에','기때문','기위해서','기위해','기위한',
            '기까지','기부터','기보다',
            '기로하다','기로했다','기로합니다',
            '기시작했다','기시작한다',
            '기쉽다','기어렵다','기좋다','기싫다',
            '기마련이다','기나름이다',
            // Progressive
            '고있다','고있는','고있어','고있어요','고있었','고있을','고있습니다',
            '는중이다','는중이야','는중이에요','는중입니다',
            '고계시다','고계신다','고계세요','고계십니다',
            // Negative patterns
            '지않다','지않아','지않아요','지않습니다','지않았','지않는다',
            '지못하다','지못해','지못했','지못할','지못한다',
            '지말다','지마','지마세요','지말자','지마라',
            '을수없다','ㄹ수없다','을수없어','ㄹ수없어','을수없는','ㄹ수없는',
            '을수있다','ㄹ수있다','을수있어','ㄹ수있어','을수있는','ㄹ수있는',
            // Causative/passive suffixes
            '이','히','리','기','우','구','추',
            '게하다','게했다','게하는','게할','게한다',
            '시키다','시켰다','시키는','시킬','시킨다',
            // Noun modifiers (관형사형) combos
            '는것','은것','ㄴ것','을것','ㄹ것','던것',
            '는법','은법','ㄴ법','을법','ㄹ법',
            '는줄','은줄','ㄴ줄','을줄','ㄹ줄',
            '는모양','은모양','ㄴ모양',
            '는편','은편','ㄴ편',
            // More noun-modifier + particle
            '는데','은데','ㄴ데','는데도','은데도',
            '는바','은바','ㄴ바',
            // Plural suffixes
            '적','적이다','적인','적으로','적이',
            // Plural + particle combos
            '들이','들도','들만','들의','들에','들은','들을','들과','들로','들보다','들께',
            '들에서','들까지','들처럼','들부터','들조차','들마저',
            // Adverbial endings
            '게','도록','게끔','게도','도록도',
            // More kính ngữ thân mật
            '실게요','실래요','실까요','시지요','시죠','시네요','시군요','시잖아요',
            '으실게요','으실래요','으실까요','으시지요','으시죠','으시네요','으시군요','으시잖아요',
        ];
        for(var i=0;i<V.length;i++){var v=V[i];if(word.endsWith(v)&&word.length>v.length){var stem=word.slice(0,-v.length);set.push(stem+'다');set.push(stem);}}
        
        // Auxiliary verb patterns: 아/어 + 가다/오다/보다/주다/놓다/두다/버리다/내다/쌓다 etc.
        // These are stripped in two steps: first the auxiliary, then the 아/어 connector
        var Aux=[
            // 가다 (continuation)
            '어가다','어가요','어갑니다','어갔어요','어갔다','어갔','어가','어갈','어가는','어가고','어가면','어가서',
            '아가다','아가요','아갑니다','아갔어요','아갔다','아갔','아가','아갈','아가는','아가고','아가면','아가서',
            '여가다','여가요','여갑니다','여갔어요','여갔다','여갔','여가','여갈','여가는','여가고','여가면','여가서',
            // 오다 (coming / have been doing)
            '어오다','어와요','어옵니다','어왔어요','어왔다','어왔','어와','어올','어오는','어오고','어오면','어와서',
            '아오다','아와요','아옵니다','아왔어요','아왔다','아왔','아와','아올','아오는','아오고','아오면','아와서',
            '여오다','여와요','여옵니다','여왔어요','여왔다','여왔','여와','여올','여오는','여오고','여오면','여와서',
            // 보다 (try)
            '어보다','어봐요','어봅니다','어봤어요','어봤다','어봤','어봐','어볼','어보는','어보고','어보면','어봐서',
            '아보다','아봐요','아봅니다','아봤어요','아봤다','아봤','아봐','아볼','아보는','아보고','아보면','아봐서',
            '여보다','여봐요','여봅니다','여봤어요','여봤다','여봤','여봐','여볼','여보는','여보고','여보면','여봐서',
            // 주다 (do for someone)
            '어주다','어줘요','어줍니다','어줬어요','어줬다','어줬','어줘','어줄','어주는','어주고','어주면','어줘서',
            '아주다','아줘요','아줍니다','아줬어요','아줬다','아줬','아줘','아줄','아주는','아주고','아주면','아줘서',
            '여주다','여줘요','여줍니다','여줬어요','여줬다','여줬','여줘','여줄','여주는','여주고','여주면','여줘서',
            // 놓다 (do and leave/keep)
            '어놓다','어놔요','어놓습니다','어놨어요','어놨다','어놨','어놔','어놓을','어놓는','어놓고','어놓으면','어놔서',
            '아놓다','아놔요','아놓습니다','아놨어요','아놨다','아놨','아놔','아놓을','아놓는','아놓고','아놓으면','아놔서',
            // 두다 (do and keep)
            '어두다','어둬요','어둡니다','어뒀어요','어뒀다','어뒀','어둬','어둘','어두는','어두고','어두면','어둬서',
            '아두다','아둬요','아둡니다','아뒀어요','아뒀다','아뒀','아둬','아둘','아두는','아두고','아두면','아둬서',
            // 버리다 (do completely / end up doing)
            '어버리다','어버려요','어버립니다','어버렸어요','어버렸다','어버렸','어버려','어버릴','어버리는','어버리고','어버리면',
            '아버리다','아버려요','아버립니다','아버렸어요','아버렸다','아버렸','아버려','아버릴','아버리는','아버리고','아버리면',
            // 내다 (do through / finally do)
            '어내다','어내요','어냅니다','어냈어요','어냈다','어냈','어내','어낼','어내는','어내고','어내면','어내서',
            '아내다','아내요','아냅니다','아냈어요','아냈다','아냈','아내','아낼','아내는','아내고','아내면','아내서',
            // 쌓다 (do repeatedly)
            '어쌓다','어쌓아요','어쌓았어요','어쌓았다','어쌓았','어쌓아',
            // 드리다 (honorific 주다)
            '어드리다','어드려요','어드립니다','어드렸어요','어드렸다','어드렸','어드려','어드릴','어드리는','어드리고','어드리면',
            '아드리다','아드려요','아드립니다','아드렸어요','아드렸다','아드렸','아드려','아드릴','아드리는','아드리고','아드리면',
            '여드리다','여드려요','여드립니다','여드렸어요','여드렸다','여드렸','여드려','여드릴','여드리는','여드리고','여드리면',
            // 지다 (become / passive)
            '어지다','어져요','어집니다','어졌어요','어졌다','어졌','어져','어질','어지는','어지고','어지면','어져서',
            '아지다','아져요','아집니다','아졌어요','아졌다','아졌','아져','아질','아지는','아지고','아지면','아져서',
            '여지다','여져요','여집니다','여졌어요','여졌다','여졌','여져','여질','여지는','여지고','여지면','여져서',
            // 하다 (causative)
            '게하다','게해요','게합니다','게했어요','게했다','게했','게해','게할','게하는','게하고','게하면','게해서',
            // 시키다 (causative)
            '시키다','시켜요','시킵니다','시켰어요','시켰다','시켰','시켜','시킬','시키는','시키고','시키면','시켜서',
            // More honorific auxiliary combos
            '으시다','으셔요','으십니다','으셨어요','으셨다','으시는','으신','으실','으시면','으시고','으시며',
            // Combined honorific + auxiliary
            '어드리시다','어드리셔요','어드리십니다','어드리셨어요','어드리셨다','어드리시는','어드리신',
            '아드리시다','아드리셔요','아드리십니다','아드리셨어요','아드리셨다','아드리시는','아드리신',
            // More kính ngữ thân mật
            '실게요','실래요','실까요','시지요','시죠','시네요','시군요','시잖아요',
            '으실게요','으실래요','으실까요','으시지요','으시죠','으시네요','으시군요','으시잖아요',
        ];
        for(var i=0;i<Aux.length;i++){var a=Aux[i];if(word.endsWith(a)&&word.length>a.length){var stem=word.slice(0,-a.length);set.push(stem+'다');set.push(stem);}}
        
        // Irregular patterns — massively expanded
        var I={
            // ㅆ-past contractions
            '했':'하','됐':'되','켰':'키',
            '갔':'가','왔':'오','봤':'보','줬':'주','샀':'사',
            '섰':'서','컸':'크','났':'나','썼':'쓰','붰':'붓',
            // ㅂ-irregular (present & past)
            '더워':'덥','추워':'춥','매워':'맵','쉬워':'쉽','고마워':'고맙','어려워':'어렵',
            '무서워':'무섭','가까워':'가깝','뜨거워':'뜨겁','아름다워':'아름답',
            '가벼워':'가볍','부드러워':'부드럽','두려워':'두렵','괴로워':'괴롭',
            '더웠':'덥','추웠':'춥','매웠':'맵','쉬웠':'쉽','고마웠':'고맙','어려웠':'어렵',
            '무서웠':'무섭','가까웠':'가깝','뜨거웠':'뜨겁','아름다웠':'아름답',
            '가벼웠':'가볍','부드러웠':'부드럽','두려웠':'두렵','괴로웠':'괴롭',
            // ㄷ-irregular
            '들었':'듣','물었':'묻','걸었':'걷','실었':'싣','깨달았':'깨닫',
            '들어':'듣','물어':'묻','걸어':'걷','실어':'싣','깨달아':'깨닫',
            '들으':'듣','물으':'묻','걸으':'걷',
            // 르-irregular
            '불렀':'부르','몰랐':'모르','흘렀':'흐르','올랐':'오르',
            '빨랐':'빠르','길렀':'기르','갈랐':'가르','둘렀':'두르',
            '불러':'부르','몰라':'모르','흘러':'흐르','올라':'오르',
            '빨라':'빠르','길러':'기르','갈라':'가르','둘러':'두르',
            '흘러':'흐르','일러':'이르','눌러':'누르','굴러':'구르',
            // 으-irregular (으 drops)
            '예뻐':'예쁘','아파':'아프','바빠':'바쁘','슬퍼':'슬프','기뻐':'기쁘',
            '예뻤':'예쁘','아팠':'아프','바빴':'바쁘','슬펐':'슬프','기뻤':'기쁘',
            // ㅅ-irregular
            '나았':'낫','부었':'붓','이었':'잇','지었':'짓','그었':'긋',
            '나아':'낫','부어':'붓','이어':'잇','지어':'짓','그어':'긋',
            // ㅎ-irregular (ㅎ drops, vowel contraction)
            '파래':'파랗','하얘':'하얗','빨개':'빨갛','노래':'노랗','까매':'까맣',
            '파랬':'파랗','하얬':'하얗','빨갰':'빨갛','노랬':'노랗','까맸':'까맣',
            '이래':'이렇','그래':'그렇','저래':'저렇','어때':'어떻',
            '이랬':'이렇','그랬':'그렇','저랬':'저렇','어땠':'어떻',
            // 눕다
            '누웠':'눕','누워':'눕',
            // Other common irregulars
            '나아':'낫','고와':'곱',
            '지어':'짓',
            '퍼':'푸','펐':'푸',
            '달라':'다르','달랐':'다르',
            // Verb stems ending in vowel + 았/었 contraction
            '랐':'라','봤':'보','됐':'되','켰':'키',
            '샜':'새','댔':'대','맸':'매','뺐':'빼',
            '놨':'놓','꼈':'끼','꿨':'꾸','껐':'께',
            // More complex contractions
            '놀랐':'놀라','날랐':'날라','말랐':'마르',
            '건넜':'건너','일어났':'일어나','들어났':'들어나',
            // 준비했다 etc: strip past from 하다 verbs
            '했다':'하다','했다':'하다',
        };
        var arr=set.slice();
        for(var i=0;i<arr.length;i++){var c=arr[i];for(var k in I){var idx=c.indexOf(k);if(idx!==-1){var prefix=c.substring(0,idx);set.push(prefix+I[k]+'다');set.push(prefix+I[k]);}}}
        
        // Recursive stripping: try stripping particles/endings from already-stripped results
        var arr2=set.slice();
        for(var i=0;i<arr2.length;i++){
            var w=arr2[i];
            var P2='은,는,이,가,을,를,에,의,도,만,로,과,와,들,께,야,나,랑,요'.split(',');
            for(var j=0;j<P2.length;j++){var p=P2[j];if(w.endsWith(p)&&w.length>p.length)set.push(w.slice(0,-p.length));}
        }
        
        return set;
    }

    function lookup(word){
        var q=word.toLowerCase().trim();
        if(fullMap){var cands=unfold(q);for(var i=0;i<cands.length;i++){var e=fullMap.get(cands[i]);if(e)return e;}}
        return null;
    }

    var _lastClickY=0;
    function scrollForMobile(){
        if(window.innerWidth>768) return;
        var panelH=window.innerHeight*0.66;
        var panelTop=window.innerHeight-panelH;
        if(_lastClickY>panelTop-40){
            window.scrollBy({top:_lastClickY-panelTop+60,behavior:'smooth'});
        }
    }

    // ── Show panel ──
    var curData=null;
    function showPanel(data){
        curData=data;
        document.getElementById('hv-word').textContent=data.w;
        resetSearchUI();
        hvExpanded=false;panel.classList.remove('hv-exp');document.getElementById('hv-expand').innerHTML=svgExpand;
        var body=document.getElementById('hv-body');
        var senses=data.s||[{m:data.m,d:data.d,x:data.x}];
        var html='';
        for(var i=0;i<senses.length;i++){
            var sp=senses[i];
            var sk=data.w+'::'+sp.m;
            var saved=window.savedVocabSet&&(window.savedVocabSet.has(sk)||window.savedVocabSet.has(data.w));
            html+='<div style="margin-bottom:8px;padding:10px 12px;background:#f8fafc;border:1px solid #f1f5f9;border-radius:10px;">';
            html+='<div style="display:flex;justify-content:space-between;align-items:flex-start;">';
            html+='<div style="flex:1;"><div style="font-size:0.7em;color:#94a3b8;font-weight:600;margin-bottom:2px;">NGHĨA '+(i+1)+'</div>';
            html+='<div style="color:#0f172a;font-weight:500;">'+sp.m+'</div>';
            if(sp.d)html+='<div style="color:#64748b;font-size:0.85em;line-height:1.45;margin-top:2px;">'+sp.d+'</div></div>';
            html+='<button class="hv-sv" data-word="'+data.w.replace(/"/g,'&quot;')+'" data-mean="'+sp.m.replace(/"/g,'&quot;')+'" data-key="'+sk+'" data-sidx="'+i+'" style="flex-shrink:0;background:none;border:none;cursor:pointer;font-size:1.1em;padding:2px 4px;margin-left:6px;'+(saved?'color:#f59e0b;':'color:#cbd5e1;')+'" title="'+(saved?'Bỏ lưu':'Lưu vào sổ từ')+'">'+(saved?'★':'☆')+'</button>';
            html+='</div>';
            if(sp.x&&sp.x.length)for(var j=0;j<sp.x.length;j++){var ex=typeof sp.x[j]==='string'?sp.x[j]:(sp.x[j].ko||'');if(ex)html+='<div class="hv-ex" data-idx="'+i+'-'+j+'" style="margin-top:3px;padding:5px 8px;background:#fff;border:1px solid #e2e8f0;border-radius:6px;font-size:0.82em;color:#475569;">'+ex+'</div>';}
            html+='</div>';
        }
        if(data.t)html+='<span style="display:inline-block;margin-top:4px;padding:2px 10px;background:#eff6ff;color:#2563eb;border-radius:6px;font-size:0.75em;">'+data.t+'</span>';
        if(data.k)html+='<div style="margin-top:10px;padding:8px 12px;background:#fffbeb;border:1px solid #fef3c7;border-radius:10px;"><div style="font-size:0.7em;color:#92400e;font-weight:600;margin-bottom:2px;">한국어 정의</div><div style="color:#78350f;font-size:0.85em;line-height:1.5;">'+data.k+'</div></div>';
        html+='<div style="font-size:0.6em;color:#cbd5e1;margin-top:8px;text-align:right;">📚 KRDict</div>';
        body.innerHTML=html;
        if(window.innerWidth<=768){panel.style.left='';panel.style.right='';panel.style.top='';panel.style.bottom='';}
        panel.style.display='block';
        // Scroll on mobile after display
        scrollForMobile();
        // Save buttons
        body.querySelectorAll('.hv-sv').forEach(function(btn){
            btn.addEventListener('click',function(e){e.stopPropagation();handleSave(this.dataset.word,this.dataset.mean,this.dataset.key,+this.dataset.sidx,this);});
        });
        // Auto-translate
        autoTranslate();
    }
    var _lastClickY=0;
    function scrollForMobile(e){if(window.innerWidth<=768&&_lastClickY>window.innerHeight*0.34-40){window.scrollBy({top:_lastClickY-window.innerHeight*0.34+60,behavior:'smooth'});}}

    // ── Auto-translate examples ──
    async function autoTranslate(){
        var divs=panel.querySelectorAll('.hv-ex');
        for(var i=0;i<divs.length;i++){
            var d=divs[i];
            if(d.querySelector('.hv-vi')) continue;
            var t=d.textContent.trim();if(!t) continue;
            try{
                var resp=await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl=vi&dt=t&q='+encodeURIComponent(t));
                var data=await resp.json();
                var vi=data[0]&&data[0].map(function(s){return s[0];}).filter(Boolean).join('')||'';
                if(vi){var s=document.createElement('span');s.className='hv-vi';s.style.cssText='display:block;color:#16a34a;font-size:0.9em;margin-top:2px;';s.textContent=vi;d.appendChild(s);}
            }catch(_){}
        }
    }

    // ── Save ──
    async function handleSave(word,meaning,saveKey,sIdx,btn){
        if(typeof firebase==='undefined'||!firebase.auth){alert('Firebase chưa tải');return;}
        var cu=firebase.auth().currentUser;
        if(!cu){alert('Vui lòng đăng nhập để lưu từ!');return;}
        var db=firebase.firestore();
        var isSaved=window.savedVocabSet&&(window.savedVocabSet.has(saveKey)||window.savedVocabSet.has(word));
        if(isSaved){
            btn.textContent='⏳';btn.disabled=true;
            if(window.savedVocabSet){window.savedVocabSet.delete(saveKey);window.savedVocabSet.delete(word);}
            try{await db.collection('users').doc(cu.uid).collection('vocabulary').doc(saveKey).delete();}catch(_){}
            try{await db.collection('users').doc(cu.uid).collection('vocabulary').doc(word).delete();}catch(_){}
            updateStars(word);
            return;
        }
        // On mobile, shrink panel so save dialog is visible
        if(window.innerWidth<=768) panel.classList.add('hv-shrink');
        // Collect examples
        await new Promise(function(r){setTimeout(r,800);});
        var senseDef='',senseExamples=[];
        if(curData){
            var senses=curData.s||[{m:curData.m,d:curData.d,x:curData.x}];
            var sense=senses[sIdx];
            if(sense){senseDef=sense.d||'';if(sense.x){sense.x.forEach(function(ex,j){var ko=typeof ex==='string'?ex:(ex.ko||'');if(!ko)return;var vi='';var d=panel.querySelector('.hv-ex[data-idx="'+sIdx+'-'+j+'"]');if(d){var vs=d.querySelector('.hv-vi');if(vs)vi=vs.textContent.replace(/^ → /,'').trim();}senseExamples.push({ko:ko,vi:vi});});}}
            if(senseExamples.length>1)senseExamples=[senseExamples[Math.floor(Math.random()*senseExamples.length)]];
        }
        // Folder picker — 2-level hierarchy
        // Try window.userVocabLists first, fall back to Firestore
        var allLists=window.userVocabLists;
        if(!allLists||!allLists.length){
            try{
                var userDoc=await db.collection('users').doc(cu.uid).get();
                if(userDoc.exists){var data=userDoc.data();allLists=data.vocabLists||[];}
            }catch(_){}
        }
        // Also collect from actual vocabulary docs (more reliable)
        try{
            var vocabSnap=await db.collection('users').doc(cu.uid).collection('vocabulary').get();
            vocabSnap.forEach(function(d){
                var ln=d.data().listName;
                if(ln&&allLists.indexOf(ln)===-1) allLists.push(ln);
            });
        }catch(_){}
        if(!allLists||!allLists.length) allLists=['Đã lưu'];
        if(allLists.indexOf('Đã lưu')===-1) allLists.unshift('Đã lưu');
        // Update global list
        window.userVocabLists=allLists;

        // Extract top-level folders
        var folders=[];
        allLists.forEach(function(l){
            var parts=l.split('/');
            var folder=parts[0];
            if(folders.indexOf(folder)===-1) folders.push(folder);
        });

        function showFolderPicker(){
            var h='<div style="font-size:0.95em;font-weight:700;color:#64748b;margin-bottom:10px;">Lưu "<b>'+word+'</b>" vào:</div>';
            h+='<div style="max-height:220px;overflow-y:auto;">';
            folders.forEach(function(f){
                h+='<button class="swal-folder-btn" data-f="'+f+'" style="width:100%;text-align:left;padding:8px 12px;border:none;background:#f8fafc;border-radius:6px;margin-bottom:5px;cursor:pointer;font-weight:600;color:#1e293b;">📁 '+f+'</button>';
            });
            h+='</div>';
            h+='<button class="swal-new-folder-btn" style="width:100%;text-align:left;padding:8px 12px;border:none;background:#fef3c7;border-radius:6px;margin-top:5px;cursor:pointer;font-weight:600;color:#d97706;">＋ Tạo thư mục</button>';
            return h;
        }

        function showLessonPicker(folder){
            var lessons=allLists.filter(function(l){return l.indexOf(folder+'/')===0;});
            var h='<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;"><span style="font-weight:700;color:#1e293b;">📁 '+folder+'</span><span style="font-size:.75em;color:#94a3b8;">('+lessons.length+' bài)</span></div>';
            h+='<div style="max-height:200px;overflow-y:auto;">';
            h+='<button class="swal-l-btn" data-l="'+folder+'" style="width:100%;text-align:left;padding:8px 12px;border:none;background:#eff6ff;border-radius:6px;margin-bottom:5px;cursor:pointer;font-weight:600;color:#2563eb;">📂 Lưu vào thư mục này</button>';
            lessons.forEach(function(l){var ln=l.substring(folder.length+1);h+='<button class="swal-l-btn" data-l="'+l+'" style="width:100%;text-align:left;padding:8px 12px;border:none;background:#f8fafc;border-radius:6px;margin-bottom:5px;cursor:pointer;font-weight:600;color:#1e293b;">📖 '+ln+'</button>';});
            h+='</div>';
            h+='<button class="swal-new-l" style="width:100%;text-align:left;padding:8px 12px;border:none;background:#fef3c7;border-radius:6px;margin-top:5px;cursor:pointer;font-weight:600;color:#d97706;">＋ Tạo bài học</button>';
            h+='<button class="swal-back" style="width:100%;text-align:left;padding:8px 12px;border:none;background:#f1f5f9;border-radius:6px;margin-top:5px;cursor:pointer;font-weight:600;color:#64748b;">← Trở về</button>';
            return h;
        }

        async function doSave(listName){
            Swal.close();
            await new Promise(function(r){setTimeout(r,400);});
            panel.classList.remove('hv-shrink');
            btn.textContent='⏳';btn.disabled=true;
            var doc={word:word,meaning:meaning,listName:listName,status:0,savedAt:firebase.firestore.FieldValue.serverTimestamp()};
            if(senseDef)doc.definition=senseDef;
            if(senseExamples.length)doc.examples=senseExamples;
            await db.collection('users').doc(cu.uid).collection('vocabulary').doc(saveKey).set(doc);
            if(window.savedVocabSet)window.savedVocabSet.add(saveKey);
            updateStars(word);
            panel._ignoreClick=true;setTimeout(function(){panel._ignoreClick=false;},300);
        }

        function bindFolderEvents(){
            document.querySelectorAll('.swal-folder-btn').forEach(function(fb){
                fb.addEventListener('click',function(){
                    Swal.getHtmlContainer().innerHTML=showLessonPicker(fb.dataset.f);
                    bindLessonEvents(fb.dataset.f);
                });
            });
            var nf=document.querySelector('.swal-new-folder-btn');
            if(nf)nf.addEventListener('click',async function(){
                var r=await Swal.fire({title:'Tạo thư mục mới',input:'text',inputPlaceholder:'Nhập tên thư mục...',showCancelButton:true,confirmButtonText:'Tạo',cancelButtonText:'Hủy'});
                if(!r.value) return;
                var newName=r.value.trim();if(!newName) return;
                if(allLists.indexOf(newName)===-1) allLists.push(newName);
                if(folders.indexOf(newName)===-1) folders.push(newName);
                await db.collection('users').doc(cu.uid).set({vocabLists:allLists},{merge:true});
                window.userVocabLists=allLists;
                Swal.getHtmlContainer().innerHTML=showFolderPicker();
                bindFolderEvents();
            });
        }

        function bindLessonEvents(folder){
            document.querySelectorAll('.swal-l-btn').forEach(function(lb){
                lb.addEventListener('click',function(){doSave(lb.dataset.l);});
            });
            var nl=document.querySelector('.swal-new-l');
            if(nl)nl.addEventListener('click',async function(){
                var r=await Swal.fire({title:'Tạo bài học trong "'+folder+'"',input:'text',inputPlaceholder:'Nhập tên bài học...',showCancelButton:true,confirmButtonText:'Tạo',cancelButtonText:'Hủy'});
                if(!r.value) return;
                var newName=r.value.trim();if(!newName) return;
                var fullPath=folder+'/'+newName;
                if(allLists.indexOf(fullPath)===-1) allLists.push(fullPath);
                await db.collection('users').doc(cu.uid).set({vocabLists:allLists},{merge:true});
                window.userVocabLists=allLists;
                doSave(fullPath);
            });
            var back=document.querySelector('.swal-back');
            if(back)back.addEventListener('click',function(){
                Swal.getHtmlContainer().innerHTML=showFolderPicker();
                bindFolderEvents();
            });
        }
        if(typeof Swal==='undefined'){alert('Cần SweetAlert2');return;}
        Swal.fire({title:'📁 Lưu từ vựng',html:showFolderPicker(),showCloseButton:true,showConfirmButton:false,
            didOpen:function(){bindFolderEvents();},
            didClose:function(){panel.classList.remove('hv-shrink');}
        });
    }
    function updateStars(word){
        panel.querySelectorAll('.hv-sv[data-word="'+word.replace(/"/g,'&quot;')+'"]').forEach(function(b){
            var bk=b.dataset.key;
            var s=window.savedVocabSet&&(window.savedVocabSet.has(bk)||window.savedVocabSet.has(word));
            b.textContent=s?'★':'☆';
            b.style.color=s?'#f59e0b':'#cbd5e1';
            b.title=s?'Bỏ lưu':'Lưu vào sổ từ';
        });
    }

    // ── Click handler ──
    document.addEventListener('click',async function(e){
        if(e.target.closest('#hover-vocab-panel')||e.target.closest('.swal2-container')) return;
        if(panel._ignoreClick) return;
        _lastClickY=e.clientY;
        var word=getWord(e);
        if(!word){panel.style.display='none';return;}
        var result=lookup(word);
        if(result){showPanel(result);return;}
        if(!fullLoaded){await loadDict();result=lookup(word);if(result){showPanel(result);return;}}
        // API fallback
        if(typeof VocabExternal!=='undefined'){try{var res=await VocabExternal.fetchExamples(word,word);if(res&&res.length>0){showPanel({w:word,m:res[0].viMeaning||res[0].meaning||'',t:res[0].pos||'',x:(res[0].examples||res).slice(0,3).map(function(r){return r.ko||'';}),k:'',src:'📚 KRDict'});return;}}catch(_){}}
        panel.style.display='none';
    });

    console.log('[HoverLookup] v6 ready — full UI');
})();
