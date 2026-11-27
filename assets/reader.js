/* 经页阅读器：字号、行宽、分节引用、阅读进度 */
(function(){
  var art=document.querySelector('article.text'); if(!art) return;
  var ps=art.querySelectorAll('p');
  var rd=document.getElementById('rd');
  var KEY='obenno.rd.'+location.pathname;
  var L=(function(){try{return JSON.parse(localStorage.getItem('obenno.rd.cfg'))||{}}catch(e){return {}}})();
  function save(){try{localStorage.setItem('obenno.rd.cfg',JSON.stringify(L))}catch(e){}}
  function size(v){L.size=v;save();applySize()}
  function applySize(){
    var v=L.size||0, px=[16,17.5,19,21][v]||17.5;
    art.style.setProperty('--rdp',px+'px');
    var bs=rd?rd.querySelectorAll('[data-rd="size-"], [data-rd="size+"]'):[];
    for(var i=0;i<bs.length;i++) bs[i].classList.remove('on');
  }
  function applyWidth(){document.body.classList.toggle('rd-wide',!!L.wide)}
  applySize(); applyWidth();
  /* 节数 */
  var nEl=document.getElementById('rdN');
  if(nEl) nEl.textContent='共 '+ps.length+' 节 / '+ps.length+' sections';
  if(rd) rd.setAttribute('data-rd-n',ps.length);
  /* 引用 */
  function artName(){
    var h1=document.querySelector('header.hd h1'); return h1?h1.textContent.trim():document.title.split('｜')[0];
  }
  function pinOf(p){
    var prev=p.previousElementSibling;
    while(prev){ if(prev.tagName==='H2'||prev.tagName==='H3') return prev.textContent.replace(/^\s*\d+\s*/,'').trim(); prev=prev.previousElementSibling;}
    return '';
  }
  function toast(msg){
    var t=document.getElementById('rdToast');
    if(!t){t=document.createElement('div');t.id='rdToast';t.className='rd-toast';document.body.appendChild(t)}
    t.textContent=msg; t.classList.add('on'); clearTimeout(t._h); t._h=setTimeout(function(){t.classList.remove('on')},1800);
  }
  function copyText(txt){
    if(navigator.clipboard&&navigator.clipboard.writeText){ return navigator.clipboard.writeText(txt).then(function(){toast('已复制此节引用 · citation copied')},function(){fallback(txt)}) }
    fallback(txt);
  }
  function fallback(txt){
    var ta=document.createElement('textarea');ta.value=txt;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();
    try{document.execCommand('copy');toast('已复制此节引用 · citation copied')}catch(e){toast('复制失败，请手动选择 · copy failed')}
    document.body.removeChild(ta);
  }
  for(var i=0;i<ps.length;i++){
    (function(p){
      p.addEventListener('click',function(e){
        if(e.target.closest('a')) return;
        var id=p.id||'', sn=id.replace(/^s/,'');
        var q=p.textContent.replace(/\s+/g,'').slice(0,24);
        var pin=pinOf(p);
        var url='https://www.obenno.com'+location.pathname+(id?'#'+id:'');
        var cite='《'+artName()+'》'+(pin?'（'+pin+'）':'')+' 第'+sn+'节：「'+q+'……」 '+url;
        p.classList.add('copied'); setTimeout(function(){p.classList.remove('copied')},900);
        copyText(cite);
      });
    })(ps[i]);
  }
  /* 进度 */
  var idx=0;
  function nearest(){
    var mid=window.innerHeight*0.35, best=0, bi=0;
    for(var i=0;i<ps.length;i++){ var r=ps[i].getBoundingClientRect(); if(r.top<=mid&&r.top>=-r.height){ best=r.top; bi=i; } if(r.top>mid) break; }
    return bi;
  }
  var last=-1, timer=null;
  function persist(){
    var r=document.documentElement.scrollHeight-window.innerHeight;
    var pr=r>0?Math.min(1,Math.max(0,window.scrollY/r)):0;
    try{localStorage.setItem(KEY,JSON.stringify({i:nearest(),p:pr,t:Date.now()}))}catch(e){}
  }
  window.addEventListener('scroll',function(){ if(timer) return; timer=setTimeout(function(){timer=null;persist()},450)},{passive:true});
  window.addEventListener('pagehide',persist);
  /* 恢复位置提示 */
  var saved=null; try{saved=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){}
  if(saved&&saved.p>0.04&&saved.p<0.96&&(!location.hash)){
    var chip=document.createElement('button'); chip.type='button'; chip.className='rd-chip';
    chip.textContent='继续上次 Resume · 第'+((saved.i||0)+1)+'节';
    chip.onclick=function(){ var t=ps[saved.i]; if(t) t.scrollIntoView({block:'start'}); chip.remove(); };
    var bar=document.getElementById('rd'); if(bar){bar.appendChild(chip)}else{document.body.appendChild(chip)}
    setTimeout(function(){try{chip.remove()}catch(e){}},12000);
  }
  /* 工具条 */
  if(rd){
    rd.addEventListener('click',function(e){
      var b=e.target.closest('[data-rd]'); if(!b) return;
      var k=b.getAttribute('data-rd');
      if(k==='size+'){size(Math.min(3,(L.size||0)+1))}
      if(k==='size-'){size(Math.max(0,(L.size||0)-1))}
      if(k==='width'){L.wide=!L.wide;save();applyWidth();b.classList.toggle('on',!!L.wide)}
      if(k==='top'){window.scrollTo({top:0,behavior:'smooth'})}
      if(k==='print'){window.print()}
    });
  }
})();
