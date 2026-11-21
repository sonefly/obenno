
(function(){
  "use strict";

  var stage   = document.getElementById('stage');
  var intro   = document.getElementById('intro');
  var strike  = document.getElementById('strike');
  var incense = document.getElementById('incense');
  var censerEl= document.querySelector('.censer');
  var soundBtn= document.getElementById('sound');
  var flash   = document.getElementById('flash');
  var ripple  = document.getElementById('ripple');

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* 语言：中 / EN（动态文案统一走 L(zh,en)，静态文案由 langModule 换上） */
  window.__LANG = 'zh';
  try { if (localStorage.getItem('fxy-lang') === 'en') window.__LANG = 'en'; } catch(e){}
  function L(zh, en){ return window.__LANG === 'en' ? en : zh; }

  /* 本地存储安全读写（file:// 下某些环境会抛异常） */
  var store = {
    get: function(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } },
    set: function(k, v){ try{ localStorage.setItem(k, v); }catch(e){} }
  };

  /* ================= 声音 ================= */
  /* 背景梵唱《大悲咒》，循环不断；钟声各自独立发声，可与梵唱、上一次钟声叠加 */
  var amb  = new Audio('assets/dabei.mp3');
  amb.loop = true;
  // 不预取：970KB 的梵唱若在首屏抢带宽，山门与佛像会明显变慢；第一次播放（用户手势）时才取
  amb.preload = 'none';
  amb.volume = 0;

  var bellVoices = [];
  for (var vi = 0; vi < 3; vi++){
    var vb = new Audio('assets/bell.mp3');
    vb.preload = 'auto';            // 钟声仅 96KB 且三音源共用同一文件，预取不影响首屏
    vb.volume = 0.52;
    bellVoices.push(vb);
  }
  // 梵唱排在首屏之后：空闲或入殿后再取，既不抢山门与佛像的带宽，也不至于入殿听不到
  function warmChant(){
    try{ if (amb.readyState === 0) amb.load(); }catch(e){}
  }
  if (window.requestIdleCallback) requestIdleCallback(warmChant, { timeout: 4000 });
  else setTimeout(warmChant, 2400);
  var bellIdx = 0;

  /* 离开本页（切标签页、最小化、焦点移走）就暂停梵唱；回到本页若原本在放，则续上 */
  var ambWasPlaying = false;
  function ambHold(){
    if (!amb.paused){ ambWasPlaying = true; amb.pause(); }
    var pb = document.getElementById('sutraPlay');
    if (pb) pb.textContent = L('梵唱 · 起','Chant · start');
  }
  function ambContinue(){
    if (!ambWasPlaying) return;
    ambWasPlaying = false;
    var pr = amb.play();
    if (pr && pr.catch){ pr.catch(function(){}); }
    var pb = document.getElementById('sutraPlay');
    if (pb) pb.textContent = L('梵唱 · 止','Chant · stop');
  }
  document.addEventListener('visibilitychange', function(){
    if (document.hidden) ambHold(); else ambContinue();
  }, false);
  window.addEventListener('blur', function(){ ambHold(); }, false);
  window.addEventListener('focus', function(){ if (!document.hidden) ambContinue(); }, false);


  var muted = store.get('fxy-muted') === '1';
  var entered = false;

  function fade(el, to, dur, done){
    var from = el.volume, t0 = performance.now();
    function step(){
      var p = Math.min(1, (performance.now() - t0) / dur);
      el.volume = Math.max(0, Math.min(1, from + (to - from) * p));
      if (p < 1) requestAnimationFrame(step);
      else if (done) done();
    }
    requestAnimationFrame(step);
  }

  function playAmbience(){
    if (muted) return;
    amb.play().then(function(){ fade(amb, 0.26, 4200); }).catch(function(){});
  }

  function setSoundState(on){
    muted = !on;
    soundBtn.setAttribute('aria-checked', on ? 'true' : 'false');
    store.set('fxy-muted', muted ? '1' : '0');
    if (on && entered) {
      amb.play().then(function(){ fade(amb, 0.26, 1600); }).catch(function(){});
    } else {
      fade(amb, 0, 900, function(){ amb.pause(); });
    }
  }
  soundBtn.setAttribute('aria-checked', muted ? 'false' : 'true');
  soundBtn.addEventListener('click', function(){ setSoundState(muted); });

  /* ================= 叩钟 ================= */
  function ringBell(){
    // 每一记钟用独立的音源，上一记的余音不被切断，可与梵唱同时作响
    if (!muted){
      var bv = bellVoices[bellIdx++ % bellVoices.length];
      try{
        bv.currentTime = 0;
        bv.play().catch(function(){});
      }catch(e){}
    }

    strike.classList.add('striking');
    setTimeout(function(){ strike.classList.remove('striking'); }, 950);

    flash.classList.remove('on');
    ripple.classList.remove('on');
    void flash.offsetWidth;
    flash.classList.add('on');
    ripple.classList.add('on');
    setTimeout(function(){ flash.classList.remove('on'); ripple.classList.remove('on'); }, 2500);
  }
  strike.addEventListener('click', ringBell);

  /* ================= 添香 ================= */
  var fedTimer = 0, litTimer = 0;
  incense.addEventListener('click', function(){
    censerEl.classList.remove('fed');
    void censerEl.offsetWidth;          // 重新触发过渡，连点也有反馈
    censerEl.classList.add('fed');
    clearTimeout(fedTimer);
    fedTimer = setTimeout(function(){ censerEl.classList.remove('fed'); }, 4600);

    // 按钮自身也亮一下，点击处有明确反馈
    incense.classList.add('lit');
    clearTimeout(litTimer);
    litTimer = setTimeout(function(){ incense.classList.remove('lit'); }, 1500);

    // 一次喷出一簇浓香
    for (var i = 0; i < 26; i++) puffs.push(newPuff(0, true));
    if (puffs.length > 110) puffs.splice(0, puffs.length - 110);
  });

  /* ================= 二维码放大 ================= */
  var qrModal = document.getElementById('qrModal');
  function openQr(kind){
    if (!kind) return;
    qrModal.setAttribute('data-kind', kind);
    qrModal.classList.add('open');
  }
  function closeQr(){
    qrModal.classList.remove('open');
    qrModal.setAttribute('data-kind', '');
  }
  qrModal.addEventListener('click', function(e){
    if (e.target && e.target.closest && (e.target.closest('.qr-bank-copy') || e.target.closest('.qr-bank'))) return;
    closeQr();
  });
  var giveBtn = document.getElementById('giveBtn');
  if (giveBtn) giveBtn.addEventListener('click', function(){ openQr('both'); });

  /* 国际汇款信息 · 一键复制 */
  (function bankCopyModule(){
    var btn = document.getElementById('bankCopy');
    if (!btn) return;
    var lines = [
      '账户名称 / Account name: Fei Song',
      'IBAN: GB03EZYR04000100371583',
      '账号 / Account number: 00371583',
      'BIC / SWIFT: EZYRGB2LDPB',
      '银行名称 / Bank: IFAST GLOBAL BANK LIMITED',
      '银行地址 / Bank address: iFAST Global Bank Limited, SQB, 77 Marsh Wall, London E14 9SH'
    ].join('\n');
    btn.addEventListener('click', function(){
      if (navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(lines).then(function(){
          toast('汇款信息已复制 · Bank details copied');
        }, function(){
          toast('复制被拦，请长按选择 · copy blocked, long-press instead');
        });
      } else {
        toast('请长按选择复制 · long-press to copy');
      }
    });
  })();

  /* ================= 求签 ================= */
  var oracleEl = document.getElementById('oracle');
  var oracleBtn = document.getElementById('oracleBtn');
  var SIGNS = [
    { no:'一', grade:'上吉', gradeEn:'MOST FAVOURABLE',
      lines:['莲开水面净无尘','一炷心香透古今','莫问前程何处是','回头即是本来人'],
      read:'心静之处，自有归途。', readEn:'A still mind finds its own way home.' },
    { no:'二', grade:'上吉', gradeEn:'MOST FAVOURABLE',
      lines:['钟声三扣殿门开','香雾徐行绕玉台','所愿虽迟终有应','春风不负种花人'],
      read:'所求虽慢，终会回应。', readEn:'What is asked in patience is answered in season.' },
    { no:'三', grade:'中吉', gradeEn:'FAVOURABLE',
      lines:['云在青山水在瓶','一指轻安万缘轻','且做眼前分明事','不攀高来不问低'],
      read:'做好眼前事，便是修行。', readEn:'Tend the task at hand; that is the practice.' },
    { no:'四', grade:'上吉', gradeEn:'MOST FAVOURABLE',
      lines:['金身不语坐莲台','照见三千念与灰','若解放下两个字','一灯能破百年灾'],
      read:'放下二字，胜过千言。', readEn:'Two words — let go — outshine a thousand prayers.' },
    { no:'五', grade:'中平', gradeEn:'STEADY',
      lines:['古殿深庭落叶迟','风来只动旧幡旗','心动幡动皆非实','且看风停叶落时'],
      read:'该来的会来，该去的不留。', readEn:'What comes, comes; what leaves, leaves.' },
    { no:'六', grade:'上吉', gradeEn:'MOST FAVOURABLE',
      lines:['殿前石阶苔色深','步步登临步步金','莫嫌来路多风雨','檐下灯明待归人'],
      read:'走过风雨，方识灯火。', readEn:'Those who walk through rain know the worth of light.' },
    { no:'七', grade:'中吉', gradeEn:'FAVOURABLE',
      lines:['一炉香烬一炉新','寒到深时自暖人','世味尝来皆淡薄','唯余檐角月轮真'],
      read:'淡处有真味。', readEn:'In plainness there is a true taste.' },
    { no:'八', grade:'上吉', gradeEn:'MOST FAVOURABLE',
      lines:['钟残鼓歇殿门闲','一枕松风梦未还','万籁无声心自响','此中消息不须参'],
      read:'心自响时，不必多问。', readEn:'When the heart resounds, no question remains.' },
    { no:'九', grade:'中平', gradeEn:'STEADY',
      lines:['香灰冷了再添香','一念才平一念长','休问吉凶归何处','莲池无浪自成行'],
      read:'再添一炷，便多一分定。', readEn:'One more stick of incense adds a little steadiness.' },
    { no:'十', grade:'上吉', gradeEn:'MOST FAVOURABLE',
      lines:['檐头滴水穿石痕','日日寻常日日深','莫笑功夫无可见','九层台起一抔尘'],
      read:'日复一日，自有所成。', readEn:'Day upon day, the work quietly accumulates.' },
    { no:'十一', grade:'上吉', gradeEn:'MOST FAVOURABLE',
      lines:['金殿灯昏夜未央','有人叩钟有人香','你今立处即福地','何须更觅远方光'],
      read:'你立足处，即是福地。', readEn:'Where you stand now is already holy ground.' },
    { no:'十二', grade:'中吉', gradeEn:'FAVOURABLE',
      lines:['风过殿廊幡自动','月移金柱影初斜','随缘不是不着力','着力不用在虚华'],
      read:'随缘，仍要着力。', readEn:'Go with the flow — yet still do the work.' }
  ];
  function showOracle(){
    var s = SIGNS[Math.floor(Math.random() * SIGNS.length)];
    document.getElementById('oNo').textContent = s.no;
    document.getElementById('oGrade').textContent = s.grade;
    document.getElementById('oGradeEn').textContent = s.gradeEn;
    document.getElementById('oRead').textContent = s.read;
    document.getElementById('oReadEn').textContent = s.readEn;
    var verse = document.getElementById('oVerse');
    verse.innerHTML = '';
    for (var i = 0; i < s.lines.length; i++){
      var sp = document.createElement('span');
      sp.className = 'o-line';
      sp.textContent = s.lines[i];
      sp.style.animationDelay = (i * 0.13 + 0.1).toFixed(2) + 's';
      verse.appendChild(sp);
    }
    oracleEl.classList.add('show');
  }
  function hideOracle(){ oracleEl.classList.remove('show'); }
  if (oracleBtn) oracleBtn.addEventListener('click', showOracle);
  if (oracleEl) oracleEl.addEventListener('click', hideOracle);

  /* ================= 时辰 ================= */
  var HOURS = [
    ['子时 · 夜半', 'Hour of the Rat · Midnight'],
    ['丑时 · 鸡鸣', 'Hour of the Ox · Cockcrow'],
    ['寅时 · 平旦', 'Hour of the Tiger · First Light'],
    ['卯时 · 日出', 'Hour of the Rabbit · Sunrise'],
    ['辰时 · 食时', 'Hour of the Dragon · Morning Meal'],
    ['巳时 · 隅中', 'Hour of the Snake · Late Morning'],
    ['午时 · 日中', 'Hour of the Horse · High Noon'],
    ['未时 · 日昳', 'Hour of the Goat · Afternoon Sun'],
    ['申时 · 哺时', 'Hour of the Monkey · Evening Meal'],
    ['酉时 · 日入', 'Hour of the Rooster · Sunset'],
    ['戌时 · 黄昏', 'Hour of the Dog · Dusk'],
    ['亥时 · 人定', 'Hour of the Boar · Rest']
  ];
  var hourZh = document.getElementById('hourZh');
  var hourEn = document.getElementById('hourEn');
  function updateHour(){
    var idx = Math.floor(((new Date().getHours() + 1) % 24) / 2);
    hourZh.textContent = HOURS[idx][0];
    hourEn.textContent = HOURS[idx][1];
  }
  updateHour();
  setInterval(updateHour, 30000);

  /* ================= 静坐 · 一炷香 ================= */
  var sitBtn = document.getElementById('sit');
  var sitPanel = document.getElementById('sitPanel');
  var sitTimeEl = document.getElementById('sitTime');
  var sitCapZh = document.getElementById('sitCapZh');
  var sitCapEn = document.getElementById('sitCapEn');
  var sitStopBtn = document.getElementById('sitStop');
  var sitEmberEl = document.getElementById('sitEmber');
  var sitStick = sitEmberEl ? sitEmberEl.parentNode : null;
  var SIT_SECONDS = 180;              // 一炷香：3 分钟
  var sitRaf = 0, sitEndTimer = 0, sitRunning = false;

  function pad2(n){ return (n < 10 ? '0' : '') + n; }
  function sitText(sec){ return pad2(Math.floor(sec / 60)) + ':' + pad2(sec % 60); }
  function sitLabels(tipZh, tipEn, btnZh){
    sitCapZh.textContent = tipZh;
    sitCapEn.textContent = tipEn;
    sitStopBtn.textContent = btnZh;
  }

  function startSit(){
    if (sitRunning) return;
    sitRunning = true;
    clearTimeout(sitEndTimer);
    sitLabels('一炷香 · 静坐', 'One stick of incense', '结束静坐 · End');
    sitTimeEl.textContent = sitText(SIT_SECONDS);
    sitEmberEl.style.top = '0px';
    sitPanel.classList.add('show');
    sitPanel.setAttribute('aria-hidden', 'false');
    if (sitBtn) sitBtn.classList.add('lit');
    if (!muted) ringBell();
    var t0 = performance.now();
    (function tick(){
      var el = (performance.now() - t0) / 1000;
      var passed = Math.min(SIT_SECONDS, el);
      var remain = Math.max(0, SIT_SECONDS - Math.floor(el));
      sitTimeEl.textContent = sitText(remain);
      if (sitStick) sitEmberEl.style.top = Math.round((sitStick.clientHeight - 9) * (passed / SIT_SECONDS)) + 'px';
      if (el >= SIT_SECONDS){ finishSit(); return; }
      sitRaf = requestAnimationFrame(tick);
    })();
  }

  function finishSit(){
    sitRaf = 0;
    if (!sitRunning) return;
    sitRunning = false;
    sitTimeEl.textContent = '00:00';
    sitLabels('香已燃尽', 'The incense has burnt out', '收起 · Close');
    if (!muted) ringBell();
    sitEndTimer = setTimeout(hideSit, 2800);
  }

  function hideSit(){
    if (sitRaf){ cancelAnimationFrame(sitRaf); sitRaf = 0; }
    sitRunning = false;
    sitPanel.classList.remove('show');
    sitPanel.setAttribute('aria-hidden', 'true');
    if (sitBtn) sitBtn.classList.remove('lit');
    sitTimeEl.textContent = sitText(SIT_SECONDS);
    sitEmberEl.style.top = '0px';
    sitLabels('一炷香 · 静坐', 'One stick of incense', '结束静坐 · End');
  }

  if (sitBtn) sitBtn.addEventListener('click', startSit);
  if (sitStopBtn) sitStopBtn.addEventListener('click', hideSit);
  /* Esc 的收口统一在视图模块里处理（弹码 > 签文 > 经卷 > 静坐） */

  /* ================= 访客问候 ================= */
  var welcomeEl = document.getElementById('welcome');
  var wHon = document.getElementById('wHon');
  var wHonEn = document.getElementById('wHonEn');
  var wFrom = document.getElementById('wFrom');
  var wFromEn = document.getElementById('wFromEn');
  var HONOR = ['善信', '檀越', '施主', '居士'];
  var HONOR_EN = ['WELCOME, DEVOTEE', 'WELCOME, BENEFACTOR', 'WELCOME, ALMSGIVER', 'WELCOME, LAY BUDDHIST'];

  function pickHonor(seed){
    var s = seed || '远方', h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973;
    return HONOR[h % HONOR.length];
  }
  function pickHonorIndex(seed){
    var s = seed || '远方', h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973;
    return h % HONOR.length;
  }
  var enRegion = '';
  var PROV_EN = {
    '北京':'BEIJING','天津':'TIANJIN','上海':'SHANGHAI','重庆':'CHONGQING',
    '河北':'HEBEI','山西':'SHANXI','辽宁':'LIAONING','吉林':'JILIN','黑龙江':'HEILONGJIANG',
    '江苏':'JIANGSU','浙江':'ZHEJIANG','安徽':'ANHUI','福建':'FUJIAN','江西':'JIANGXI',
    '山东':'SHANDONG','河南':'HENAN','湖北':'HUBEI','湖南':'HUNAN','广东':'GUANGDONG',
    '海南':'HAINAN','四川':'SICHUAN','贵州':'GUIZHOU','云南':'YUNNAN','陕西':'SHAANXI',
    '甘肃':'GANSU','青海':'QINGHAI','台湾':'TAIWAN','内蒙古':'INNER MONGOLIA',
    '广西':'GUANGXI','西藏':'TIBET','宁夏':'NINGXIA','新疆':'XINJIANG',
    '香港':'HONG KONG','澳门':'MACAU'
  };
  function showWelcome(region, regionEn){
    var idx = pickHonorIndex(region);
    wHon.textContent = HONOR[idx];
    if (wHonEn) wHonEn.textContent = HONOR_EN[idx];
    wFrom.textContent = region ? '自 ' + region + ' 而来' : '自 远方 而来';
    if (wFromEn){
      var pEn = String(region || '').split(' · ')[0];
      wFromEn.textContent = regionEn ? ('FROM ' + String(regionEn).toUpperCase())
        : (PROV_EN[pEn] ? 'FROM ' + PROV_EN[pEn] : 'FROM AFAR');
    }
    welcomeEl.classList.add('ready');
  }
  /* 到访次数：本机历史 + 全网累计 */
  (function visitStats(){
    var key = 'fxy-visits', n = 1;
    try{
      n = (parseInt(localStorage.getItem(key) || '0', 10) || 0) + 1;
      localStorage.setItem(key, String(n));
    }catch(e){ n = 1; }
    var CN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
    function cnNum(v){
      if (v >= 1 && v <= 10) return CN[v];
      if (v < 20) return '十' + CN[v - 10];
      if (v < 100){
        var t = Math.floor(v / 10), u = v % 10;
        return CN[t] + '十' + (u ? CN[u] : '');
      }
      return String(v);
    }
    var visitEl = document.getElementById('wVisit');
    if (visitEl){
      visitEl.textContent = cnNum(n);
      if (n > 10) visitEl.classList.remove('cn');
    }
    var visitEnEl = document.getElementById('wVisitEn');
    if (visitEnEl) visitEnEl.textContent = (n === 1) ? 'YOUR FIRST VISIT' : 'VISIT NO. ' + n;
    // 全网累计（服务端计数：换设备、换地点都接着加；同一浏览器 24 小时内只计一次）
    // 计数端点：首选自有域名（Cloudflare 区域激活后生效），失败即退到 Worker 默认域名
    var FXY_COUNTERS = [
      'https://count.obenno.com/count',
      'https://obenno-visits.sonefly.workers.dev/count'
    ];
    var FXY_COUNTER_KEY = 'hall-v4';    // 计数键名（换名会从 0 重新开始）
    var stampKey = 'fxy-count-at', totalKey = 'fxy-total', lastAt = 0, nowAt = Date.now();
    try{ lastAt = parseInt(localStorage.getItem(stampKey) || '0', 10) || 0; }catch(e){}
    var due = (!lastAt) || (nowAt - lastAt > 86400000);
    var tEl = document.getElementById('wTotal');
    var dEl = document.getElementById('wToday');
    var wrapEl = document.getElementById('wTotalWrap');
    var enEl2 = document.getElementById('wTotalEn');
    var todayWrap = document.getElementById('wTodayWrap');
    var todayEn = document.getElementById('wTodayEn');
    var ruleEl = document.getElementById('wRule');
    function paintTotal(v, tdy){
      var fmt = String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      if (tEl) tEl.textContent = fmt;
      if (enEl2) enEl2.textContent = fmt + ' VISITS IN ALL';
      if (wrapEl) wrapEl.hidden = false;
      if (enEl2) enEl2.hidden = false;
      if (typeof tdy === 'number'){
        if (dEl) dEl.textContent = String(tdy);
        if (todayEn) todayEn.textContent = tdy + ' TODAY';
        if (todayWrap) todayWrap.hidden = false;
        if (todayEn) todayEn.hidden = false;
        if (ruleEl) ruleEl.hidden = false;
      }
    }
    var cachedTotal = 0, cachedToday = 0;
    try{ cachedTotal = parseInt(localStorage.getItem(totalKey) || '0', 10) || 0; }catch(e){}
    try{ cachedToday = parseInt(localStorage.getItem('fxy-today') || '0', 10) || 0; }catch(e){}
    if (cachedTotal > 0) paintTotal(cachedTotal, cachedToday);
    function askTotal(ep, isRetry){
      ep = ep || 0;
      var base = FXY_COUNTERS[ep] || FXY_COUNTERS[0];
      var url = base + '?key=' + FXY_COUNTER_KEY + (due ? '&hit=1' : '');
      var ctrl = (typeof AbortController === 'function') ? new AbortController() : null;
      var timer = ctrl ? setTimeout(function(){ ctrl.abort(); }, 5000) : 0;
      fetch(url, { cache: 'no-store', signal: ctrl ? ctrl.signal : undefined })
        .then(function(r){ return r.ok ? r.json() : null; })
        .then(function(d){
          if (timer) clearTimeout(timer);
          if (!d || typeof d.value !== 'number') throw new Error('bad payload');
          if (d.geo && typeof window.__fxySetRegion === 'function') window.__fxySetRegion(d.geo);
          if (d.map && typeof window.__fxyMap === 'function') window.__fxyMap(d.map, d.regions, d.value);
          if (due){
            due = false;
            try{ localStorage.setItem(stampKey, String(nowAt)); }catch(e){}
          }
          try{ localStorage.setItem(totalKey, String(d.value)); }catch(e){}
          if (typeof d.today === 'number'){
            try{ localStorage.setItem('fxy-today', String(d.today)); }catch(e){}
          }
          paintTotal(d.value, (typeof d.today === 'number') ? d.today : undefined);
        })
        .catch(function(){
          if (timer) clearTimeout(timer);
          if (ep + 1 < FXY_COUNTERS.length) askTotal(ep + 1, isRetry);
          else if (!isRetry) setTimeout(function(){ askTotal(0, true); }, 5000);
        });
    }
    askTotal(0);
  })();

  /* 十方来朝 · 寰宇图 —— 点阵世界 + 来处光点；数据由自建 Worker 按省市聚合 */
  (function visitorsMap(){
    var MASK=["..............#....###.###########.......##.................................","............##....####....#######................#.....########.#...........","...###########.#..#.#.##...#####.........#####....##.#######################","....###############....#...##....#......##.#################################","....##...#########....#.#..............###.##########################.#.....","...#......################..........##....#########################....#....","............############..............##############################........","............#############.............######..#####################.........","............###########.............##...########################...........","............##########................##......##################...#........",".............########...............#####.#..###################............","...............##..................##########.##.##############.............","................#..................################..#########.#............","................###................###########.###...###..##...#............","..................................##############......#....##..#............","....................#####..........##############.....#.........#...........","......................#####.............########..........##..#.............",".....................#######............#######............#.##.............",".....................#########...........#####.....................##.......",".....................#########...........#####.......................#......","......................########...........######.#................##.#.......",".......................#######...........#####.#................#####.......",".......................######............####..#..............########......",".......................#####.............####.................########......",".......................####...............##..................##..####......","......................####..........................................##......","......................##..................................................#.","......................##....................................................","......................#....................................................."];
    var CENT="RU:99.2,61.7;CA:-101.6,57.7;CN:103.9,36.6;US:-99.1,39.5;BR:-53.1,-10.8;AU:134.4,-25.6;GL:-41.5,74.8;KZ:67.3,48.2;IN:79.6,22.9;AR:-65.1,-35.2;DZ:2.6,28.2;CD:23.6,-2.9;MN:102.9,46.8;MX:-102.6,23.9;SA:44.5,24.1;SD:29.9,16.0;IR:54.3,32.5;LY:18.0,27.0;ZA:25.1,-29.0;PE:-74.4,-9.2;TD:18.6,15.3;ML:-3.5,17.3;AO:17.5,-12.3;NE:9.3,17.3;CO:-73.1,3.9;ET:39.6,8.7;BO:-64.6,-16.7;MR:-10.3,20.2;EG:29.8,26.5;PK:69.4,30.0;TR:35.4,39.0;SE:16.6,62.8;CL:-71.7,-37.3;TZ:34.8,-6.3;NG:8.0,9.5;VE:-66.2,7.2;NA:17.2,-22.1;UA:31.2,49.1;MZ:35.5,-17.2;FI:26.2,64.5;AF:66.1,33.9;ZM:27.7,-13.4;MM:96.5,21.0;MA:-8.4,29.9;ES:-3.6,40.3;BW:23.8,-22.1;SS:30.2,7.3;CF:20.4,6.5;MG:46.7,-19.4;TM:59.3,39.1;UZ:63.2,41.7;KE:37.8,0.6;DE:10.3,51.1;ID:114.0,-0.3;TH:101.0,15.0;IQ:43.8,33.0;PL:19.3,52.1;SO:45.7,4.8;YE:47.5,15.9;CM:12.6,5.7;PY:-58.4,-23.2;PG:144.3,-6.6;GB:-2.7,53.9;ZW:29.8,-18.9;JP:136.9,36.0;IT:12.2,43.5;VN:106.3,16.7;BY:28.0,53.5;CG:15.1,-0.8;RO:24.9,45.9;CI:-5.6,7.6;OM:56.1,20.6;BF:-1.8,12.3;GA:11.7,-0.6;KG:74.6,41.5;IS:-18.8,65.1;EC:-78.4,-1.5;UG:32.4,1.3;GH:-1.2,7.9;GN:-11.1,10.4;LA:103.8,18.4;SY:38.5,35.0;NZ:170.5,-44.0;GY:-59.0,4.8;UY:-56.0,-32.8;MY:114.7,3.5;SN:-14.5,14.4;TN:9.5,34.2;KH:104.9,12.7;TJ:71.0,38.6;NP:84.0,28.2;KP:127.2,40.1;GR:22.6,39.3;BG:25.2,42.8;BD:90.3,23.8;SR:-55.9,4.1;HU:19.4,47.2;NI:-85.0,12.8;AT:14.1,47.6;CZ:15.3,49.8;ER:38.7,15.4;CU:-79.0,21.6;KR:127.8,36.4;PT:-8.1,39.6;PH:121.5,15.8;BJ:2.3,9.6;HN:-86.6,14.8;LV:24.8,56.8;MW:34.2,-13.2;GT:-90.4,15.7;AZ:47.7,40.3;LT:23.9,55.3;RS:20.8,44.2;EH:-12.1,24.3;JO:36.8,31.2;LR:-9.4,6.4;IE:-8.0,53.2;GE:43.5,42.2;AE:54.2,23.9;EE:25.8,58.6;HR:16.6,45.0;SL:-11.8,8.5;PA:-80.1,8.5;SK:19.5,48.7;BA:17.8,44.2;CH:8.1,46.8;LK:80.7,7.7;NL:5.5,52.3;TG:1.0,8.4;DK:9.3,56.2;CR:-84.2,10.0;DO:-70.5,18.9;MD:28.4,47.2;BE:4.6,50.7;BT:90.5,27.4;AL:20.0,41.1;TW:121.0,23.7;AM:45.0,40.2;GW:-15.1,12.0;MK:21.7,41.6;LS:28.2,-29.6;HT:-72.7,18.9;SI:14.9,46.1;GQ:10.4,1.6;IL:35.0,31.5;BI:29.9,-3.4;FK:-59.4,-51.7;NC:165.5,-21.3;RW:29.9,-2.0;BZ:-88.7,17.2;DJ:42.5,11.8;SV:-88.9,13.7;SZ:31.4,-26.5;KW:47.6,29.3;ME:19.3,42.8;TL:126.0,-8.8;GM:-15.4,13.5;JM:-77.3,18.1;QA:51.2,25.3;FJ:178.0,-17.8;LB:35.9,33.9;BN:114.9,4.7;PR:-66.5,18.2;BS:-77.9,24.5;TT:-61.3,10.4;CY:33.0,34.9;SB:159.1,-7.9;PS:35.3,31.9;VU:166.9,-15.2;LU:6.0,49.8;FR:2.3,46.6;NO:14.2,64.5;HK:114.1,22.3;MO:113.5,22.2;SG:103.8,1.3";
    var ZH={"CN":"中国","TW":"台湾","HK":"香港","MO":"澳门","SG":"新加坡","JP":"日本","KR":"韩国","KP":"朝鲜","MN":"蒙古","VN":"越南","LA":"老挝","KH":"柬埔寨","TH":"泰国","MM":"缅甸","MY":"马来西亚","ID":"印尼","PH":"菲律宾","BN":"文莱","IN":"印度","PK":"巴基斯坦","BD":"孟加拉","LK":"斯里兰卡","NP":"尼泊尔","BT":"不丹","AF":"阿富汗","KZ":"哈萨克斯坦","UZ":"乌兹别克斯坦","KG":"吉尔吉斯斯坦","TJ":"塔吉克斯坦","TM":"土库曼斯坦","RU":"俄罗斯","UA":"乌克兰","BY":"白俄罗斯","LT":"立陶宛","LV":"拉脱维亚","EE":"爱沙尼亚","PL":"波兰","CZ":"捷克","SK":"斯洛伐克","HU":"匈牙利","RO":"罗马尼亚","BG":"保加利亚","GR":"希腊","TR":"土耳其","IR":"伊朗","IQ":"伊拉克","IL":"以色列","SA":"沙特阿拉伯","AE":"阿联酋","QA":"卡塔尔","KW":"科威特","OM":"阿曼","YE":"也门","JO":"约旦","LB":"黎巴嫩","SY":"叙利亚","EG":"埃及","MA":"摩洛哥","DZ":"阿尔及利亚","TN":"突尼斯","LY":"利比亚","SD":"苏丹","ET":"埃塞俄比亚","KE":"肯尼亚","TZ":"坦桑尼亚","UG":"乌干达","NG":"尼日利亚","GH":"加纳","ZA":"南非","NA":"纳米比亚","MZ":"莫桑比克","AO":"安哥拉","CD":"刚果（金）","CG":"刚果（布）","CM":"喀麦隆","SN":"塞内加尔","ML":"马里","NE":"尼日尔","TD":"乍得","SO":"索马里","MG":"马达加斯加","ZW":"津巴布韦","ZM":"赞比亚","BW":"博茨瓦纳","US":"美国","CA":"加拿大","MX":"墨西哥","CU":"古巴","GT":"危地马拉","HN":"洪都拉斯","NI":"尼加拉瓜","CR":"哥斯达黎加","PA":"巴拿马","DO":"多米尼加","JM":"牙买加","HT":"海地","PR":"波多黎各","BS":"巴哈马","TT":"特立尼达和多巴哥","BR":"巴西","AR":"阿根廷","CL":"智利","PE":"秘鲁","CO":"哥伦比亚","VE":"委内瑞拉","EC":"厄瓜多尔","BO":"玻利维亚","PY":"巴拉圭","UY":"乌拉圭","GY":"圭亚那","SR":"苏里南","AU":"澳大利亚","NZ":"新西兰","PG":"巴布亚新几内亚","FJ":"斐济","NC":"新喀里多尼亚","GL":"格陵兰","IS":"冰岛","NO":"挪威","SE":"瑞典","FI":"芬兰","DK":"丹麦","IE":"爱尔兰","GB":"英国","FR":"法国","DE":"德国","NL":"荷兰","BE":"比利时","LU":"卢森堡","CH":"瑞士","AT":"奥地利","IT":"意大利","ES":"西班牙","PT":"葡萄牙","HR":"克罗地亚","RS":"塞尔维亚","SI":"斯洛文尼亚","BA":"波黑","ME":"黑山","MK":"北马其顿","AL":"阿尔巴尼亚","CY":"塞浦路斯","AM":"亚美尼亚","AZ":"阿塞拜疆","GE":"格鲁吉亚","MD":"摩尔多瓦"};
    var EN={"CN":"CHINA","TW":"TAIWAN","HK":"HONG KONG","MO":"MACAO","SG":"SINGAPORE","JP":"JAPAN","KR":"SOUTH KOREA","KP":"NORTH KOREA","MN":"MONGOLIA","VN":"VIETNAM","LA":"LAOS","KH":"CAMBODIA","TH":"THAILAND","MM":"MYANMAR","MY":"MALAYSIA","ID":"INDONESIA","PH":"PHILIPPINES","BN":"BRUNEI","IN":"INDIA","PK":"PAKISTAN","BD":"BANGLADESH","LK":"SRI LANKA","NP":"NEPAL","BT":"BHUTAN","AF":"AFGHANISTAN","KZ":"KAZAKHSTAN","UZ":"UZBEKISTAN","KG":"KYRGYZSTAN","TJ":"TAJIKISTAN","TM":"TURKMENISTAN","RU":"RUSSIA","UA":"UKRAINE","BY":"BELARUS","LT":"LITHUANIA","LV":"LATVIA","EE":"ESTONIA","PL":"POLAND","CZ":"CZECHIA","SK":"SLOVAKIA","HU":"HUNGARY","RO":"ROMANIA","BG":"BULGARIA","GR":"GREECE","TR":"TÜRKIYE","IR":"IRAN","IQ":"IRAQ","IL":"ISRAEL","SA":"SAUDI ARABIA","AE":"UAE","QA":"QATAR","KW":"KUWAIT","OM":"OMAN","YE":"YEMEN","JO":"JORDAN","LB":"LEBANON","SY":"SYRIA","EG":"EGYPT","MA":"MOROCCO","DZ":"ALGERIA","TN":"TUNISIA","LY":"LIBYA","SD":"SUDAN","ET":"ETHIOPIA","KE":"KENYA","TZ":"TANZANIA","UG":"UGANDA","NG":"NIGERIA","GH":"GHANA","ZA":"SOUTH AFRICA","NA":"NAMIBIA","MZ":"MOZAMBIQUE","AO":"ANGOLA","CD":"DR CONGO","CG":"CONGO","CM":"CAMEROON","SN":"SENEGAL","ML":"MALI","NE":"NIGER","TD":"CHAD","SO":"SOMALIA","MG":"MADAGASCAR","ZW":"ZIMBABWE","ZM":"ZAMBIA","BW":"BOTSWANA","US":"UNITED STATES","CA":"CANADA","MX":"MEXICO","CU":"CUBA","GT":"GUATEMALA","HN":"HONDURAS","NI":"NICARAGUA","CR":"COSTA RICA","PA":"PANAMA","DO":"DOMINICAN REP.","JM":"JAMAICA","HT":"HAITI","PR":"PUERTO RICO","BS":"BAHAMAS","TT":"TRINIDAD","BR":"BRAZIL","AR":"ARGENTINA","CL":"CHILE","PE":"PERU","CO":"COLOMBIA","VE":"VENEZUELA","EC":"ECUADOR","BO":"BOLIVIA","PY":"PARAGUAY","UY":"URUGUAY","GY":"GUYANA","SR":"SURINAME","AU":"AUSTRALIA","NZ":"NEW ZEALAND","PG":"PAPUA NEW GUINEA","FJ":"FIJI","NC":"NEW CALEDONIA","GL":"GREENLAND","IS":"ICELAND","NO":"NORWAY","SE":"SWEDEN","FI":"FINLAND","DK":"DENMARK","IE":"IRELAND","GB":"UNITED KINGDOM","FR":"FRANCE","DE":"GERMANY","NL":"NETHERLANDS","BE":"BELGIUM","LU":"LUXEMBOURG","CH":"SWITZERLAND","AT":"AUSTRIA","IT":"ITALY","ES":"SPAIN","PT":"PORTUGAL","HR":"CROATIA","RS":"SERBIA","SI":"SLOVENIA","BA":"BOSNIA","ME":"MONTENEGRO","MK":"N. MACEDONIA","AL":"ALBANIA","CY":"CYPRUS","AM":"ARMENIA","AZ":"AZERBAIJAN","GE":"GEORGIA","MD":"MOLDOVA"};
    var svg=document.getElementById('vmGlobe');
    if(!svg) return;
    var gL=document.getElementById('vmLand'), gD=document.getElementById('vmDots'),
        listEl=document.getElementById('vmList'), emptyEl=document.getElementById('vmEmpty'),
        tallyEl=document.getElementById('vmTally');
    var NS='http://www.w3.org/2000/svg', C={};
    CENT.split(';').forEach(function(s){
      var p=s.split(':'); if(p.length!==2) return;
      var q=p[1].split(','); if(q.length!==2) return;
      C[p[0]]={lon:parseFloat(q[0]),lat:parseFloat(q[1])};
    });
    // 大陆点阵：整块拼成一条 <path>，一个节点代替 1500–2000 个 circle；并且推迟到页面空闲再建，
    // 首屏（山门/主殿）不再为看不见的寰宇图付出建树与重排成本
    var landBuilt = false;
    function buildLand(){
      if (landBuilt) return;
      landBuilt = true;
      var narrow = (window.matchMedia && window.matchMedia('(max-width:560px)').matches);
      var step = narrow ? 2 : 1, size = narrow ? 5.4 : 3.4;
      var d = '';
      for(var r=0;r<MASK.length;r+=step){
        var row=MASK[r];
        for(var c=0;c<row.length;c+=step){
          if(row.charAt(c)!=='#') continue;
          var x=(c+0.5)*10-size/2, y=(r+0.5)*10-size/2;
          d += 'M' + x.toFixed(1) + ' ' + y.toFixed(1) + 'h' + size + 'v' + size + 'h-' + size + 'z';
        }
      }
      var p=document.createElementNS(NS,'path');
      p.setAttribute('d', d); p.setAttribute('class','vm-land');
      gL.appendChild(p);
    }
    (function scheduleLand(){
      if (window.requestIdleCallback) requestIdleCallback(buildLand, { timeout: 2200 });
      else setTimeout(buildLand, 1600);
    })();
    function zhOf(cc){ return ZH[cc]||EN[cc]||cc; }
    function enOf(cc){ return EN[cc]||cc; }
    function pos(cc){
      var p=C[cc]; if(!p && cc==='UK') p=C['GB'];
      if(!p) return null;
      return {x:(p.lon+180)/360*760, y:(80-p.lat)/138*300};
    }
    // 省/州、城市的中文名（能译则译，译不出就原样保留拉丁名，绝不退回只剩国名）
    var PRG={"Beijing":"北京","Tianjin":"天津","Shanghai":"上海","Chongqing":"重庆","Hebei":"河北","Shanxi":"山西","Liaoning":"辽宁","Jilin":"吉林","Heilongjiang":"黑龙江","Jiangsu":"江苏","Zhejiang":"浙江","Anhui":"安徽","Fujian":"福建","Jiangxi":"江西","Shandong":"山东","Henan":"河南","Hubei":"湖北","Hunan":"湖南","Guangdong":"广东","Guangxi":"广西","Hainan":"海南","Sichuan":"四川","Guizhou":"贵州","Yunnan":"云南","Tibet":"西藏","Xizang":"西藏","Shaanxi":"陕西","Gansu":"甘肃","Qinghai":"青海","Ningxia":"宁夏","Xinjiang":"新疆","Inner Mongolia":"内蒙古","Nei Mongol":"内蒙古","Hong Kong":"香港","Macau":"澳门","Macao":"澳门","Taiwan":"台湾","Uusimaa":"新地区","Pirkanmaa":"皮尔坎马","Pohjois-Pohjanmaa":"北博滕","Varsinais-Suomi":"西南芬兰","Uttar Pradesh":"北方邦","Maharashtra":"马哈拉施特拉邦","Bavaria":"巴伐利亚","Bayern":"巴伐利亚","California":"加利福尼亚","New York":"纽约","Texas":"得克萨斯","Ontario":"安大略","Quebec":"魁北克","New South Wales":"新南威尔士","Victoria":"维多利亚","Tokyo":"东京","Osaka":"大阪","Seoul":"首尔","Busan":"釜山","Singapore":"新加坡","Johor":"柔佛","Selangor":"雪兰莪","Bangkok":"曼谷","Ho Chi Minh City":"胡志明市","Hanoi":"河内"};
    var CTN={"Shangqiu":"商丘","Zhengzhou":"郑州","Kaifeng":"开封","Luoyang":"洛阳","Xinxiang":"新乡","Anyang":"安阳","Zhoukou":"周口","Nanyang":"南阳","Xinyang":"信阳","Pingdingshan":"平顶山","Jiaozuo":"焦作","Xuchang":"许昌","Puyang":"濮阳","Sanmenxia":"三门峡","Hebi":"鹤壁","Luohe":"漯河","Zhumadian":"驻马店","Beijing":"北京","Shanghai":"上海","Tianjin":"天津","Chongqing":"重庆","Guangzhou":"广州","Shenzhen":"深圳","Dongguan":"东莞","Foshan":"佛山","Zhuhai":"珠海","Huizhou":"惠州","Hangzhou":"杭州","Ningbo":"宁波","Wenzhou":"温州","Nanjing":"南京","Suzhou":"苏州","Wuxi":"无锡","Changzhou":"常州","Yangzhou":"扬州","Xuzhou":"徐州","Nantong":"南通","Jinan":"济南","Qingdao":"青岛","Yantai":"烟台","Weifang":"潍坊","Zibo":"淄博","Linyi":"临沂","Hefei":"合肥","Fuzhou":"福州","Xiamen":"厦门","Quanzhou":"泉州","Nanchang":"南昌","Wuhan":"武汉","Yichang":"宜昌","Xiangyang":"襄阳","Changsha":"长沙","Zhuzhou":"株洲","Hengyang":"衡阳","Shenyang":"沈阳","Dalian":"大连","Harbin":"哈尔滨","Changchun":"长春","Shijiazhuang":"石家庄","Tangshan":"唐山","Baoding":"保定","Taiyuan":"太原","Xi'an":"西安","Lanzhou":"兰州","Xining":"西宁","Yinchuan":"银川","Urumqi":"乌鲁木齐","Kunming":"昆明","Guiyang":"贵阳","Nanning":"南宁","Haikou":"海口","Sanya":"三亚","Hohhot":"呼和浩特","Chengdu":"成都","Mianyang":"绵阳","Lhasa":"拉萨","Hong Kong":"香港","Macau":"澳门","Taipei":"台北","Kaohsiung":"高雄","Taichung":"台中","Helsinki":"赫尔辛基","Espoo":"埃斯波","Vantaa":"万塔","Tampere":"坦佩雷","Turku":"图尔库","Oulu":"奥卢","Tokyo":"东京","Osaka":"大阪","Kyoto":"京都","Seoul":"首尔","Busan":"釜山","Incheon":"仁川","Singapore":"新加坡","Kuala Lumpur":"吉隆坡","Bangkok":"曼谷","Hanoi":"河内","Ho Chi Minh City":"胡志明市","Manila":"马尼拉","Jakarta":"雅加达","New York":"纽约","Los Angeles":"洛杉矶","San Francisco":"旧金山","Chicago":"芝加哥","Seattle":"西雅图","Toronto":"多伦多","Vancouver":"温哥华","Montreal":"蒙特利尔","London":"伦敦","Paris":"巴黎","Berlin":"柏林","Munich":"慕尼黑","Frankfurt":"法兰克福","Amsterdam":"阿姆斯特丹","Brussels":"布鲁塞尔","Zurich":"苏黎世","Vienna":"维也纳","Rome":"罗马","Milan":"米兰","Madrid":"马德里","Barcelona":"巴塞罗那","Lisbon":"里斯本","Moscow":"莫斯科","Sydney":"悉尼","Melbourne":"墨尔本","Auckland":"奥克兰","Dubai":"迪拜"};
    // 国内 IP 库回传中文（河南 / 商丘），Cloudflare 回传英文（Henan / Zhengzhou）；
    // 双向归一：对外中文为主、英文为副，两种来源都能落到同一张表、同一个榜单行
    var revCtn = {};
    for (var ck in CTN){ if (Object.prototype.hasOwnProperty.call(CTN, ck)) revCtn[CTN[ck]] = ck; }
    function isCJK(s){ return /[\u4e00-\u9fff]/.test(String(s || '')); }
    function toZh(raw, en2zh){
      var k = String(raw || '').replace(/[省市]$/, '');
      if (!k) return '';
      return isCJK(k) ? k : (en2zh[k] || k);
    }
    function toEn(raw, zh2en){
      var k = String(raw || '').replace(/[省市]$/, '');
      if (!k) return '';
      return isCJK(k) ? (zh2en[k] || k) : k;
    }
    window.__fxyName = function(rg, ct){
      var P = (typeof PROV_EN !== 'undefined') ? PROV_EN : {};
      return {
        rz: toZh(rg, PRG), cz: toZh(ct, CTN),
        ug: toEn(rg, P), uz: toEn(ct, revCtn)
      };
    };
    function splitRow(raw, n){
      var p = String(raw || '').split('|');
      var cc = String(p[0] || '').toUpperCase();
      var rg = String(p[1] || '').trim();
      var ct = String(p[2] || '').trim();
      var z = ZH[cc] || EN[cc] || cc;
      var e = EN[cc] || cc;
      var nm = window.__fxyName(rg, ct);
      var rz = nm.rz, cz = nm.cz, ug = nm.ug, uz = nm.uz;
      // 省名、市名与国名相同（台湾·台湾、北京·北京）时只留一处，避免同名重复
      if (rz && (rz === z || rz.toUpperCase() === e.toUpperCase())) rz = '';
      if (cz && (cz === z || cz.toUpperCase() === e.toUpperCase() || cz === rz)) cz = '';
      if (rz){ z += ' · ' + rz; e += ' · ' + (ug || '').toUpperCase(); }
      if (cz){ z += ' · ' + cz; e += ' · ' + (uz || '').toUpperCase(); }
      return { cc: cc, rg: rg, ct: ct, n: n, z: z, e: e };
    }
    window.__fxyPlace = { PRG: PRG, CTN: CTN };
    window.__fxyNames = { ZH: ZH, EN: EN };   // 完整国名表，供欢迎块兜底（与寰宇图同一套译名）
    window.__fxyMap=function(rows, regions, total){
      if(!rows || !rows.length){
        gD.textContent='';
        if(listEl){ listEl.textContent=''; listEl.hidden=true; }
        if(tallyEl) tallyEl.hidden=true;
        if(emptyEl) emptyEl.hidden=false;
        return;
      }
      // 只保留“国家|省/州|城市”这类详细来处；历史上只存国名的旧行不再单独顶榜
      var detailed = rows.filter(function(it){ return String(it[0]||'').indexOf('|') > 0; });
      var legacySum = 0, places = 0;
      if (detailed.length){
        rows.forEach(function(it){ if(String(it[0]||'').indexOf('|') <= 0) legacySum += (+it[1]||0); });
        rows = detailed; places = detailed.length;
      }
      else places = regions || rows.length;
      // 同一处来朝可能被存成两套键（Henan|Zhengzhou 与 河南|郑州），按显示名合并后再排名
      var agg = {}, aggOrder = [];
      rows.forEach(function(it){
        var r = splitRow(it[0], +it[1] || 0);
        if (agg[r.z]) agg[r.z][1] += r.n;
        else { aggOrder.push(r.z); agg[r.z] = [it[0], r.n]; }
      });
      rows = aggOrder.map(function(k){ return agg[k]; });
      places = rows.length;
      rows.sort(function(a,b){ return (+b[1]||0) - (+a[1]||0); });
      var maxv=0; rows.forEach(function(it){ if(it[1]>maxv) maxv=it[1]; });
      gD.textContent='';
      var shown=[], ccSeen={}, dots=0;
      rows.forEach(function(it, i){
        var row=splitRow(it[0], +it[1]||0), cc=row.cc, n=row.n, at=pos(cc);
        var lg = maxv>1 ? Math.log(n+1)/Math.log(maxv+1) : 1;
        var rad = 2.0 + lg*4.2;
        var top = (i===0);
        if(at && dots<30){
          // 同一国家的多个省市，围绕国名质心错开排布，避免光点叠在一起
          var k=ccSeen[cc]=(ccSeen[cc]||0)+1, dx=0, dy=0;
          if(k>1){ var ang=(k-2)*2.399963; var rr=7+Math.floor((k-2)/6)*7; dx=Math.cos(ang)*rr; dy=Math.sin(ang)*rr*0.72; }
          dots++;
          var glow=document.createElementNS(NS,'circle');
          glow.setAttribute('cx',at.x+dx); glow.setAttribute('cy',at.y+dy);
          glow.setAttribute('r',String(rad*2.6)); glow.setAttribute('class','vm-dot-glow');
          glow.setAttribute('filter','url(#vmSoft)');
          gD.appendChild(glow);
          var core=document.createElementNS(NS,'circle');
          core.setAttribute('cx',at.x+dx); core.setAttribute('cy',at.y+dy);
          core.setAttribute('r',String(rad)); core.setAttribute('class','vm-dot-lit');
          if(top) core.setAttribute('class','vm-dot-lit vm-top-dot');
          var t=document.createElementNS(NS,'title');
          t.textContent=row.z+' · '+n;
          core.appendChild(t);
          gD.appendChild(core);
        }
        if(shown.length<6) shown.push([row,lg]);
      });
      if(!shown.length) return;
      if(emptyEl) emptyEl.hidden=true;
      listEl.hidden=false; listEl.textContent='';
      if(tallyEl) tallyEl.hidden=false;
      shown.forEach(function(pair, i){
        var row=pair[0], lg=pair[1];
        var li=document.createElement('li'); li.className='vm-row';
        var rk=document.createElement('span'); rk.className='vm-rank'; rk.textContent='一二三四五六'.charAt(i);
        var nm=document.createElement('span'); nm.className='vm-name';
        nm.textContent=row.z;
        var em=document.createElement('em'); em.textContent=row.e; nm.appendChild(em);
        var nn=document.createElement('span'); nn.className='vm-n'; nn.textContent=row.n;
        var bar=document.createElement('span'); bar.className='vm-bar';
        bar.style.width=Math.max(6,Math.round(lg*100))+'%';
        li.appendChild(rk); li.appendChild(nm); li.appendChild(nn); li.appendChild(bar);
        listEl.appendChild(li);
      });
      if (legacySum){
        var lgn=document.createElement('li'); lgn.className='vm-legacy';
        lgn.innerHTML='另有 <b>'+legacySum+'</b> 次往期来朝，未及省市<em> · '+legacySum+' earlier visits, recorded before province and city were kept</em>';
        listEl.appendChild(lgn);
      }
      if(tallyEl){
        tallyEl.innerHTML='累计 <b>'+(total||0)+'</b> 次 · <b>'+places+'</b> 处<em> · '+(total||0)+' VISITS · '+places+' PLACES</em>';
      }
    };
  })();

  (function loadRegion(){
    var done = false, timer = 0;
    // 地名一律由自建 Worker 用 Cloudflare 自带的国家字段回传，页面不再请求任何第三方 IP 定位接口
    var CTY = {
      CN:['中国','CHINA'], TW:['台湾','TAIWAN'], HK:['香港','HONG KONG'], MO:['澳门','MACAU'],
      US:['美国','UNITED STATES'], CA:['加拿大','CANADA'], JP:['日本','JAPAN'], KR:['韩国','SOUTH KOREA'],
      SG:['新加坡','SINGAPORE'], MY:['马来西亚','MALAYSIA'], TH:['泰国','THAILAND'], VN:['越南','VIETNAM'],
      ID:['印度尼西亚','INDONESIA'], PH:['菲律宾','PHILIPPINES'], IN:['印度','INDIA'], AU:['澳大利亚','AUSTRALIA'],
      NZ:['新西兰','NEW ZEALAND'], GB:['英国','UNITED KINGDOM'], DE:['德国','GERMANY'], FR:['法国','FRANCE'],
      IT:['意大利','ITALY'], ES:['西班牙','SPAIN'], NL:['荷兰','NETHERLANDS'], CH:['瑞士','SWITZERLAND'],
      SE:['瑞典','SWEDEN'], RU:['俄罗斯','RUSSIA'], BR:['巴西','BRAZIL'], MX:['墨西哥','MEXICO'],
      AE:['阿联酋','UNITED ARAB EMIRATES'], SA:['沙特阿拉伯','SAUDI ARABIA'], TR:['土耳其','TURKEY'],
      IL:['以色列','ISRAEL'], ZA:['南非','SOUTH AFRICA'], EG:['埃及','EGYPT'], AR:['阿根廷','ARGENTINA']
    };
    var lastRegion = '';
    function finish(region, regionEn){
      clearTimeout(timer);
      if (region){
        try{ localStorage.setItem('fxy-region2', JSON.stringify({ r: region, e: regionEn || '', t: Date.now() })); }catch(e){}
      }
      // 先显示、后校正：先在缓存地名，随后或备用线路回传的地名与已显示的不同就必须覆盖（同名不重绘）
      if (done && region === lastRegion) return;
      done = true;
      lastRegion = region;
      showWelcome(region, regionEn);
    }
    // 缓存只作「先显示、后校正」：上次在境外或开着 VPN 时留下的旧地名，不再锁死 7 天
    var painted = false;
    try{
      var cached = localStorage.getItem('fxy-region2');
      if (cached){
        var o = JSON.parse(cached);
        if (o && o.r && Date.now() - o.t < 6 * 3600000){
          showWelcome(o.r, o.e || '');
          painted = true;
        }
      }
    }catch(e){}
    window.__fxySetRegion = function(geo){
      if (!geo) return;
      var code = String(geo.c || '').toUpperCase();
      if (!code || code.length !== 2) return;
      // 国家名不再只认 37 国白名单：表外国家（芬兰、波兰等）用寰宇图的完整国名表兜底
      var pair = CTY[code];
      if (!pair){
        var NM = window.__fxyNames || {};
        pair = [ (NM.ZH && NM.ZH[code]) || code, (NM.EN && NM.EN[code]) || code ];
      }
      // 省市粒度的地名：中国访客直接显示「省 · 市」，国外显示「国 · 省/州」，译不出时保留原名
      // 精度以 Worker 的 geo.p 为准：只有 city 才显示城市；定不下城市就只到省，绝不拿省会顶替
      var rg = String(geo.r || '').trim(), ct = String(geo.t || '').trim();
      if (String(geo.p || 'city') !== 'city') ct = '';
      var nm = (typeof window.__fxyName === 'function') ? window.__fxyName(rg, ct) : null;
      var rz = nm ? nm.rz : rg;         // 译不出时保留原省名，绝不因译名缺失把省一级丢掉
      var cz = nm ? nm.cz : ct;
      var uz = ((nm ? nm.uz : ct) || '').toUpperCase();
      var ug = ((nm ? nm.ug : rg) || '').toUpperCase();
      var z = pair[0], e = pair[1];
      var home = (code === 'CN' || code === 'HK' || code === 'MO' || code === 'TW');
      if (rz && home){
        var same = (cz && cz === rz) || (uz && uz === ug);
        z = rz + ((cz && !same) ? ' · ' + cz : '');
        e = same ? ug : ((cz && uz ? uz + ', ' : '') + ug);
      } else if (rz){
        z = pair[0] + ' · ' + rz + (cz ? ' · ' + cz : '');
        e = pair[1] + ' · ' + ug + (cz && uz ? ' · ' + uz : '');
      } else if (cz){
        z = pair[0] + ' · ' + cz;
        e = pair[1] + ' · ' + uz;
      }
      finish(z, e);
    };
    timer = setTimeout(function(){ if (!painted) finish(''); }, 7000);
  })();

  /* ================= 入场 ================= */
  var KOAN = [
    ['\u8bf8\u6076\u83ab\u4f5c\uff0c\u4f17\u5584\u5949\u884c\uff0c\u81ea\u51c0\u5176\u610f\uff0c\u662f\u8bf8\u4f5b\u6559\u3002', '\u300a\u6cd5\u53e5\u7ecf\u300b', 'Do no evil, do all good, purify the mind: this is the teaching of all Buddhas.'],
    ['\u4e00\u5207\u6709\u4e3a\u6cd5\uff0c\u5982\u68a6\u5e7b\u6ce1\u5f71\uff0c\u5982\u9732\u4ea6\u5982\u7535\uff0c\u5e94\u4f5c\u5982\u662f\u89c2\u3002', '\u300a\u91d1\u521a\u7ecf\u300b', 'All conditioned things are like a dream, an illusion, a bubble, a shadow, like dew or a flash of lightning. Contemplate them thus.'],
    ['\u5e94\u65e0\u6240\u4f4f\uff0c\u800c\u751f\u5176\u5fc3\u3002', '\u300a\u91d1\u521a\u7ecf\u300b', 'Let the mind arise without dwelling anywhere.'],
    ['\u8272\u4e0d\u5f02\u7a7a\uff0c\u7a7a\u4e0d\u5f02\u8272\uff1b\u8272\u5373\u662f\u7a7a\uff0c\u7a7a\u5373\u662f\u8272\u3002', '\u300a\u5fc3\u7ecf\u300b', 'Form is not other than emptiness, emptiness is not other than form.'],
    ['\u7167\u89c1\u4e94\u8574\u7686\u7a7a\uff0c\u5ea6\u4e00\u5207\u82e6\u5384\u3002', '\u300a\u5fc3\u7ecf\u300b', 'Seeing the five aggregates as empty, one passes beyond all suffering.'],
    ['\u82e5\u4eba\u6b32\u4e86\u77e5\uff0c\u4e09\u4e16\u4e00\u5207\u4f5b\uff0c\u5e94\u89c2\u6cd5\u754c\u6027\uff0c\u4e00\u5207\u552f\u5fc3\u9020\u3002', '\u300a\u534e\u4e25\u7ecf\u300b', 'To know all Buddhas of the three times, see the nature of the dharma-realm: all is made by mind alone.'],
    ['\u5fc3\u5982\u5de5\u753b\u5e08\uff0c\u80fd\u753b\u8bf8\u4e16\u95f4\u3002', '\u300a\u534e\u4e25\u7ecf\u300b', 'The mind is like a painter, drawing the whole world.'],
    ['\u83e9\u63d0\u672c\u65e0\u6811\uff0c\u660e\u955c\u4ea6\u975e\u53f0\uff1b\u672c\u6765\u65e0\u4e00\u7269\uff0c\u4f55\u5904\u60f9\u5c18\u57c3\u3002', '\u300a\u516d\u7956\u575b\u7ecf\u300b', 'Bodhi is no tree, the mirror has no stand; originally not a single thing exists \u2014 where could dust alight?'],
    ['\u4e0d\u662f\u98ce\u52a8\uff0c\u4e0d\u662f\u5e62\u52a8\uff0c\u4ec1\u8005\u5fc3\u52a8\u3002', '\u300a\u516d\u7956\u575b\u7ecf\u300b', 'It is not the wind that moves, nor the banner: it is your mind that moves.'],
    ['\u72c2\u5fc3\u82e5\u6b47\uff0c\u6b47\u5373\u83e9\u63d0\u3002', '\u300a\u6123\u4e25\u7ecf\u300b', 'When the mad mind rests, that resting is bodhi.'],
    ['\u968f\u5176\u5fc3\u51c0\uff0c\u5219\u4f5b\u571f\u51c0\u3002', '\u300a\u7ef4\u6469\u8bd8\u7ecf\u300b', 'As the mind is purified, so is the Buddha-land purified.'],
    ['\u83ab\u8f7b\u5c0f\u6076\uff0c\u4ee5\u4e3a\u65e0\u7f6a\uff1b\u6c34\u6ef4\u867d\u5fae\uff0c\u6e10\u76c8\u5927\u5668\u3002', '\u300a\u6cd5\u53e5\u7ecf\u300b', 'Do not slight a small evil as harmless: drop by drop the vessel fills.'],
    ['\u884c\u4ea6\u7985\uff0c\u5750\u4ea6\u7985\uff0c\u8bed\u9ed8\u52a8\u9759\u4f53\u5b89\u7136\u3002', '\u300a\u6c38\u5609\u8bc1\u9053\u6b4c\u300b', 'Walking is zen, sitting is zen; in speech and silence, in motion and stillness, the body is at peace.'],
    ['\u8bf8\u6cd5\u4ece\u672c\u6765\uff0c\u5e38\u81ea\u5bc2\u706d\u76f8\u3002', '\u300a\u6cd5\u534e\u7ecf\u300b', 'All dharmas, from the very beginning, are ever of the mark of quiescence.']
  ];
  (function initKoan(){
    var txt = document.getElementById('introKoan');
    if (!txt || !KOAN.length) return;
    var k = KOAN[Math.floor(Math.random() * KOAN.length)];
    txt.textContent = '\u300c' + k[0] + '\u300d';
    var src = document.getElementById('introKoanSrc');
    var en = document.getElementById('introKoanEn');
    if (src) src.textContent = k[1];
    if (en) en.textContent = k[2];
  })();

  var bgReady = false;
  try {
    var bgImg = new Image();
    bgImg.onload = function(){ bgReady = true; };
    bgImg.src = 'assets/hall_gold_1280.webp';
    if (bgImg.complete) bgReady = true;
  } catch (e) { bgReady = true; }

  function whenBg(cb){
    if (bgReady) { cb(); return; }
    var n = 0;
    var t = setInterval(function(){
      if (bgReady || n++ > 14) { clearInterval(t); cb(); }
    }, 100);
  }

  function enterHall(){
    if (entered) return;
    entered = true;
    try { sessionStorage.setItem('fxy-entered', '1'); } catch (e) {}
    stage.classList.add('opening');
    var lead = reduce.matches ? 90 : 120;
    whenBg(function(){ setTimeout(function(){
      stage.classList.add('open');
      if (!reduce.matches && !muted) playAmbience();
      setTimeout(function(){
        stage.classList.remove('opening');
        intro.setAttribute('aria-hidden', 'true');
        intro.style.display = 'none';
      }, reduce.matches ? 240 : 2150);
    }, lead); });
    setTimeout(function(){
      if (!reduce.matches && !muted) ringBell();
    }, 2500);
  }
  intro.addEventListener('click', enterHall);

  try {
    if (sessionStorage.getItem('fxy-entered') === '1') {
      entered = true;
      stage.classList.add('open');
    }
  } catch (e) {}

  /* ================= 藏经 · 经咒数据 ================= */
    var PY = {"一":"yī","三":"sān","上":"shàng","不":"bù","世":"shì","业":"yè","中":"zhōng","为":"wèi","乃":"nǎi","义":"yì","之":"zhī","九":"jiǔ","二":"èr","五":"wǔ","亦":"yì","他":"tā","以":"yǐ","伊":"yī","传":"chuán","伽":"gā","佉":"qū","佛":"fú","作":"zuò","侄":"zhí","依":"yī","俱":"jù","倒":"dào","停":"tíng","僧":"sēng","全":"quán","八":"bā","六":"liù","兰":"lán","写":"xiě","净":"jìng","减":"jiǎn","出":"chū","切":"qiè","利":"lì","功":"gōng","十":"shí","南":"nán","卢":"lú","即":"jí","厄":"è","参":"cān","受":"shòu","口":"kǒu","句":"jù","吉":"jí","味":"wèi","呼":"hū","咒":"zhòu","咩":"miē","哆":"duō","唎":"lì","唐":"táng","唵":"ǎn","啰":"luō","喝":"hē","喻":"yù","嚧":"lú","四":"sì","土":"tǔ","在":"zài","地":"dì","垢":"gòu","埵":"duǒ","墀":"chí","增":"zēng","声":"shēng","复":"fù","多":"duō","夜":"yè","大":"dà","夷":"yí","奘":"zàng","如":"rú","妨":"fáng","娑":"suō","婆":"pó","子":"zi","孕":"yùn","字":"zì","实":"shí","室":"shì","寿":"shòu","小":"xiǎo","尼":"ní","尽":"jǐn","帝":"dì","常":"cháng","度":"dù","异":"yì","弥":"mí","强":"qiáng","往":"wǎng","得":"dé","心":"xīn","必":"bì","怖":"bù","怛":"dá","恐":"kǒng","悉":"xī","悲":"bēi","想":"xiǎng","意":"yì","慢":"màn","所":"suǒ","拔":"bá","挂":"guà","提":"tí","揭":"jiē","摩":"mó","故":"gù","数":"shù","文":"wén","无":"wú","早":"zǎo","时":"shí","明":"míng","是":"shì","晚":"wǎn","智":"zhì","曰":"yuē","曳":"yè","有":"yǒu","朋":"péng","本":"běn","枳":"zhǐ","根":"gēn","梦":"mèng","梵":"fàn","楞":"léng","槃":"pán","正":"zhèng","死":"sǐ","殿":"diàn","毗":"pí","求":"qiú","汉":"hàn","沙":"shā","法":"fǎ","波":"bō","涅":"niè","深":"shēn","漫":"màn","灭":"miè","烁":"shuò","照":"zhào","特":"tè","玄":"xuán","瑟":"sè","生":"shēng","界":"jiè","百":"bǎi","皆":"jiē","皤":"pó","相":"xiāng","真":"zhēn","眼":"yǎn","知":"zhī","碍":"ài","神":"shén","离":"lí","稍":"shāo","穆":"mù","究":"jiū","空":"kōng","竟":"jìng","等":"děng","经":"jīng","罗":"luó","罚":"fá","羯":"jié","老":"lǎo","者":"zhě","耨":"nòu","耳":"ěr","耶":"yé","耽":"dān","胜":"shèng","能":"néng","腻":"nì","自":"zì","至":"zhì","舌":"shé","舍":"shě","般":"bān","色":"sè","艺":"yì","节":"jié","苏":"sū","若":"ruò","苦":"kǔ","菩":"pú","萨":"sà","蒙":"méng","蕴":"yùn","藐":"miǎo","虚":"xū","蜜":"mì","行":"xíng","要":"yào","见":"jiàn","观":"guān","触":"chù","诃":"hē","识":"shí","译":"yì","说":"shuō","诵":"sòng","诸":"zhū","读":"dú","课":"kè","谛":"dì","谨":"jǐn","豆":"dòu","跋":"bá","身":"shēn","输":"shū","远":"yuǎn","迦":"jiā","通":"tōng","逝":"shì","遍":"biàn","道":"dào","遮":"zhē","那":"nà","部":"bù","都":"dōu","醯":"xī","量":"liàng","钵":"bō","间":"jiān","阇":"dū","阿":"ā","陀":"tuó","除":"chú","障":"zhàng","隶":"lì","集":"jí","音":"yīn","顿":"dùn","颠":"diān","香":"xiāng","驮":"tuó","鼻":"bí"};
var SUTRAS = {
    dabei: {
      name: '大悲咒', en: 'GREAT COMPASSION MANTRA',
      lead: '大悲咒为梵音音译，字句即音，不必强求字义；诵时心口如一，句间稍作停顿。全咒八十四句，为汉传早晚功课常诵之咒。',
      lines: [
        '南无喝啰怛那哆啰夜耶','南无阿唎耶','婆卢羯帝烁钵啰耶','菩提萨埵婆耶','摩诃萨埵婆耶',
        '摩诃迦卢尼迦耶','唵','萨皤啰罚曳','数怛那怛写','南无悉吉利埵伊蒙阿唎耶',
        '婆卢吉帝室佛啰楞驮婆','南无那啰谨墀','醯唎摩诃皤哆沙咩','萨婆阿他豆输朋','阿逝孕',
        '萨婆萨哆那摩婆萨多那摩婆伽','摩罚特豆','怛侄他','唵阿婆卢醯','卢迦帝',
        '迦罗帝','夷醯唎','摩诃菩提萨埵','萨婆萨婆','摩啰摩啰',
        '摩醯摩醯唎驮孕','俱卢俱卢羯蒙','度卢度卢罚阇耶帝','摩诃罚阇耶帝','陀啰陀啰',
        '地唎尼','室佛啰耶','遮啰遮啰','摩摩罚摩啰','穆帝隶',
        '伊醯伊醯','室那室那','阿啰参佛啰舍利','罚沙罚参','佛啰舍耶',
        '呼卢呼卢摩啰','呼卢呼卢醯利','娑啰娑啰','悉唎悉唎','苏卢苏卢',
        '菩提夜菩提夜','菩驮夜菩驮夜','弥帝利夜','那啰谨墀','地利瑟尼那',
        '婆夜摩那','娑婆诃','悉陀夜','娑婆诃','摩诃悉陀夜',
        '娑婆诃','悉陀喻艺','室皤啰耶','娑婆诃','那啰谨墀',
        '娑婆诃','摩啰那啰','娑婆诃','悉啰僧阿穆佉耶','娑婆诃',
        '娑婆摩诃阿悉陀夜','娑婆诃','者吉啰阿悉陀夜','娑婆诃','波陀摩羯悉陀夜',
        '娑婆诃','那啰谨墀皤伽啰耶','娑婆诃','摩婆利胜羯啰夜','娑婆诃',
        '南无喝啰怛那哆啰夜耶','南无阿利耶','婆嚧吉帝','烁皤啰夜','娑婆诃',
        '唵悉殿都','漫多啰','跋陀耶','娑婆诃'
      ]
    },
    xinjing: {
      name: '心经', en: 'HEART SUTRA',
      lead: '《般若波罗蜜多心经》，唐玄奘译，正文二百六十字。般若部之心要，说空、说无所得；读时不妨慢，一句一停。',
      lines: [
        '观自在菩萨行深般若波罗蜜多时','照见五蕴皆空度一切苦厄','舍利子色不异空空不异色',
        '色即是空空即是色','受想行识亦复如是','舍利子是诸法空相不生不灭不垢不净不增不减',
        '是故空中无色无受想行识','无眼耳鼻舌身意无色声香味触法','无眼界乃至无意识界',
        '无无明亦无无明尽乃至无老死亦无老死尽','无苦集灭道无智亦无得',
        '以无所得故菩提萨埵依般若波罗蜜多故心无挂碍','无挂碍故无有恐怖远离颠倒梦想究竟涅槃',
        '三世诸佛依般若波罗蜜多故得阿耨多罗三藐三菩提',
        '故知般若波罗蜜多是大神咒是大明咒是无上咒是无等等咒','能除一切苦真实不虚',
        '故说般若波罗蜜多咒即说咒曰','揭谛揭谛波罗揭谛波罗僧揭谛菩提萨婆诃'
      ]
    },
    wangsheng: {
      name: '往生咒', en: 'REBIRTH MANTRA',
      lead: '《拔一切业障根本得生净土陀罗尼》，通行本十四句五十九字，出《小无量寿经》。诵时常以二十一遍为一节。',
      lines: [
        '南无阿弥多婆夜','哆他伽多夜','哆地夜他','阿弥利都婆毗','阿弥利哆',
        '悉耽婆毗','阿弥利哆','毗迦兰帝','阿弥利哆','毗迦兰多',
        '伽弥腻','伽伽那','枳多迦利','娑婆诃'
      ]
    }
  };

  (function sutraModule(){
    var linesEl = document.getElementById('sutraLines');
    var leadEl = document.getElementById('sutraLead');
    var pickEl = document.getElementById('sutraPick');
    var playBtn = document.getElementById('sutraPlay');
    var resetBtn = document.getElementById('sutraReset');
    var hintEl = document.getElementById('sutraHint');
    var cur = 'dabei';
    var lineEls = [];
    var selIdx = -1, loopOn = false, follow = false, selfScroll = 0;
    /* 通行读法校正：陀罗尼中几个字的常读音 */
    var PY_FIX = { '佛':'fó', '阇':'shé', '伽':'qié', '般':'bō', '若':'rě', '啰':'là', '咄':'duō' };

    function pyOf(ch){
      if (PY_FIX[ch]) return PY_FIX[ch];
      return PY[ch] || '';
    }

    function render(key){
      var s = SUTRAS[key];
      if (!s || !linesEl) return;
      cur = key;
      leadEl.textContent = s.lead;
      linesEl.innerHTML = '';
      lineEls = [];
      for (var i = 0; i < s.lines.length; i++){
        var p = document.createElement('p');
        var no = document.createElement('span');
        no.className = 'no';
        no.textContent = (i + 1 < 10 ? '0' : '') + (i + 1);
        p.appendChild(no);
        p.setAttribute('data-i', String(i));
        var txt = s.lines[i];
        var pys = [];
        for (var c = 0; c < txt.length; c++){
          var py = pyOf(txt.charAt(c));
          if (py) pys.push(py);
        }
        if (pys.length){
          var pysEl = document.createElement('span');
          pysEl.className = 'py';
          pysEl.textContent = pys.join(' ');
          p.appendChild(pysEl);
        }
        p.appendChild(document.createTextNode(txt));
        linesEl.appendChild(p);
        lineEls.push(p);
      }
      if (pickEl){
        var btns = pickEl.querySelectorAll('button');
        for (var j = 0; j < btns.length; j++) btns[j].classList.toggle('on', btns[j].getAttribute('data-sutra') === key);
      }
      if (key === 'dabei') setFollow(follow);
      else if (hintEl) hintEl.textContent = L('无声诵读 · silent reading','Silent reading');
      selectLine(-1);
      highlight(-1);
      if (stepOn) stopStep(false);
    }

    function highlight(idx){
      for (var i = 0; i < lineEls.length; i++) lineEls[i].classList.toggle('on', i === idx);
      if (idx >= 0 && lineEls[idx] && follow){
        try{ selfScroll = Date.now(); lineEls[idx].scrollIntoView({ block: 'nearest' }); }catch(e){ selfScroll = 0; }
      }
    }
    function setFollow(on){
      follow = !!on;
      if (hintEl) hintEl.textContent = follow
        ? L('随唱标注 · following the chant','Following the chant')
        : L('自由浏览 · browse freely','Browse freely');
    }

    var cum = null, totalChars = 0;
    function buildCum(){
      var s = SUTRAS.dabei;
      cum = []; totalChars = 0;
      for (var i = 0; i < s.lines.length; i++){
        cum.push(totalChars);
        totalChars += s.lines[i].length;
      }
    }
    buildCum();

    function syncChant(){
      if (cur !== 'dabei' || !lineEls.length) return;
      if (!document.getElementById('v-sutra').classList.contains('open')) return;
      var dur = amb.duration;
      if (!dur || isNaN(dur) || amb.paused) return;
      var frac = Math.min(1, amb.currentTime / dur);
      var target = frac * totalChars;
      var idx = 0;
      for (var i = 0; i < cum.length; i++) if (target >= cum[i]) idx = i;
      if (loopOn && selIdx >= 0){
        var s = SUTRAS.dabei;
        var startF = cum[selIdx] / totalChars;
        var endF = (cum[selIdx] + s.lines[selIdx].length) / totalChars;
        if (frac >= endF){
          amb.currentTime = startF * dur;
          idx = selIdx;
        }
      }
      highlight(idx);
    }
    amb.addEventListener('timeupdate', syncChant);

    /* 点某一句：置为跟读起点，并把梵唱挪到这一句 */
    function selectLine(i){
      selIdx = i;
      for (var k = 0; k < lineEls.length; k++) lineEls[k].classList.toggle('sel', k === i);
    }
    function seekToLine(i){
      if (cur !== 'dabei' || i < 0) return;
      var dur = amb.duration;
      if (!dur || isNaN(dur)) return;
      amb.currentTime = (cum[i] / totalChars) * dur;
    }
    if (linesEl){
      linesEl.addEventListener('click', function(e){
        var p = e.target.closest ? e.target.closest('p[data-i]') : null;
        if (!p) return;
        var i = parseInt(p.getAttribute('data-i'), 10);
        selectLine(i);
        seekToLine(i);
        if (cur === 'dabei') setFollow(true);
        if (cur !== 'dabei') toast('无声诵读 · only the chant is timed');
      });
    }

    if (pickEl){
      pickEl.addEventListener('click', function(e){
        var b = e.target.closest ? e.target.closest('button') : null;
        if (!b) return;
        render(b.getAttribute('data-sutra'));
      });
    }
    if (playBtn){
      playBtn.addEventListener('click', function(){
        if (muted){ toast('声音已关｜先开右上角声字'); return; }
        if (stepOn) stopStep(false);
        if (amb.paused){
          amb.play().then(function(){ fade(amb, 0.26, 1400); }).catch(function(){});
          playBtn.textContent = L('梵唱 · 止','Chant · stop');
        } else {
          fade(amb, 0, 700, function(){ amb.pause(); });
          playBtn.textContent = L('梵唱 · 起','Chant · start');
          highlight(-1);
        }
      });
    }
    if (resetBtn) resetBtn.addEventListener('click', function(){ setFollow(true); highlight(-1); amb.currentTime = 0; });
    /* 用户自己一滚，就交出控制权，梵唱不再把视线拽回经文 */
    var leafBodyEl = document.querySelector('#v-sutra .leaf-body');
    if (leafBodyEl){
      leafBodyEl.addEventListener('scroll', function(){
        if (Date.now() - selfScroll < 500) return;
        if (follow && cur === 'dabei' && !amb.paused) setFollow(false);
      }, { passive: true });
      leafBodyEl.addEventListener('wheel', function(){ if (follow && !amb.paused) setFollow(false); }, { passive: true });
      leafBodyEl.addEventListener('touchstart', function(){ if (follow && !amb.paused) setFollow(false); }, { passive: true });
    }

    /* 字号四档，随本机记住 */
    var ZOOM = [0.86, 1, 1.16, 1.34];
    var zoomIdx = 1;
    try{
      var zi = parseInt(localStorage.getItem('fxy-sutra-zoom'), 10);
      if (zi >= 0 && zi < ZOOM.length) zoomIdx = zi;
    }catch(e){}
    function applyZoom(){
      if (!linesEl) return;
      linesEl.style.setProperty('--sutra-size', 'calc(' + ZOOM[zoomIdx] + ' * clamp(16px, 1.72vw, 21px))');
      try{ localStorage.setItem('fxy-sutra-zoom', String(zoomIdx)); }catch(e){}
    }
    applyZoom();
    var zoomSmall = document.getElementById('sutraSmall');
    var zoomBig = document.getElementById('sutraBig');
    if (zoomSmall) zoomSmall.addEventListener('click', function(){ zoomIdx = Math.max(0, zoomIdx - 1); applyZoom(); });
    if (zoomBig) zoomBig.addEventListener('click', function(){ zoomIdx = Math.min(ZOOM.length - 1, zoomIdx + 1); applyZoom(); });

    /* 注音：默认显示，可关 */
    var pyBtn = document.getElementById('sutraPy');
    var pyOn = true;
    try{ pyOn = localStorage.getItem('fxy-py') !== '0'; }catch(e){}
    function applyPy(){
      if (linesEl) linesEl.classList.toggle('no-py', !pyOn);
      if (pyBtn){
        pyBtn.textContent = pyOn ? L('注音 · 关','Romanisation · off') : L('注音 · 开','Romanisation · on');
        pyBtn.setAttribute('aria-pressed', pyOn ? 'true' : 'false');
      }
      try{ localStorage.setItem('fxy-py', pyOn ? '1' : '0'); }catch(e){}
    }
    applyPy();
    if (pyBtn) pyBtn.addEventListener('click', function(){ pyOn = !pyOn; applyPy(); });

    /* 语速三档 */
    var rateBtn = document.getElementById('sutraRate');
    var RATES = [1, 0.8, 1.25];
    var rateIdx = 0;
    function applyRate(){
      amb.playbackRate = RATES[rateIdx];
      if (rateBtn) rateBtn.textContent = L('语速 · ','Speed · ') + (RATES[rateIdx] === 1 ? '1' : String(RATES[rateIdx])) + '×';
    }
    applyRate();
    if (rateBtn) rateBtn.addEventListener('click', function(){ rateIdx = (rateIdx + 1) % RATES.length; applyRate(); });

    /* 单句循环 */
    var loopBtn = document.getElementById('sutraLoop');
    function applyLoop(){
      if (loopBtn) loopBtn.setAttribute('aria-pressed', loopOn ? 'true' : 'false');
    }
    if (loopBtn) loopBtn.addEventListener('click', function(){
      loopOn = !loopOn;
      if (loopOn && selIdx < 0) selectLine(0);
      applyLoop();
      toast(loopOn ? '循环该句 · line repeats' : '停止循环 · loop off');
    });

    /* 静默跟读：不开声音，按句长推进高亮，适合安静处或戴耳机不便时 */
    var stepBtn = document.getElementById('sutraStep');
    var stepTimer = 0, stepIdx = -1, stepOn = false;
    function stepLabel(){
      if (!stepBtn) return;
      stepBtn.textContent = stepOn ? L('跟读 · 止','Pacing · stop') : L('静默跟读','Silent pacing');
      stepBtn.setAttribute('aria-pressed', stepOn ? 'true' : 'false');
    }
    function stopStep(reset){
      clearTimeout(stepTimer); stepTimer = 0;
      stepOn = false;
      if (reset){ stepIdx = -1; highlight(-1); selectLine(-1); }
      stepLabel();
    }
    function stepTick(){
      if (!stepOn) return;
      var lv = document.getElementById('v-sutra');
      if (!lv || !lv.classList.contains('open')){ stopStep(false); return; }
      var lines = (SUTRAS[cur] && SUTRAS[cur].lines) || [];
      stepIdx++;
      if (stepIdx >= lines.length){
        stopStep(false);
        toast('一遍已毕 · one round finished');
        return;
      }
      highlight(stepIdx);
      selectLine(stepIdx);
      var per = Math.round(320 / (RATES[rateIdx] || 1));
      var bare = lines[stepIdx].replace(/[，。、；：？！·]/g, '');
      var ms = Math.max(900, bare.length * per + 260);
      stepTimer = setTimeout(stepTick, ms);
    }
    if (stepBtn) stepBtn.addEventListener('click', function(){
      if (stepOn){ stopStep(false); toast('已停 · stopped'); return; }
      if (!amb.paused){
        fade(amb, 0, 600, function(){ amb.pause(); });
        if (playBtn) playBtn.textContent = L('梵唱 · 起','Chant · start');
      }
      stepOn = true; stepIdx = -1; stepLabel();
      toast('跟读中，可点「语速」调整快慢 · pacing, adjust with speed');
      stepTick();
    });

    /* 跟读录音：只在本机内存里，关页即失 */
    var recBtn = document.getElementById('sutraRec');
    var recRow = document.getElementById('sutraRecRow');
    var recAudio = document.getElementById('sutraRecAudio');
    var recClear = document.getElementById('sutraRecClear');
    var mediaRec = null, recChunks = [], recStream = null, recUrl = '', recTimer = 0;
    function stopRec(){
      if (mediaRec && mediaRec.state !== 'inactive') mediaRec.stop();
      if (recBtn) recBtn.textContent = '跟读录音';
      clearTimeout(recTimer);
    }
    if (recBtn) recBtn.addEventListener('click', function(){
      if (mediaRec && mediaRec.state === 'recording'){ stopRec(); return; }
      if (!navigator.mediaDevices || !window.MediaRecorder){ toast('此浏览器不支持录音 · Recording unsupported'); return; }
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function(st){
        recStream = st;
        recChunks = [];
        mediaRec = new MediaRecorder(st);
        mediaRec.ondataavailable = function(ev){ if (ev.data && ev.data.size) recChunks.push(ev.data); };
        mediaRec.onstop = function(){
          if (recUrl) URL.revokeObjectURL(recUrl);
          recUrl = URL.createObjectURL(new Blob(recChunks, { type: 'audio/webm' }));
          if (recAudio){ recAudio.src = recUrl; recRow.classList.add('show'); }
          if (recStream){ recStream.getTracks().forEach(function(t){ t.stop(); }); recStream = null; }
          toast('已录一段 · Take saved (this page only)');
        };
        mediaRec.start();
        if (recBtn) recBtn.textContent = '停 · Stop';
        toast('录音中，最长二十秒 · recording, max 20s');
        recTimer = setTimeout(stopRec, 20000);
      }).catch(function(){ toast('未能取得麦克风权限 · Mic permission denied'); });
    });
    if (recClear) recClear.addEventListener('click', function(){
      if (recUrl){ URL.revokeObjectURL(recUrl); recUrl = ''; }
      if (recAudio) recAudio.removeAttribute('src');
      recRow.classList.remove('show');
      toast('已删去 · Removed');
    });

    render('dabei');
    window.__sutraRender = render;
  })();

  /* ================= 功课 · 计数与连续日 ================= */
  function todayKey(){
    var d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }
  (function practiceModule(){
    var list = document.getElementById('kungList');
    var beadNum = document.getElementById('beadNum');
    var beadRing = document.getElementById('beadRing');
    var beadTap = document.getElementById('beadTap');
    var beadReset = document.getElementById('beadReset');
    var streakNum = document.getElementById('streakNum');
    var kungKey = 'fxy-kung-' + todayKey();
    var beadKey = 'fxy-bead-' + todayKey();
    var daysKey = 'fxy-days';
    var C = 339.29;

    /* 每日一偈：按当年的第几日轮换 */
    var GATHAS = [
      ['诸恶莫作，众善奉行，自净其意，是诸佛教。', 'DO NO EVIL・PRACTISE WHAT IS GOOD・PURIFY THE MIND・THIS IS THE TEACHING OF ALL BUDDHAS'],
      ['一切有为法，如梦幻泡影，如露亦如电，应作如是观。', 'ALL CONDITIONED THINGS ARE LIKE A DREAM・AN ILLUSION・A BUBBLE・A SHADOW・LIKE DEW OR A FLASH OF LIGHTNING — SO SHOULD THEY BE SEEN'],
      ['心无挂碍，无挂碍故，无有恐怖，远离颠倒梦想。', 'WITH NO HINDRANCE IN THE MIND, FEAR FALLS AWAY AND DISTORTED DREAMS END'],
      ['若人静坐一须臾，胜造恒沙七宝塔。', 'ONE MOMENT OF STILL SITTING OUTWEIGHS STUPAS OF SEVEN TREASURES AS MANY AS THE GANGES SANDS'],
      ['日日是好日，处处是道场。', 'EVERY DAY IS A GOOD DAY・EVERY PLACE IS A PLACE OF PRACTICE'],
      ['不怕念起，只怕觉迟。', 'THOUGHTS WILL ARISE・WHAT MATTERS IS NOTICING THEM IN TIME'],
      ['莫向外求，但向心觅。', 'SEEK NOT OUTSIDE・LOOK INTO THE MIND INSTEAD'],
      ['随其心净，则佛土净。', 'AS THE MIND IS PURE, SO IS THE BUDDHA-LAND PURE']
    ];
    function paintGatha(){
      var gz = document.getElementById('gathaZh');
      var ge = document.getElementById('gathaEn');
      var d = new Date();
      var doy = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000);
      var g = GATHAS[((doy % GATHAS.length) + GATHAS.length) % GATHAS.length];
      if (gz) gz.textContent = g[0];
      if (ge) ge.textContent = g[1];
    }
    paintGatha();

    function getDay(){
      try{ return JSON.parse(localStorage.getItem(kungKey) || '{}') || {}; }catch(e){ return {}; }
    }
    function saveDay(o){ try{ localStorage.setItem(kungKey, JSON.stringify(o)); }catch(e){} }
    function markToday(){
      var days = [];
      try{ days = JSON.parse(localStorage.getItem(daysKey) || '[]') || []; }catch(e){ days = []; }
      var t = todayKey();
      if (days.indexOf(t) < 0){ days.push(t); if (days.length > 400) days = days.slice(-400); }
      try{ localStorage.setItem(daysKey, JSON.stringify(days)); }catch(e){}
    }
    function streak(){
      var days = [];
      try{ days = JSON.parse(localStorage.getItem(daysKey) || '[]') || []; }catch(e){}
      var n = 0, d = new Date();
      for (var i = 0; i < 800; i++){
        var k = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
        if (days.indexOf(k) >= 0) n++;
        else if (i > 0) break;
        d.setDate(d.getDate() - 1);
      }
      return n;
    }

    function paintBead(){
      var n = 0;
      try{ n = parseInt(localStorage.getItem(beadKey) || '0', 10) || 0; }catch(e){ n = 0; }
      if (beadNum) beadNum.textContent = String(n);
      if (beadRing){
        var p = Math.min(1, (n % 108) / 108);
        beadRing.setAttribute('stroke-dashoffset', String(C * (1 - p)));
        beadRing.setAttribute('stroke-dasharray', String(C));
      }
      if (streakNum) streakNum.textContent = String(streak());
    }

    if (list){
      var st = getDay();
      var boxes = list.querySelectorAll('input[type=checkbox]');
      for (var i = 0; i < boxes.length; i++){
        var k = boxes[i].getAttribute('data-k');
        boxes[i].checked = !!st[k];
        (function(box, key){
          box.addEventListener('change', function(){
            var o = getDay();
            o[key] = box.checked;
            saveDay(o);
            if (box.checked) markToday();
            paintBead();
          });
        })(boxes[i], k);
      }
    }
    if (beadTap){
      beadTap.addEventListener('click', function(){
        var n = parseInt(localStorage.getItem(beadKey) || '0', 10) + 1;
        try{ localStorage.setItem(beadKey, String(n)); }catch(e){}
        markToday();
        paintBead();
      });
    }
    if (beadReset){
      beadReset.addEventListener('click', function(){
        try{ localStorage.setItem(beadKey, '0'); }catch(e){}
        paintBead();
        toast('已清零 · Cleared');
      });
    }
    paintBead();
  })();

  /* ================= 供养：灯 / 花 / 水 ================= */
  (function offeringModule(){
    var wall = document.getElementById('lampWall');
    var wishEl = document.getElementById('lampWish');
    var nameEl = document.getElementById('lampName');
    var addBtn = document.getElementById('lampAdd');
    var tabsEl = document.querySelector('.off-tabs');
    var cntEl = document.getElementById('lampCount');

    var KINDS = {
      lamp: {
        key: 'fxy-lamps', cls: '', mark: 'flame',
        ph: '一句愿文，二十八言以内', act: '点一盏灯 · Light a lamp',
        empty: '灯墙尚空。写下愿文，点一盏；愿不必大，一句真心即可。',
        none: '此处尚无灯 · No lamp yet',
        count: '此处已供 {n} 盏 · {n} LAMP{LIT}',
        done: '灯已点亮 · Lamp lit',
        take: '吹熄 · Out'
      },
      flower: {
        key: 'fxy-offer-flowers', cls: 'lamp--flower', mark: 'bloom',
        ph: '一句愿文，二十八言以内', act: '供一枝花 · Offer a flower',
        empty: '花尚空瓶。写一句愿，供一枝；花会枯，愿不必许。',
        none: '此处尚无花 · No flower yet',
        count: '此处已供 {n} 枝 · {n} FLOWER{LIT}',
        done: '花已供奉 · Flower offered',
        take: '撤供 · Remove'
      },
      water: {
        key: 'fxy-offer-water', cls: 'lamp--water', mark: 'bowl',
        ph: '一句愿文，二十八言以内', act: '奉一盏水 · Offer water',
        empty: '水盂尚空。供一盏清水，表心地澄净。',
        none: '此处尚无水 · No water yet',
        count: '此处已供 {n} 盏 · {n} BOWL{LIT}',
        done: '净水已奉 · Water offered',
        take: '撤供 · Remove'
      }
    };

    var kind = 'lamp';
    var stores = {};

    function load(k){
      if (stores[k]) return stores[k];
      var arr = [];
      try { arr = JSON.parse(localStorage.getItem(KINDS[k].key) || '[]') || []; } catch (e) { arr = []; }
      stores[k] = arr;
      return arr;
    }
    function save(k){
      try { localStorage.setItem(KINDS[k].key, JSON.stringify(load(k).slice(-36))); } catch (e) {}
    }
    function fill(tpl, n){
      return tpl.replace(/\{n\}/g, n).replace(/\{LIT\}/g, n === 1 ? '' : 'S');
    }

    function paint(){
      var cfg = KINDS[kind], list = load(kind);
      if (cntEl) cntEl.textContent = list.length ? fill(cfg.count, list.length) : cfg.none;
      if (!wall) return;
      wall.textContent = '';
      if (!list.length){
        var p = document.createElement('p');
        p.className = 'lamp-empty';
        p.textContent = cfg.empty;
        wall.appendChild(p);
        return;
      }
      for (var i = list.length - 1; i >= 0; i--){
        (function(item, idx){
          var d = document.createElement('div');
          d.className = 'lamp' + (cfg.cls ? ' ' + cfg.cls : '');
          var mk = document.createElement('span');
          mk.className = cfg.mark;
          if (cfg.mark === 'bloom'){
            mk.innerHTML = '<svg viewBox="0 0 32 28" width="27" height="24" aria-hidden="true">'
              + '<path d="M16 2 C20 8 20 15 16 19 C12 15 12 8 16 2Z" fill="rgba(255,206,228,.58)" stroke="rgba(255,214,232,.75)" stroke-width=".8"/>'
              + '<path d="M5 7 C11 10 14 14 16 19 C10 19 6 14 5 7Z" fill="rgba(248,190,216,.46)" stroke="rgba(252,206,228,.6)" stroke-width=".8"/>'
              + '<path d="M27 7 C21 10 18 14 16 19 C22 19 26 14 27 7Z" fill="rgba(248,190,216,.46)" stroke="rgba(252,206,228,.6)" stroke-width=".8"/>'
              + '<path d="M2 16 C8 16 13 18 16 21 C10 25 4 22 2 16Z" fill="rgba(240,178,208,.38)" stroke="rgba(250,200,224,.5)" stroke-width=".8"/>'
              + '<path d="M30 16 C24 16 19 18 16 21 C22 25 28 22 30 16Z" fill="rgba(240,178,208,.38)" stroke="rgba(250,200,224,.5)" stroke-width=".8"/>'
              + '<circle cx="16" cy="21" r="1.6" fill="rgba(255,226,180,.75)"/>'
              + '</svg>';
          }
          d.appendChild(mk);
          var w = document.createElement('p');
          w.textContent = item.w;
          d.appendChild(w);
          var by = document.createElement('span');
          by.className = 'by';
          by.textContent = item.n ? ('— ' + item.n) : '— 无名';
          d.appendChild(by);
          var del = document.createElement('button');
          del.className = 'del';
          del.type = 'button';
          del.textContent = cfg.take;
          del.addEventListener('click', function(){
            var l = load(kind);
            l.splice(idx, 1);
            save(kind); paint();
          });
          d.appendChild(del);
          wall.appendChild(d);
        })(list[i], i);
      }
    }

    function switchKind(k){
      kind = k;
      if (tabsEl){
        var tabs = tabsEl.querySelectorAll('.off-tab');
        for (var i = 0; i < tabs.length; i++){
          var on = tabs[i].getAttribute('data-k') === k;
          tabs[i].classList.toggle('on', on);
          tabs[i].setAttribute('aria-selected', on ? 'true' : 'false');
        }
      }
      if (wishEl) wishEl.placeholder = KINDS[k].ph;
      if (addBtn) addBtn.textContent = KINDS[k].act;
      paint();
    }

    if (tabsEl){
      tabsEl.addEventListener('click', function(e){
        var t = e.target.closest('.off-tab');
        if (t) switchKind(t.getAttribute('data-k'));
      });
    }

    if (addBtn){
      addBtn.addEventListener('click', function(){
        var w = (wishEl ? wishEl.value : '').trim();
        if (!w){ toast('先写一句愿文 · Please write a wish'); return; }
        load(kind).push({ w: w.slice(0, 28), n: (nameEl ? nameEl.value : '').trim().slice(0, 12), t: Date.now() });
        save(kind); paint();
        if (wishEl) wishEl.value = '';
        if (nameEl) nameEl.value = '';
        toast(KINDS[kind].done);
      });
    }

    switchKind('lamp');
  })();

  /* ================= 回向 · dedication ================= */
  (function dedicationModule(){
    var btn = document.getElementById('meritBtn');
    var say = document.getElementById('meritSay');
    var panel = document.getElementById('ded');
    var forEl = document.getElementById('dedFor');
    var nameEl = document.getElementById('dedName');
    var makeBtn = document.getElementById('dedMake');
    var outEl = document.getElementById('dedOut');
    var zhEl = document.getElementById('dedZh');
    var enEl = document.getElementById('dedEn');
    var copyBtn = document.getElementById('dedCopy');
    var saveBtn = document.getElementById('dedSave');
    var histEl = document.getElementById('dedHist');
    var KEY = 'fxy-merit';

    function state(){ try{ return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; }catch(e){ return {}; } }
    function store(st){ try{ localStorage.setItem(KEY, JSON.stringify(st)); }catch(e){} }

    function paint(){
      var st = state(), n = st.n || 0, d = st.last || '';
      if (say){
        if (n) say.innerHTML = '已回向 <b>' + n + '</b> 次 · 最近 ' + d + '　Dedicated ' + n + ' time' + (n > 1 ? 's' : '');
        else say.textContent = '尚未回向 · Nothing dedicated yet';
      }
      if (!histEl) return;
      var list = st.list || [];
      if (!list.length){ histEl.textContent = ''; return; }
      var html = '近三次回向 · Last three<br>';
      for (var i = 0; i < list.length && i < 3; i++){
        html += '<b>' + list[i].d + '</b>　' + list[i].for + (list[i].name ? '（' + list[i].name + '）' : '') + '<br>';
      }
      histEl.innerHTML = html;
    }

    function compose(){
      var kindFor = forEl ? forEl.value : 'all';
      var nm = (nameEl ? nameEl.value : '').trim().slice(0, 16);
      var zh, en;
      if (kindFor === 'alive'){
        var who = nm || '亲友';
        zh = '愿以此诵经、抄经、供灯之功德，回向给' + who + '：愿其身心安康，善根增长，所愿称遂，远离忧恼。';
        en = 'By this merit of reciting, copying and offering, may ' + (nm || 'my loved ones') + ' be well in body and mind, grow in goodness, and be free from sorrow.';
      } else if (kindFor === 'dead'){
        var whom = nm || '先亡';
        zh = '愿以此诵经、抄经、供灯之功德，回向先亡' + whom + '：愿其离苦得乐，往生净土，莲品增上，早证菩提。';
        en = 'By this merit, may ' + (nm || 'the departed') + ' be free from suffering, reborn in the Pure Land, and swiftly awaken.';
      } else {
        zh = '愿以此诵经、抄经、供灯之功德，普及于一切，我等与众生，皆共成佛道。';
        en = 'May this merit be shared with all beings; may we together accomplish the path of awakening.';
      }
      return { zh: zh, en: en, for: kindFor, name: nm };
    }

    if (btn) btn.addEventListener('click', function(){
      if (!panel) return;
      var open = !panel.hasAttribute('hidden');
      if (open){ panel.setAttribute('hidden', ''); return; }
      panel.removeAttribute('hidden');
      if (nameEl && forEl && forEl.value !== 'all') nameEl.focus();
      else if (forEl) forEl.focus();
    });

    if (makeBtn) makeBtn.addEventListener('click', function(){
      var r = compose();
      if (zhEl) zhEl.textContent = r.zh;
      if (enEl) enEl.textContent = r.en;
      if (outEl) outEl.removeAttribute('hidden');
      panel.setAttribute('data-last', JSON.stringify(r));
      paint();
    });

    if (copyBtn) copyBtn.addEventListener('click', function(){
      var txt = (zhEl ? zhEl.textContent : '') + '\n' + (enEl ? enEl.textContent : '');
      function fallback(){
        try {
          var ta = document.createElement('textarea');
          ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
          document.body.appendChild(ta); ta.select(); document.execCommand('copy');
          document.body.removeChild(ta);
          toast('回向文已抄下 · Dedication copied');
        } catch (e) { toast('这段字就在这里，可自行抄录 · Please copy manually'); }
      }
      if (navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(txt).then(function(){ toast('回向文已抄下 · Dedication copied'); }, fallback);
      } else fallback();
    });

    if (saveBtn) saveBtn.addEventListener('click', function(){
      var raw = panel.getAttribute('data-last');
      if (!raw){ toast('先书写回向文 · Compose first'); return; }
      var r = null;
      try { r = JSON.parse(raw); } catch (e) { r = null; }
      if (!r) return;
      var st = state();
      st.n = (st.n || 0) + 1;
      var d = new Date();
      st.last = d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
      st.list = (st.list || []).concat([{ d: st.last, for: r.for, name: r.name }]).slice(-12);
      store(st); paint();
      toast('愿以此功德，普及于一切 · Merit shared with all');
    });

    paint();
  })();

  /* ================= 历数 · 农历与斋期 ================= */
  var LUNAR_MON = { '正月':1, '一月':1, '二月':2, '三月':3, '四月':4, '五月':5, '六月':6,
    '七月':7, '八月':8, '九月':9, '十月':10, '冬月':11, '十一月':11, '腊月':12, '十二月':12 };
  var MON_NAME = ['', '正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];
  var OBSERVANCES = [
    { m: 2, d: 8,  zh: '释迦牟尼佛出家', en: 'BUDDHA\'S RENUNCIATION' },
    { m: 2, d: 19, zh: '观音菩萨圣诞',   en: 'GUANYIN\'S BIRTHDAY' },
    { m: 4, d: 4,  zh: '文殊菩萨圣诞',   en: 'MANJUSHRI\'S BIRTHDAY' },
    { m: 4, d: 8,  zh: '释迦牟尼佛圣诞', en: 'BUDDHA\'S BIRTHDAY' },
    { m: 6, d: 19, zh: '观音菩萨成道',   en: 'GUANYIN\'S ENLIGHTENMENT' },
    { m: 7, d: 30, zh: '地藏菩萨圣诞',   en: 'KSITIGARBHA\'S BIRTHDAY' },
    { m: 9, d: 19, zh: '观音菩萨出家',   en: 'GUANYIN\'S RENUNCIATION' },
    { m: 11, d: 17, zh: '阿弥陀佛圣诞',  en: 'AMITABHA\'S BIRTHDAY' },
    { m: 1, d: 1,  zh: '弥勒菩萨圣诞',   en: 'MAITREYA\'S BIRTHDAY' },
    { m: 7, d: 15, zh: '佛欢喜日 · 盂兰盆', en: 'THE JOYFUL DAY' },
    { m: 12, d: 8, zh: '释迦牟尼佛成道 · 腊八', en: 'BUDDHA\'S ENLIGHTENMENT (LABA)' }
  ];
  var lunarFmt = null;
  function lunarParts(date){
    try{
      if (!lunarFmt) lunarFmt = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', { year: 'numeric', month: 'long', day: 'numeric' });
      var parts = lunarFmt.formatToParts(date);
      var mon = '', day = 0, leap = false;
      for (var i = 0; i < parts.length; i++){
        if (parts[i].type === 'month') mon = parts[i].value;
        else if (parts[i].type === 'day') day = parseInt(String(parts[i].value).replace(/[^0-9]/g, ''), 10) || 0;
      }
      if (!mon || !day) return null;
      if (mon.indexOf('闰') === 0){ leap = true; mon = mon.slice(1); }
      else if (mon.indexOf('闰') > 0){ leap = true; mon = mon.replace('闰', ''); }
      var m = LUNAR_MON[mon] || 0;
      var ry = '', yn = '';
      for (var j = 0; j < parts.length; j++){
        if (parts[j].type === 'relatedYear' || parts[j].type === 'year') ry = parts[j].value;
        if (parts[j].type === 'yearName') yn = parts[j].value;
      }
      return { m: m, d: day, leap: leap, monName: mon, yearText: ry ? (ry + yn + '年') : '' };
    }catch(e){ return null; }
  }
  function zhDay(n){
    if (n <= 0) return '';
    if (n <= 10) return '初' + (n === 10 ? '十' : '一二三四五六七八九'.charAt(n - 1));
    if (n < 20) return '十' + '一二三四五六七八九'.charAt(n - 11);
    if (n === 20) return '二十';
    if (n < 30) return '廿' + '一二三四五六七八九'.charAt(n - 21);
    return '三十';
  }
  /* 一次扫描建表：按 (月-日) 记第一个未来日期，避免 8 个节令各扫 420 天 */
  var lunarIndex = null;
  function buildLunarIndex(days){
    if (lunarIndex) return lunarIndex;
    lunarIndex = {};
    var base = new Date(); base.setHours(12, 0, 0, 0);
    for (var i = 0; i < (days || 420); i++){
      var dt = new Date(base.getTime() + i * 86400000);
      var l = lunarParts(dt);
      if (!l || l.leap || !l.m) continue;
      var key = l.m + '-' + l.d;
      if (!lunarIndex[key]) lunarIndex[key] = dt;
    }
    return lunarIndex;
  }
  function nextOf(m, d){ return buildLunarIndex(420)[m + '-' + d] || null; }
  function zhDate(dt){ return (dt.getMonth() + 1) + '月' + dt.getDate() + '日'; }
  function pad2n(n){ return (n < 10 ? '0' : '') + n; }
  function icsStamp(dt){
    return dt.getFullYear() + pad2n(dt.getMonth() + 1) + pad2n(dt.getDate());
  }
  function downloadIcs(rows){
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'CALSCALE:GREGORIAN',
      'PRODID:-//Jinshen Liantai//Lunar Observances//CN'];
    for (var i = 0; i < rows.length; i++){
      var r = rows[i];
      var s = new Date(r.dt.getTime()); s.setHours(0, 0, 0, 0);
      var e = new Date(s.getTime() + 86400000);
      L.push('BEGIN:VEVENT');
      L.push('UID:jinshen-' + icsStamp(s) + '-' + i + '@liantai');
      L.push('DTSTAMP:' + icsStamp(new Date()) + 'T000000Z');
      L.push('DTSTART;VALUE=DATE:' + icsStamp(s));
      L.push('DTEND;VALUE=DATE:' + icsStamp(e));
      L.push('SUMMARY:' + r.o.zh + ' ' + r.o.en);
      L.push('DESCRIPTION:农历' + MON_NAME[r.o.m] + zhDay(r.o.d) + ' · 六斋日宜素食');
      L.push('TRANSP:TRANSPARENT');
      L.push('END:VEVENT');
    }
    L.push('END:VCALENDAR');
    try{
      var blob = new Blob([L.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'liantai-observances.ics';
      document.body.appendChild(a);
      a.click();
      setTimeout(function(){ URL.revokeObjectURL(url); a.remove(); }, 1200);
      toast('历表已下载 · Calendar file saved');
    }catch(err){ toast('当前环境不支持下载 · Download unavailable'); }
  }
  var icsRows = [];

  var almanacDone = false;
  function initAlmanac(){
    if (almanacDone) return;
    almanacDone = true;
    var dateEl = document.getElementById('almDate');
    var lunarEl = document.getElementById('almLunar');
    var lunarEnEl = document.getElementById('almLunarEn');
    var tagEl = document.getElementById('almTag');
    var listEl = document.getElementById('almList');
    if (!dateEl) return;
    var now = new Date();
    dateEl.textContent = now.getFullYear() + ' 年 ' + (now.getMonth() + 1) + ' 月 ' + now.getDate() + ' 日';
    var l = lunarParts(now);
    if (l){
      lunarEl.textContent = (l.yearText || '') + ' · ' + (l.leap ? '闰' : '') + l.monName + zhDay(l.d);
      lunarEnEl.textContent = 'LUNAR MONTH ' + l.m + ' · DAY ' + l.d;
      var eraEl = document.getElementById('almEra');
      if (eraEl){
        var era = now.getFullYear() + 543;   // 佛历：公元 + 543（佛灭后纪年）
        eraEl.textContent = '佛历 ' + era + ' 年 · 公元 ' + now.getFullYear() + ' 年　B.E. ' + era;
      }
      var ZHAI = [8, 14, 15, 23, 29, 30];
      if (ZHAI.indexOf(l.d) >= 0){
        tagEl.textContent = '今日 · 六斋日 · 宜素食';
      } else {
        var nd = null;
        for (var i = 1; i < 40; i++){
          var d2 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
          var l2 = lunarParts(d2);
          if (l2 && ZHAI.indexOf(l2.d) >= 0 && !l2.leap){ nd = { d: d2, l: l2 }; break; }
        }
        tagEl.textContent = nd ? ('下一斋日 · ' + (nd.l.monName) + zhDay(nd.l.d)) : '今日 · 平日';
      }
    } else {
      lunarEl.textContent = '农历换算不可用';
      lunarEnEl.textContent = 'LUNAR CALENDAR UNAVAILABLE';
      tagEl.textContent = '平日';
    }
    if (listEl){
      var items = [];
      for (var k = 0; k < OBSERVANCES.length; k++){
        var o = OBSERVANCES[k];
        var dt = nextOf(o.m, o.d);
        if (dt) items.push({ o: o, dt: dt });
      }
      items.sort(function(a, b){ return a.dt - b.dt; });
      icsRows = items.slice();
      listEl.innerHTML = '';
      for (var q = 0; q < items.length && q < 4; q++){
        (function(it){
          var row = document.createElement('div');
          row.className = 'alm-item';
          var b = document.createElement('b');
          b.textContent = it.o.zh;
          row.appendChild(b);
          var days = Math.ceil((it.dt - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
          var sp = document.createElement('span');
          sp.className = 'days';
          sp.textContent = days <= 0 ? '今日' : (days + ' 日');
          row.appendChild(sp);
          var small = document.createElement('small');
          small.textContent = (it.dt.getMonth() + 1) + '月' + it.dt.getDate() + '日 · 农历' + MON_NAME[it.o.m] + zhDay(it.o.d) + ' · ' + it.o.en;
          row.appendChild(small);
          listEl.appendChild(row);
        })(items[q]);
      }
    }
    var icsBtn = document.getElementById('almIcs');
    if (icsBtn){
      icsBtn.addEventListener('click', function(){
        if (!icsRows.length){ toast('历表未就绪 · Calendar not ready'); return; }
        downloadIcs(icsRows);
      });
    }
  }

  /* ================= 提醒 ================= */
  (function remindModule(){
    var tEl = document.getElementById('remindTime');
    var bEl = document.getElementById('remindBtn');
    var sayEl = document.getElementById('remindSay');
    var KEY = 'fxy-remind';
    var timer = 0;
    var st = { on: false, t: '07:00' };
    try{ st = JSON.parse(localStorage.getItem(KEY) || '{}') || st; }catch(e){}
    if (tEl && st.t) tEl.value = st.t;
    function save(){ try{ localStorage.setItem(KEY, JSON.stringify(st)); }catch(e){} }
    function paint(){
      if (!bEl || !sayEl) return;
      bEl.textContent = st.on ? '关闭提醒 · Turn off' : '开启提醒 · Remind me';
      bEl.setAttribute('aria-pressed', st.on ? 'true' : 'false');
      sayEl.textContent = st.on
        ? ('每日 ' + st.t + ' 提醒 · 仅页面打开时生效　daily at ' + st.t + ', page must stay open')
        : '仅在页面打开时生效 · works only while this page is open';
    }
    function fire(){
      if (!st.on) return;
      var body = '今日功课：上香、诵咒、叩钟、静坐，择一件即可。';
      try{
        if (window.Notification && Notification.permission === 'granted'){
          new Notification('梵音殿 · 今日功课', { body: body });
          toast('提醒已响 · Reminder shown');
        } else {
          toast('该到做功课时 · Time for practice');
        }
      }catch(e){ toast('该到做功课时 · Time for practice'); }
    }
    function schedule(){
      clearTimeout(timer);
      if (!st.on) return;
      var p = String(st.t || '07:00').split(':');
      var h = parseInt(p[0], 10) || 0, m = parseInt(p[1], 10) || 0;
      var now = new Date();
      var next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
      if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
      timer = setTimeout(function(){ fire(); schedule(); }, next.getTime() - now.getTime());
    }
    if (bEl) bEl.addEventListener('click', function(){
      if (st.on){ st.on = false; save(); paint(); schedule(); toast('已关闭提醒 · Reminder off'); return; }
      if (tEl) st.t = tEl.value || '07:00';
      st.on = true; save(); paint(); schedule();
      if (window.Notification && Notification.permission === 'default'){
        try{ Notification.requestPermission(); }catch(e){}
      }
      toast('已定 ' + st.t + ' · reminder set');
    });
    if (tEl) tEl.addEventListener('change', function(){ st.t = tEl.value || '07:00'; save(); paint(); schedule(); });
    paint();
    schedule();
  })();

  /* ================= 本地存档 · 导出 / 导入 ================= */
  (function archiveModule(){
    var exp = document.getElementById('expBtn');
    var imp = document.getElementById('impBtn');
    var file = document.getElementById('impFile');
    var say = document.getElementById('archSay');
    if (!exp || !imp || !file) return;

    function collect(){
      var out = {}, i, k;
      try{
        for (i = 0; i < localStorage.length; i++){
          k = localStorage.key(i);
          if (k && k.indexOf('fxy-') === 0) out[k] = localStorage.getItem(k);
        }
      }catch(e){}
      return out;
    }

    exp.addEventListener('click', function(){
      var keys = collect();
      var n = Object.keys(keys).length;
      var payload = { app: '梵音殿 · Obenno', savedAt: new Date().toISOString(), keys: keys };
      var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      var d = new Date();
      a.href = url;
      a.download = '梵音殿-本地存档-' + d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()) + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function(){ URL.revokeObjectURL(url); }, 4000);
      if (say) say.textContent = '已导出 ' + n + ' 项 · ' + n + ' items exported';
      toast('存档已导出 · Archive exported');
    });

    imp.addEventListener('click', function(){ file.click(); });

    file.addEventListener('change', function(){
      var f = file.files && file.files[0];
      if (!f) return;
      var fr = new FileReader();
      fr.onload = function(){
        var obj = null, n = 0;
        try{ obj = JSON.parse(String(fr.result)); }catch(e){ obj = null; }
        if (!obj || !obj.keys || typeof obj.keys !== 'object'){
          toast('文件无法识别 · Unrecognised file');
          file.value = '';
          return;
        }
        Object.keys(obj.keys).forEach(function(k){
          if (k.indexOf('fxy-') !== 0) return;
          try{ localStorage.setItem(k, String(obj.keys[k])); n++; }catch(e){}
        });
        file.value = '';
        if (say) say.textContent = '已导入 ' + n + ' 项，正在刷新 · ' + n + ' items restored';
        toast('存档已导入 · Archive restored');
        setTimeout(function(){ location.reload(); }, 900);
      };
      fr.readAsText(f);
    });
  })();


  /* ================= 阅读设置 · 引用此节 ================= */
  (function readerTools(){
    var body = document.getElementById('readerBody');
    if (!body) return;
    var FS_KEY = 'fxy-rd-fs', MW_KEY = 'fxy-rd-wide';
    function applySize(v){
      v = Math.min(21, Math.max(14, v));
      body.style.setProperty('--rd-fs', v + 'px');
      try{ localStorage.setItem(FS_KEY, String(v)); }catch(e){}
    }
    function applyWidth(wide){
      body.style.setProperty('--rd-mw', wide ? '940px' : '720px');
      try{ localStorage.setItem(MW_KEY, wide ? '1' : '0'); }catch(e){}
      var b = document.getElementById('rdWide');
      if (b) b.textContent = wide ? '窄行 · Narrow' : '行宽 · Width';
    }
    var fs = 16;
    try{ fs = parseInt(localStorage.getItem(FS_KEY), 10) || 16; }catch(e){}
    applySize(fs);
    var wide = false;
    try{ wide = localStorage.getItem(MW_KEY) === '1'; }catch(e){}
    applyWidth(wide);

    var small = document.getElementById('rdSmall'), big = document.getElementById('rdBig'), wideBtn = document.getElementById('rdWide');
    if (small) small.addEventListener('click', function(){ var v = parseInt(body.style.getPropertyValue('--rd-fs'), 10) || 16; applySize(v - 1); });
    if (big) big.addEventListener('click', function(){ var v = parseInt(body.style.getPropertyValue('--rd-fs'), 10) || 16; applySize(v + 1); });
    if (wideBtn) wideBtn.addEventListener('click', function(){ applyWidth(wideBtn.textContent.indexOf('窄行') < 0); });

    var citeBtn = document.getElementById('rdCite');
    if (citeBtn) citeBtn.addEventListener('click', function(){
      var mid = window.innerHeight / 2, best = null, bestD = 1e9;
      var ps = body.querySelectorAll('p[data-i]');
      for (var i = 0; i < ps.length; i++){
        var r = ps[i].getBoundingClientRect();
        var d = Math.abs((r.top + r.bottom) / 2 - mid);
        if (d < bestD){ bestD = d; best = ps[i]; }
      }
      if (!best){ toast('这一部暂无可引之节 · nothing to cite'); return; }
      var title = (document.getElementById('readerTitle') || {}).textContent || '经';
      var i2 = parseInt(best.getAttribute('data-i'), 10) + 1;
      var txt = best.textContent.replace(/\s+/g, '');
      var base = location.href.split('?')[0].split('#')[0];
      var id = window.__curBook || '';
      var line = '「' + txt + '」——《' + title + '》第 ' + i2 + ' 节（' + base + '?b=' + id + '）';
      var done = function(){ toast('已复制此节 · Section copied'); };
      if (navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(line).then(done).catch(function(){ toast('复制失败，请手动选取 · copy failed'); });
      } else { toast('复制失败，请手动选取 · copy failed'); }
    });
  })();



  /* ================= 打印经文 ================= */
  (function printModule(){
    var btn = document.getElementById('rdPrint');
    if (!btn) return;
    btn.addEventListener('click', function(){
      var body = document.getElementById('readerBody');
      var title = document.getElementById('readerTitle');
      var lines = document.getElementById('sutraLines');
      var hasReader = !!(body && body.children.length);
      var hasLines = !!(lines && lines.children.length);
      if (!hasReader && !hasLines){
        toast('先开一部经 · open a text first');
        return;
      }
      var sheet = document.getElementById('printSheet');
      if (!sheet){
        sheet = document.createElement('div');
        sheet.id = 'printSheet';
        document.body.appendChild(sheet);
      }
      var name = ((title && title.textContent) || '').trim();
      if (name.length < 2){
        var onBtn = document.querySelector('#v-sutra .sutra-pick button[data-sutra].on b')
                 || document.querySelector('#v-sutra .sutra-pick button[data-sutra="' + (window.__curBook || '') + '"] b');
        name = (onBtn && onBtn.textContent || '').trim() || '经文';
      }
      var cn = name.split('·')[0].trim() || name;
      var srcEl = document.querySelector('#bookReader .reader-source');
      var srcTxt = '';
      if (srcEl) srcTxt = (window.__citeFor || srcEl.textContent || '').replace(/\s+/g, ' ').slice(0, 260);
      var html = '<h1 class="ps-title">' + cn + '</h1>';
      if (srcTxt) html += '<p class="ps-src">' + srcTxt + '</p>';
      var texts = [];
      if (hasReader){
        var ps = body.querySelectorAll('p');
        for (var i = 0; i < ps.length; i++) texts.push(ps[i].textContent);
      } else {
        var kids = lines.children;
        for (var k = 0; k < kids.length; k++){
          var tx = (kids[k].textContent || '').replace(/\s+/g, ' ').trim();
          if (tx) texts.push(tx);
        }
        if (!texts.length) texts = [(lines.textContent || '').replace(/\s+/g, ' ').trim()];
      }
      for (var t = 0; t < texts.length; t++){
        var tx2 = (texts[t] || '').replace(/\s+/g, ' ').trim();
        if (tx2) html += '<p class="ps-line">' + tx2 + '</p>';
      }
      html += '<p class="ps-foot">梵音殿 · Obenno｜www.obenno.com　经文仅供诵读，勿作商用；录文据 CBETA《大正藏》电子佛典。</p>';
      sheet.innerHTML = html;
      document.body.classList.add('pr-book');
      try{ window.print(); }catch(e){}
      setTimeout(function(){ document.body.classList.remove('pr-book'); }, 1200);
    });
    window.addEventListener('afterprint', function(){
      document.body.classList.remove('pr-book');
    });
  })();

  /* ================= 离线可读 ================= */
  (function offlineModule(){
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol.indexOf('http') !== 0) return;
    window.addEventListener('load', function(){
      setTimeout(function(){
        navigator.serviceWorker.register('./sw.js').catch(function(){});
      }, 1200);
    });
  })();


  /* ================= 版本 · 注疏 ================= */
  (function metaModule(){
    window.__META = {
      jg: { alt: '异译六种：鸠摩罗什（402）、菩提流支（509）、真谛（562）、达摩笈多（605）、玄奘（648，即《大般若经》第九会）、义净（703）。今取罗什本。',
            com: '古德注疏可参：天台智者《金刚般若经疏》、吉藏《金刚般若疏》、窥基《金刚般若经赞述》。' },
      xj: { alt: '异译七种，今存罗什《大明咒经》、玄奘本及法月、般若共利言、智慧轮、法成、施护诸译。通行者为玄奘本。',
            com: '古德注疏可参：窥基《般若波罗蜜多心经幽赞》、法藏《般若心经略疏》。' },
      amt: { alt: '异译二种：鸠摩罗什本、玄奘《称赞净土佛摄受经》。',
             com: '古德注疏可参：莲池《阿弥陀经疏钞》、智旭《阿弥陀经要解》。' },
      wls: { alt: '此经异译最多，古有十二译，今存五种，以康僧铠本最通行。',
             com: '古德注疏可参：昙鸾《无量寿经优婆提舍愿生偈注》、慧远《无量寿经义疏》。' },
      wmj: { alt: '异译三种：支谦、鸠摩罗什、玄奘《说无垢称经》。今取罗什本。',
             com: '古德注疏可参：僧肇《维摩诘所说经注》、智者《维摩经文疏》。' },
      lz:  { alt: '版本四种：敦煌本、惠昕本、契嵩本、宗宝本；通行者为元宗宝本。',
             com: '读时留意：各本详略不同，敦煌本最近古貌，宗宝本最通行。' },
      qx:  { alt: '旧题马鸣造、真谛译；异译有实叉难陀《大乘起信论》一本。',
             com: '古德注疏可参：法藏《大乘起信论义记》、憨山《起信论直解》。' },
      zl:  { alt: '梵本作《根本中颂》，青目菩萨释，鸠摩罗什译。',
             com: '古德注疏可参：吉藏《中观论疏》。' },
      pm:  { alt: '《法华》异译三种：竺法护《正法华经》、鸠摩罗什《妙法莲华经》、阇那崛多《添品法华》。此品为罗什本第二十五品。',
             com: '古德注疏可参：智者《观音玄义》《观音义疏》。' },
      dz:  { alt: '汉译一本，唐实叉难陀译，三卷十三品。',
             com: '古德注疏可参：《地藏菩萨本愿经科注》。' }
    };
    window.__metaFor = function(id){ return window.__META[id] || null; };
  })();

  /* ================= 名相 · 术语 ================= */
  (function termsModule(){
    var TERMS = {
      '般若':'智慧。如实照见诸法实相的慧，非世间聪明。',
      '波罗蜜':'到彼岸。究竟圆满之行，六度皆称波罗蜜。',
      '阿耨多罗三藐三菩提':'无上正等正觉，唯佛所证之圆满觉。',
      '菩提萨埵':'菩萨。觉有情，上求佛道、下化众生。',
      '菩萨摩诃萨':'大菩萨。发大心、行大行者的通称。',
      '涅槃':'烦恼永息、不再受生之寂灭。',
      '无常':'迁流不住。一切有为法皆刹那生灭。',
      '无我':'诸法无独立恒常之主宰，唯是因缘假合。',
      '缘起':'因缘和合而生，缘散而灭；无自性即空。',
      '五蕴':'色、受、想、行、识，构成身心的五类。',
      '四谛':'苦、集、灭、道，佛法的总纲。',
      '八正道':'正见、正思惟、正语、正业、正命、正精进、正念、正定。',
      '六度':'布施、持戒、忍辱、精进、禅定、般若。',
      '三宝':'佛、法、僧，一切修行的归依处。',
      '阿罗汉':'断尽烦恼、应受人供养之圣者。',
      '辟支佛':'缘觉。无佛之世，自观因缘而悟。',
      '声闻':'闻佛四谛之教而修证者。',
      '如来':'乘如实之道而来，佛之德号。',
      '世尊':'佛十号之一，为世间所尊。',
      '布施':'施与。财施、法施、无畏施。',
      '持戒':'守护戒律，防恶止非。',
      '忍辱':'安受苦境而不动心。',
      '精进':'于善法勇猛不懈。',
      '禅定':'心一境性，专注不散。',
      '回向':'以所修功德，转向众生或佛道。',
      '发心':'发起求证菩提之愿，为修行之始。',
      '执着':'对法取相不舍，是系缚之因。',
      '烦恼':'扰乱身心之惑，根本为贪嗔痴。',
      '贪嗔痴':'三毒。贪则不足，嗔则不容，痴则不明。',
      '业':'有意的造作，感未来之苦乐果。',
      '因果':'业因感果，丝毫不爽。',
      '轮回':'随业受生，流转不息。',
      '净土':'佛愿所成之清净国土。',
      '念佛':'系心于佛，或持名、或观想。',
      '观想':'以心力观佛相好或观法义。',
      '止观':'止息散乱，观照实相。',
      '因缘':'亲因与助缘，和合方生一法。',
      '方便':'权巧之法，导人趣入真实。',
      '授记':'佛为弟子预记未来成佛之名号。',
      '无生法忍':'安住于诸法本不生的智慧。',
      '不退转':'于佛道不复退堕。',
      '功德':'修行所成之善力，非交易之物。',
      '福田':'能生福报之处，如三宝、父母、众生。',
      '供养':'以香花灯涂等奉事，重在敬心。',
      '僧伽':'出家众之和合团体。',
      '比丘':'受具足戒之男众。',
      '比丘尼':'受具足戒之女众。',
      '优婆塞':'在家男信徒。',
      '优婆夷':'在家女信徒。',
      '刹那':'极短之时，一念之间。',
      '劫':'极长之时，喻器世间成住坏空一轮。',
      '三千大千世界':'一佛所化之土，以须弥山为中心。',
      '天龙八部':'护持佛法的八类众生。'
    };
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'rdTerms';
    btn.textContent = '名相 · Terms';
    var tools = document.querySelector('.reader-tools');
    if (tools) tools.insertBefore(btn, tools.querySelector('#readerTop'));

    var ORDER = Object.keys(TERMS);
    var COUNT = ORDER.length;

    var panel = document.createElement('div');
    panel.className = 'terms-panel';
    panel.id = 'termsPanel';
    panel.innerHTML = '<div class="tp-card">' +
      '<p class="tp-h">名相<i>GLOSSARY OF TERMS</i></p>' +
      '<div class="tp-tools">' +
        '<input type="search" class="tp-search" id="tpSearch" placeholder="搜名相 · search a term" aria-label="搜名相 Search a term">' +
        '<button type="button" class="tp-toggle" id="tpAll" aria-pressed="false">全部 · All</button>' +
      '</div>' +
      '<p class="tp-hint" id="tpHint">本经所出常用名相 · terms found in this text</p>' +
      '<div class="tp-list" id="tpList"></div>' +
      '<button type="button" class="tp-close">关闭 · Close</button></div>';
    document.body.appendChild(panel);

    var input = panel.querySelector('#tpSearch');
    var toggle = panel.querySelector('#tpAll');
    var hint = panel.querySelector('#tpHint');
    var list = panel.querySelector('#tpList');
    var mode = 'book', q = '';

    function norm(t){ return (t || '').replace(/\s+/g, ''); }

    function openTerm(k){
      close();
      if (window.__leafOpen) window.__leafOpen('search');
      var si = document.getElementById('searchInput');
      var sg = document.getElementById('searchGo');
      if (si && sg){
        si.value = k;
        setTimeout(function(){ sg.click(); }, 380);
      }
    }

    function paint(){
      var bookText = '';
      var body = document.getElementById('readerBody');
      var lines = document.getElementById('sutraLines');
      if (body) bookText += norm(body.textContent || '');
      if (lines) bookText += norm(lines.textContent || '');
      var keys = [];
      for (var i = 0; i < ORDER.length; i++){
        var k = ORDER[i];
        if (q && k.indexOf(q) < 0) continue;
        if (mode === 'book' && (!bookText || bookText.indexOf(k) < 0)) continue;
        keys.push(k);
      }
      list.innerHTML = '';
      if (!keys.length && mode === 'book' && !q){
        hint.textContent = '本经内未见词条，已列全表 · no term occurs in this text, showing all';
        for (var f = 0; f < ORDER.length; f++) keys.push(ORDER[f]);
      }
      if (!keys.length){
        var p = document.createElement('p');
        p.className = 'tp-empty';
        p.textContent = '没有匹配的名相 · no term found';
        list.appendChild(p);
        return;
      }
      for (var j = 0; j < keys.length; j++){
        (function(k){
          var row = document.createElement('div');
          row.className = 'tp-row';
          row.setAttribute('role', 'button');
          row.setAttribute('tabindex', '0');
          var b = document.createElement('b');
          b.textContent = k;
          var sp = document.createElement('span');
          sp.textContent = TERMS[k];
          var go = document.createElement('span');
          go.className = 'tp-go';
          go.textContent = '在经中查此词 · find in the canon';
          row.appendChild(b); row.appendChild(sp); row.appendChild(go);
          row.addEventListener('click', function(){ openTerm(k); });
          row.addEventListener('keydown', function(e){
            if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); openTerm(k); }
          });
          list.appendChild(row);
        })(keys[j]);
      }
    }

    var lastFocus = null;
    function openPanel(m){
      lastFocus = document.activeElement;
      mode = m || 'all';
      q = '';
      input.value = '';
      toggle.setAttribute('aria-pressed', mode === 'all' ? 'true' : 'false');
      toggle.textContent = (mode === 'all') ? '只看本经 · This text' : '全部 · All';
      hint.textContent = (mode === 'all')
        ? '全站 ' + COUNT + ' 条名相 · the full glossary'
        : '本经所出常用名相 · terms found in this text';
      paint();
      panel.classList.add('open');
      setTimeout(function(){
        var f = panel.querySelector('#tpSearch');
        if (f){ try{ f.focus({ preventScroll: true }); }catch(e){ f.focus(); } }
      }, 80);
    }
    window.__termsOpen = openPanel;

    btn.addEventListener('click', function(){ openPanel('all'); });
    toggle.addEventListener('click', function(){
      mode = (mode === 'all') ? 'book' : 'all';
      toggle.setAttribute('aria-pressed', mode === 'all' ? 'true' : 'false');
      toggle.textContent = (mode === 'all') ? '只看本经 · This text' : '全部 · All';
      hint.textContent = (mode === 'all')
        ? '全站 ' + COUNT + ' 条名相 · the full glossary'
        : '本经所出常用名相 · terms found in this text';
      paint();
    });
    input.addEventListener('input', function(){ q = norm(input.value); paint(); });

    function close(){
      panel.classList.remove('open');
      if (lastFocus && lastFocus.focus){ try{ lastFocus.focus({ preventScroll: true }); }catch(e){} }
    }
    panel.addEventListener('click', function(e){
      if (e.target === panel || (e.target.closest && e.target.closest('.tp-close'))) close();
    });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape') close(); });
    panel.addEventListener('keydown', function(e){
      if (e.key !== 'Tab') return;
      var card = panel.querySelector('.tp-card');
      if (!card) return;
      var f = card.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    });
  })();

  /* ================= 经页结构化数据 ================= */
  (function articleLd(){
    window.__articleLd = function(info, extra){
      var old = document.getElementById('ldArticle');
      if (old && old.parentNode) old.parentNode.removeChild(old);
      var el = document.createElement('script');
      el.type = 'application/ld+json';
      el.id = 'ldArticle';
      el.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: info[1],
        inLanguage: 'zh-Hans',
        isPartOf: { '@type': 'Book', name: '大正新脩大藏經' },
        about: { '@type': 'Thing', name: info[2] },
        url: 'https://www.obenno.com/?b=' + (window.__curBook || ''),
        publisher: { '@type': 'Person', name: 'Upasaka Song' },
        text: extra || ''
      });
      document.head.appendChild(el);
    };
  })();

  /* ================= 分享卡 · 今日偈语 ================= */
  (function shareCardModule(){
    var btn = document.getElementById('shareCard');
    function wrapText(ctx, text, maxW){
      var out = [], line = '';
      for (var i = 0; i < text.length; i++){
        var t = line + text.charAt(i);
        if (ctx.measureText(t).width > maxW && line){ out.push(line); line = text.charAt(i); }
        else line = t;
      }
      if (line) out.push(line);
      return out;
    }
    function draw(){
      var d = new Date();
      var dateZh = d.getFullYear() + '.' + pad2(d.getMonth() + 1) + '.' + pad2(d.getDate());
      var zh = (document.getElementById('gathaZh') || {}).textContent || '';
      var en = (document.getElementById('gathaEn') || {}).textContent || '';
      var W = 1080, H = 1350;
      var cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      var ctx = cv.getContext('2d');
      var g = ctx.createRadialGradient(W / 2, H * 0.36, 60, W / 2, H * 0.36, H * 0.8);
      g.addColorStop(0, '#241608'); g.addColorStop(0.55, '#100a06'); g.addColorStop(1, '#070403');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(216,178,120,.42)'; ctx.lineWidth = 2;
      ctx.strokeRect(46, 46, W - 92, H - 92);
      ctx.strokeStyle = 'rgba(216,178,120,.18)'; ctx.lineWidth = 1;
      ctx.strokeRect(62, 62, W - 124, H - 124);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f3dab0';
      ctx.font = '600 40px "Noto Serif SC", serif';
      if ('letterSpacing' in ctx) ctx.letterSpacing = '12px';
      ctx.fillText('梵音殿', W / 2, 190);
      ctx.font = '300 18px Georgia, serif';
      ctx.fillStyle = 'rgba(224,198,160,.55)';
      if ('letterSpacing' in ctx) ctx.letterSpacing = '8px';
      ctx.fillText('THE GOLDEN LOTUS THRONE', W / 2, 236);
      if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
      ctx.fillStyle = 'rgba(216,178,120,.5)';
      ctx.fillRect(W / 2 - 70, 280, 140, 1);

      ctx.fillStyle = 'rgba(232,206,168,.62)';
      ctx.font = '300 20px "Noto Serif SC", serif';
      ctx.fillText('今日一偈　A VERSE FOR TODAY', W / 2, 360);

      ctx.fillStyle = '#ffeccc';
      ctx.font = '400 46px "Noto Serif SC", serif';
      if ('letterSpacing' in ctx) ctx.letterSpacing = '4px';
      var lines = wrapText(ctx, zh, W - 240);
      var y = 500;
      for (var i = 0; i < lines.length; i++){ ctx.fillText(lines[i], W / 2, y); y += 74; }

      ctx.fillStyle = 'rgba(224,198,160,.5)';
      ctx.font = '300 17px Georgia, serif';
      if ('letterSpacing' in ctx) ctx.letterSpacing = '5px';
      var enLines = wrapText(ctx, en, W - 260);
      y += 40;
      for (var k = 0; k < enLines.length && k < 6; k++){ ctx.fillText(enLines[k], W / 2, y); y += 34; }

      ctx.fillStyle = 'rgba(216,178,120,.42)';
      ctx.fillRect(W / 2 - 70, H - 220, 140, 1);
      ctx.fillStyle = 'rgba(232,206,168,.6)';
      ctx.font = '300 22px "Noto Serif SC", serif';
      if ('letterSpacing' in ctx) ctx.letterSpacing = '6px';
      ctx.fillText(dateZh, W / 2, H - 160);
      ctx.fillStyle = 'rgba(224,198,158,.5)';
      ctx.font = '300 17px "Noto Serif SC", serif';
      if ('letterSpacing' in ctx) ctx.letterSpacing = '5px';
      ctx.fillText('金殿一炷香 · 莲台半卷经', W / 2, H - 118);
      ctx.fillStyle = 'rgba(216,186,146,.38)';
      ctx.font = '300 15px Georgia, serif';
      if ('letterSpacing' in ctx) ctx.letterSpacing = '1px';
      ctx.fillText('www.obenno.com', W / 2, H - 84);

      var name = '梵音殿-今日一偈-' + d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()) + '.png';
      cv.toBlob(function(blob){
        if (!blob){ toast('导出失败 · Export failed'); return; }
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = name;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function(){ URL.revokeObjectURL(url); }, 1200);
        toast('卡片已存 · Card saved');
      }, 'image/png');
    }
    if (btn) btn.addEventListener('click', draw);
  })();

  /* ================= 全殿检索 ================= */
  /* ================= 名相 · 小词典 ================= */
  var TERMS = [
    ['佛','buddha','觉者：自觉、觉他、觉行圆满。','One who is awake — awakened for oneself and for others.'],
    ['法','dharma','一切现象，以及佛陀所说之教理。','All phenomena, and the teaching that points to them.'],
    ['僧','sangha','僧团；四人以上受具足戒之清净众。','The community of ordained practitioners.'],
    ['三宝','three jewels','佛、法、僧，学佛所依之处。','Buddha, Dharma and Sangha — the three refuges.'],
    ['因果','cause and effect','所造之业必感其果，丝毫不爽。','Every deed bears its fruit; nothing is lost.'],
    ['业','karma','身、口、意所造作之势力，随业受报。','Action of body, speech and mind, and its residue.'],
    ['轮回','samsara','依业受生，生生死死，循环不已。','The round of birth and death driven by karma.'],
    ['无常','impermanence','一切有为法刹那生灭，无可常住。','All conditioned things arise and pass, without permanence.'],
    ['无我','non-self','五蕴之中，觅不到常一主宰之我。','No permanent, ruling self is found in the aggregates.'],
    ['空','emptiness','诸法因缘所生，无有自性，故说为空。','Things arise from causes and lack fixed essence.'],
    ['涅槃','nirvana','烦恼熄灭、生死止息之境界。','The stilling of defilement and of becoming.'],
    ['四圣谛','four noble truths','苦、集、灭、道，是佛法的总纲。','Suffering, its arising, its cessation and the path.'],
    ['八正道','noble eightfold path','正见、正思惟、正语、正业、正命、正精进、正念、正定。','Right view, thought, speech, action, livelihood, effort, mindfulness, concentration.'],
    ['十二因缘','twelve links','无明缘行，乃至生缘老死，说明轮回之链。','The chain of conditions from ignorance to ageing and death.'],
    ['五蕴','five aggregates','色、受、想、行、识，构成所谓的「我」。','Form, feeling, perception, formations, consciousness.'],
    ['六根','six sense bases','眼、耳、鼻、舌、身、意。','Eye, ear, nose, tongue, body, mind.'],
    ['六尘','six sense objects','色、声、香、味、触、法。','Sights, sounds, smells, tastes, touches, ideas.'],
    ['三法印','three marks','诸行无常、诸法无我、涅槃寂静。','Impermanence, non-self, and the peace of nirvana.'],
    ['四无量心','four immeasurables','慈、悲、喜、舍，遍缘一切众生。','Loving-kindness, compassion, joy, equanimity.'],
    ['菩提心','bodhicitta','为利一切众生，愿成佛道之心。','The mind set on awakening for the sake of all beings.'],
    ['般若','prajna','照见诸法实相的智慧，非世间知识可比。','Wisdom that sees things as they are.'],
    ['波罗蜜','paramita','到彼岸；六度为布施、持戒、忍辱、精进、禅定、般若。','Perfection — the six crossings to the other shore.'],
    ['禅定','dhyana','心一境性，止息散乱。','One-pointed quiet of mind.'],
    ['止观','samatha and vipasyana','止是定，观是慧，双运乃成正观。','Calming and insight, practised together.'],
    ['戒定慧','precepts, concentration, wisdom','三学次第：由戒生定，由定发慧。','The three trainings, each giving rise to the next.'],
    ['布施','giving','财施、法施、无畏施。','Giving of goods, of teaching, and of fearlessness.'],
    ['持戒','precepts','防非止恶，护念自己与他人。','Restraint that protects oneself and others.'],
    ['忍辱','patience','安受苦境，不念怨害。','Enduring hardship without resentment.'],
    ['精进','diligence','于善法勇猛不退。','Steady vigour in what is good.'],
    ['回向','dedication','以所修功德，转向众生与菩提。','Turning merit towards beings and awakening.'],
    ['发愿','vows','立愿为修行之导引，如阿弥陀佛四十八愿。','Aspirations that steer practice.'],
    ['忏悔','repentance','承认过失，誓不更造。','Acknowledging faults, resolving not to repeat them.'],
    ['随喜','rejoicing','见他人善行而生欢喜，同得功德。','Gladness at others\x27 good, sharing in its merit.'],
    ['供养','offering','以香、花、灯、水等奉事三宝，要在敬心。','Giving incense, flowers, light, water — chiefly with reverence.'],
    ['福田','field of merit','供养三宝、父母、众生，如种福于田。','Where merit is sown: the Three Jewels, parents, beings.'],
    ['慈悲','compassion','慈能与乐，悲能拔苦。','Kindness that gives joy, compassion that removes pain.'],
    ['菩提萨埵','bodhisattva','觉有情：上求佛道，下化众生。','One who seeks awakening while carrying others across.'],
    ['阿罗汉','arhat','断尽烦恼、不再受生者。','One whose defilements are ended.'],
    ['缘起','dependent origination','此有故彼有，此生故彼生。','When this is, that is; when this arises, that arises.'],
    ['净土','pure land','佛本愿所成之清净世界。','A purified realm formed by a buddha\x27s vows.'],
    ['往生','rebirth in the Pure Land','舍此报身，生于净土，继续修学。','Passing from this life into a pure land to continue.'],
    ['法身','dharmakaya','佛所证之真理之身，遍一切处。','The body of truth, pervading everywhere.'],
    ['化身','nirmanakaya','应众生机缘而现之身。','A form assumed to meet beings where they are.'],
    ['优婆塞','upasaka','近事男：受三归五戒的在家男众。','A lay man who takes refuge and the precepts.'],
    ['居士','lay Buddhist','在家学佛者之通称。','A general name for householders who practise.'],
    ['开示','teaching','善知识应机说法，指一修行门径。','Instruction given to fit the listener.'],
    ['结缘','karmic connection','以法或以物相接，不图回报。','A tie formed by dharma or by giving, without expecting return.'],
    ['名相','terms','佛典中的名词概念，如五蕴、四谛。','Technical terms of the scriptures.']
  ];

  (function glossaryModule(){
    var listEl = document.getElementById('glossList');
    var fEl = document.getElementById('glossFilter');
    var cEl = document.getElementById('glossCount');
    if (!listEl) return;

    function row(t){
      var d = document.createElement('div');
      d.className = 'gloss-row';
      var dt = document.createElement('dt');
      dt.textContent = t[0];
      var en = document.createElement('em');
      en.textContent = t[1];
      dt.appendChild(en);
      var dd = document.createElement('dd');
      dd.textContent = t[2];
      var ddEn = document.createElement('em');
      ddEn.textContent = t[3];
      dd.appendChild(ddEn);
      d.appendChild(dt); d.appendChild(dd);
      return d;
    }

    function paint(){
      var q = (fEl && fEl.value ? fEl.value : '').trim().toLowerCase();
      listEl.innerHTML = '';
      var shown = 0;
      for (var i = 0; i < TERMS.length; i++){
        var t = TERMS[i];
        if (q){
          var hay = (t[0] + ' ' + t[1] + ' ' + t[2] + ' ' + t[3]).toLowerCase();
          if (hay.indexOf(q) < 0) continue;
        }
        listEl.appendChild(row(t));
        shown++;
      }
      if (!shown){
        var em = document.createElement('div');
        em.className = 'gloss-row';
        em.textContent = '未见此名相 · no such term';
        listEl.appendChild(em);
      }
      if (cEl) cEl.textContent = shown + ' / ' + TERMS.length;
    }
    if (fEl){
      var tid = 0;
      fEl.addEventListener('input', function(){
        clearTimeout(tid);
        tid = setTimeout(paint, 120);
      });
    }
    paint();
  })();

  /* ================= 学佛次第 ================= */
  (function pathModule(){
    var wrap = document.getElementById('pathStages');
    var bar = document.getElementById('pathBar');
    var countEl = document.getElementById('pathCount');
    var resetBtn = document.getElementById('pathReset');
    if (!wrap) return;
    var boxes = wrap.querySelectorAll('input[data-pid]');
    var KEY = 'fxy-path';
    var state = { done: [] };

    function load(){
      try{
        var raw = localStorage.getItem(KEY);
        if (raw){ var o = JSON.parse(raw); if (o && o.done && o.done.length) state.done = o.done; }
      }catch(e){}
    }
    function save(){
      try{ localStorage.setItem(KEY, JSON.stringify({ done: state.done, at: new Date().toISOString().slice(0, 10) })); }catch(e){}
    }
    function paint(){
      var total = boxes.length, n = 0;
      for (var i = 0; i < total; i++){
        var pid = boxes[i].getAttribute('data-pid');
        boxes[i].checked = state.done.indexOf(pid) >= 0;
        if (boxes[i].checked) n++;
      }
      if (bar) bar.style.width = (total ? (n / total * 100) : 0) + '%';
      if (countEl) countEl.textContent = n + ' / ' + total;
    }
    load();
    paint();

    for (var i = 0; i < boxes.length; i++){
      boxes[i].addEventListener('change', function(){
        var pid = this.getAttribute('data-pid');
        var at = state.done.indexOf(pid);
        if (this.checked && at < 0) state.done.push(pid);
        if (!this.checked && at >= 0) state.done.splice(at, 1);
        save(); paint();
        var total = boxes.length, n = state.done.length;
        if (n === total) toast('十五项已毕，仍须日日相续 · all fifteen marked, keep going daily');
      });
    }
    if (resetBtn) resetBtn.addEventListener('click', function(){
      state.done = []; save(); paint();
      toast('已清空，可重新记 · marks cleared');
    });

    var jumps = document.querySelectorAll('.path-go[data-jump]');
    for (var j = 0; j < jumps.length; j++){
      jumps[j].addEventListener('click', function(){
        var v = this.getAttribute('data-jump');
        var a = document.querySelector('.site-nav a[data-view="' + v + '"]');
        if (a) a.click();
      });
    }
  })();

  (function searchModule(){
    var inputEl = document.getElementById('searchInput');
    var resEl = document.getElementById('searchRes');
    var goBtn = document.getElementById('searchGo');
    var LEAF_LABEL = { sutra: '藏经', practice: '功课', rite: '仪轨', path: '次第', temple: '寺院', lamps: '供养', almanac: '历数', search: '名相' };
    var index = null;
    var builtWithBooks = false;

    function build(){
      index = [];
      for (var key in SUTRAS){
        for (var i = 0; i < SUTRAS[key].lines.length; i++){
          index.push({ leaf: 'sutra', s: 'sutra-' + key, title: SUTRAS[key].name + ' 第 ' + (i + 1) + ' 句', text: SUTRAS[key].lines[i], sutra: key, line: i });
        }
      }
      var bookInfo = window.__bookInfo, ALLT = window.__texts;
      var __bk = 0; if (ALLT) for (var __b in ALLT) __bk++;
      if (ALLT && bookInfo && __bk){
        for (var bk in ALLT){
          var info = bookInfo[bk], tt = ALLT[bk];
          if (!info || !tt) continue;
          for (var k2 = 0; k2 < tt.length; k2++){
            index.push({ leaf: 'sutra', title: info[1] + ' · 第 ' + (k2 + 1) + ' 节', text: tt[k2], book: bk, ti: k2 });
          }
        }
        builtWithBooks = true;
      }
      for (var q = 0; q < TERMS.length; q++){
        index.push({ leaf: 'search', title: '名相 · ' + TERMS[q][0] + ' ' + TERMS[q][1], text: TERMS[q][0] + ' ' + TERMS[q][1] + ' ' + TERMS[q][2] + ' ' + TERMS[q][3], term: TERMS[q] });
      }
      var ids = ['practice', 'rite', 'path', 'temple', 'lamps', 'almanac'];
      for (var n = 0; n < ids.length; n++){
        var sec = document.getElementById('v-' + ids[n]);
        if (!sec) continue;
        var body = sec.querySelector('.leaf-body');
        if (!body) continue;
        var blocks = body.querySelectorAll('h3,p,dt,dd,li');
        for (var b = 0; b < blocks.length; b++){
          var t = (blocks[b].textContent || '').replace(/\s+/g, ' ').trim();
          if (t.length < 4) continue;
          index.push({ leaf: ids[n], title: LEAF_LABEL[ids[n]], text: t });
        }
      }
    }

    function run(){
      if (!index || (!builtWithBooks && window.__bookInfo)) build();
      if (!builtWithBooks && window.__bookInfo && window.__loadAllTexts){
        window.__loadAllTexts(function(){
          builtWithBooks = true; index = null;
          if (inputEl && inputEl.value && inputEl.value.trim()) run();
        });
      }
      var q = (inputEl ? inputEl.value : '').trim();
      if (!q){ resEl.innerHTML = ''; toast('写几个字再搜 · type to search'); return; }
      var hits = [], lower = q.toLowerCase();
      for (var i = 0; i < index.length; i++){
        if (index[i].text.toLowerCase().indexOf(lower) >= 0) hits.push(index[i]);
      }
      resEl.innerHTML = '';
      if (!hits.length){
        var em = document.createElement('p');
        em.className = 'search-empty';
        em.textContent = '殿内未见「' + q + '」· Nothing found';
        resEl.appendChild(em);
        return;
      }
      var pool = hits, total = hits.length, shown = 0, moreBtn = null, curKey = 'all';
      var groups = [], gmap = {};
      for (var gi = 0; gi < hits.length; gi++){
        var it0 = hits[gi];
        var key = it0.book || it0.sutra || it0.leaf;
        var label = '';
        if (it0.book && window.__bookInfo && window.__bookInfo[it0.book]) label = window.__bookInfo[it0.book][1];
        else if (it0.sutra && SUTRAS[it0.sutra]) label = SUTRAS[it0.sutra].name;
        else label = LEAF_LABEL[it0.leaf] || '其他';
        if (!gmap[key]){ gmap[key] = { key: key, n: 0, label: label }; groups.push(gmap[key]); }
        gmap[key].n++;
      }
      groups.sort(function(a, b){ return b.n - a.n; });

      resEl.innerHTML = '';
      var chips = document.createElement('div');
      chips.className = 'search-filters';
      function chipFor(key, label, n){
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'sf-chip' + (key === 'all' ? ' on' : '');
        b.innerHTML = label + '<i>' + n + '</i>';
        b.addEventListener('click', function(){
          curKey = key;
          var all = chips.querySelectorAll('.sf-chip');
          for (var z = 0; z < all.length; z++) all[z].classList.toggle('on', all[z] === b);
          pool = key === 'all' ? hits : hits.filter(function(x){ return (x.book || x.sutra || x.leaf) === key; });
          total = pool.length; shown = 0;
          list.innerHTML = '';
          if (moreBtn && moreBtn.parentNode) moreBtn.parentNode.removeChild(moreBtn);
          moreBtn = null;
          paintPage();
        });
        return b;
      }
      chips.appendChild(chipFor('all', '全部', hits.length));
      for (var c = 0; c < groups.length && c < 12; c++) chips.appendChild(chipFor(groups[c].key, groups[c].label, groups[c].n));
      resEl.appendChild(chips);

      var cntP = document.createElement('p');
      cntP.className = 'search-count';
      resEl.appendChild(cntP);
      var list = document.createElement('div');
      list.className = 'search-list';
      resEl.appendChild(list);

      function paintPage(){
        var upto = Math.min(total, shown + 24);
        for (var h = shown; h < upto; h++){
          (function(it){
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'search-item';
            var bt = document.createElement('b');
            bt.textContent = it.title;
            if (it.sutra){
              var em2 = document.createElement('em');
              em2.textContent = LEAF_LABEL[it.leaf] || '';
              bt.appendChild(em2);
            }
            b.appendChild(bt);
            var sp = document.createElement('span');
            var cut = it.text.indexOf(q) > 22 ? '…' + it.text.slice(it.text.indexOf(q) - 18) : it.text;
            var hitAt = cut.indexOf(q);
            if (hitAt >= 0){
              var pre = cut.slice(0, hitAt);
              var mid = cut.slice(hitAt, hitAt + q.length);
              var post = cut.slice(hitAt + q.length);
              if (pre) sp.appendChild(document.createTextNode(pre.slice(-52)));
              var mk = document.createElement('mark');
              mk.textContent = mid;
              sp.appendChild(mk);
              sp.appendChild(document.createTextNode(post.slice(0, 34) + (post.length > 34 ? '…' : '')));
            } else {
              sp.textContent = cut.slice(0, 72) + (it.text.length > 72 ? '…' : '');
            }
            b.appendChild(sp);
            b.addEventListener('click', function(){
              if (window.__leafOpen) window.__leafOpen(it.leaf);
              if (it.book && window.__openBook){
                if (window.__leafOpen) window.__leafOpen('sutra');
                window.__openBook(it.book);
                setTimeout(function(){
                  var p = document.querySelector('#readerBody p[data-i="' + it.ti + '"]');
                  if (p){ p.classList.add('hit'); try{ p.scrollIntoView({ block: 'center' }); }catch(e){} }
                }, 460);
              }
              if (it.sutra && window.__sutraRender){
                window.__sutraRender(it.sutra);
                setTimeout(function(){
                  var p = document.querySelector('#sutraLines p[data-i="' + it.line + '"]');
                  if (p){ p.classList.add('sel'); try{ p.scrollIntoView({ block: 'center' }); }catch(e){} }
                }, 260);
              }
            });
            list.appendChild(b);
          })(pool[h]);
        }
        shown = upto;
        cntP.textContent = '共 ' + total + ' 条命中' + (curKey === 'all' ? '' : '（已筛）') + ' · 已显示 ' + shown + ' 条 · ' + total + ' hits';
        if (moreBtn && moreBtn.parentNode) moreBtn.parentNode.removeChild(moreBtn);
        moreBtn = null;
        if (shown < total){
          moreBtn = document.createElement('button');
          moreBtn.type = 'button';
          moreBtn.className = 'search-more';
          moreBtn.textContent = '再看 24 条 · Show 24 more';
          moreBtn.addEventListener('click', paintPage);
          list.appendChild(moreBtn);
        }
      }
      paintPage();
    }
    if (goBtn) goBtn.addEventListener('click', run);
    if (inputEl) inputEl.addEventListener('keydown', function(e){ if (e.key === 'Enter'){ e.preventDefault(); run(); } });
  })();

  /* ================= 视图切换 / 分享 ================= */
  var toastEl = document.getElementById('toast');
  var toastTimer = 0;
  function toast(msg){
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toastEl.classList.remove('show'); }, 2400);
  }
  window.__toast = toast;
  var LEAF_NAMES = ['sutra', 'practice', 'rite', 'path', 'temple', 'lamps', 'almanac', 'search'];
  var leafReturnFocus = null;
  var currentLeaf = '';
  window.__leafOpen = openLeaf;
  function openLeaf(name){
    if (LEAF_NAMES.indexOf(name) < 0) return;
    if (name === 'almanac') initAlmanac();
    if (name === 'sutra'){
      var pb = document.getElementById('sutraPlay');
      if (pb) pb.textContent = amb.paused ? L('梵唱 · 起','Chant · start') : L('梵唱 · 止','Chant · stop');
    }
    if (!currentLeaf){
      var act = document.activeElement;
      leafReturnFocus = (act && act.blur) ? act : null;
    }
    currentLeaf = name;
    for (var i = 0; i < LEAF_NAMES.length; i++){
      var el = document.getElementById('v-' + LEAF_NAMES[i]);
      if (!el) continue;
      var on = LEAF_NAMES[i] === name;
      if (on && el.classList.contains('leaving')) el.classList.remove('leaving');
      el.classList.toggle('open', on);
      el.setAttribute('aria-hidden', on ? 'false' : 'true');
    }
    try{
      if (!/[?&]b=/.test(location.search)) history.replaceState(null, '', '?v=' + name);
    }catch(e){}
    var navA = document.querySelector('.site-nav a[data-view="' + name + '"]');
    var navAll = document.querySelectorAll('.site-nav a');
    for (var k = 0; k < navAll.length; k++) navAll[k].removeAttribute('aria-current');
    if (navA) navA.setAttribute('aria-current', 'page');
    var body = document.querySelector('.leaf.open .leaf-body');
    if (body){
      body.scrollTop = 0;
      requestAnimationFrame(function(){ body.scrollTop = 0; });
      setTimeout(function(){ body.scrollTop = 0; }, 360);
    }
    var closeBtn = document.querySelector('.leaf.open .leaf-close');
    if (closeBtn){
      try{ closeBtn.focus({ preventScroll: true }); }catch(e){ closeBtn.focus(); }
    }
  }
  function closeLeaves(){
    if (!currentLeaf) return;
    var veil = document.getElementById('hallVeil');
    var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    for (var i = 0; i < LEAF_NAMES.length; i++){
      var el = document.getElementById('v-' + LEAF_NAMES[i]);
      if (!el) continue;
      if (el.classList.contains('open')){
        el.classList.remove('open');
        el.classList.add('leaving');
        (function(node){
          setTimeout(function(){
            node.classList.remove('leaving');
            node.setAttribute('aria-hidden', 'true');
          }, calm ? 420 : 980);
        })(el);
      } else {
        el.setAttribute('aria-hidden', 'true');
      }
    }
    if (veil && !calm){
      veil.style.transition = 'none';
      veil.style.opacity = '1';
      window.requestAnimationFrame(function(){
        veil.style.transition = 'opacity 1.1s ease-out';
        veil.style.opacity = '0';
      });
    }
    currentLeaf = '';
    if (leafReturnFocus && leafReturnFocus.focus){
      try{ leafReturnFocus.focus({ preventScroll: true }); }catch(e){}
    }
    leafReturnFocus = null;
  }
  function stepLeaf(dir){
    if (!currentLeaf) return;
    var i = LEAF_NAMES.indexOf(currentLeaf);
    var n = (i + dir + LEAF_NAMES.length) % LEAF_NAMES.length;
    openLeaf(LEAF_NAMES[n]);
  }
  function sharePage(){
    var panel = document.getElementById('sharePanel');
    if (!panel){
      panel = document.createElement('div');
      panel.id = 'sharePanel';
      panel.className = 'share-panel';
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'false');
      // 分享出去时附带的宣传语：一句中文在前，一句英文在后，各平台共用同一段
      var BLURB = '金殿一炷香，莲台半卷经。梵音殿 · OBENNO：金身莲台、大悲咒梵唱、藏经诵读、每日功课、灯花水供养，皆可静阅；免费、无账号、无广告。';
      var BLURB_EN = 'A hall of gold, incense, bell and scripture — sutras, daily practice, offerings and the lunar almanac; free, no account, no ads.';
      panel.innerHTML = '<div class="sp-card">' +
        '<p class="sp-h">分享此页<i>SHARE THIS PAGE</i></p>' +
        '<p class="sp-sub">免费页面，不设账号、不留个人资料；只记十方来朝的总人次。<em>No account, no profiles — only a running count of visits.</em></p>' +
        '<div class="sp-rows">' +
        '<button type="button" class="sp-row" data-sp="link"><b>复制本页链接</b><span>Copy the page link</span></button>' +
        '<div class="sp-grid">' +
        '<button type="button" class="sp-pill" data-sp="wx"><b>分享到微信</b><span>Share on WeChat</span></button>' +
        '<button type="button" class="sp-pill" data-sp="wb"><b>分享到微博</b><span>Share on Weibo</span></button>' +
        '<button type="button" class="sp-pill" data-sp="x"><b>分享到 X（推特）</b><span>Share on X</span></button>' +
        '<button type="button" class="sp-pill" data-sp="fb"><b>分享到 Facebook</b><span>Share on Facebook</span></button>' +
        '<button type="button" class="sp-pill" data-sp="wa"><b>分享到 WhatsApp</b><span>Send in WhatsApp</span></button>' +
        '<button type="button" class="sp-pill" data-sp="tg"><b>分享到 Telegram</b><span>Send in Telegram</span></button>' +
        '</div>' +
        '<p class="sp-note">微信、微博境内畅通；X、Facebook、WhatsApp、Telegram 需自备可通达的网络。<em>WeChat and Weibo work at home; X, Facebook, WhatsApp and Telegram need a network that reaches them.</em></p>' +
        '<div class="sp-blurb">' +
        '<span class="k">分享语 · BLURB</span>' +
        '<p>' + BLURB + '</p>' +
        '<em>' + BLURB_EN + '</em>' +
        '<button type="button" data-sp="blurb">复制这段分享语 · Copy the blurb</button>' +
        '</div>' +
        '<button type="button" class="sp-row" data-sp="book" hidden><b>复制当前经书链接</b><span>Link to the sutra on screen</span></button>' +
        '<button type="button" class="sp-row" data-sp="card"><b>存一张今日偈语卡</b><span>Save today\'s verse card</span></button>' +
        '<button type="button" class="sp-row" data-sp="mail"><b>写信给编者</b><span>Write to the keeper</span></button>' +
        '</div>' +
        '<button type="button" class="sp-close" data-sp="close">关闭 · Close</button>' +
        '</div>';
      document.body.appendChild(panel);

      function closeShare(){ panel.classList.remove('open'); }
      function copyLink(u, keep, msg){
        var ok = function(){ if (!keep) closeShare(); toast(msg || '链接已复制 · Link copied'); };
        var fallback = function(){
          var box = panel.querySelector('.sp-fallback');
          if (!box){
            box = document.createElement('input');
            box.className = 'sp-fallback';
            box.readOnly = true;
            box.setAttribute('aria-label', '可复制的链接 · link to copy');
            panel.querySelector('.sp-card').appendChild(box);
          }
          box.value = u;
          try{ box.select(); box.focus(); }catch(e){}
        };
        if (navigator.clipboard && navigator.clipboard.writeText){
          navigator.clipboard.writeText(u).then(ok).catch(fallback);
        } else {
          fallback();
        }
      }
      panel.addEventListener('click', function(e){
        var t = e.target.closest ? e.target.closest('[data-sp]') : null;
        if (!t){ if (e.target === panel) closeShare(); return; }
        var k = t.getAttribute('data-sp');
        if (k === 'close'){ closeShare(); return; }
        if (k === 'link'){ copyLink(location.href); return; }
        if (k === 'blurb'){ copyLink(BLURB + '\n' + BLURB_EN + '\n' + (location.origin + location.pathname), false, '分享语已复制 · Blurb copied'); return; }
        // 分享到各平台：X / Facebook / 微博 / WhatsApp / Telegram 走官方分享页（新窗口即拉起客户端）；
        // 微信没有网页分享接口，复制「分享语 + 链接」后尝试用 weixin:// 唤起手机上的微信
        var su = location.origin + ((location.pathname === '/index.html' || location.pathname === '/') ? '/' : location.pathname) + (window.__curBook ? ('?b=' + window.__curBook) : '');
        var st = BLURB + ' ' + BLURB_EN;
        var popup = function(u){
          // 用真实链接点击打开，比 window.open 更不容易被拦；rel=noopener 断掉 window.opener
          var a = document.createElement('a');
          a.href = u; a.target = '_blank'; a.rel = 'noopener noreferrer';
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          setTimeout(function(){ if (a.parentNode) a.parentNode.removeChild(a); }, 0);
        };
        if (k === 'x'){ popup('https://twitter.com/intent/tweet?text=' + encodeURIComponent(st) + '&url=' + encodeURIComponent(su)); return; }
        if (k === 'fb'){ popup('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(su)); return; }
        if (k === 'wb'){ popup('https://service.weibo.com/share/share.php?url=' + encodeURIComponent(su) + '&title=' + encodeURIComponent(BLURB)); return; }
        if (k === 'wa'){ popup('https://wa.me/?text=' + encodeURIComponent(BLURB + ' ' + su)); return; }
        if (k === 'tg'){ popup('https://t.me/share/url?url=' + encodeURIComponent(su) + '&text=' + encodeURIComponent(BLURB + ' ' + BLURB_EN)); return; }
        if (k === 'wx'){
          copyLink(BLURB + '\n' + su, true, '分享语与链接已复制，可到微信粘贴 · Blurb and link copied');
          if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)){
            setTimeout(function(){ try{ location.href = 'weixin://'; }catch(e){} }, 240);
          }
          return;
        }
        if (k === 'book'){
          if (!window.__curBook) return;
          var base = location.href.split('?')[0].split('#')[0];
          copyLink(base + '?b=' + window.__curBook);
          return;
        }
        if (k === 'card'){
          closeShare();
          var c = document.getElementById('shareCard');
          if (c){ c.click(); } else { toast('偈语卡在「功课」页 · see the Daily page'); }
          return;
        }
        if (k === 'mail'){ location.href = 'mailto:hereok@msn.com?subject=' + encodeURIComponent('梵音殿 · 一句话'); return; }
      });
      document.addEventListener('keydown', function(e){
        if (e.key === 'Escape' && panel.classList.contains('open')) panel.classList.remove('open');
      });
    }
    var bookRow = panel.querySelector('[data-sp="book"]');
    if (bookRow) bookRow.hidden = !window.__curBook;
    panel.classList.add('open');
  }
  (function navModule(){
    var nav = document.getElementById('siteNav');
    if (nav){
      nav.addEventListener('click', function(e){
        var a = e.target.closest ? e.target.closest('a') : null;
        if (!a) return;
        e.preventDefault();
        var v = a.getAttribute('data-view');
        var act = a.getAttribute('data-action');
        if (act === 'share'){ sharePage(); return; }
        openLeaf(v);
      });
    }
    document.addEventListener('click', function(e){
      var c = e.target.closest ? e.target.closest('[data-close]') : null;
      if (c){ closeLeaves(); return; }
      var g = e.target.closest ? e.target.closest('[data-go]') : null;
      if (g){ stepLeaf(parseInt(g.getAttribute('data-go'), 10) || 1); }
    });
    // 键盘：Esc 由上层收回，1–5 直达五处，←/→ 翻页
    document.addEventListener('keydown', function(e){
      var k = e.key;
      var tag = (e.target && e.target.tagName) || '';
      if (k === 'Escape' || k === 'Esc'){
        if (qrModal && qrModal.classList.contains('open')){ closeQr(); return; }
        if (oracleEl && oracleEl.classList.contains('show')){ hideOracle(); return; }
        if (currentLeaf){ closeLeaves(); return; }
        if (sitRunning){ hideSit(); }
        return;
      }
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (currentLeaf && (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'PageUp' || k === 'PageDown')){
        e.preventDefault();
        stepLeaf((k === 'ArrowRight' || k === 'PageDown') ? 1 : -1);
        return;
      }
      if (k >= '1' && k <= '9'){
        var d = parseInt(k, 10);
        if (d >= 1 && d <= LEAF_NAMES.length) openLeaf(LEAF_NAMES[d - 1]);
      }
    });
  })();

  /* ================= 深链：?v=sutra 或 #sutra 直达对应经卷页（外链/搜索结果可直达） ================= */
  (function deepLink(){
    var NAMES = ['sutra','practice','rite','path','temple','lamps','almanac','search'];
    function wanted(){
      var h = (location.hash || '').replace('#','');
      if (NAMES.indexOf(h) >= 0) return h;
      var m = /[?&]v=([a-z]+)/.exec(location.search || '');
      if (m && NAMES.indexOf(m[1]) >= 0) return m[1];
      return '';
    }
    var first = wanted();
    if (first){
      setTimeout(function(){ try{ openLeaf(first); }catch(err){} }, 400);
      setTimeout(function(){ try{ openLeaf(first); }catch(err){} }, 1400);
    }
  })();

  /* ================= 浮尘 / 香烟 ================= */
  var dustCv = document.getElementById('dust');
  var smokeCv = document.getElementById('smoke');
  var dustCtx = dustCv.getContext('2d');
  var smokeCtx = smokeCv.getContext('2d');
  var W = 0, H = 0, SW = 0, SH = 0, dpr = 1;

  var motes = [], puffs = [];
  var rnd = Math.random;

  function resize(){
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = dustCv.clientWidth || stage.clientWidth;
    H = dustCv.clientHeight || stage.clientHeight;
    dustCv.width = Math.round(W * dpr);
    dustCv.height = Math.round(H * dpr);
    dustCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    SW = smokeCv.clientWidth || 200;
    SH = smokeCv.clientHeight || 300;
    smokeCv.width = Math.round(SW * dpr);
    smokeCv.height = Math.round(SH * dpr);
    smokeCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    buildMotes();
    buildPuffs();
  }

  function buildMotes(){
    motes.length = 0;
    var n = Math.round(Math.min(120, Math.max(46, W / 12)));
    for (var i = 0; i < n; i++){
      motes.push({
        x: rnd() * W,
        y: rnd() * H,
        r: 0.5 + rnd() * 1.7,
        vy: -(0.10 + rnd() * 0.42),
        vx: (rnd() - 0.5) * 0.16,
        a: 0.18 + rnd() * 0.45,
        ph: rnd() * Math.PI * 2,
        sp: 0.6 + rnd() * 1.4,
        big: rnd() > 0.86
      });
    }
  }

  function buildPuffs(){
    puffs.length = 0;
    for (var i = 0; i < 26; i++){
      puffs.push(newPuff(rnd()));
    }
  }

  function newPuff(ySeed, boost){
    return {
      x: SW * 0.5 + (rnd() - 0.5) * SW * (boost ? 0.34 : 0.12),
      y: SH * 0.96 - rnd() * SH * (boost ? 0.13 : 0.05),
      r: (boost ? 9 : 3) + rnd() * (boost ? 9 : 5),
      life: 0,
      max: (boost ? 300 : 260) + rnd() * 220,
      vy: (boost ? 0.34 : 0.16) + rnd() * 0.20,
      sway: (boost ? 14 : 6) + rnd() * 16,
      ph: rnd() * Math.PI * 2,
      sp: 0.004 + rnd() * 0.006,
      boost: !!boost
    };
  }

  var last = performance.now();

  function drawDust(t){
    dustCtx.clearRect(0, 0, W, H);
    for (var i = 0; i < motes.length; i++){
      var m = motes[i];
      var tw = 0.55 + 0.45 * Math.sin(t * 0.0012 * m.sp + m.ph);
      var alpha = m.a * tw;
      dustCtx.beginPath();
      dustCtx.arc(m.x, m.y, m.r, 0, 6.2832);
      dustCtx.fillStyle = 'rgba(255,' + (m.big ? 220 : 232) + ',' + (m.big ? 168 : 198) + ',' + alpha.toFixed(3) + ')';
      dustCtx.fill();
      if (m.big){
        dustCtx.beginPath();
        dustCtx.arc(m.x, m.y, m.r * 3.2, 0, 6.2832);
        dustCtx.fillStyle = 'rgba(255,206,150,' + (alpha * 0.10).toFixed(3) + ')';
        dustCtx.fill();
      }
    }
  }

  function drawSmoke(){
    smokeCtx.clearRect(0, 0, SW, SH);
    for (var i = 0; i < puffs.length; i++){
      var p = puffs[i];
      var lifeP = p.life / p.max;
      if (lifeP >= 1){ puffs[i] = newPuff(0); continue; }
      var alpha = Math.sin(Math.PI * lifeP) * (p.boost ? 0.52 : 0.30);
      var cx = p.x + Math.sin(p.life * p.sp + p.ph) * p.sway * (0.4 + lifeP * 1.6);
      var cy = p.y - p.life * p.vy;
      var r = p.r * (1 + lifeP * (p.boost ? 4.2 : 3.4));
      var g = smokeCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, 'rgba(255,248,238,' + alpha.toFixed(3) + ')');
      g.addColorStop(0.45, 'rgba(238,226,210,' + (alpha * 0.55).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(196,186,174,0)');
      smokeCtx.fillStyle = g;
      smokeCtx.beginPath();
      smokeCtx.arc(cx, cy, r, 0, 6.2832);
      smokeCtx.fill();
      p.life += 1;
    }
  }

  var raf = 0, fedSpawn = 0;
  function loop(now){
    var dt = Math.min(48, now - last);
    last = now;

    // 添香期间不间断续香，烟柱才明显变浓
    if (now - fedSpawn > 170 && censerEl.classList.contains('fed')){
      fedSpawn = now;
      if (puffs.length < 110) puffs.push(newPuff(0, true));
    }

    // 浮尘缓慢上浮，出顶回到底部
    for (var i = 0; i < motes.length; i++){
      var m = motes[i];
      m.y += m.vy * dt * 0.06;
      m.x += (m.vx + Math.sin(now * 0.0006 + m.ph) * 0.12) * dt * 0.06;
      if (m.y < -6){ m.y = H + 6; m.x = rnd() * W; }
      if (m.x < -6) m.x = W + 6;
      if (m.x > W + 6) m.x = -6;
    }
    drawDust(now);
    drawSmoke();
    raf = requestAnimationFrame(loop);
  }

  function start(){
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }
  function stop(){
    if (raf){ cancelAnimationFrame(raf); raf = 0; }
  }

  document.addEventListener('visibilitychange', function(){
    if (document.hidden) stop();
    else if (!reduce.matches) start();
  });

  var rt = 0;
  window.addEventListener('resize', function(){
    clearTimeout(rt);
    rt = setTimeout(resize, 180);
  });

  resize();
  if (!reduce.matches) start();
  else { drawDust(0); drawSmoke(); }   // 低动效时画一帧静态浮尘与香烟

  if (reduce.addEventListener){
    reduce.addEventListener('change', function(e){
      if (e.matches){ stop(); drawDust(0); drawSmoke(); } else start();
    });
  }
})();

/* ================= 描红抄经 · tracing copy sheet ================= */
(function copySheetModule(){
  var overlay = document.getElementById('copySheet');
  var paper = document.getElementById('csPaper');
  var subEl = document.getElementById('csSub');
  var openBtn = document.getElementById('sutraCopy');
  if (!overlay || !paper || !openBtn) return;

  var LEVELS = [8, 9.5, 11];        /* 格子边长 mm */
  var PER = 20;                     /* 每页行数 */
  var lv = 1;

  function cellMM(){                 /* 手机上格子再收一档，免得一行被折成两排 */
    var mmv = LEVELS[lv];
    if (window.innerWidth <= 560) mmv = Math.min(mmv, 6.5);
    return mmv;
  }

  function colsFor(){                /* 一行能排几格：纸面净宽约 154mm */
    return Math.max(8, Math.floor(154 / cellMM()));
  }
  try {
    var saved = localStorage.getItem('fxy-cs-zoom');
    if (saved !== null) lv = Math.min(2, Math.max(0, parseInt(saved, 10) || 0));
  } catch (e) {}

  function scaleCell(){
    paper.style.setProperty('--cs-cell', cellMM() + 'mm');
  }

  function curMeta(){
    var b = document.querySelector('.sutra-pick button.on');
    var nameEl = b ? b.querySelector('b') : null;
    var enEl = b ? b.querySelector('em') : null;
    return {
      name: nameEl ? nameEl.textContent.trim() : '大悲咒',
      en: enEl ? enEl.textContent.trim() : 'GREAT COMPASSION MANTRA'
    };
  }

  /* 直接读已渲染的经文行，避免跨模块作用域取值 */
  function readLines(){
    var els = document.querySelectorAll('#sutraLines p[data-i]');
    var arr = [];
    for (var i = 0; i < els.length; i++){
      var clone = els[i].cloneNode(true);
      var py = clone.querySelector('.py');
      if (py) py.parentNode.removeChild(py);
      var no = clone.querySelector('.no');
      if (no) no.parentNode.removeChild(no);
      arr.push(clone.textContent.replace(/\s+/g, '').trim());
    }
    return arr;
  }

  function build(){
    var meta = curMeta();
    var lines = readLines();
    var total = lines.length;
    if (!total) return;
    var cols = colsFor();
    var pages = Math.ceil(total / PER);
    subEl.textContent = meta.name + ' · ' + total + ' 句 · 每页 ' + PER + ' 行 / ' + pages + ' pages';
    paper.textContent = '';
    for (var p = 0; p < pages; p++){
      var pg = document.createElement('section');
      pg.className = 'cs-page';
      var hd = document.createElement('div');
      hd.className = 'cs-page-head';
      var spanA = document.createElement('span');
      spanA.textContent = '梵音殿 · 描红抄经';
      var spanB = document.createElement('span');
      spanB.textContent = meta.name + ' · ' + meta.en;
      var spanC = document.createElement('span');
      spanC.textContent = '第 ' + (p + 1) + ' / ' + pages + ' 页';
      hd.appendChild(spanA); hd.appendChild(spanB); hd.appendChild(spanC);
      pg.appendChild(hd);
      var start = p * PER, end = Math.min(total, (p + 1) * PER);
      for (var i = start; i < end; i++){
        var txt = lines[i];
        var row = document.createElement('div');
        row.className = 'cs-line';
        var no = document.createElement('span');
        no.className = 'cs-no';
        no.textContent = (i + 1 < 10 ? '0' : '') + (i + 1);
        row.appendChild(no);
        var cells = document.createElement('span');
        cells.className = 'cs-cells';
        var n = Math.max(cols, txt.length);
        for (var c = 0; c < n; c++){
          var cell = document.createElement('span');
          cell.className = 'cs-cell';
          if (c < txt.length){
            var ch = document.createElement('i');
            ch.textContent = txt.charAt(c);
            cell.appendChild(ch);
          }
          cells.appendChild(cell);
        }
        row.appendChild(cells);
        pg.appendChild(row);
      }
      paper.appendChild(pg);
    }
  }

  function open(){
    build();
    scaleCell();
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    paper.scrollTop = 0;
  }

  function close(){
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
  }

  function zoom(step){
    lv = Math.min(2, Math.max(0, lv + step));
    scaleCell();
    build();                          /* 格子变了，重排每行格数 */
    try { localStorage.setItem('fxy-cs-zoom', String(lv)); } catch (e) {}
  }

  openBtn.addEventListener('click', open);
  var closeBtn = document.getElementById('csClose');
  if (closeBtn) closeBtn.addEventListener('click', close);
  var lessBtn = document.getElementById('csLess');
  if (lessBtn) lessBtn.addEventListener('click', function(){ zoom(-1); });
  var moreBtn = document.getElementById('csMore');
  if (moreBtn) moreBtn.addEventListener('click', function(){ zoom(1); });
  var printBtn = document.getElementById('csPrint');
  if (printBtn) printBtn.addEventListener('click', function(){
    document.body.classList.add('cs-printing');
    try { window.print(); } catch (err) { toast('请用浏览器打印 · use browser print'); }
    setTimeout(function(){ document.body.classList.remove('cs-printing'); }, 800);
  });
  window.addEventListener('afterprint', function(){
    document.body.classList.remove('cs-printing');
  });
  var dedBtn = document.getElementById('csDedicate');
  if (dedBtn) dedBtn.addEventListener('click', function(){
    close();
    var link = document.querySelector('.site-nav a[data-view="practice"]');
    if (link) link.click();
    setTimeout(function(){
      var m = document.getElementById('meritBtn');
      var panel = document.getElementById('ded');
      if (m && panel && panel.hasAttribute('hidden')) m.click();
    }, 420);
  });
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape' && overlay.classList.contains('open')){
      e.stopPropagation();
      close();
    }
  }, true);
  /* ================= 语言：中 / EN ================= */

  /* ================= 佛教故事 ================= */
  (function storyModule(){
    var grid = document.getElementById('storyGrid');
    if (!grid) return;
    var TYPE = { piyu:'譬喻', jataka:'本生', yinyuan:'因缘', chan:'禅门' };
    var STORIES = [
      ['piyu','愚人食盐','Salt','《百喻经》','做客的人嫌菜淡，主人添了一把盐，他立刻觉得味美，便想：美味既从盐来，多放岂不更美？于是空口吃盐，口舌焦苦，反受其害。','修行如调味，法药过量亦成病。','Too much of a good thing is another sickness.'],
      ['piyu','渴见水','Thirsty by the river','《百喻经》','有人行经旷野，口渴求水，忽见大河清流，却站着不动。旁人问故，他说：水这样多，我怎么喝得完？宁渴而死，也不肯俯身一饮。','法门广大，畏难而退，与渴死河畔无异。','Refusing the river because it is too wide.'],
      ['piyu','三重楼','The third floor','《百喻经》','愚人见富家三重楼阁庄严，唤木匠来造。木匠先打地基、砌第一层，他拦住说：我不要下面两层，只给我造最上面那层。木匠罢手：没有底，哪有顶。','不修因地，妄求果报，楼无由成。','No foundation, no top floor.'],
      ['piyu','煮黑石蜜','Fanning the syrup','《百喻经》','有人煮黑石蜜，富人忽至，他急着奉上甜浆，便往滚糖里加水、拿扇猛扇，想让它立刻变凉。旁人劝：不必扇，放着自凉。他不听，糖浆溅了满地，客人也走了。','急于求成，反失其味。','Hurrying spoils the sweetness.'],
      ['piyu','盲人摸象','Blind men and the elephant','《大般涅槃经》','众盲各触象身一处。摸牙的说象如萝卜，摸耳的说如簸箕，摸腿的说如柱子，摸尾的说如绳子，争持不下，几至相打。王笑说：你们各得一分，何曾见全象。','执一分为了义，即起诤论。','Each touches a part, none sees the whole.'],
      ['piyu','共命鸟','One body, two heads','《杂宝藏经》','雪山有鸟，一身二头，同命共命。一头趁另一头睡着，独食毒果，心想让它死去，我便独享。毒发之时，两头俱亡，谁也没有活下来。','同体相害，无一能独存。','Poison taken by one head kills both.'],
      ['jataka','割肉贸鸽','Flesh for a dove','《大智度论》·尸毗王','鹰逐鸽，鸽投尸毗王怀中求救。王割自身肉，欲换鸽命。鹰要肉与鸽等重，王割尽股肉臂肉，秤仍不平；他奋力上秤，身虽将倾，心念不动。一念舍身，重于形骸。','护生之念，重于肉身。','A vow weighs more than flesh.'],
      ['jataka','舍身饲虎','Feeding the tigress','《贤愚经》·摩诃萨埵','摩诃萨埵随兄出游，见母虎产子七日，饥困将死。他支开兄长，脱衣卧于虎前，以身施虎。虎无力下口，他以竹刺颈出血，虎舐血而后食。兄还，唯见白骨与衣。','慈悲至极，不惜身命。','Compassion that does not count the cost.'],
      ['yinyuan','鹦鹉救火','The parrot and the fire','《旧杂譬喻经》','山林起火，鹦鹉往来取水洒之，羽湿即飞，飞回再取。天神笑它徒劳：火如此大，几滴水何用？鹦鹉答：我知无用，但曾受此山恩，不忍坐视。天神感其志，为灭火。','愿力不问成否，只问肯不肯。','Small wings, unbroken vow.'],
      ['yinyuan','贫女一灯','One lamp','《贤愚经》·难陀','贫女难陀以乞得的一文钱买油，供佛一灯。众灯油尽皆灭，唯此灯通宵不灭。目连以扇扇之，焰更炽盛。佛言：此灯以竭诚所施，纵大悲风，亦不能灭。','供养在诚，不在多。','A beggar last coin lights a lamp no wind can blow out.'],
      ['yinyuan','鬼子母','The mother of demons','《杂宝藏经》','鬼子母多子，却日日食人家小儿。佛藏其爱子，她悲号寻遍世界。佛问：你失一子，已如此痛；日食人子，那些父母何堪？她闻言受戒，转为护子之神。','以己之痛，量人之痛。','Her own grief becomes everyone protection.'],
      ['yinyuan','周利槃陀伽','Sweeping','《增一阿含经》','周利槃陀伽愚钝，五百罗汉教他一偈，四句终记不住。佛只教他扫地，念「扫帚」二字。他日日扫除，边扫边念，扫到后来，尘垢与心垢一同净尽，证阿罗汉。','法不在多，行到即通。','Sweeping the floor is sweeping the mind.'],
      ['chan','拈花微笑','The flower and the smile','《景德传灯录》','灵山会上，梵天王献金色波罗花，请佛说法。佛拈花示众，一言不发。大众惘然，唯迦叶破颜一笑。佛言：吾有正法眼藏，涅槃妙心，付嘱摩诃迦叶。','不立文字，以心传心。','One flower, one smile, no words.'],
      ['chan','磨砖作镜','Polishing a brick','《景德传灯录》·怀让','马祖道一在南岳坐禅，怀让禅师取砖在石上磨。马祖问做什么，答：磨作镜。马祖笑：磨砖岂能成镜？怀让说：坐禅岂能成佛？马祖当下息念。','执坐相为道，犹磨砖求镜。','A brick will never become a mirror.'],
      ['chan','吃茶去','Have tea','《景德传灯录》·赵州','有僧来参赵州，赵州问：曾到此间否？答：曾到。赵州说：吃茶去。又一僧来，答未曾到，赵州也说：吃茶去。院主问其故，赵州唤：院主。院主应诺。赵州说：吃茶去。','道在平常，不在言句。','Have tea — that is the whole answer.'],
      ['chan','一苇渡江','Crossing on a reed','《景德传灯录》·达摩','达摩自天竺东来，与梁武帝语不投机，遂渡江北去。江面无舟，他折一苇立于其上，飘然过江，止于嵩山少林，面壁九年，等人来。','机不契则去，缘熟则住。','A reed is enough when the time is right.'],
      ['piyu','奴守门','Guarding the door','《百喻经》','主人将出，嘱奴守门。奴以绳系门扇负之而去看戏。贼入其家，财物尽失。奴归，主人问财何在，奴答：门在此，财不知。','执相守门，失其家中所有。','He carried the door and lost the house.'],
      ['jataka','九色鹿','The nine-coloured deer','《九色鹿经》','九色鹿救起溺人，只求他勿泄其踪。王后梦鹿求其皮角，王悬赏。溺人贪赏告发，引兵围鹿。鹿陈说救命之恩，王惭愧放鹿，溺人满身生疮。','背恩求利，利得而身败。','Betrayal pays in sores, not silver.'],
      ['jataka','雪山童子','Half a verse','《大般涅槃经》','雪山童子闻罗刹诵「诸行无常，是生灭法」，求其后半。罗刹言：饥不能说。童子愿以身施。得偈「生灭灭已，寂灭为乐」，即上高树投身。','为半偈舍身，法重于命。','Half a verse, a whole life given.'],
      ['yinyuan','老婢卖贫','Selling poverty','《贤愚经》·迦旃延','老婢为人役使，贫苦欲死，向迦旃延求脱苦之法。尊者教她以旧衣净水施僧，受八斋戒。她依教而行，命终生于天上。','贫亦可施，施不在物之贵贱。','Poverty too can be given away.'],
      ['yinyuan','目连救母','Maudgalyayana saves his mother','《盂兰盆经》','目连以天眼见母堕饿鬼，以钵饭饷之，饭入口化成火炭。佛告：七月十五僧自恣日，以百味供十方僧，仗众僧之力，母乃得脱。','孝思虽切，须仗众力方成。','One bowl cannot feed a mother; a community can.'],
      ['chan','不落因果','Not falling into cause and effect','《无门关》·百丈','老人随百丈听法，自言昔答「不落因果」，遂堕野狐身五百世。百丈请其再问，老人问：大修行人还落因果也无？百丈答：不昧因果。老人言下大悟，脱狐身而去。','拨无因果是邪见，不昧因果是正见。','Not free of cause, but never blind to it.'],
      ['chan','击竹悟道','The sound of bamboo','《五灯会元》·香严','香严问沩山：父母未生时，如何是本来面目？沩山不答，只说：我说的是我的，与你何益。后香严住南阳，芟草击竹，一声入耳，忽然省悟，焚香遥礼沩山。','道不在言句，触境而自得。','A stone, a bamboo, and the ear opens.']
,
      ["piyu", "以梨打头破", "Beaten and unyielding", "《百喻经》", "愚人头上无发，有人拿梨子打，一打再打，把头都打破了，他只管忍着，不知躲开。旁人问：为何不避？他说：那人骄慢恃力，见我一头无发，当是石头，才拿梨打我。旁人说：痴的是你——被打到头破还不知躲。", "只整威仪、不修信戒闻慧而受人供养，正如这不躲的秃头。", "Guarding appearances without practice, like a bald head that will not duck."],
      ["piyu", "估客驼死", "The camel and the silk", "《百喻经》", "商人赶路，骆驼忽然死了，驼背尽是珍宝细软。他剥下驼皮，交代两个徒弟：看好这张皮，别让它湿烂。后逢下雨，二人把上好的细布全盖在皮上，布烂尽了——皮与布孰贵孰贱，一目了然。", "以财货造塔供僧，却不持不杀戒，正是舍本护皮。", "Fine silk spent covering a camel hide."],
      ["piyu", "夫妇食饼", "Two cakes and a vow", "《百喻经》", "夫妇分三张饼，各吃一张，余一张，约定：谁先开口，这张就不给他。片刻贼入，偷尽家财，二人为这张饼都不吭声。贼当面欺其妇，夫仍不吭声。妇喊贼，夫拍手笑：婢子，饼到底归我了。", "为小名利诈现静默，恶贼侵身而不觉。", "Silent for a cake while the house is robbed."],
      ["piyu", "水火喻", "Fire and cold water", "《百喻经》", "有人要用火，也要冷水；他把火种留着，又把一罐水搁在火上。后来取火，火早灭了；取冷水，水已热了。两样都没了。", "已入佛法还念五欲，功德之火、持戒之水，一时俱失。", "Keeping both fire and water, losing both."],
      ["piyu", "欲食半饼", "Half a cake", "《百喻经》", "有人饿极，买了七张煎饼，吃到第六张半就饱了。他悔恨起来，抬手打自己：早知这半张能饱，先前六张岂不白吃了。", "于半饼上生饱想，世人于富贵上生乐想，同一颠倒。", "Full on the last half, blind to the six before it."],
      ["piyu", "入海取沉水", "Sandalwood into charcoal", "《百喻经》", "有人入海采沉水香，经年方得一车，担还市上。见卖炭者速售，便烧香成炭，得钱无几。旁人问他何故，他说：卖得快些。", "多劫积集之功，随小利而毁，如焚香为炭。", "Years of sandalwood burned to cheap charcoal."]
    ];
    var cur = 'all';
    var BOOKID = {};
    (function(){
      var info = window.__bookInfo;
      if (!info) return;
      for (var k in info){
        var t = info[k][1];
        BOOKID[t] = k;
        BOOKID[t.replace('佛说', '')] = k;
        BOOKID[t.replace('菩萨', '')] = k;
      }
    })();
    function buildBookId(){
      var info = window.__bookInfo;
      if (!info) return;
      for (var k in info){
        var t = info[k][1];
        BOOKID[t] = k;
        BOOKID[t.replace('佛说', '')] = k;
        BOOKID[t.replace('菩萨', '')] = k;
      }
    }
    function bookOf(src){
      if (!BOOKID['__ready'] && window.__bookInfo){ buildBookId(); BOOKID['__ready'] = 1; }
      var m = src.match(/《([^》]+)》/);
      if (!m) return '';
      var nm = m[1].split(/[·・]/)[0].trim();
      if (BOOKID[nm]) return BOOKID[nm];
      var strip = nm.replace(/^(佛说)?/, '').replace(/^(大乘)?/, '');
      if (BOOKID[strip]) return BOOKID[strip];
      var info = window.__bookInfo || {};
      for (var k in info){
        var t = info[k][1];
        if (t.indexOf(strip) >= 0 || strip.indexOf(t.replace('佛说', '')) >= 0) return k;
      }
      return '';
    }
    function card(b, i){
      return '<button class="story-card" type="button" data-type="' + b[0] + '" data-i="' + i + '">' +
        '<div class="sc-top"><h4>' + b[1] + '</h4><span class="sc-tag">' + TYPE[b[0]] + '</span></div>' +
        '<span class="sc-en">' + b[2] + '</span>' +
        '<span class="sc-src">' + b[3] + '</span>' +
        '<div class="sc-body"><p>' + b[4] + '</p>' +
        (bookOf(b[3]) ? '<span class="sc-go" role="button" tabindex="0" data-book="' + bookOf(b[3]) + '">读此经 · Open the text</span>' : '') +
        '<p class="sc-moral">喻：' + b[5] + '</p>' +
        '<p class="sc-moral-en">' + b[6] + '</p></div>' +
        '<span class="sc-more">展开 · read</span></button>';
    }
    function paint(){
      var list = [];
      for (var i = 0; i < STORIES.length; i++){
        if (cur === 'all' || STORIES[i][0] === cur) list.push([i, STORIES[i]]);
      }
      var html = [];
      for (var k = 0; k < list.length; k++) html.push(card(list[k][1], list[k][0]));
      grid.innerHTML = html.join('');
    if (!window.__bookInfo && !paint.__wait){
      paint.__wait = 1;
      var t0 = 0;
      var iv = setInterval(function(){
        if (window.__bookInfo || ++t0 > 80){ clearInterval(iv); if (window.__bookInfo) paint(); }
      }, 120);
    }
    if (!grid.__goBound){
      grid.__goBound = 1;
      grid.addEventListener('keydown', function(e){
        if (e.key !== 'Enter' && e.key !== ' ') return;
        var t = e.target.closest && e.target.closest('.sc-go');
        if (!t) return;
        e.preventDefault(); e.stopPropagation();
        var id = t.getAttribute('data-book');
        if (id && window.__leafOpen) window.__leafOpen('sutra');
        if (id && window.__openBook) setTimeout(function(){ window.__openBook(id); }, 120);
    });
    grid.addEventListener('click', function(e){
        var t = e.target.closest && e.target.closest('.sc-go');
        if (!t) return;
        e.preventDefault(); e.stopPropagation();
        var id = t.getAttribute('data-book');
        if (id && window.__leafOpen) window.__leafOpen('sutra');
        if (id && window.__openBook) setTimeout(function(){ window.__openBook(id); }, 120);
      });
    }
      var cnt = document.getElementById('storyCount');
      if (cnt) cnt.textContent = list.length + ' 则';
      var chips = document.querySelectorAll('#storyFilters button');
      for (var c = 0; c < chips.length; c++) chips[c].classList.toggle('on', chips[c].getAttribute('data-type') === cur);
    }
    var bar = document.getElementById('storyFilters');
    if (bar) bar.addEventListener('click', function(e){
      var t = e.target.closest ? e.target.closest('button') : null;
      if (!t) return;
      cur = t.getAttribute('data-type') || 'all';
      paint();
    });
    grid.addEventListener('click', function(e){
      var c = e.target.closest ? e.target.closest('.story-card') : null;
      if (!c) return;
      c.classList.toggle('open');
    });
    paint();
  })();

  /* ================= 藏经分栏导航 ================= */
  (function sutraToc(){
    var toc = document.getElementById('sutraToc');
    if (!toc) return;
    toc.addEventListener('click', function(e){
      var b = e.target.closest ? e.target.closest('button') : null;
      if (!b) return;
      var id = b.getAttribute('data-to');
      var el = id ? document.getElementById(id) : null;
      var body = document.querySelector('#v-sutra .leaf-body');
      if (!el || !body) return;
      var top = el.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop - 104;
      var max = Math.max(0, body.scrollHeight - body.clientHeight);
      body.scrollTo({ top: Math.min(max, Math.max(0, top)), behavior: 'auto' });
      var chips = toc.querySelectorAll('button');
      for (var i = 0; i < chips.length; i++) chips[i].classList.toggle('on', chips[i] === b);
    });
  })();

  (function langModule(){
    var DICT = {
      '故事': 'Stories', '佛教故事': 'Stories', '譬喻': 'Parables', '本生': 'Past lives', '因缘': 'Causes', '禅门': 'Chan',
      '诵持': 'Recite', '三藏': 'Three baskets', '十二部': 'Twelve genres', '路径': 'Routes', '书目': 'Shelf',
      '藏经': 'Canon', '功课': 'Daily practice', '仪轨': 'Rites & manners', '次第': 'The path',
      '寺院': 'The temple', '供养': 'Offerings', '历数': 'Almanac', '检索': 'Search', '分享': 'Share',
      '诵持之典｜三经一咒': 'Three sutras and one dhāraṇī',
      '日日不辍｜一日一记': 'A little every day, one entry per day',
      '入殿之礼｜四事问答': 'Manners in the hall · questions and answers',
      '由信而解｜由解而行': 'From faith to understanding, from understanding to practice',
      '殿宇之制｜称谓与结缘': 'Hall layout, forms of address, contact',
      '灯花净水｜存于本机': 'Lamp, flower, water — kept on this device only',
      '朔望斋期｜圣诞将至': 'New and full moon fasts, coming festival days',
      '遍搜全殿｜经句与问答': 'Search the whole hall — verses and questions',
      '上香': 'Incense', '合十问讯': 'Greeting with joined palms',
      '殿堂之制': 'Hall layout', '造像之法': 'Making of images', '法器与供具': 'Vessels and implements',
      '梵唱 · 起': 'Chant · start', '梵唱 · 止': 'Chant · stop',
      '回到开头': 'Back to the start', '字 小': 'Text −', '字 大': 'Text +',
      '注音 · 开': 'Romanisation · on', '注音 · 关': 'Romanisation · off',
      '单句循环': 'Loop one line', '静默跟读': 'Silent pacing', '跟读 · 止': 'Pacing · stop',
      '跟读录音': 'Record your recital', '描红抄经 · Trace': 'Trace & copy',
      '删去 · Remove': 'Remove', '念一声 · 记一次': 'One recital, one mark',
      '清零 · Clear': 'Clear', '存一张今日偈语卡 · Save a verse card': 'Save a verse card',
      '回向此功课 · Dedicate': 'Dedicate this practice', '书写回向文 · Compose': 'Compose a dedication',
      '抄下这段 · Copy': 'Copy this text', '记一次回向 · Record': 'Record a dedication',
      '开启提醒 · Remind me': 'Remind me', '导出存档 · Export': 'Export archive',
      '导入存档 · Import': 'Import archive', '重新记 · Reset': 'Reset',
      '去藏经读一段 · Read a sutra': 'Read a sutra', '去功课记一笔 · Daily practice': 'Daily practice',
      '去名相查一查 · Glossary': 'Glossary', '点一盏灯': 'Light a lamp',
      '加入日历 · Add to calendar (.ics)': 'Add to calendar (.ics)',
      '搜索 · Find': 'Find', '复制以上信息 · Copy details': 'Copy details',
      '格 小': 'Cells −', '格 大': 'Cells +', '打印 · Print': 'Print', '回向 · Dedicate': 'Dedicate',
      '一寺之主，由僧团推举；「方丈」原指住持居所，后成为对其尊称。':
        'The head of a monastery, chosen by the community. \u201cFangzhang\u201d originally meant the abbot\u2019s quarters, and later became a title of respect.',
      '原指通晓佛法、能为人师者。当面称「法师」或「师父」皆可，不必称「大师」以求隆重。':
        'One who knows the dharma and can teach it. \u201cFashi\u201d or \u201cShifu\u201d is fine face to face; there is no need for the grander \u201cDashi\u201d.',
      '梵语「邬波驮耶」的讹略，意为亲教师；本非贬称，但日常称「师父」更为亲切妥帖。':
        'A rendering of the Sanskrit upadhyaya, a personal preceptor. It was never a term of disparagement, though \u201cShifu\u201d is the warmer everyday address.',
      '受具足戒的男众、女众。在家人可泛称「师父」，不必追问戒腊与职务。':
        'Fully ordained monks and nuns. Lay visitors may simply say \u201cShifu\u201d, without asking about ordination years or office.',
      '在家学佛者的通称，梵语「迦罗越」。自称居士是谦辞，称他人则含敬意。':
        'The general term for a lay follower, from the Sanskrit kulapati. Used of oneself it is modest; used of others it carries respect.',
      '以物相赠、以法相见，皆名结缘，不作买卖。念珠、经书、香，通常由寺院流通处供给，随喜成本即可。':
        'Giving a thing, or meeting through the dharma, is called forming a karmic connection — never a transaction. Rosaries, books and incense usually come from the temple shop; a contribution towards cost is the custom.',
      '佛号 · 一百零八': 'The name · one hundred and eight',
      '满一百零八即为一串': 'One hundred and eight makes a full rosary',
      '一百零八遍圆满': 'A full rosary completed',
      '连续用功': 'Days in a row',
      '今日一偈': 'A verse for today',
      '功课毕，可念一段回向：愿以此功德，普及于一切，我等与众生，皆共成佛道。':
        'When the practice is done, dedicate it: may this merit reach all beings, that we and all others together awaken.',
      '已回向': 'Dedicated',
      '还殿 · Back': 'Back',
      '名相': 'Glossary', '已行 \u00b7 done': 'Done', '供养之意': 'Why an offering',
      '学佛不是一步登天，多是一段一段走。下面五阶只是常行的次序，不是考级；勾一项，只是给自己留个记号。':
        'The path is walked step by step, not in one leap. These five stages are an ordinary order of practice, not a grading scheme; a tick is only a mark you leave for yourself.',
      '搜索经句、问答、称谓……': 'Search verses, questions, terms\u2026',
      '筛名相，如：般若、五蕴、回向……': 'Filter terms, e.g. prajna, aggregates, dedication\u2026',
      '今日功课': 'Practice for today',
      '入殿问答': 'Questions on entering the hall',
      '轻触入殿': 'Tap to enter',
      /* 仪轨三卡与问答、寺院三卡：英文版正文 */
      '取香一枝，双手平举至眉齐，默念所愿；插香时不必用力，香与香之间留一指宽。一枝即可，不必求多。':
        'Take one stick, hold it level with both hands up to the brow, and silently form your intention. Set it in the censer without force, leaving a finger-width between sticks. One is enough; there is no need for many.',
      '花、果、清水为上，取其清净；供毕可自受用，不弃不焚。供品以心意为主，不在贵重。':
        'Flowers, fruit and clean water are best, for their purity. After offering you may use them yourself — do not throw them away or burn them. What matters is the intention, not the price.',
      '双掌相合于胸前，脊背自然直立，躬身约三十度为一问讯；起身时缓慢，不与旁人说笑。':
        'Join the palms at the chest, back naturally upright, and bow about thirty degrees: that is one greeting. Rise slowly, without chatting or laughing beside others.',
      '殿里可以拍照吗？': 'May I take photographs in the hall?',
      '可以，但请关掉闪光，不要跨过拜垫、不要正对他人礼佛时按快门。拍下的影像不用于商业与戏谑。':
        'Yes, but turn the flash off, do not step over the cushions, and do not photograph others while they are bowing. Please do not use the images commercially or mockingly.',
      '许愿要不要还愿？': 'If I make a vow, must I repay it?',
      '佛法讲发愿与行愿，重在愿后的行动：善待身边人、少一分贪嗔。若在别处许过愿，按当地寺院的规矩行事即可。':
        'Buddhism speaks of making vows and of carrying them out: what counts is the conduct afterwards — treating those around you kindly, wanting and resenting a little less. If you have vowed elsewhere, simply follow that temple\x27s custom.',
      '供品怎么处理？': 'What should be done with offerings afterwards?',
      '撤供后与家人分食，或转赠他人，皆是惜福。不宜随手弃于地面、丢入垃圾桶。':
        'Share it with your family, or give it to others: both are a way of cherishing the blessing. It should not be dropped on the ground or thrown in the bin.',
      '心静不下来怎么办？': 'What if my mind will not settle?',
      '不必强压。先数呼吸，从一数到十，反复即可；念头起时不追不斥，回到呼吸便是。':
        'Do not force it down. Count the breath from one to ten and repeat; when a thought arises, neither chase it nor scold it — simply return to the breath.',
      '供灯是什么意思？': 'What does offering a lamp mean?',
      '灯表智慧、表照破无明，不表许愿灵验。点一盏，是提醒自己愿做那一点光：照见自己，也照见旁人。':
        'A lamp stands for wisdom, for light that breaks through ignorance — not for wishes coming true. Lighting one is a reminder that you mean to be that bit of light: seeing yourself, and seeing others.',
      '功课要念多久？': 'How long should daily practice be?',
      '宁少而恒。定下一个日日做得到的量——三分钟、一串佛号、一遍心经——先做满一月，再谈加量。':
        'Better small and constant. Set an amount you can truly do every day — three minutes, one rosary of the name, one Heart Sutra — keep it for a month before adding more.',
      '在家也能这样做吗？': 'Can I do this at home?',
      '能。焚香一支、净水一杯、静坐片刻，皆是供养；不必置办法器，也不必择日择时。':
        'Yes. One stick of incense, a cup of clean water, a few minutes of sitting — all are offerings. You need no implements, and no special day or hour.',
      '汉传寺院中轴多以山门、天王殿、大雄宝殿、法堂、藏经楼依次排开，两侧配钟鼓楼、伽蓝殿、祖师殿。大雄宝殿为主殿，「大雄」意为能降伏烦恼的勇士，殿内主尊多为释迦牟尼佛。<br>主流布局：山门 → 天王殿 → 大雄宝殿 → 法堂。':
        'A Chinese Buddhist temple usually runs along one axis: gate house, Hall of the Heavenly Kings, Great Hero Hall, dharma hall and scripture library, with bell and drum towers, a Sangharama hall and a patriarchs\x27 hall to the sides. The Great Hero Hall is the main one; \u201cGreat Hero\u201d means one who can subdue affliction, and its central image is usually Shakyamuni Buddha.<br>The common sequence: gate → Heavenly Kings → Great Hero Hall → dharma hall.',
      '佛像多结跏趺坐于莲台：莲表清净，出淤泥而不染；手结定印或触地印，表禅定与觉悟。两侧常立胁侍，或供观音、文殊、普贤、地藏四大菩萨。<br>金身非为华美，取「金」之不变不坏，表法身常住。':
        'A Buddha image usually sits cross-legged on a lotus: the lotus means purity, unstained though it grows from mud. The hands form the meditation mudra or the earth-touching mudra, for stillness and awakening. Attendant figures often stand at either side, or the four great bodhisattvas — Guanyin, Manjushri, Samantabhadra, Ksitigarbha — are honoured.<br>The gilding is not for show: gold stands for what does not change or break, the dharma body that abides.',
      '钟、鼓、磬、木鱼、香炉、烛台、幡帐，各有其用：钟表警醒昏沉，磬表清净，香表戒定之德。供桌上的香、花、灯、涂、果、茶、食、宝、珠、衣，称为「十供养」。<br>供具不在多，在常清洁、常恭敬。':
        'Bell, drum, gong, wooden fish, censer, candlesticks and banners each have a use: the bell wakes us from torpor, the gong means purity, incense stands for the virtue of precepts and stillness. The ten offerings on the altar are incense, flowers, light, ointment, fruit, tea, food, treasures, pearls and cloth.<br>What matters is not how many vessels there are, but that they are kept clean and treated with reverence.'
    };
    var REV = {};
    for (var k in DICT){ if (Object.prototype.hasOwnProperty.call(DICT, k)) REV[DICT[k]] = k; }
    var MAP = document.getElementById('langBtn');
    var nowEl = document.getElementById('langNow');
    var altEl = document.getElementById('langAlt');
    var cache = [];
    var SKIP = ['sutra-lines', 'py', 'cs-paper'];

    function pick(node){
      var p = node.parentNode;
      while (p && p !== document.body){
        if (p.nodeType === 1){
          for (var i = 0; i < SKIP.length; i++){
            if (p.id === SKIP[i] || (' ' + p.className + ' ').indexOf(' ' + SKIP[i] + ' ') > -1) return null;
          }
        }
        p = p.parentNode;
      }
      return p;
    }

    function swap(){
      var dir = window.__LANG === 'en' ? DICT : REV;
      var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
      var n;
      while ((n = walker.nextNode())){
        var raw = n.nodeValue;
        if (!raw) continue;
        var s = raw.trim();
        if (!s) continue;
        if (n.parentNode && n.parentNode.id && (n.parentNode.id === 'langNow' || n.parentNode.id === 'langAlt')) continue;
        /* 已经是英文的那一行（.en / .en 系）不参与双向替换，避免回切时把英文行改成中文 */
        var p = n.parentNode, guard = false;
        while (p && p !== document.body){
          if (p.nodeType === 1 && ((p.classList && p.classList.contains('en')) || p.tagName === 'EM')){ guard = true; break; }
          p = p.parentNode;
        }
        if (guard) continue;
        var out = null;
        if (dir[s] !== undefined) out = dir[s];
        else if (window.__LANG === 'en' && s.indexOf('语速 · ') === 0) out = s.replace('语速 · ', 'Speed · ');
        else if (window.__LANG === 'zh' && s.indexOf('Speed · ') === 0) out = s.replace('Speed · ', '语速 · ');
        if (out === null) continue;
        n.nodeValue = raw.replace(s, out);
      }
    }

    function paint(){
      var en = window.__LANG === 'en';
      document.documentElement.lang = en ? 'en' : 'zh-Hans';
      document.body.classList.toggle('lang-en', en);
      /* 中英双行标题：中文标题已有对应英文时，英文模式不再重复显示同一串英文 */
      var heads = document.querySelectorAll('h2,h3');
      for (var hh = 0; hh < heads.length; hh++){
        var emEl = heads[hh].querySelector('em');
        if (!emEl) continue;
        var lead = heads[hh].firstChild;
        var zhTxt = (lead && lead.nodeType === 3) ? lead.nodeValue.trim() : '';
        if (heads[hh].getAttribute('data-hzh') === null) heads[hh].setAttribute('data-hzh', zhTxt);
        var srcTxt = heads[hh].getAttribute('data-hzh') || '';
        if (/[\u4e00-\u9fff]/.test(srcTxt) && typeof DICT[srcTxt] === 'string') emEl.setAttribute('data-dup','1');
      }
      if (nowEl) nowEl.textContent = en ? 'EN' : '中';
      if (altEl) altEl.textContent = en ? '中' : 'EN';
      if (MAP) MAP.setAttribute('aria-pressed', en ? 'true' : 'false');
      swap();
      /* 含 <br> 的整段（寺院三卡）：文本被折行拆开，改按整段 innerHTML 替换 */
      var cards = document.querySelectorAll('.temple-card p');
      for (var c = 0; c < cards.length; c++){
        var cell = cards[c];
        if (!cell.getAttribute('data-zh')) cell.setAttribute('data-zh', cell.innerHTML);
        if (en){
          var enHtml = DICT[cell.getAttribute('data-zh')];
          if (enHtml) cell.innerHTML = enHtml;
        } else {
          cell.innerHTML = cell.getAttribute('data-zh');
        }
      }
      /* 成对文案（中文 + <em>英文</em>）：英文态只留英文那半 */
      var PAIRS = ['.gloss-row dt', '.gloss-row dd', '.path-item span', '.kung-list label .zh', '.off-tab', '.path-stage h3', '.ps-no'];
      var CJK = /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/;
      for (var s = 0; s < PAIRS.length; s++){
        var set = document.querySelectorAll(PAIRS[s]);
        for (var k = 0; k < set.length; k++){
          var host = set[k];
          if (host.querySelector('b.zh-only')) continue;
          var nodes = [];
          for (var c2 = 0; c2 < host.childNodes.length; c2++){
            var tn = host.childNodes[c2];
            if (tn.nodeType === 3 && tn.nodeValue && CJK.test(tn.nodeValue)) nodes.push(tn);
          }
          for (var n2 = 0; n2 < nodes.length; n2++){
            var b = document.createElement('b');
            b.className = 'zh-only';
            host.replaceChild(b, nodes[n2]);
            b.appendChild(nodes[n2]);
          }
        }
      }
      /* 输入框提示语（placeholder 不进文本节点，单独换） */
      var PH = [
        ['searchInput', '搜索经句、问答、称谓……', 'Search verses, questions, terms\u2026'],
        ['glossFilter', '筛名相，如：般若、五蕴、回向……', 'Filter terms, e.g. prajna, aggregates, dedication\u2026'],
        ['lampWish', '一句愿文，二十八言以内', 'A wish, within twenty-eight characters'],
        ['lampName', '署名（可空）', 'Your name (optional)']
      ];
      for (var h = 0; h < PH.length; h++){
        var pe = document.getElementById(PH[h][0]);
        if (pe) pe.setAttribute('placeholder', en ? PH[h][2] : PH[h][1]);
      }
      /* 竖排导航用短词，避免英文过长把导航撑开；按 data-view 取值，不随条目增删错位 */
      var NAV_LABELS = {
        sutra: ['藏经', 'Canon'], practice: ['功课', 'Daily'], rite: ['仪轨', 'Rites'],
        path: ['次第', 'Path'], temple: ['寺院', 'Temple'], lamps: ['供养', 'Offering'],
        almanac: ['历数', 'Almanac'], search: ['检索', 'Search'],
        share: ['分享', 'Share']
      };
      var nlinks = document.querySelectorAll('.site-nav a');
      for (var i = 0; i < nlinks.length; i++){
        var key = nlinks[i].getAttribute('data-view') || nlinks[i].getAttribute('data-action');
        var lb = NAV_LABELS[key];
        var sp = nlinks[i].querySelector('span');
        if (lb && sp) sp.textContent = en ? lb[1] : lb[0];
      }
    }

    if (MAP){
      MAP.addEventListener('click', function(){
        window.__LANG = window.__LANG === 'en' ? 'zh' : 'en';
        try { localStorage.setItem('fxy-lang', window.__LANG); } catch(e){}
        paint();
        if (window.__toast) window.__toast(window.__LANG === 'en' ? 'English edition · 英文优先排版' : '中文界面 · Chinese edition');
      });
    }
    paint();
  })();

  /* ===== 经文正文按需加载：首屏不再内联五十万字 ===== */
  var TEXTS = {}, textsState = 0, textsWaiters = [];
  function loadTexts(cb){
    if (cb) textsWaiters.push(cb);
    if (textsState === 2){
      var fin = textsWaiters; textsWaiters = [];
      for (var f = 0; f < fin.length; f++){ try{ fin[f](); }catch(e){} }
      return;
    }
    if (textsState === 1) return;
    textsState = 1;
    fetch('/assets/texts.json', { credentials: 'same-origin' })
      .then(function(r){ if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function(d){
        for (var k in d){ if (Object.prototype.hasOwnProperty.call(d, k)) TEXTS[k] = d[k]; }
        textsState = 2;
        var fin = textsWaiters; textsWaiters = [];
        for (var m = 0; m < fin.length; m++){ try{ fin[m](); }catch(e){} }
      })
      .catch(function(){
        textsState = 0; textsWaiters = [];
        if (window.__toast) window.__toast('经文取不到，请检查网络 · text failed to load');
      });
  }
  function loadText(id, cb){
    if (TEXTS[id]){ if (cb){ try{ cb(id); }catch(e){} } return; }
    loadTexts(function(){ if (cb){ try{ cb(id); }catch(e){} } });
  }
  window.__loadText = loadText;
  window.__loadAllTexts = function(cb){ loadTexts(cb); };
  window.__texts = TEXTS;
  (function canonModule(){
    var grid = document.getElementById('canonBooks');
    var bar  = document.getElementById('canonFilters');
    var cnt  = document.getElementById('canonCount');
    var reader = document.getElementById('bookReader');
    var rBody = document.getElementById('readerBody');
    var rTitle = document.getElementById('readerTitle');
    var rMeta = document.getElementById('readerMeta');
    if (!grid) return;
    var CAT = { jing:'经藏', lü:'律藏', lun:'论藏', zhuan:'中国撰述' };
    var BOOKS = [
      ['db','大悲咒','Great Compassion Mantra','jing','咒','观世音根本咒，八十四句，汉传早晚课常诵。','The root mantra of Guanyin, chanted daily in Chinese temples.'],
      ['xj','心经','Heart Sutra','jing','1 卷','二百六十字的般若核心，照见五蕴皆空。','Two hundred and sixty characters: the heart of prajna.'],
      ['ws','往生咒','Rebirth Mantra','jing','咒','净土助行，十四句，短而易持。','A short Pure Land aid, easy to hold every day.'],
      ['jg','金刚经','Diamond Sutra','jing','1 卷','以无住生心，破一切相，般若部流通最广者。','Dwell nowhere and let the mind arise; breaking every mark.'],
      ['amt','佛说阿弥陀经','Amitabha Sutra','jing','1 卷','净土三经之一，持名念佛的经典依据。','One of the three Pure Land sutras: the case for recitation.'],
      ['gj','观无量寿佛经','Contemplation Sutra','jing','1 卷','十六观门，由观想而入净土，兼说九品往生。','Sixteen contemplations: entering the Pure Land by vision.'],
      ['wls','无量寿经','Larger Sukhavati-vyuha Sutra','jing','2 卷','四十八愿的完整展开，净土根本依据。','The forty-eight vows in full, ground of the Pure Land path.'],
      ['ys','药师经','Medicine Buddha Sutra','jing','1 卷','十二大愿，消灾延寿，现世安乐之门。','Twelve vows for healing and long life.'],
      ['dz','地藏菩萨本愿经','Ksitigarbha Sutra','jing','3 卷 13 品','因果与孝道，愿力最深的一部。','Cause and effect, filial care, the deepest of vows.'],
      ['wmj','维摩诘所说经','Vimalakirti Sutra','jing','3 卷 14 品','在家菩萨的辩才，不二法门，默然雷音。','A layman eloquence; the gate of non-duality.'],
      ['yj','圆觉经','Sutra of Perfect Enlightenment','jing','1 卷','十二菩萨次第发问，修行方便分明。','Twelve bodhisattvas ask; every method laid out.'],
      ['sm','胜鬘经','Shrimala Sutra','jing','1 卷','如来藏与一乘，由胜鬘夫人宣说。','Tathagatagarbha and one vehicle, taught by a queen.'],
      ['jsm','解深密经','Samdhinirmocana Sutra','jing','5 卷','三时判教与唯识的经典依据。','The scriptural basis for the three turnings and yogacara.'],
      ['sse','佛说四十二章经','Sutra of Forty-two Chapters','jing','1 卷','最早的汉译经典，条目式教诫。','The earliest Chinese translation: forty-two short teachings.'],
      ['bd','佛说八大人觉经','Sutra of the Eight Realizations','jing','1 卷','最简的修行提纲，八条便见全貌。','Eight lines, and the whole path is sketched.'],
      ['yjiao','佛遗教经','Sutra of the Buddhas Bequest','jing','1 卷','临涅槃最后的教诫，以戒为师。','Last words before parinirvana: take the precepts as teacher.'],
      ['by','百喻经','Sutra of a Hundred Parables','jing','4 卷','九十八个譬喻，读之解颐又解义。','Ninety-eight parables: wit that teaches.'],
      ['fjy','法句经','Dhammapada (Chinese)','jing','2 卷','三十九品偈颂，偈偈可诵可行。','Verses on verses: short enough to carry all day.'],
      ['lyj','楞严经','Surangama Sutra','jing','10 卷','七处征心、十番显见，由破妄至二十五圆通，汉传禅净教观共尊。','Seven interrogations of the mind and twenty-five gateways to awakening.'],
      ['ylp','盂兰盆经','Ullambana Sutra','jing','1 卷','目连救母的缘起，盂兰盆会所依。','The origin of the ghost-festival offering for the dead.'],
      ['ssyd','十善业道经','Sutra of the Ten Wholesome Ways','jing','1 卷','十善为一切戒基，人天乘的起点。','Ten wholesome deeds: the floor under every precept.'],
      ['pm','观世音菩萨普门品','Universal Gateway Chapter','jing','1 品','法华经第二十五品，观音信仰的根本章句。','The Lotus chapter on Guanyin, root of the devotion.'],
      ['xyy','普贤行愿品','Bhadracarya-pranidhana','jing','1 卷','四十华严末卷，十大愿王导归极乐。','The ten great vows that close the Avatamsaka.'],
      ['usj','优婆塞戒经','Upasaka Precepts Sutra','lü','7 卷','佛陀为在家居士所说，六重二十八轻，教人在家业、生计与亲眷之间行六度。','The lay bodhisattva precepts: six major and twenty-eight minor, kept inside ordinary work and family life.'],
      ['fw','梵网经','Brahma Net Sutra','lü','2 卷','菩萨戒十重四十八轻，汉传通行本。','The bodhisattva precepts: ten major, forty-eight minor.'],
      ['zl','中论','Mulamadhyamaka-karika','lun','4 卷 27 品','八不中道，缘起即性空，中观根本论。','Eight negations; dependent arising is emptiness.'],
      ['sem','十二门论','Twelve Gate Treatise','lun','1 卷','中观入门，十二门各破一执。','Twelve gates, each dismantling one clinging.'],
      ['bl','百论','Hundred Verses Treatise','lun','2 卷','提婆破外道，百偈见锋。','A hundred verses by Aryadeva, sharp against rivals.'],
      ['qx','大乘起信论','Awakening of Faith','lun','1 卷','一心二门，体相用三大，大乘总纲。','One mind, two gates: the Mahayana in miniature.'],
      ['lz','六祖坛经','Platform Sutra','zhuan','1 卷 10 品','唯一以「经」称的中国僧人语录。','The only Chinese teaching honoured as a sutra.'],
      ['xxm','信心铭','Inscription on Faith in Mind','zhuan','1 篇','三祖僧璨所作，五百余字直指。','Six hundred characters pointing straight at the mind.'],
      ['zdg','永嘉证道歌','Song of Enlightenment','zhuan','1 篇','永嘉玄觉一歌，禅门千古绝唱。','Yongjia one song, still sung after twelve centuries.']
    ];
    var INFO = {};
    for (var i = 0; i < BOOKS.length; i++) INFO[BOOKS[i][0]] = BOOKS[i];
    window.__bookInfo = INFO;
    window.__bookIds = BOOKS.map(function(b){ return b[0]; });
    var SRC = { jg: ['T08n0235', '金剛般若波羅蜜經'], amt: ['T12n0366', '佛說阿彌陀經'], gj: ['T12n0365', '佛說觀無量壽佛經'], wls: ['T12n0360', '佛說無量壽經'], dz: ['T13n0412', '地藏菩薩本願經'], ys: ['T14n0450', '藥師琉璃光如來本願功德經'], wmj: ['T14n0475', '維摩詰所說經'], yj: ['T17n0842', '大方廣圓覺修多羅了義經'], sm: ['T12n0353', '勝鬘師子吼一乘大方便方廣經'], jsm: ['T16n0676', '解深密經'], sse: ['T17n0784', '佛說四十二章經'], bd: ['T17n0779', '佛說八大人覺經'], yjiao: ['T12n0389', '佛垂般涅槃略說教誡經'], by: ['T04n0209', '百喻經'], fjy: ['T04n0210', '法句經'], ylp: ['T16n0685', '佛說盂蘭盆經'], ssyd: ['T15n0600', '佛為娑伽羅龍王所說大乘經'], fw: ['T24n1484', '梵網經'], zl: ['T30n1564', '中論'], sem: ['T30n1568', '十二門論'], bl: ['T30n1569', '百論'], qx: ['T32n1666', '大乘起信論'], lz: ['T48n2008', '六祖大師法寶壇經'], pm: ['T09n0262', '妙法蓮華經'], xyy: ['T10n0293', '大方廣佛華嚴經'], xxm: ['T48n2010', '信心銘'], zdg: ['T48n2014', '永嘉證道歌'], usj: ['T24n1488', '優婆塞戒經'], lyj: ['T19n0945', '大佛頂如來密因修證了義諸菩薩萬行首楞嚴經'] };
    function paintSource(id){
      var el = document.querySelector('#bookReader .reader-source');
      if (!el) return;
      var c = SRC[id];
      if (!c){
        el.innerHTML = '录文据 CBETA《大正藏》电子佛典，标点一仍其旧，校勘从略。'
          + '<em>Text per the CBETA Taisho edition; punctuation kept, apparatus omitted.</em>';
        window.__citeFor = '';
        return;
      }
      var meta = (window.__metaFor ? window.__metaFor(id) : null);
      var extra = meta ? '<span class="rs-meta"><i>版本</i>' + meta.alt + '<i>注疏</i>' + meta.com + '</span>' : '';
      var vol = String(parseInt(c[0].slice(1, 3), 10));
      var no = String(parseInt(c[0].slice(4), 10));
      var cite = '《' + c[1] + '》，大正新修大藏经第 ' + vol + ' 册，No. ' + no + '（' + c[0] + '），CBETA 电子佛典录文；本站标点一仍其旧，校勘从略。';
      window.__citeFor = cite;
      el.innerHTML = extra
        + '<div class="rs-cite"><b>底本 · 引用 SOURCE &amp; CITATION</b>'
        + '<p>' + cite + '</p>'
        + '<button type="button" class="rs-copy">复制引用 · Copy citation</button></div>'
        + '录文据 CBETA《大正藏》' + c[0] + ' · ' + c[1] + '；标点一仍其旧，校勘从略。'
        + '<em>CBETA Taisho edition, ' + c[0] + ' (No. ' + no + '). Punctuation kept, apparatus omitted.</em>';
      var cp = el.querySelector('.rs-copy');
      if (cp) cp.addEventListener('click', function(){
        var done = function(){ toast('已复制引用 · Citation copied'); };
        if (navigator.clipboard && navigator.clipboard.writeText){
          navigator.clipboard.writeText(cite).then(done).catch(function(){ toast('复制失败，请手动选取 · copy failed'); });
        } else { toast('复制失败，请手动选取 · copy failed'); }
      });
    }

    var POS_KEY = 'fxy-pos-';
    var curBook = '';
    function readPos(id){
      try{ var v = parseInt(localStorage.getItem(POS_KEY + id), 10); return isNaN(v) ? -1 : v; }catch(e){ return -1; }
    }
    function writePos(id, n){
      try{ localStorage.setItem(POS_KEY + id, String(n)); }catch(e){}
    }
    var resumeBar = null;
    function showResume(id, n){
      if (resumeBar && resumeBar.parentNode) resumeBar.parentNode.removeChild(resumeBar);
      resumeBar = null;
      if (!reader || !rBody || n <= 1) return;
      var el = document.createElement('div');
      el.className = 'resume';
      var b = document.createElement('b');
      b.textContent = '续读 · 上次读到第 ' + (n + 1) + ' 节';
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = '从头读 · From start';
      btn.addEventListener('click', function(){
        writePos(id, 0);
        var box = document.querySelector('#v-sutra .leaf-body');
        if (box && reader){
          var top = reader.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
          box.scrollTo({ top: Math.max(0, top - 96) });
        }
        if (el.parentNode) el.parentNode.removeChild(el);
        if (window.__toast) window.__toast('从头读 · from the start');
      });
      el.appendChild(b);
      el.appendChild(btn);
      reader.insertBefore(el, rBody);
      resumeBar = el;
    }
    var CHANT = { db:1, xj:1, ws:1 };
    var cur = 'all';

    function cardHtml(b){
      return '<button class="book" id="cb-' + b[0] + '" data-cat="' + b[3] + '" data-book="' + b[0] + '" type="button">' +
             '<div class="top"><h4>' + b[1] + '</h4><span class="tag">' + CAT[b[3]] + ' · ' + b[4] + '</span></div>' +
             '<span class="en">' + b[2] + '</span>' +
             '<p>' + b[5] + '<em>' + b[6] + '</em></p>' +
             '<span class="rd">全文 · full text</span></button>';
    }
    function paint(){
      var list = BOOKS.filter(function(b){ return cur === 'all' || b[3] === cur; });
      grid.innerHTML = list.map(cardHtml).join('');
      if (cnt) cnt.textContent = list.length + ' 部';
      var chips = bar ? bar.querySelectorAll('.chip') : [];
      for (var i = 0; i < chips.length; i++) chips[i].classList.toggle('on', chips[i].getAttribute('data-cat') === cur);
    }

    function esc(s){
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    function renderText(id){
      var b = INFO[id];
      var t = TEXTS[id];
      if (!b || !t || !rBody) return false;
      if (rTitle) rTitle.textContent = b[1];
      if (rMeta) rMeta.textContent = b[2] + ' · ' + CAT[b[3]] + ' · ' + b[4] + ' · ' + t.length + ' 节';
      paintSource(id);
      if (window.__articleLd) window.__articleLd(b, t[0]);
      var html = [];
      for (var i = 0; i < t.length; i++){
        var cls = 'rl';
        if (i === 0) cls += ' first';
        html.push('<p class="' + cls + '" data-i="' + i + '">' + esc(t[i]) + '</p>');
      }
      rBody.innerHTML = html.join('');
      rBody.scrollTop = 0;
      return true;
    }

    function openBook(id){
      curBook = id;
      window.__curBook = id;
      if (!CHANT[id] && !TEXTS[id]){
        if (window.__toast) window.__toast('正在取经文… · loading text');
        loadText(id, function(){ if (curBook === id) openBook(id); });
        return;
      }
      var body = document.querySelector('#v-sutra .leaf-body');
      var main = document.querySelector('#v-sutra .sutra-main');
      var pickWrap = document.querySelector('#v-sutra .sutra-pick');
      if (CHANT[id]){
        if (reader) reader.hidden = true;
        if (main) main.hidden = false;
        if (pickWrap) pickWrap.style.display = '';
        var pick = document.querySelector('#v-sutra .sutra-pick button[data-sutra="' + id + '"]');
        if (pick) pick.click();
        if (body) body.scrollTop = 0;
        markCard(id);
        return;
      }
      if (!renderText(id)) return;
      if (main) main.hidden = true;
      if (pickWrap) pickWrap.style.display = 'none';
      if (reader) reader.hidden = false;
      setTimeout(function(){
        var hd = document.getElementById('readerTitle');
        if (hd){ hd.setAttribute('tabindex','-1'); try{ hd.focus({preventScroll:true}); }catch(e){} }
      }, 60);
      markCard(id);
      if (body && reader){
        var top = reader.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop;
        var go = Math.max(0, top - 96);
        var saved = readPos(id);
        if (saved > 1 && rBody){
          var ps = rBody.querySelectorAll('p.rl');
          var node = ps[Math.min(saved, ps.length - 1)];
          if (node){ go = node.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop - 150; }
        }
        body.scrollTo({ top: Math.max(0, go), behavior: 'smooth' });
        (function(g, bid){
          setTimeout(function(){ if (curBook === bid) body.scrollTo({ top: Math.max(0, g) }); }, 480);
        })(go, id);
        showResume(id, saved);
      }
      try{ history.replaceState(null, '', '?b=' + id); }catch(e){}
    }
    function markCard(id){
      var cards = grid.querySelectorAll('.book');
      for (var i = 0; i < cards.length; i++) cards[i].classList.toggle('on', cards[i].getAttribute('data-book') === id);
    }

    window.__openBook = openBook;

    /* 滚动时记录读到哪一节 */
    (function trackPos(){
      var box = document.querySelector('#v-sutra .leaf-body');
      if (!box || !rBody) return;
      var timer = 0;
      box.addEventListener('scroll', function(){
        clearTimeout(timer);
        timer = setTimeout(function(){
          if (!curBook) return;
          var ps = rBody.querySelectorAll('p.rl');
          if (!ps.length) return;
          var mark = box.getBoundingClientRect().top + 150;
          for (var i = 0; i < ps.length; i++){
            if (ps[i].getBoundingClientRect().bottom > mark){ writePos(curBook, i); break; }
          }
        }, 420);
      }, { passive: true });
    })();

    /* 深链：?b=<经号> 直接落到那部经 */
    (function deepLink(){
      var fire = function(){
        try{
          var m = (location.search || '').match(/[?&]b=([A-Za-z0-9_-]{2,})/);
          if (m && m[1] && INFO[m[1]]){
            if (window.__leafOpen) window.__leafOpen('sutra');
            openBook(m[1]);
          } else if (m && m[1]){
            var tEl = document.getElementById('toast');
            if (tEl){
              tEl.textContent = '未收此经（' + m[1] + '），已返书目 · This text is not in the canon — back to the catalogue';
              tEl.classList.add('show');
              clearTimeout(window.__dlToast);
              window.__dlToast = setTimeout(function(){ tEl.classList.remove('show'); }, 3600);
            }
            if (window.__leafOpen) window.__leafOpen('sutra');
            setTimeout(function(){
              var cn = document.getElementById('canon');
              var lb = document.querySelector('#v-sutra .leaf-body');
              if (cn && lb) lb.scrollTop = Math.max(0, cn.offsetTop - 72);
            }, 420);
          }
        }catch(e){}
      };
      var fireView = function(){
        try{
          var mv = (location.search || '').match(/[?&]v=([a-z]+)/);
          if (mv && mv[1] && window.__leafOpen) window.__leafOpen(mv[1]);
        }catch(e){}
      };
      if (document.readyState === 'complete') setTimeout(fireView, 400);
      else window.addEventListener('load', function(){ setTimeout(fireView, 400); });
      if (document.readyState === 'complete') setTimeout(fire, 600);
      else window.addEventListener('load', function(){ setTimeout(fire, 600); });
    })();

    if (bar){
      bar.addEventListener('click', function(e){
        var t = e.target.closest ? e.target.closest('.chip') : null;
        if (!t) return;
        cur = t.getAttribute('data-cat') || 'all';
        paint();
      });
    }
    grid.addEventListener('click', function(e){
      var card = e.target.closest ? e.target.closest('.book') : null;
      if (!card) return;
      openBook(card.getAttribute('data-book'));
    });

    var closeBtn = document.getElementById('readerClose');
    if (closeBtn) closeBtn.addEventListener('click', function(){
      if (reader) reader.hidden = true;
      var main = document.querySelector('#v-sutra .sutra-main');
      var pickWrap = document.querySelector('#v-sutra .sutra-pick');
      if (main) main.hidden = false;
      if (pickWrap) pickWrap.style.display = '';
      markCard('');
    });
    var jumpBtn = document.getElementById('readerTop');
    if (jumpBtn) jumpBtn.addEventListener('click', function(){
      var body = document.querySelector('#v-sutra .leaf-body');
      if (body && reader) body.scrollTo({ top: Math.max(0, reader.offsetTop - 96), behavior: 'smooth' });
    });

    /* 阅读路径：跳到对应书目卡 */
    var routes = document.querySelectorAll('#canon .route .chip');
    for (var r = 0; r < routes.length; r++){
      routes[r].addEventListener('click', function(){
        var id = this.getAttribute('data-goto');
        if (!id || !INFO[id]) return;
        cur = 'all'; paint();
        var el = document.getElementById('cb-' + id);
        if (!el) return;
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        el.classList.add('lit');
        var self = el;
        setTimeout(function(){ self.classList.remove('lit'); }, 1500);
      });
    }
    paint();
  })();

  /* 藏经功能条：窄屏时按经名横条的实际高度让位，避免两层吸附重叠 */
  (function sutraBarFit(){
    var pick = document.querySelector('#v-sutra .sutra-pick');
    var toc = document.querySelector('#v-sutra .leaf-toc');
    var root = document.documentElement;
    if (!pick || !root || !window.ResizeObserver) return;
    var apply = function(){
      root.style.setProperty('--spick', Math.round(pick.offsetHeight) + 'px');
      if (toc) root.style.setProperty('--stoc', Math.round(toc.offsetHeight) + 'px');
    };
    try { new ResizeObserver(apply).observe(pick); } catch (e) {}
    if (toc) { try { new ResizeObserver(apply).observe(toc); } catch (e) {} }
    apply();
    window.addEventListener('resize', apply);
  })();



  /* ================= 坐香 · 三十分钟 ================= */
  (function sitModule(){
    var labels = document.querySelectorAll('#v-practice label');
    var host = null;
    for (var i = 0; i < labels.length; i++){
      if (labels[i].textContent.indexOf('静坐') >= 0){ host = labels[i]; break; }
    }
    if (!host) return;
    var row = document.createElement('div');
    row.className = 'zx-row';
    row.innerHTML = '<button type="button" class="zx-btn" id="zxBtn">坐香三十分钟 · Sit 30 min</button>' +
                    '<span class="zx-time" id="zxTime">30:00</span>';
    host.parentNode.appendChild(row);
    var btn = document.getElementById('zxBtn'), out = document.getElementById('zxTime');
    var left = 1800, timer = 0;
    function ring(){
      try{
        var a = new Audio('assets/bell.mp3');
        a.volume = 0.3;
        a.play().catch(function(){});
      }catch(e){}
    }
    function show(){
      var m = Math.floor(left / 60), sec = left % 60;
      out.textContent = (m < 10 ? '0' : '') + m + ':' + (sec < 10 ? '0' : '') + sec;
    }
    btn.addEventListener('click', function(){
      if (timer){
        clearInterval(timer); timer = 0; left = 1800; btn.textContent = '坐香三十分钟 · Sit 30 min'; show();
        try{ window.__toast && window.__toast('已止静 · sitting ended'); }catch(e){}
        return;
      }
      left = 1800; show(); ring();
      btn.textContent = '止静 · Stop';
      timer = setInterval(function(){
        left--;
        show();
        if (left <= 0){
          clearInterval(timer); timer = 0; left = 1800;
          btn.textContent = '坐香三十分钟 · Sit 30 min';
          ring();
          try{ window.__toast && window.__toast('引磬一声 · one strike of the bell'); }catch(e){}
        }
      }, 1000);
    });
    show();
  })();

  /* ================= 历数 · 本月六斋日 ================= */
  (function zhaiModule(){
    var host = document.querySelector('#v-almanac .alm-wrap') || document.querySelector('#v-almanac .leaf-body');
    if (!host || typeof Intl === 'undefined') return;
    var box = document.createElement('div');
    box.className = 'alm-zhai';
    host.appendChild(box);

    var NUM = ['初','十','二','三','四','五','六','七','八','九'];
    function zhDay(n){
      if (n === 10) return '初十';
      if (n === 20) return '二十';
      if (n === 30) return '三十';
      if (n < 10) return '初' + NUM[n];
      if (n < 20) return '十' + NUM[n % 10];
      return '廿' + NUM[n % 10];
    }
    function lunarNum(d, type){
      try{
        var f = new Intl.DateTimeFormat('en-u-ca-chinese', { day: 'numeric', month: 'numeric' });
        var parts = f.formatToParts(d);
        for (var i = 0; i < parts.length; i++){
          if (parts[i].type === type){
            var v = parseInt(parts[i].value, 10);
            return isNaN(v) ? -1 : v;
          }
        }
      }catch(e){}
      return -1;
    }
    var ZHAI = [8, 14, 15, 23, 29, 30];
    var rows = [], start = new Date();
    for (var k = 0; k < 80 && rows.length < 6; k++){
      var d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + k);
      var ln = lunarNum(d, 'day');
      if (ZHAI.indexOf(ln) >= 0) rows.push({ d: d, ln: ln });
    }
    if (!rows.length) return;

    var h = document.createElement('p');
    h.className = 'az-h';
    h.innerHTML = '六斋日 · 本月起近六次<i>THE SIX FASTING DAYS</i>';
    box.appendChild(h);

    var list = document.createElement('div');
    list.className = 'az-list';
    for (var r = 0; r < rows.length; r++){
      var it = rows[r];
      var cell = document.createElement('span');
      cell.className = 'az-item';
      var day = document.createElement('b');
      day.textContent = (it.d.getMonth() + 1) + '月' + it.d.getDate() + '日';
      var lum = document.createElement('em');
      lum.textContent = zhDay(it.ln);
      cell.appendChild(day);
      cell.appendChild(lum);
      if (r === 0) cell.classList.add('next');
      list.appendChild(cell);
    }
    box.appendChild(list);

    var note = document.createElement('p');
    note.className = 'az-note';
    note.innerHTML = '汉传丛林通行六斋日：初八、十四、十五、廿三、廿九、三十。持斋以过午不食为本，随力而行，不勉强。<em>Kept by tradition: no food after noon on these six lunar days — as far as one can.</em>';
    box.appendChild(note);
  })();
})();
