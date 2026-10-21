const stats = (chips: string): string => `\`<div class="stats" style="margin:0">${chips}</div>\``;

const glyphs = (small: boolean): string =>
  `\`<div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center${small ? ';color:var(--ic)' : ''}">\${Object.keys(P).map((n)=>ic(n${small ? ",'s'" : ''})).join('')}</div>\``;

const alertbox = (title: string, body: string, acts: string): string =>
  `'<div class="alertbox" role="alertdialog" style="position:static;transform:none;max-width:480px"><div class="t-title">${title}</div><p class="t-body t-2" style="margin:12px 0 0">${body}</p><div class="acts">${acts}</div></div>'`;
const field = (tone: string): string =>
  `'<div style="position:relative;height:300px;overflow:hidden;background:var(--bg)"><div class="aura aura-${tone}${tone === 'alert' ? ' alert' : ''}" style="height:300px" aria-hidden="true"><i></i><i></i><i></i></div></div>'`;

const band = (tone: string): string =>
  `'<div style="position:relative;height:96px;border-radius:24px;overflow:hidden;background:var(--surface)">'+aura('${tone}','band')+'</div>'`;

const phone = (inner: string, cls = ''): string =>
  `'<div class="phone ${cls}" style="height:760px;border:0;border-radius:0;box-shadow:none;background:var(--bg)">'+${inner}+'</div>'`;

type Hero = { cls: string; size: number; sentence: string; meta: string; state?: string };

const herorow = ({ cls, size, sentence, meta, state = 'idle' }: Hero): string =>
  `'<div class="herorow ${cls}">'+masc('${state}',${size})+'<div><div class="t-hero">${sentence}</div><div class="t-meta">${meta}</div></div></div>'`;

const homeStats =
  "'<div class=\"stats\"><span class=\"chip\">'+ic('cam','s')+'<b>5</b> cámaras</span><span class=\"chip\">'+ic('shieldok','s')+'<b>0</b> alertas hoy</span><span class=\"chip\">'+ic('hist','s')+'<b>4</b> detecciones</span></div>'";

const homeTop = (updating: boolean): string =>
  `'<div class="topbar" style="min-height:44px"><div class="grow"><div class="t-meta" style="font-weight:600">Buenas tardes, Ana</div></div>${updating ? '<span class="updating"><i></i>Actualizando</span>' : ''}<button class="ibtn glass" aria-label="Buscar">'+ic('search','s')+'</button></div>'`;

const home = (updating: boolean): string =>
  phone(
    `'<div class="scr"><div class="aura aura-calm" style="height:300px" aria-hidden="true"><i></i><i></i><i></i></div><div class="body">'+${homeTop(updating)}+${herorow({ cls: '', size: 66, sentence: 'Todo tranquilo.', meta: 'En casa · Luis y tú en casa' })}+${homeStats}+'<div class="sec" style="margin-top:18px">'+ahoraH()+ahora()+'</div></div></div>'`
  );

const news =
  "sec('Novedades',grp([row({lead:lic('user','',1),t:'Luis llegó',s:'Puerta principal · 14:45',chev:false}),row({lead:lic('eyeoff','',1),t:'Imagen tapada 2 min',s:'Patio trasero · ayer 15:02',chev:false})]),'Ver todo')";

const sidestat =
  '\'<div class="sidestat"><div class="ss-h"><b>Argus de Casa</b></div><div class="ss-r">\'+ic(\'home\',\'s\')+\'<span>Modo <b>En casa</b></span></div><div class="ss-r">\'+ic(\'cam\',\'s\')+\'<span><b>5 de 6</b> cámaras activas</span></div><div><div class="ss-r" style="justify-content:space-between"><span>Almacenamiento</span><b>62%</b></div><div class="meter"><i style="width:62%"></i></div></div><div class="ss-ask">\'+masc(\'idle\',20)+\'Pregúntale a Argus…</div></div>\'';

const navFor = (cls: string): string =>
  `(innerWidth>=1024?'<div class="desk" style="height:760px">'+SIDE('inicio')+'</div>':${phone("tabs('home')", cls)})`;

const CATALOGUE = 'idle listen think speak happy alert watch look sleep off'.split(' ');

const cell = (state: string): string =>
  `'<div style="display:flex;flex-direction:column;align-items:center">'+masc('${state}',150)+'<div style="display:flex;gap:8px;align-items:center;margin-top:6px">'+masc('${state}',28)+masc('${state}',36)+masc('${state}',48)+'</div></div>'`;

export const PROTOTYPE_CASES: Record<string, Record<string, string>> = {
  presence: Object.fromEntries(CATALOGUE.map((state) => [`state-${state}`, cell(state)])),
  sheet: {
    dialog: `OV.dialog(false,false).replace(/^<div class="scrim"[^>]*><\\/div>/,'').replace('class="dlg"','class="dlg" style="position:static;transform:none;animation:none;max-width:100%"')`,
  },
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
  confirm: {
    destructive: alertbox(
      '¿Hacer sonar la sirena?',
      'Sonará en Cocina durante 30 segundos. Se oye en toda la casa.',
      '<button>Cancelar</button><button class="d">Hacer sonar</button>'
    ),
    default: alertbox(
      '¿Cerrar sesión en todos tus dispositivos?',
      'Tendrás que volver a entrar en cada uno con tu cara.',
      '<button>Cancelar</button><button>Cerrar sesión</button>'
    ),
  },
  toast: {
    undo: '\'<div class="toast" role="status" style="position:static"><span class="grow">Tarea hecha: Comprar cajas</span><button>Deshacer</button></div>\'',
    error:
      '`<div class="toast err" role="status" style="position:static"><span class="ti">${ic(\'wifioff\',\'s\')}</span><span class="grow"><b>No se guardó el recordatorio</b><span>Revisa tu conexión.</span></span><span class="ta"><button>Reintentar</button></span></div>`',
  },
  menu: {
    panel:
      '`<div class="palette" style="position:static;transform:none;animation:none;width:auto;min-width:220px;border-radius:20px;background:color-mix(in srgb,var(--surface) 55%,transparent)"><div class="grp"><div class="it">${ic(\'check\',\'s\')}Marcar como hecho</div><div class="it">${ic(\'clock\',\'s\')}Posponer 1 hora</div><div class="it" style="color:var(--alert)">${ic(\'x\',\'s\')}Borrar</div></div></div>`',
  },
  command: {
    palette:
      'OV.palette().replace(/^<div class="scrim"[^>]*><\\/div>/,\'\').replace(\'class="palette"\',\'class="palette" style="position:static;transform:none;animation:none;max-width:100%"\')',
  },
  field: {
    focus:
      '\'<label class="field"><span class="lab">Título</span><span class="inp focus">Visita del técnico<i class="caret"></i></span></label>\'',
    label:
      '\'<label class="field"><span class="lab">Título</span><span class="inp">Visita del técnico</span></label>\'',
    quick: '\'<label class="field"><span class="inp">Pagar la luz</span></label>\'',
    multiline:
      '\'<label class="field"><span class="lab">Notas</span><span class="inp multi">Llevar el router viejo y la factura. Preguntar por la</span></label>\'',
    error:
      '`<label class="field"><span class="inp err"><span style="color:var(--text-3)">¿Qué quieres recordar?</span></span><span class="ferr">${ic(\'alert\',\'s\')}Escribe qué quieres recordar.</span></label>`',
  },
  'field-code': {
    typing:
      '\'<div class="codebox"><span>K</span><span>7</span><span>Q</span><span class="f"><i class="caret"></i></span><span></span><span></span></div>\'',
    empty:
      '\'<div class="codebox"><span></span><span></span><span></span><span></span><span></span><span></span></div>\'',
  },
  choice: {
    'mode-glass':
      "`<div class=\"seg glass\"><button class=\"on\">${ic('home','s')}Casa</button><button>${ic('moon','s')}Noche</button><button>Fuera</button><button>Armado</button></div>`",
    views:
      '\'<div class="seg"><button class="on">Hoy</button><button>Calendario</button><button>Proyectos</button></div>\'',
    kinds:
      '\'<div class="seg"><button class="on">Evento</button><button>Recordatorio</button><button>Tarea</button></div>\'',
    'language-glass':
      '\'<div class="seg glass" style="width:112px"><button class="on">ES</button><button>EN</button></div>\'',
    'repeat-field':
      '`<label class="field"><span class="lab">Repetir</span><span class="inp" style="justify-content:space-between">No se repite${ic(\'chevd\',\'s\')}</span></label>`',
    'notice-row': "row({t:'Avisarme',tr:'30 min antes'})",
  },
  notice: {
    'card-attention':
      "ncard({icon:'wifioff',tone:'attn',t:'Cámaras sin conexión',b:'Revisa el Wi-Fi.',a:'<button class=\"btn compact\">Reintentar</button>'})",
    'card-info':
      "ncard({icon:'shieldok',tone:'ok',t:'Todo tranquilo',b:'Aún no ha pasado nada que contar.'})",
    'card-primary':
      "ncard({icon:'check',tone:'ok',t:'Nada pendiente hoy',b:'Pídele a Argus que te recuerde algo.',a:'<button class=\"btn compact primary\">Nuevo recordatorio</button>'})",
    'banner-attention':
      "'<div class=\"banner attn\" style=\"margin-top:0\">'+ic('wifioff','s')+'<span class=\"grow\">Sin conexión. Datos de las 15:32.</span></div>'",
    'banner-info':
      "'<div class=\"banner\" style=\"margin-top:0\">'+ic('lock','s')+'<span class=\"grow\">Las llamadas están apagadas en esta casa.</span></div>'",
  },
  'feed-item': {
    feed: "'<div class=\"feed\">'+feedItem({av:lic('user','accent',1),who:'Carlos',when:'14:35',txt:'Quiere usar la agenda y los proyectos.',act:'<button class=\"btn compact primary\">Activar</button><button class=\"btn compact\">Ahora no</button>',unread:true})+feedItem({av:lic('cam','',1),who:'Cocina',when:'14:45',txt:'Luis llegó a casa.'})+feedItem({av:lic('bell','',1),who:'Recordatorio',when:'12:00',txt:'Llamar al plomero venció hace 1 h.'})+'</div>'",
    long: "'<div class=\"feed\">'+feedItem({av:lic('user','accent',1),who:'María Fernanda Quispe Huamán',when:'14:35',txt:'Quiere usar la agenda, los proyectos y los recordatorios compartidos de la casa.',act:'<button class=\"btn compact primary\">Activar</button><button class=\"btn compact\">Ahora no</button>'})+'</div>'",
    thread:
      "'<div class=\"feed\">'+feedItem({av:lic('alert','attn',1),who:'Patio trasero',when:'Ayer 21:53',txt:'Persona desconocida. Nadie respondió; avisé a Luis.',act:'<button class=\"btn compact\">Revisar</button>',thread:true})+feedItem({av:'<span class=\"lic r\">L</span>',who:'Luis',when:'Ayer 21:55',txt:'Era el jardinero. Ya lo dejé entrar.'})+'</div>'",
  },
  media: {
    'tile-live':
      "media('scene-kitchen','Cocina',{live:true,hov:1,r:'<span style=\"font-weight:500;opacity:.85\">14:45</span>'})",
    'tile-clip':
      "media('scene-door','Luis llegó',{ctr:'<span class=\"ibtn glass\" style=\"color:#fff\">'+ic('play','s')+'</span>',r:'<span style=\"font-weight:500;opacity:.85\">14:45</span>'})",
    'tile-privacy': "media('off','Dormitorio',{ctr:ic('lock'),r:'Privada'})",
    'tile-off': "media('off','Garaje',{ctr:ic('eyeoff'),r:'Apagada'})",
    stage:
      "'<div class=\"video\">'+media('scene-kitchen','',{live:true})+'<span class=\"ui dark eyecorner\" role=\"status\">'+masc('look',56)+'Argus mira</span><div class=\"ov\"><button class=\"ibtn\">'+ic('speaker','s')+'</button><button class=\"ibtn\">'+ic('max','s')+'</button></div></div>'",
    'stage-privacy':
      "'<div class=\"video\">'+media('off','Dormitorio',{ctr:ic('lock'),r:'Privada'})+'</div>'",
    patio:
      "media('scene-patio','Patio trasero',{live:true,r:'<span style=\"font-weight:500;opacity:.85\">14:45</span>'})",
  },
  'resource-view': {
    failed:
      "ncard({icon:'wifioff',tone:'attn',t:'Cámaras sin conexión',b:'Revisa el Wi-Fi.',a:'<button class=\"btn compact\">Reintentar</button>'})",
    empty:
      '\'<div class="ncard"><div class="nh" style="align-items:center">\'+masc(\'happy\',52)+\'<div><div class="nt">Nada pendiente hoy</div><div class="nb">Tienes el día libre.</div></div></div><button class="btn primary block">\'+ic(\'plus\',\'s\')+\'Nuevo recordatorio</button></div><div class="stats" style="margin-top:12px"><span class="chip">«Recuérdame pagar el agua»</span><span class="chip">«Agenda al técnico el jueves»</span></div>\'',
    stale:
      "'<div class=\"banner attn\" style=\"margin-top:0\">'+ic('wifioff','s')+'<span class=\"grow\">Sin conexión. Datos de las 15:32.</span></div>'+sec('Lo último',grp([row({lead:lic('user','',1),t:'Luis llegó',s:'Puerta principal · 14:45',chev:false}),row({lead:lic('shieldok','ok',1),t:'Sin alertas hoy',s:'5 cámaras en línea',chev:false})]),null,'hace 10 min')",
    ready:
      "sec('Lo último',grp([row({lead:lic('user','',1),t:'Luis llegó',s:'Puerta principal · 14:45',chev:false}),row({lead:lic('shieldok','ok',1),t:'Sin alertas hoy',s:'5 cámaras en línea',chev:false})]),null,'hace 10 min')",
    refused:
      "'<div class=\"banner\" style=\"margin-top:0\">'+ic('lock','s')+'<span class=\"grow\">La agenda está apagada en esta casa. Pídele al propietario que la active.</span></div>'",
    loading:
      '\'<div class="sec"><div class="group">\'+[0,1,2,3].map(()=>\'<div class="row"><span class="skel" style="width:42px;height:42px;border-radius:14px"></span><span class="main"><span class="skel" style="display:block;height:16px;width:58%"></span><span class="skel" style="display:block;height:13px;width:40%;margin-top:7px"></span></span><span class="skel" style="width:64px;height:28px;border-radius:999px"></span></div>\').join(\'\')+\'</div></div><div class="sec"><div class="group">\'+[0,1].map(()=>\'<div class="row"><span class="skel" style="width:42px;height:42px;border-radius:14px"></span><span class="main"><span class="skel" style="display:block;height:16px;width:50%"></span><span class="skel" style="display:block;height:13px;width:34%;margin-top:7px"></span></span></div>\').join(\'\')+\'</div></div><div class="skel" style="height:50px;border-radius:16px"></div>\'',
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
    'hero-calm': `'<div>'+${herorow({ cls: '', size: 66, sentence: 'Todo tranquilo.', meta: 'En casa · Luis y tú en casa' })}+${homeStats}+'</div>'`,
    'hero-security': `'<div>'+${herorow({ cls: '', size: 66, sentence: 'En casa', meta: 'Te aviso solo de desconocidos' })}+'<div class="stats"><span class="chip"><b>0</b> en curso</span><span class="chip" style="color:var(--attn)"><b>1</b> por revisar</span><span class="chip">'+ic('door','s')+'<b>1</b> visita hoy</span></div></div>'`,
    'hero-night': herorow({
      cls: '',
      size: 66,
      sentence: 'Buenas noches.',
      meta: 'Modo Noche · vigilo por ti',
      state: 'duty',
    }),
    'hero-band': `'<div style="padding:18px 28px 6px;max-width:2256px;margin:0 auto;width:100%;box-sizing:border-box"><div class="dband">'+aura('calm','band')+masc('idle',64)+'<div style="flex:1;min-width:0"><div class="t-hero" style="font-size:38px;white-space:nowrap">Todo tranquilo.</div><div class="t-meta">Buenas tardes, Ana · Modo En casa · Luis y tú en casa</div></div><div class="stats" style="margin:0;flex-wrap:nowrap"><span class="chip">'+ic('cam','s')+'<b>5</b> cámaras</span><span class="chip">'+ic('shieldok','s')+'<b>0</b> alertas hoy</span></div><button class="btn compact primary">'+ic('plus','s')+'Nuevo</button></div></div>'`,
    alert: `'<div>'+${herorow({ cls: 'sm', size: 56, sentence: 'Alguien en el patio.', meta: 'Hace 1 min · ya avisé a Luis', state: 'alert' })}+'<div class="status-alert" role="alert">'+media('scene-night','Patio trasero',{live:true})+'<div style="display:flex;gap:8px"><button class="btn primary" style="flex:1">Ver cámara</button><button class="btn" style="flex:1">Es conocido</button></div><button class="btn ghost compact" style="align-self:center">Es una falsa alarma</button></div></div>'`,
  },
  nav: {
    nav: navFor(''),
    listening: navFor('listening'),
    status: `'<div style="width:244px">'+${sidestat}+'</div>'`,
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
