/* =========================================================================
   RUSTEK SA — shared behaviour
   i18n (EN/RU), theme switch, nav, reveal, accordion, region map,
   TR CU selector, contact form.
   ========================================================================= */
(function(){
  'use strict';

  /* ---------- i18n ----------------------------------------------------
     EN/RU come from data-en / data-ru attributes (as before).
     ZH/ES/IT/DE come from the window.RT_I18N dictionary (assets/i18n.js),
     keyed by the English source string, with automatic fallback to English. */
  var LANGS = ['en','ru','zh','es','it','de'];
  var LANG_NAME = {en:'English', ru:'Русский', zh:'中文', es:'Español', it:'Italiano', de:'Deutsch'};
  var I18N = window.RT_I18N || {};
  function validLang(l){ return LANGS.indexOf(l) > -1 ? l : null; }

  var urlLang = new URLSearchParams(window.location.search).get('lang');
  var LANG = validLang(urlLang) || validLang(localStorage.getItem('rustek-lang')) || 'en';

  // translate an English source string into the active language (English fallback)
  function tr(en){
    if(LANG === 'en' || en == null) return en;
    var dict = I18N[LANG];
    return (dict && dict[en] != null) ? dict[en] : en;
  }

  function applyLang(lang){
    if(!validLang(lang)) lang = 'en';
    LANG = lang;
    localStorage.setItem('rustek-lang', lang);
    document.documentElement.setAttribute('lang', lang);
    var dict = I18N[lang];

    document.querySelectorAll('[data-en]').forEach(function(el){
      var en = el.getAttribute('data-en'), v;
      if(lang === 'en')      v = en;
      else if(lang === 'ru') v = el.getAttribute('data-ru');
      else                   v = (dict && dict[en] != null) ? dict[en] : en;   // EN fallback
      if(v == null) return;
      // attribute-targeted (placeholder etc): data-i18n-attr="placeholder"
      var attr = el.getAttribute('data-i18n-attr');
      if(attr){ el.setAttribute(attr, v); }
      else { el.textContent = v; }
    });

    document.dispatchEvent(new CustomEvent('langchange',{detail:{lang:lang}}));
  }

  window.RT = window.RT || {};
  window.RT.lang = function(){ return LANG; };
  window.RT.langs = LANGS.slice();
  window.RT.langName = function(l){ return LANG_NAME[l] || l; };
  window.RT.tr = tr;
  window.RT.t = function(en,ru){ return LANG === 'ru' ? ru : tr(en); };

  /* ---------- language switcher: 6-language dropdown ---------- */
  function setLangURL(lang){
    try{ var url = new URL(window.location.href); url.searchParams.set('lang', lang); window.history.replaceState(null,'',url.toString()); }catch(e){}
  }
  function initLangSwitcher(){
    var globe = '<svg class="langsel-globe" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.6 2.7 2.6 15.3 0 18M12 3c-2.6 2.7-2.6 15.3 0 18"/></svg>';
    var caret = '<svg class="langsel-caret" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
    var opts = LANGS.map(function(l){ return '<option value="'+l+'">'+LANG_NAME[l]+'</option>'; }).join('');
    document.querySelectorAll('.langtoggle').forEach(function(box){
      box.innerHTML = globe + '<select class="langsel" aria-label="Language">'+opts+'</select>' + caret;
      var sel = box.querySelector('select');
      sel.value = LANG;
      sel.addEventListener('change', function(){ applyLang(sel.value); setLangURL(sel.value); });
    });
    document.addEventListener('langchange', function(e){
      document.querySelectorAll('.langsel').forEach(function(s){ if(s.value !== e.detail.lang){ s.value = e.detail.lang; } });
    });
  }

  /* ---------- keyword deep-link router (?q=<free text> / ?topic=<slug>) ----------
     Maps search-style keywords to the page + section that answers them, navigates
     there (preserving language, pre-selecting the regulation finder) and highlights it. */
  var KW_ROUTES = [
    {slug:'technical-passport', url:'regions.html#technical-passport-kazakhstan',
     kw:['technical passport','tech passport','project documentation','documentation requirements','formulyar']},
    {slug:'ex-certification', url:'services.html#regulation-finder', eq:'ex',
     kw:['ex equipment','explosion proof','ex certification','hazardous area','atex','ex zone']},
    {slug:'pressure-certification', url:'services.html#regulation-finder', eq:'pressure',
     kw:['tr cu 032','pressure equipment','pressure vessel','pressure vessels']},
    {slug:'kazakhstan-documents', url:'regions.html#kazakhstan-documents',
     kw:['what documents','documents required','documents are required','which documents','required documents']},
    {slug:'eac-certification', url:'regions.html#eac-certification-kazakhstan',
     kw:['eac certification','eac certificate','eaeu certification','conformity assessment','certification for imported equipment','imported equipment in kazakhstan','declaration of conformity','tr cu 010','tr cu 012','tr cu 020']},
    {slug:'kazakhstan-certification', url:'regions.html#kazakhstan-certification-requirements',
     kw:['kazakhstan certification requirements','certification requirements','kazakhstan certification']}
  ];
  function kwNorm(s){ return (' '+String(s)+' ').toLowerCase().replace(/[^a-z0-9Ѐ-ӿ]+/g,' '); }
  function kwResolve(query){
    var q=kwNorm(query), best=null, bestLen=0;
    for(var i=0;i<KW_ROUTES.length;i++){ var r=KW_ROUTES[i];
      for(var j=0;j<r.kw.length;j++){ var nk=kwNorm(r.kw[j]).trim();
        if(nk && q.indexOf(' '+nk+' ')>-1 && nk.length>bestLen){ best=r; bestLen=nk.length; } } }
    return best;
  }
  function kwTarget(r){
    var lang=RT.lang(), parts=r.url.split('#'), path=parts[0], hash=parts[1]||'', qp=[];
    if(lang && lang!=='en') qp.push('lang='+lang);
    if(r.eq) qp.push('eq='+r.eq);
    return path + (qp.length?('?'+qp.join('&')):'') + (hash?('#'+hash):'');
  }
  function kwFlash(el){ if(!el) return; el.classList.remove('kw-flash'); void el.offsetWidth;
    el.classList.add('kw-flash'); setTimeout(function(){ el.classList.remove('kw-flash'); }, 2600); }
  function kwScrollFlash(hash){
    if(!hash) return; var el=document.getElementById(hash); if(!el) return;
    el.classList.add('in');                                   // force-reveal target + its children
    el.querySelectorAll('.reveal').forEach(function(n){ n.classList.add('in'); });
    setTimeout(function(){
      try{ el.scrollIntoView({behavior:'smooth',block:'start'}); }catch(e){ el.scrollIntoView(); }
      kwFlash(el);
    }, 90);
  }
  function initKeywordRouter(){
    var p=new URLSearchParams(location.search), topic=p.get('topic'), q=p.get('q'), r=null;
    if(topic){ for(var i=0;i<KW_ROUTES.length;i++){ if(KW_ROUTES[i].slug===topic){ r=KW_ROUTES[i]; break; } } }
    if(!r && q){ r=kwResolve(q); }
    if(!r){ kwScrollFlash((location.hash||'').replace('#','')); return; }  // no match: still honour a plain #hash
    var target=kwTarget(r), targetPath=target.split('?')[0].split('#')[0];
    var here=(location.pathname.split('/').pop()||'index.html');
    if(targetPath && targetPath!==here){ location.replace(target); return; }
    history.replaceState(null,'',target);                     // strip ?q/?topic, keep #hash + lang/eq
    kwScrollFlash(r.url.split('#')[1]);
  }

  /* ---------- theme ---------- */
  var THEMES = ['graphite','daylight','swiss'];
  var THEME_LABEL = {graphite:'Graphite', daylight:'Daylight', swiss:'Swiss Red'};
  function applyTheme(t){
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('rustek-theme', t);
    var lbl = document.querySelector('[data-theme-label]');
    if(lbl) lbl.textContent = THEME_LABEL[t];
  }
  window.RT.setTheme = applyTheme;
  function initTheme(){
    var t = localStorage.getItem('rustek-theme') || 'graphite';
    applyTheme(t);
  }

  /* ---------- build header / footer shared chrome bindings ---------- */
  function bindChrome(){
    // language switcher (6-language dropdown, replaces the EN/RU pill)
    initLangSwitcher();
    // theme cycle
    document.querySelectorAll('[data-theme-cycle]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var cur = document.documentElement.getAttribute('data-theme') || 'graphite';
        var next = THEMES[(THEMES.indexOf(cur)+1) % THEMES.length];
        applyTheme(next);
      });
    });
    // mobile menu
    var mm = document.querySelector('.mobile-menu');
    document.querySelectorAll('[data-mm-open]').forEach(function(b){
      b.addEventListener('click', function(){ if(mm) mm.classList.add('open'); });
    });
    document.querySelectorAll('[data-mm-close]').forEach(function(b){
      b.addEventListener('click', function(){ if(mm) mm.classList.remove('open'); });
    });
    if(mm) mm.querySelectorAll('a').forEach(function(a){ a.addEventListener('click',function(){ mm.classList.remove('open'); }); });
  }

  /* ---------- reveal on scroll (robust, no IO dependency) ---------- */
  function initReveal(){
    var els = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
    if(!els.length) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduce){ els.forEach(function(e){ e.classList.add('in'); }); return; }
    var ticking = false;
    function check(){
      ticking = false;
      var vh = window.innerHeight || document.documentElement.clientHeight;
      for(var i=els.length-1;i>=0;i--){
        var el = els[i];
        var r = el.getBoundingClientRect();
        if(r.top < vh*0.92 && r.bottom > 0){ el.classList.add('in'); els.splice(i,1); }
      }
      if(!els.length){ window.removeEventListener('scroll',onScroll); window.removeEventListener('resize',onScroll); }
    }
    function onScroll(){ if(!ticking){ ticking=true; requestAnimationFrame(check); } }
    window.addEventListener('scroll',onScroll,{passive:true});
    window.addEventListener('resize',onScroll);
    check();
    // safety: never leave content hidden
    setTimeout(check,400);
    setTimeout(function(){ els.forEach(function(e){ e.classList.add('in'); }); },2500);
  }

  /* ---------- accordion ---------- */
  function initAccordion(){
    document.querySelectorAll('.acc-item').forEach(function(item){
      var q = item.querySelector('.acc-q');
      var a = item.querySelector('.acc-a');
      if(!q||!a) return;
      q.addEventListener('click', function(){
        var open = item.classList.contains('open');
        // close siblings within same accordion
        var parent = item.closest('[data-accordion]') || document;
        parent.querySelectorAll('.acc-item.open').forEach(function(o){
          if(o!==item){ o.classList.remove('open'); var oa=o.querySelector('.acc-a'); if(oa) oa.style.maxHeight=null; }
        });
        if(open){ item.classList.remove('open'); a.style.maxHeight=null; }
        else { item.classList.add('open'); a.style.maxHeight = a.scrollHeight + 'px'; }
      });
    });
    // recompute on lang change (text length differs)
    document.addEventListener('langchange', function(){
      document.querySelectorAll('.acc-item.open .acc-a').forEach(function(a){ a.style.maxHeight = a.scrollHeight + 'px'; });
    });
  }

  /* ---------- count-up stats (robust) ---------- */
  function initCountup(){
    var nums = Array.prototype.slice.call(document.querySelectorAll('[data-count]'));
    if(!nums.length) return;
    function run(el){
      var target = parseFloat(el.dataset.count), dur=1100, t0=null;
      var dec = (el.dataset.count.indexOf('.')>-1)?1:0;
      function step(ts){ if(!t0)t0=ts; var p=Math.min((ts-t0)/dur,1); var v=(target*(1-Math.pow(1-p,3)));
        el.textContent=(dec? v.toFixed(1): String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g,' ')); if(p<1) requestAnimationFrame(step); }
      requestAnimationFrame(step);
    }
    var ticking=false;
    function check(){
      ticking=false;
      var vh = window.innerHeight || document.documentElement.clientHeight;
      for(var i=nums.length-1;i>=0;i--){
        var r = nums[i].getBoundingClientRect();
        if(r.top < vh*0.9 && r.bottom > 0){ run(nums[i]); nums.splice(i,1); }
      }
      if(!nums.length){ window.removeEventListener('scroll',onScroll); }
    }
    function onScroll(){ if(!ticking){ ticking=true; requestAnimationFrame(check); } }
    window.addEventListener('scroll',onScroll,{passive:true});
    check();
  }

  /* ---------- region map ---------- */
  var REGIONS = {
    kz:{en:{name:'Kazakhstan',bloc:'EAEU member',sys:'TR CU / EAC',body:'Primary market. Full EAC certification and declaration scheme plus national technical passport (formulyar) requirements for imported industrial equipment.'},
        ru:{name:'Казахстан',bloc:'Член ЕАЭС',sys:'ТР ТС / EAC',body:'Основной рынок. Полная схема сертификации и декларирования EAC, плюс национальные требования к техническому паспорту (формуляру) для импортного промышленного оборудования.'}},
    ru:{en:{name:'Russia',bloc:'EAEU member',sys:'TR CU / EAC',body:'EAC certification and declaration of conformity recognised across the customs union. Pressure, Ex and machinery directives apply.'},
        ru:{name:'Россия',bloc:'Член ЕАЭС',sys:'ТР ТС / EAC',body:'Сертификация и декларирование соответствия EAC, признаваемые во всём таможенном союзе. Действуют регламенты по сосудам под давлением, Ex и машинам.'}},
    by:{en:{name:'Belarus',bloc:'EAEU member',sys:'TR CU / EAC',body:'Single EAC mark valid throughout the EAEU. Documentation prepared once is accepted across member states.'},
        ru:{name:'Беларусь',bloc:'Член ЕАЭС',sys:'ТР ТС / EAC',body:'Единый знак EAC действует на всей территории ЕАЭС. Подготовленная один раз документация принимается во всех странах-членах.'}},
    kg:{en:{name:'Kyrgyzstan',bloc:'EAEU member',sys:'TR CU / EAC',body:'EAEU member — EAC scheme applies. Often combined into wider Central Asia delivery packages.'},
        ru:{name:'Кыргызстан',bloc:'Член ЕАЭС',sys:'ТР ТС / EAC',body:'Член ЕАЭС — действует схема EAC. Часто объединяется в более широкие поставочные пакеты по Центральной Азии.'}},
    am:{en:{name:'Armenia',bloc:'EAEU member',sys:'TR CU / EAC',body:'EAEU member. EAC certificates and declarations recognised; local representation handled through our network.'},
        ru:{name:'Армения',bloc:'Член ЕАЭС',sys:'ТР ТС / EAC',body:'Член ЕАЭС. Сертификаты и декларации EAC признаются; локальное представительство — через нашу сеть.'}},
    uz:{en:{name:'Uzbekistan',bloc:'Central Asia',sys:'National scheme (O\u2018zDSt)',body:'Uzbekistan operates a national certification system with product-specific local requirements. In practice, local certification routes are often document-driven and may depend on consignee-side commercial and shipping documents. For foreign suppliers delivering through international EPC contractors, this can limit the practicality of local certification routes. Our support is therefore mainly focused on technical passports, translation and adaptation of technical documentation, and preparation of supporting project documents.'},
        ru:{name:'Узбекистан',bloc:'Центральная Азия',sys:'Нац. схема (O\u2018zDSt)',body:'В Узбекистане действует национальная система сертификации с локальными требованиями под конкретную продукцию. На практике местные маршруты сертификации часто завязаны на документы и могут зависеть от коммерческих и отгрузочных документов со стороны грузополучателя. Для иностранных поставщиков, работающих через международных EPC-подрядчиков, это может ограничивать практичность местных маршрутов сертификации. Поэтому наша поддержка в основном сосредоточена на технических паспортах, переводе и адаптации технической документации, а также подготовке сопроводительных проектных документов.'}},
    tm:{en:{name:'Turkmenistan',bloc:'Central Asia',sys:'National scheme',body:'National certification and import approval requirements apply under a country-specific state system. Our support is focused on technical passports, translation and adaptation of technical documentation, and preparation of supporting project documents for customer or contractor review.'},
        ru:{name:'Туркменистан',bloc:'Центральная Азия',sys:'Нац. схема',body:'Требования к сертификации и разрешениям на импорт применяются в рамках национальной государственной системы. Наша поддержка сосредоточена на технических паспортах, переводе и адаптации технической документации, а также подготовке сопроводительных проектных документов для рассмотрения заказчиком или подрядчиком.'}},
    tj:{en:{name:'Tajikistan',bloc:'Central Asia',sys:'National scheme',body:'National conformity scheme, where certification is normally arranged by the importer or end user. We support suppliers with technical documentation, Russian translation and preparation of technical passports where required.'},
        ru:{name:'Таджикистан',bloc:'Центральная Азия',sys:'Нац. схема',body:'Национальная схема соответствия, где сертификация обычно оформляется импортёром или конечным пользователем. Мы поддерживаем поставщиков технической документацией, переводом на русский язык и подготовкой технических паспортов, когда это требуется.'}}
  };

  function initRegionMap(){
    var map = document.querySelector('[data-region-map]');
    if(!map) return;
    var panel = document.querySelector('[data-region-panel]');
    function render(code){
      var r = REGIONS[code]; if(!r||!panel) return;
      var de = r.en, dr = r.ru || r.en;
      var d = { name: RT.t(de.name, dr.name), bloc: RT.t(de.bloc, dr.bloc), sys: RT.t(de.sys, dr.sys), body: RT.t(de.body, dr.body) };
      panel.innerHTML =
        '<div class="tag tag--accent" style="margin-bottom:14px">'+code.toUpperCase()+' · '+d.bloc+'</div>'+
        '<h3 class="h2" style="margin-bottom:6px">'+d.name+'</h3>'+
        '<div class="mono faint" style="font-size:13px;margin-bottom:16px">'+RT.t('SCHEME','СХЕМА')+' — '+d.sys+'</div>'+
        '<p class="muted" style="line-height:1.6">'+d.body+'</p>';
      map.querySelectorAll('[data-rc]').forEach(function(b){ b.classList.toggle('sel', b.dataset.rc===code); });
    }
    map.querySelectorAll('[data-rc]').forEach(function(b){
      b.addEventListener('click', function(){ render(b.dataset.rc); });
      b.addEventListener('mouseenter', function(){ render(b.dataset.rc); });
    });
    document.addEventListener('langchange', function(){
      var sel = map.querySelector('[data-rc].sel'); if(sel) render(sel.dataset.rc);
    });
    render('kz');
  }

  /* ---------- global clients world map ---------- */
  var CLIENTS = [
    {c:'IT',en:'Italy',ru:'Италия',n:552,lat:41.9,lon:12.5,k:'EU'},
    {c:'GB',en:'United Kingdom',ru:'Великобритания',n:516,lat:51.5,lon:-0.13,k:'EU'},
    {c:'DE',en:'Germany',ru:'Германия',n:177,lat:52.5,lon:13.4,k:'EU'},
    {c:'ES',en:'Spain',ru:'Испания',n:149,lat:40.4,lon:-3.7,k:'EU'},
    {c:'US',en:'United States',ru:'США',n:134,lat:38.9,lon:-77.0,k:'NA'},
    {c:'FR',en:'France',ru:'Франция',n:128,lat:48.9,lon:2.35,k:'EU'},
    {c:'NL',en:'Netherlands',ru:'Нидерланды',n:101,lat:52.4,lon:4.9,k:'EU'},
    {c:'SE',en:'Sweden',ru:'Швеция',n:47,lat:59.3,lon:18.1,k:'EU'},
    {c:'IN',en:'India',ru:'Индия',n:36,lat:28.6,lon:77.2,k:'AS'},
    {c:'CH',en:'Switzerland',ru:'Швейцария',n:35,lat:46.95,lon:7.45,k:'EU'},
    {c:'RU',en:'Russia',ru:'Россия',n:34,lat:55.75,lon:37.6,k:'EU'},
    {c:'AE',en:'UAE',ru:'ОАЭ',n:26,lat:24.45,lon:54.4,k:'AS'},
    {c:'BE',en:'Belgium',ru:'Бельгия',n:25,lat:50.85,lon:4.35,k:'EU'},
    {c:'CA',en:'Canada',ru:'Канада',n:24,lat:56.0,lon:-96.0,k:'NA'},
    {c:'NO',en:'Norway',ru:'Норвегия',n:24,lat:59.9,lon:10.75,k:'EU'},
    {c:'AU',en:'Australia',ru:'Австралия',n:21,lat:-33.9,lon:151.2,k:'OC'},
    {c:'CN',en:'China',ru:'Китай',n:21,lat:39.9,lon:116.4,k:'AS'},
    {c:'KR',en:'South Korea',ru:'Южная Корея',n:20,lat:37.55,lon:126.99,k:'AS'},
    {c:'AT',en:'Austria',ru:'Австрия',n:18,lat:48.2,lon:16.37,k:'EU'},
    {c:'DK',en:'Denmark',ru:'Дания',n:14,lat:55.7,lon:12.6,k:'EU'},
    {c:'JP',en:'Japan',ru:'Япония',n:14,lat:35.7,lon:139.7,k:'AS'},
    {c:'TR',en:'Turkey',ru:'Турция',n:11,lat:39.93,lon:32.85,k:'AS'},
    {c:'SG',en:'Singapore',ru:'Сингапур',n:8,lat:1.35,lon:103.8,k:'AS'},
    {c:'CZ',en:'Czechia',ru:'Чехия',n:5,lat:50.08,lon:14.44,k:'EU'},
    {c:'FI',en:'Finland',ru:'Финляндия',n:5,lat:60.17,lon:24.94,k:'EU'},
    {c:'HU',en:'Hungary',ru:'Венгрия',n:5,lat:47.5,lon:19.04,k:'EU'},
    {c:'KZ',en:'Kazakhstan',ru:'Казахстан',n:5,lat:51.13,lon:71.43,k:'AS'},
    {c:'RO',en:'Romania',ru:'Румыния',n:5,lat:44.43,lon:26.1,k:'EU'},
    {c:'PL',en:'Poland',ru:'Польша',n:4,lat:52.23,lon:21.01,k:'EU'},
    {c:'TH',en:'Thailand',ru:'Таиланд',n:4,lat:13.75,lon:100.5,k:'AS'},
    {c:'IR',en:'Iran',ru:'Иран',n:3,lat:35.7,lon:51.42,k:'AS'},
    {c:'MY',en:'Malaysia',ru:'Малайзия',n:3,lat:3.14,lon:101.69,k:'AS'},
    {c:'PT',en:'Portugal',ru:'Португалия',n:3,lat:38.72,lon:-9.14,k:'EU'},
    {c:'QA',en:'Qatar',ru:'Катар',n:3,lat:25.29,lon:51.53,k:'AS'},
    {c:'HR',en:'Croatia',ru:'Хорватия',n:2,lat:45.81,lon:15.98,k:'EU'},
    {c:'GR',en:'Greece',ru:'Греция',n:2,lat:37.98,lon:23.73,k:'EU'},
    {c:'ID',en:'Indonesia',ru:'Индонезия',n:2,lat:-6.2,lon:106.85,k:'AS'},
    {c:'IE',en:'Ireland',ru:'Ирландия',n:2,lat:53.35,lon:-6.26,k:'EU'},
    {c:'LU',en:'Luxembourg',ru:'Люксембург',n:2,lat:49.61,lon:6.13,k:'EU'},
    {c:'SK',en:'Slovakia',ru:'Словакия',n:2,lat:48.15,lon:17.11,k:'EU'},
    {c:'ZA',en:'South Africa',ru:'ЮАР',n:2,lat:-25.75,lon:28.19,k:'AF'},
    {c:'BH',en:'Bahrain',ru:'Бахрейн',n:1,lat:26.23,lon:50.59,k:'AS'},
    {c:'BY',en:'Belarus',ru:'Беларусь',n:1,lat:53.9,lon:27.57,k:'EU'},
    {c:'BA',en:'Bosnia and Herzegovina',ru:'Босния и Герцеговина',n:1,lat:43.85,lon:18.41,k:'EU'},
    {c:'BR',en:'Brazil',ru:'Бразилия',n:1,lat:-15.8,lon:-47.9,k:'SA'},
    {c:'GT',en:'Guatemala',ru:'Гватемала',n:1,lat:14.6,lon:-90.51,k:'NA'},
    {c:'KW',en:'Kuwait',ru:'Кувейт',n:1,lat:29.38,lon:47.98,k:'AS'},
    {c:'LV',en:'Latvia',ru:'Латвия',n:1,lat:56.95,lon:24.11,k:'EU'},
    {c:'NZ',en:'New Zealand',ru:'Новая Зеландия',n:1,lat:-41.29,lon:174.78,k:'OC'},
    {c:'OM',en:'Oman',ru:'Оман',n:1,lat:23.59,lon:58.41,k:'AS'},
    {c:'PK',en:'Pakistan',ru:'Пакистан',n:1,lat:33.69,lon:73.06,k:'AS'},
    {c:'SC',en:'Seychelles',ru:'Сейшелы',n:1,lat:-4.62,lon:55.45,k:'AF'},
    {c:'SI',en:'Slovenia',ru:'Словения',n:1,lat:46.05,lon:14.51,k:'EU'},
    {c:'TW',en:'Taiwan',ru:'Тайвань',n:1,lat:25.03,lon:121.57,k:'AS'},
    {c:'UA',en:'Ukraine',ru:'Украина',n:1,lat:50.45,lon:30.52,k:'EU'},
    {c:'ZM',en:'Zambia',ru:'Замбия',n:1,lat:-15.42,lon:28.28,k:'AF'}
  ];

  function initClientMap(){
    var stage = document.querySelector('[data-cm-stage]');
    var card  = document.querySelector('[data-client-map]');
    if(!stage || !card || !window.RT_WORLD) return;

    var WD = window.RT_WORLD, NS = 'http://www.w3.org/2000/svg';
    var HUB_LON = 8.95, HUB_LAT = 46.0;            // Lugano HQ
    function proj(lon,lat){ return [ (lon+180)/360*WD.w, (90-lat)/180*WD.h ]; }
    function el(name,attrs){ var e=document.createElementNS(NS,name); for(var k in attrs){ e.setAttribute(k,attrs[k]); } return e; }
    function fmt(n){ return String(n).replace(/\B(?=(\d{3})+(?!\d))/g,' '); }
    function nameOf(c){ return RT.t(c.en, c.ru); }

    var hub = proj(HUB_LON,HUB_LAT);
    var nMax = CLIENTS.reduce(function(m,c){ return Math.max(m,c.n); },1);
    var rMin = 2.6, rMax = 15;
    function radius(n){ return rMin + (rMax-rMin)*Math.sqrt(n/nMax); }

    var byCode={}, dotByCode={}, arcByCode={}, hitByCode={};
    CLIENTS.forEach(function(c){ byCode[c.c]=c; });

    var svg = el('svg',{'class':'cm-svg',viewBox:WD.viewBox,preserveAspectRatio:'xMidYMid meet',role:'img'});
    svg.appendChild(el('path',{'class':'cm-land',d:WD.d}));

    var gArc=el('g',{'class':'cm-arcs'}), gDot=el('g',{'class':'cm-dots'}), gHit=el('g',{'class':'cm-hits'});

    // small dots + their arcs first (so large markets render on top and stay visible)
    CLIENTS.slice().sort(function(a,b){ return a.n-b.n; }).forEach(function(c){
      var p=proj(c.lon,c.lat), x1=p[0], y1=p[1], x2=hub[0], y2=hub[1];
      var mx=(x1+x2)/2, my=(y1+y2)/2, dx=x2-x1, dy=y2-y1, dist=Math.sqrt(dx*dx+dy*dy)||1;
      var ux=-dy/dist, uy=dx/dist, k=0.22*dist;          // perpendicular offset
      var ax=mx+ux*k, ay=my+uy*k, bx=mx-ux*k, by=my-uy*k; // pick the control point that bows upward
      var cx=(ay<by)?ax:bx, cy=(ay<by)?ay:by;
      var arc=el('path',{'class':'cm-arc','data-code':c.c,
        d:'M'+x1.toFixed(1)+' '+y1.toFixed(1)+'Q'+cx.toFixed(1)+' '+cy.toFixed(1)+' '+x2.toFixed(1)+' '+y2.toFixed(1)});
      gArc.appendChild(arc); arcByCode[c.c]=arc;
      var dot=el('circle',{'class':'cm-dot','data-code':c.c,cx:x1.toFixed(1),cy:y1.toFixed(1),r:radius(c.n).toFixed(2)});
      gDot.appendChild(dot); dotByCode[c.c]=dot;
    });

    // transparent hit targets (min 8u) — large markets first so tiny ones sit on top and stay reachable
    CLIENTS.slice().sort(function(a,b){ return b.n-a.n; }).forEach(function(c){
      var p=proj(c.lon,c.lat);
      var hit=el('circle',{'class':'cm-hit','data-code':c.c,tabindex:'0',role:'button',
        cx:p[0].toFixed(1),cy:p[1].toFixed(1),r:Math.max(radius(c.n),8).toFixed(2)});
      hit.setAttribute('aria-label', nameOf(c)+': '+fmt(c.n)+' '+RT.t('clients','клиентов'));
      gHit.appendChild(hit); hitByCode[c.c]=hit;
    });

    var gHub=el('g',{'class':'cm-hub'});
    gHub.appendChild(el('circle',{'class':'cm-hub-pulse',cx:hub[0],cy:hub[1],r:6}));
    gHub.appendChild(el('circle',{'class':'cm-hub-ring',cx:hub[0],cy:hub[1],r:6}));
    gHub.appendChild(el('circle',{'class':'cm-hub-dot',cx:hub[0],cy:hub[1],r:2.6}));

    svg.appendChild(gArc); svg.appendChild(gDot); svg.appendChild(gHub); svg.appendChild(gHit);
    function setSvgLabel(){ svg.setAttribute('aria-label', RT.t('World map of Rustek clients across 56 countries and 6 continents','Карта клиентов Rustek в 56 странах на 6 континентах')); }
    setSvgLabel();
    var ns=stage.querySelector('noscript'); if(ns) ns.remove();
    stage.appendChild(svg);

    // tooltip
    var tip=document.createElement('div'); tip.className='cm-tip';
    tip.innerHTML='<span class="cm-tip-n"></span><span class="cm-tip-v"></span>';
    var tipN=tip.firstChild, tipV=tip.lastChild;
    stage.appendChild(tip);
    var curCode=null;
    function placeTip(code){
      var h=hitByCode[code]; if(!h) return;
      var hb=h.getBoundingClientRect(), sb=stage.getBoundingClientRect();
      tip.style.left=(hb.left-sb.left+hb.width/2)+'px';
      tip.style.top =(hb.top -sb.top)+'px';
    }
    function showTip(code){
      var c=byCode[code]; if(!c) return;
      tipN.textContent=nameOf(c); tipV.textContent=fmt(c.n)+' '+RT.t('clients','клиентов');
      placeTip(code); tip.classList.add('on');
    }
    function hideTip(){ tip.classList.remove('on'); }

    var topWrap=card.querySelector('[data-cm-top]');
    function clearHot(){
      var h=svg.querySelectorAll('.hot'); for(var i=0;i<h.length;i++){ h[i].classList.remove('hot'); }
      if(topWrap){ var ch=topWrap.querySelectorAll('.cm-chip.hot'); for(var j=0;j<ch.length;j++){ ch[j].classList.remove('hot'); } }
    }
    function activate(code){
      clearHot();
      if(dotByCode[code]) dotByCode[code].classList.add('hot');
      if(arcByCode[code]) arcByCode[code].classList.add('hot');
      var chip=topWrap && topWrap.querySelector('.cm-chip[data-code="'+code+'"]'); if(chip) chip.classList.add('hot');
      card.classList.add('cm-active'); curCode=code; showTip(code);
    }
    function deactivate(){ clearHot(); card.classList.remove('cm-active'); hideTip(); curCode=null; }

    // map interaction (delegated)
    gHit.addEventListener('mouseover', function(e){ var t=e.target.closest('.cm-hit'); if(t) activate(t.getAttribute('data-code')); });
    gHit.addEventListener('mouseout',  function(e){ var t=e.target.closest('.cm-hit'); if(t) deactivate(); });
    gHit.addEventListener('focusin',   function(e){ var t=e.target.closest('.cm-hit'); if(t) activate(t.getAttribute('data-code')); });
    gHit.addEventListener('focusout',  function(){ deactivate(); });
    gHit.addEventListener('click',     function(e){ var t=e.target.closest('.cm-hit'); if(t) activate(t.getAttribute('data-code')); });

    // top-market chips
    function renderChips(){
      if(!topWrap) return;
      var top=CLIENTS.slice().sort(function(a,b){ return b.n-a.n; }).slice(0,8);
      var html='<span class="cm-top-cap mono">'+RT.t('TOP MARKETS','КЛЮЧЕВЫЕ РЫНКИ')+'</span>';
      top.forEach(function(c){ html+='<button type="button" class="cm-chip" data-code="'+c.c+'"><span></span><b>'+fmt(c.n)+'</b></button>'; });
      topWrap.innerHTML=html;
      // set names via textContent (avoid HTML-injection / entity issues)
      var btns=topWrap.querySelectorAll('.cm-chip');
      for(var i=0;i<btns.length;i++){ btns[i].firstChild.textContent=nameOf(byCode[btns[i].getAttribute('data-code')]); }
    }
    if(topWrap){
      renderChips();
      topWrap.addEventListener('mouseover', function(e){ var b=e.target.closest('.cm-chip'); if(b) activate(b.getAttribute('data-code')); });
      topWrap.addEventListener('mouseout',  function(e){ var b=e.target.closest('.cm-chip'); if(b) deactivate(); });
      topWrap.addEventListener('focusin',   function(e){ var b=e.target.closest('.cm-chip'); if(b) activate(b.getAttribute('data-code')); });
      topWrap.addEventListener('focusout',  function(){ deactivate(); });
    }

    // reposition / dismiss while a tip is open
    window.addEventListener('resize', function(){ if(curCode) placeTip(curCode); });
    window.addEventListener('scroll', function(){ if(curCode) deactivate(); }, {passive:true});

    document.addEventListener('langchange', function(){
      setSvgLabel();
      var hs=gHit.querySelectorAll('.cm-hit');
      for(var i=0;i<hs.length;i++){ var c=byCode[hs[i].getAttribute('data-code')]; if(c) hs[i].setAttribute('aria-label', nameOf(c)+': '+fmt(c.n)+' '+RT.t('clients','клиентов')); }
      renderChips();
      if(curCode){ var cc=byCode[curCode]; if(cc){ tipN.textContent=nameOf(cc); tipV.textContent=fmt(cc.n)+' '+RT.t('clients','клиентов'); } }
    });
  }

  /* ---------- TR CU technical-regulation selector ---------- */
  var EQUIP = {
    pressure:{en:'Pressure equipment — vessels, pipelines, fittings and pressure equipment components',ru:'Оборудование под давлением - сосуды, трубопроводы, арматура, элементы оборудования под давлением',
      regs:['TR CU 032/2013','TR CU 010/2011'],
      form:{en:'TR CU 032 certificate or declaration — depending on equipment category',ru:'Сертификат или декларация ТР ТС 032 - в зависимости от категории оборудования'},
      note:{en:'Pressure equipment almost always needs a Certificate of Conformity plus a technical passport.',ru:'Оборудование под давлением почти всегда требует сертификата соответствия и технического паспорта.'}},
    ex:{en:'Ex / explosion-proof equipment',ru:'Ex / взрывозащищённое оборудование',
      regs:['TR CU 012/2011','TR CU 020/2011'],form:'Certificate',
      note:{en:'Equipment for explosive atmospheres requires Ex certification (012) and usually EMC and LV regulations too.',ru:'Оборудование для взрывоопасных сред требует Ex-сертификации (012) и обычно также регламентов по ЭМС и НВ.'}},
    machinery:{en:'Machinery & packaged units',ru:'Машины и блочно-комплектные установки',
      regs:['TR CU 010/2011'],form:'Certificate / Declaration',
      note:{en:'Machinery directive applies; packaged units are assessed against each component regulation.',ru:'Применяется к насосам, компрессорам, трубопроводной арматуре, технологическому оборудованию'}},
    electrical:{en:'Low-voltage electrical equipment',ru:'Низковольтное электрооборудование',
      regs:['TR CU 004/2011','TR CU 020/2011'],form:'Declaration',
      note:{en:'Low-voltage equipment typically follows a Declaration of Conformity route with EMC.',ru:'Низковольтное оборудование обычно идёт по маршруту декларирования соответствия с ЭМС.'}},
    instrument:{en:'Instrumentation & control',ru:'КИПиА и системы управления',
      regs:['TR CU 020/2011','TR CU 004/2011','TR CU 012/2011'],form:'Declaration / Certificate',
      note:{en:'Route depends on the operating environment — Ex zones shift instruments to certification.',ru:'Маршрут зависит от среды эксплуатации — зоны Ex переводят приборы на сертификацию.'}}
  };
  var REG_NAMES = {
    'TR CU 004/2011':{en:'Low Voltage Equipment',ru:'Низковольтное оборудование'},
    'TR CU 010/2011':{en:'Safety of Machinery & Equipment',ru:'Безопасность машин и оборудования'},
    'TR CU 012/2011':{en:'Equipment for Explosive Atmospheres',ru:'О безопасности оборудования для работы во взрывоопасных средах'},
    'TR CU 020/2011':{en:'Electromagnetic Compatibility',ru:'Электромагнитная совместимость'},
    'TR CU 032/2013':{en:'Pressure Equipment Safety',ru:'Безопасность оборудования под давлением'}
  };

  function initSelector(){
    var sel = document.querySelector('[data-selector]'); if(!sel) return;
    var out = sel.querySelector('[data-selector-out]');
    function render(key){
      var e = EQUIP[key]; if(!e) return;
      var regs = e.regs.map(function(code){
        var n = REG_NAMES[code] ? RT.t(REG_NAMES[code].en, REG_NAMES[code].ru) : '';
        return '<div class="card card--pad hover" style="display:flex;justify-content:space-between;align-items:center;gap:16px;padding:16px 18px">'+
               '<div><div class="mono" style="color:var(--accent);font-size:13px;margin-bottom:3px">'+code+'</div>'+
               '<div style="font-size:14.5px">'+n+'</div></div>'+
               '<div class="ar" style="color:var(--text-3)">\u2192</div></div>';
      }).join('');
      out.innerHTML =
        '<div class="row" style="justify-content:space-between;margin-bottom:18px">'+
          '<div class="eyebrow eyebrow--plain">'+RT.t('LIKELY ROUTE','ВЕРОЯТНЫЙ МАРШРУТ')+'</div>'+
          '<div class="tag tag--accent" style="max-width:min(360px,55%);white-space:normal;line-height:1.35;text-align:right;justify-content:flex-end;text-transform:none">'+(typeof e.form==='string'?RT.t(e.form,e.form):RT.t(e.form.en,e.form.ru))+'</div>'+
        '</div>'+
        '<div class="grid" style="gap:10px">'+regs+'</div>'+
        '<p class="faint" style="font-size:13.5px;margin-top:18px;line-height:1.55">'+RT.t(e.note.en,e.note.ru)+'</p>'+
        '<p class="faint mono" style="font-size:11px;margin-top:10px">'+RT.t('INDICATIVE ONLY — CONFIRMED AT TENDER REVIEW','ОРИЕНТИРОВОЧНО — УТОЧНЯЕТСЯ ПРИ АНАЛИЗЕ ТЕНДЕРА')+'</p>';
      sel.querySelectorAll('[data-eq]').forEach(function(b){ b.classList.toggle('sel', b.dataset.eq===key); });
    }
    sel.querySelectorAll('[data-eq]').forEach(function(b){
      b.addEventListener('click', function(){ render(b.dataset.eq); });
    });
    document.addEventListener('langchange', function(){
      var s = sel.querySelector('[data-eq].sel'); if(s) render(s.dataset.eq);
    });
    var startEq = new URLSearchParams(location.search).get('eq');
    render(EQUIP[startEq] ? startEq : 'pressure');
  }

  /* ---------- contact form ---------- */
  function initForm(){
    document.querySelectorAll('[data-contact-form]').forEach(function(f){
      f.addEventListener('submit', function(ev){
        ev.preventDefault();
        if(f.hasAttribute('data-guide-form')){
          var fullName = (f.querySelector('[name="fullName"]') || {}).value || '';
          var company = (f.querySelector('[name="company"]') || {}).value || '';
          var email = (f.querySelector('[name="email"]') || {}).value || '';
          var to = f.getAttribute('data-mailto') || 'info@rustek.net';
          var subject = 'Certification guide request';
          var body = [
            'Certification guide request',
            '',
            'Full name: ' + fullName,
            'Company: ' + company,
            'Work email: ' + email,
            '',
            'Source: rustek.net website'
          ].join('\n');
          window.location.href = 'mailto:' + to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
        }
        var ok = f.querySelector('[data-form-ok]');
        f.querySelectorAll('input,select,textarea,button').forEach(function(el){ el.disabled=true; });
        if(ok){ ok.style.display='flex'; requestAnimationFrame(function(){ ok.style.opacity=1; }); }
      });
    });
  }
  /* ---------- init ---------- */
  document.addEventListener('DOMContentLoaded', function(){
    initTheme();
    bindChrome();
    applyLang(LANG);
    initReveal();
    initAccordion();
    initCountup();
    initRegionMap();
    initClientMap();
    initSelector();
    initForm();
    initKeywordRouter();
  });
})();
