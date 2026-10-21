const stats = (chips: string): string => `\`<div class="stats" style="margin:0">${chips}</div>\``;

const glyphs = (small: boolean): string =>
  `\`<div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center${small ? ';color:var(--ic)' : ''}">\${Object.keys(P).map((n)=>ic(n${small ? ",'s'" : ''})).join('')}</div>\``;

const alertbox = (title: string, body: string, acts: string): string =>
  `'<div class="alertbox" role="alertdialog" style="position:static;transform:none;max-width:480px"><div class="t-title">${title}</div><p class="t-body t-2" style="margin:12px 0 0">${body}</p><div class="acts">${acts}</div></div>'`;

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
      '`<div class="palette" style="position:static;transform:none;animation:none;width:auto;min-width:220px;border-radius:20px;background:color-mix(in srgb,var(--surface) 55%,transparent)"><div class="grp"><div class="it" style="min-height:36px">${ic(\'check\',\'s\')}Marcar como hecho</div><div class="it" style="min-height:36px">${ic(\'clock\',\'s\')}Posponer 1 hora</div><div class="it" style="min-height:36px;color:var(--alert)">${ic(\'x\',\'s\')}Borrar</div></div></div>`',
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
};
