const stats = (chips: string): string => `\`<div class="stats" style="margin:0">${chips}</div>\``;

const glyphs = (small: boolean): string =>
  `\`<div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center${small ? ';color:var(--ic)' : ''}">\${Object.keys(P).map((n)=>ic(n${small ? ",'s'" : ''})).join('')}</div>\``;

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
      "'<div class=\"video\">'+media('scene-kitchen','',{live:true})+'<span class=\"ui dark eyecorner\" role=\"status\">Argus mira</span><div class=\"ov\"><button class=\"ibtn\">'+ic('speaker','s')+'</button><button class=\"ibtn\">'+ic('max','s')+'</button></div></div>'",
    'stage-privacy':
      "'<div class=\"video\">'+media('off','Dormitorio',{ctr:ic('lock'),r:'Privada'})+'</div>'",
    patio:
      "media('scene-patio','Patio trasero',{live:true,r:'<span style=\"font-weight:500;opacity:.85\">14:45</span>'})",
  },
  'resource-view': {
    failed:
      "ncard({icon:'wifioff',tone:'attn',t:'Cámaras sin conexión',b:'Revisa el Wi-Fi.',a:'<button class=\"btn compact\">Reintentar</button>'})",
    empty:
      '\'<div class="ncard"><div class="nh">\'+lic(\'check\',\'ok\',1)+\'<div><div class="nt">Nada pendiente hoy</div><div class="nb">Tienes el día libre.</div></div></div><button class="btn primary block">\'+ic(\'plus\',\'s\')+\'Nuevo recordatorio</button></div><div class="stats" style="margin-top:12px"><span class="chip">«Recuérdame pagar el agua»</span><span class="chip">«Agenda al técnico el jueves»</span></div>\'',
    stale:
      "'<div class=\"banner attn\" style=\"margin-top:0\">'+ic('wifioff','s')+'<span class=\"grow\">Sin conexión. Datos de las 15:32.</span></div>'+sec('Lo último',grp([row({lead:lic('user','',1),t:'Luis llegó',s:'Puerta principal · 14:45',chev:false}),row({lead:lic('shieldok','ok',1),t:'Sin alertas hoy',s:'5 cámaras en línea',chev:false})]),null,'hace 10 min')",
    ready:
      "sec('Lo último',grp([row({lead:lic('user','',1),t:'Luis llegó',s:'Puerta principal · 14:45',chev:false}),row({lead:lic('shieldok','ok',1),t:'Sin alertas hoy',s:'5 cámaras en línea',chev:false})]),null,'hace 10 min')",
    refused:
      "'<div class=\"banner\" style=\"margin-top:0\">'+ic('lock','s')+'<span class=\"grow\">La agenda está apagada en esta casa. Pídele al propietario que la active.</span></div>'",
    loading:
      '\'<div class="sec"><div class="group">\'+[0,1,2,3].map(()=>\'<div class="row"><span class="skel" style="width:42px;height:42px;border-radius:14px"></span><span class="main"><span class="skel" style="display:block;height:16px;width:58%"></span><span class="skel" style="display:block;height:13px;width:40%;margin-top:7px"></span></span><span class="skel" style="width:64px;height:28px;border-radius:999px"></span></div>\').join(\'\')+\'</div></div><div class="sec"><div class="group">\'+[0,1].map(()=>\'<div class="row"><span class="skel" style="width:42px;height:42px;border-radius:14px"></span><span class="main"><span class="skel" style="display:block;height:16px;width:50%"></span><span class="skel" style="display:block;height:13px;width:34%;margin-top:7px"></span></span></div>\').join(\'\')+\'</div></div><div class="skel" style="height:50px;border-radius:16px"></div>\'',
  },
};
