const stats = (chips: string): string => `\`<div class="stats" style="margin:0">${chips}</div>\``;

const glyphs = (small: boolean): string =>
  `\`<div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center${small ? ';color:var(--ic)' : ''}">\${Object.keys(P).map((n)=>ic(n${small ? ",'s'" : ''})).join('')}</div>\``;

const still = (expr: string): string =>
  `(${expr}).replace(/<canvas[^>]*data-sz="(\\d+)"[^>]*><\\/canvas>/g,(m,n)=>'<span style="width:'+n+'px;height:'+n+'px;border-radius:50%;background:var(--accent-soft);flex:none;display:block"></span>')`;

const field = (tone: string): string =>
  `'<div style="position:relative;height:300px;overflow:hidden;background:var(--bg)"><div class="aura aura-${tone}${tone === 'alert' ? ' alert' : ''}" style="height:300px" aria-hidden="true"><i></i><i></i><i></i></div></div>'`;

const band = (tone: string): string =>
  `'<div style="position:relative;height:96px;border-radius:24px;overflow:hidden;background:var(--surface)">'+aura('${tone}','band')+'</div>'`;

const phone = (inner: string, cls = ''): string =>
  `'<div class="phone ${cls}" style="height:760px;border:0;border-radius:0;box-shadow:none;background:var(--bg)">'+${inner}+'</div>'`;

type Hero = { cls: string; size: number; sentence: string; meta: string };

const herorow = ({ cls, size, sentence, meta }: Hero): string =>
  `'<div class="herorow ${cls}">'+masc('idle',${size})+'<div><div class="t-hero">${sentence}</div><div class="t-meta">${meta}</div></div></div>'`;

const homeStats =
  "'<div class=\"stats\"><span class=\"chip\">'+ic('cam','s')+'<b>5</b> cámaras</span><span class=\"chip\">'+ic('shieldok','s')+'<b>0</b> alertas hoy</span><span class=\"chip\">'+ic('hist','s')+'<b>4</b> detecciones</span></div>'";

const homeTop = (updating: boolean): string =>
  `'<div class="topbar" style="min-height:44px"><div class="grow"><div class="t-meta" style="font-weight:600">Buenas tardes, Ana</div></div>${updating ? '<span class="updating"><i></i>Actualizando</span>' : ''}<button class="ibtn glass" aria-label="Buscar">'+ic('search','s')+'</button></div>'`;

const home = (updating: boolean): string =>
  still(
    phone(
      `'<div class="scr"><div class="aura aura-calm" style="height:300px" aria-hidden="true"><i></i><i></i><i></i></div><div class="body">'+${homeTop(updating)}+${herorow({ cls: '', size: 66, sentence: 'Todo tranquilo.', meta: 'En casa · Luis y tú en casa' })}+${homeStats}+'<div class="sec" style="margin-top:18px">'+ahoraH()+ahora()+'</div></div></div>'`
    )
  );

const news =
  "sec('Novedades',grp([row({lead:lic('user','',1),t:'Luis llegó',s:'Puerta principal · 14:45',chev:false}),row({lead:lic('eyeoff','',1),t:'Imagen tapada 2 min',s:'Patio trasero · ayer 15:02',chev:false})]),'Ver todo')";

const sidestat =
  '\'<div class="sidestat"><div class="ss-h"><b>Argus de Casa</b></div><div class="ss-r">\'+ic(\'home\',\'s\')+\'<span>Modo <b>En casa</b></span></div><div class="ss-r">\'+ic(\'cam\',\'s\')+\'<span><b>5 de 6</b> cámaras activas</span></div><div><div class="ss-r" style="justify-content:space-between"><span>Almacenamiento</span><b>62%</b></div><div class="meter"><i style="width:62%"></i></div></div><div class="ss-ask">\'+masc(\'idle\',20)+\'Pregúntale a Argus…</div></div>\'';

const navFor = (cls: string): string =>
  still(
    `(innerWidth>=1024?'<div class="desk" style="height:760px">'+SIDE('inicio')+'</div>':${phone("tabs('home')", cls)})`
  );

export const PROTOTYPE_CASES: Record<string, Record<string, string>> = {
  text: {
    hero: '\'<div class="t-hero">hero 36/40 · Todo tranquilo.</div>\'',
    title: '\'<div class="t-title">title 22/28 · Seguridad</div>\'',
    headline: '\'<div class="t-headline">headline 17/24 · Lo que pasó</div>\'',
    body: '\'<div class="t-body">body 16/22 · Pagar la luz vence hoy a las 17:00.</div>\'',
    meta: '\'<div class="t-meta">meta 14/20 · Patio trasero · 21:53</div>\'',
    caption: '\'<div class="t-caption">caption 12/16 · En vivo</div>\'',
    'hero-compact':
      '\'<div class="herorow" style="padding:0"><div class="t-hero">Todo tranquilo.</div></div>\'',
    'hero-secondary':
      '\'<div class="herorow sm" style="padding:0"><div class="t-hero">Alguien en el patio.</div></div>\'',
    'body-2':
      '\'<div class="t-body t-2">Cuido tu casa, te ayudo con tu día y te escucho cuando me hablas.</div>\'',
  },
  icon: {
    'set-24': glyphs(false),
    'set-20': glyphs(true),
    plus: "ic('plus')",
    more: "ic('more')",
    'door-accent': "`<span style=\"color:var(--ic);display:flex\">${ic('door','s')}</span>`",
  },
  button: {
    'primary-block': '\'<button class="btn primary block">Comenzar</button>\'',
    'ghost-block': '\'<button class="btn ghost block">Tengo una invitación</button>\'',
    'primary-icon-block':
      "`<button class=\"btn primary block\">${ic('plus','s')}Nuevo recordatorio</button>`",
    'primary-compact': '\'<button class="btn compact primary">Activar</button>\'',
    'secondary-compact': '\'<button class="btn compact">Reintentar</button>\'',
    'secondary-icon-compact':
      "`<button class=\"btn compact\">${ic('bell','s')}Comprar pan · 18:00</button>`",
    'ghost-compact': '\'<button class="btn ghost compact">Es una falsa alarma</button>\'',
    'danger-compact': '\'<button class="btn compact danger">SOS</button>\'',
    'glass-compact': "`<button class=\"btn compact glass\">Casa ${ic('chevd','s')}</button>`",
    'icon-glass': "`<button class=\"ibtn glass\">${ic('search','s')}</button>`",
    'icon-filled': '`<button class="ibtn filled">${ic(\'plus\')}</button>`',
    'icon-plain': '`<button class="ibtn">${ic(\'more\')}</button>`',
    'icon-back': '`<button class="ibtn glass">${ic(\'back\')}</button>`',
  },
  chip: {
    'tag-ok-dot': "chip('En vivo','ok',true)",
    'tag-attn': "chip('Revisar','attn')",
    'tag-default': "chip('Llamar')",
    'stat-icon': stats("<span class=\"chip\">${ic('cam','s')}<b>5</b> cámaras</span>"),
    'stat-plain': stats('<span class="chip"><b>0</b> en curso</span>'),
    'stat-attn': stats('<span class="chip" style="color:var(--attn)"><b>1</b> por revisar</span>'),
    suggestion:
      '\'<div class="sugg" style="padding:0;overflow:visible"><span class="chip">Muéstrame la cocina</span></div>\'',
  },
  avatar: {
    well: "lic('door')",
    'round-attn': "lic('alert','attn',1)",
    'round-default': "lic('user','',1)",
    'round-ok': "lic('shieldok','ok',1)",
    'well-alert': "`<span class=\"lic alert\">${ic('logout','s')}</span>`",
    'small-attn':
      '`<div class="ncard" style="padding:0;background:none;box-shadow:none"><div class="nh">${lic(\'wifioff\',\'attn\',1)}</div></div>`',
    initial: '\'<span class="lic r accent">A</span>\'',
    'initial-large':
      '\'<span class="lic accent r" style="width:56px;height:56px;font-size:22px;font-weight:700">A</span>\'',
  },
  check: {
    open: '\'<span class="check"></span>\'',
    overdue: '\'<span class="check over"></span>\'',
    done: "`<span class=\"check done\">${ic('check','s')}</span>`",
  },
  switch: {
    off: '\'<span class="switch"></span>\'',
    on: '\'<span class="switch on"></span>\'',
  },
  layout: {
    cluster: stats(
      "<span class=\"chip\">${ic('cam','s')}<b>5</b> cámaras</span><span class=\"chip\">${ic('shieldok','s')}<b>0</b> alertas hoy</span><span class=\"chip\">${ic('hist','s')}<b>4</b> detecciones</span>"
    ),
    'inline-fill':
      '\'<div style="display:flex;gap:8px"><button class="btn primary" style="flex:1">Ver cámara</button><button class="btn" style="flex:1">Es conocido</button></div>\'',
    stack:
      '\'<div><button class="btn primary block">Comenzar</button><button class="btn ghost block" style="margin-top:6px">Tengo una invitación</button></div>\'',
  },
  section: {
    grouped:
      "sec('Casa',grp([row({lead:lic('users'),t:'Personas',s:'4 personas · 1 invitación'}),row({lead:lic('face'),t:'Visitantes reconocidos',s:'Apagado'}),row({lead:lic('grid'),t:'Módulos',s:'Seguridad, Productividad'})]))",
    action:
      "sec('Lo que pasó',grp([row({lead:lic('alert','attn',1),t:'Persona desconocida',s:'Patio trasero · 21:53 · avisé a Luis',tr:chip('Revisar','attn')}),row({lead:lic('user','',1),t:'Luis llegó',s:'Puerta principal · 14:45'}),row({lead:lic('eyeoff','',1),t:'Imagen tapada 2 min',s:'Patio trasero · ayer 15:02'})]),'Ver todo')",
    meta: "sec('Lo último',grp([row({lead:lic('user','',1),t:'Luis llegó',s:'Puerta principal · 14:45',chev:false}),row({lead:lic('shieldok','ok',1),t:'Sin alertas hoy',s:'5 cámaras en línea',chev:false})]),null,'hace 10 min')",
  },
  row: {
    navigation: "row({lead:lic('users'),t:'Personas',s:'4 personas · 1 invitación'})",
    value: "row({lead:lic('sun'),t:'Apariencia',tr:'Sistema'})",
    chip: "row({lead:lic('alert','attn',1),t:'Persona desconocida',s:'Patio trasero · 21:53 · avisé a Luis',tr:chip('Revisar','attn')})",
    check:
      '\'<button class="row"><span class="check over"></span><span class="main"><span class="ttl">Llamar al plomero</span><span class="sub" style="color:var(--alert)">Atrasado · 11:00</span></span></button>\'',
    done: '`<button class="row"><span class="check done">${ic(\'check\',\'s\')}</span><span class="main"><span class="ttl" style="text-decoration:line-through;color:var(--text-3)">Yoga</span><span class="sub">07:00 – 08:00</span></span></button>`',
    static:
      "row({lead:lic('door'),t:'3 puertas y el patio',s:'Puerta, Garaje, Patio trasero',chev:false})",
    person:
      "row({lead:'<span class=\"lic r accent\">A</span>',t:'Ana Rojas · propietaria',s:'Ella puede reactivarla',tr:'<span class=\"chip\">Llamar</span>',chev:false})",
    switch:
      "row({lead:lic('face'),t:'Visitantes reconocidos',s:'Apagado',tr:'<span class=\"switch\"></span>',chev:false})",
    danger:
      '`<button class="row danger"><span class="lic alert">${ic(\'logout\',\'s\')}</span><span class="main"><span class="ttl">Cerrar sesión</span></span></button>`',
  },
  aura: {
    'field-calm': field('calm'),
    'field-duty': field('duty'),
    'field-attn': field('attn'),
    'field-alert': field('alert'),
    'field-off': field('off'),
    'field-listen': field('listen'),
    band: band('calm'),
    'band-alert': band('alert'),
    edge: `'<div style="position:relative;height:300px;border-radius:28px;overflow:hidden;background:var(--bg)"><div class="aura aura-listen" style="height:300px" aria-hidden="true"><i></i><i></i><i></i></div><div class="edge"></div></div>'`,
  },
  status: {
    'hero-calm': still(
      `'<div>'+${herorow({ cls: '', size: 66, sentence: 'Todo tranquilo.', meta: 'En casa · Luis y tú en casa' })}+${homeStats}+'</div>'`
    ),
    'hero-security': still(
      `'<div>'+${herorow({ cls: '', size: 66, sentence: 'En casa', meta: 'Te aviso solo de desconocidos' })}+'<div class="stats"><span class="chip"><b>0</b> en curso</span><span class="chip" style="color:var(--attn)"><b>1</b> por revisar</span><span class="chip">'+ic('door','s')+'<b>1</b> visita hoy</span></div></div>'`
    ),
    'hero-night': still(
      herorow({ cls: '', size: 66, sentence: 'Buenas noches.', meta: 'Modo Noche · vigilo por ti' })
    ),
    'hero-band': still(
      `'<div style="padding:18px 28px 6px;max-width:2256px;margin:0 auto;width:100%;box-sizing:border-box"><div class="dband">'+aura('calm','band')+masc('idle',64)+'<div style="flex:1;min-width:0"><div class="t-hero" style="font-size:38px;white-space:nowrap">Todo tranquilo.</div><div class="t-meta">Buenas tardes, Ana · Modo En casa · Luis y tú en casa</div></div><div class="stats" style="margin:0;flex-wrap:nowrap"><span class="chip">'+ic('cam','s')+'<b>5</b> cámaras</span><span class="chip">'+ic('shieldok','s')+'<b>0</b> alertas hoy</span></div><button class="btn compact primary">'+ic('plus','s')+'Nuevo</button></div></div>'`
    ),
    alert: still(
      `'<div>'+${herorow({ cls: 'sm', size: 56, sentence: 'Alguien en el patio.', meta: 'Hace 1 min · ya avisé a Luis' })}+'<div class="status-alert" role="alert">'+media('scene-night','Patio trasero',{live:true})+'<div style="display:flex;gap:8px"><button class="btn primary" style="flex:1">Ver cámara</button><button class="btn" style="flex:1">Es conocido</button></div><button class="btn ghost compact" style="align-self:center">Es una falsa alarma</button></div></div>'`
    ),
  },
  nav: {
    nav: navFor(''),
    listening: navFor('listening'),
    status: still(`'<div style="width:244px">'+${sidestat}+'</div>'`),
  },
  screen: {
    inicio: home(false),
    updating: home(true),
    detail: phone(
      `'<div class="scr"><div class="body">'+topb('Seguridad',{back:true,right:'<button class="btn compact danger">SOS</button>'})+'<div class="sec">'+ahoraH()+ahora()+'</div></div></div>'`
    ),
    columns: `(innerWidth>=1024?'<div style="height:760px;position:relative;overflow:hidden;background:var(--bg)"><div class="aura aura-calm" style="height:300px" aria-hidden="true"><i></i><i></i><i></i></div><div class="dk" style="grid-template-columns:320px minmax(0,1fr);position:relative">'+'<div class="dcol"><div class="sec">'+ahoraH()+ahora()+'</div></div><div class="dcol">'+${news}+${news}+'</div></div></div>':${phone(`'<div class="scr"><div class="aura aura-calm" style="height:300px" aria-hidden="true"><i></i><i></i><i></i></div><div class="body"><div class="sec">'+ahoraH()+ahora()+'</div>'+${news}+${news}+'</div></div>'`)})`,
  },
};
