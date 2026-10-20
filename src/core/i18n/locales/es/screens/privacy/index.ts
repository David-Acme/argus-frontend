export const privacy = {
  title: 'Privacidad',
  subtitle: 'Tú decides qué hace Argus con tus datos. Puedes cambiarlo cuando quieras.',
  step: 'Privacidad',
  modules: {
    eyebrow: 'Un último ajuste',
    title: 'Tus permisos para lo que acabas de elegir',
    intro:
      'Esto solo aplica a los módulos que activaste. Todo empieza apagado: lo que no actives sigue apagado para ti y puedes cambiarlo en tu perfil cuando quieras.',
    'for-modules': 'Para {modules}',
    save: 'Guardar y continuar',
    later: 'Ahora no',
    loading: 'Un momento…',
    'save-failed': 'No se pudieron guardar tus elecciones. Puedes hacerlo luego desde tu perfil.',
  },
  consent: {
    eyebrow: 'Antes de empezar',
    title: 'Tu privacidad, en tus manos',
    intro:
      'Argus funciona solo en el equipo de tu casa. Nada sale a la nube. Elige qué permites; lo que no actives queda apagado para ti.',
    'review-title': 'Revisa tu privacidad',
    'review-intro':
      'Necesitamos que leas el aviso y elijas qué permites antes de seguir. Lo que no actives queda apagado para ti.',
    'updated-title': 'El aviso cambió',
    'updated-intro':
      'Actualizamos el aviso de privacidad y los términos. Léelos y confirma tus elecciones para seguir.',
    'essentials-title': 'Lo esencial',
    'essential-local': 'Todo se procesa y se guarda en el equipo de tu casa, nunca en la nube.',
    'essential-face':
      'Para entrar usas tu rostro: Argus guarda un patrón numérico de tu cara y la foto del registro en almacenamiento privado.',
    'essential-retention':
      'Lo que Argus aprende se borra solo con el tiempo, y al instante si retiras tu permiso.',
    'essential-beta':
      'Argus está en desarrollo y no es un sistema de alarma certificado.',
    'choices-title': 'Qué permites',
    'choices-hint': 'Todo empieza apagado. Actívalo solo si quieres.',
    accept: 'Aceptar y continuar',
    'accept-hint': 'Al continuar aceptas el aviso de privacidad y los términos (versión {version}).',
    decline: 'No acepto',
    'decline-onboarding-title': 'No se creó ninguna cuenta',
    'decline-onboarding-description':
      'Sin aceptar el aviso no podemos registrar tu rostro. Puedes volver cuando quieras.',
    'decline-title': '¿Salir sin aceptar?',
    'decline-description':
      'Sin aceptar el aviso y los términos no puedes usar Argus en este dispositivo. Se cerrará tu sesión.',
    'decline-confirm': 'Cerrar sesión',
    saving: 'Guardando…',
    'save-failed': 'No se pudieron guardar tus elecciones',
    'saved-later':
      'Tu cuenta se creó, pero tus elecciones de privacidad no se guardaron. Te las pediremos al entrar.',
    'read-notice': 'Leer el aviso completo y los términos',
  },
  signal: {
    presence: 'Presencia en casa',
    faceCameras: 'Reconocerme en las cámaras',
    voiceLearning: 'Aprender mi voz',
    cameraAudio: 'Audio de las cámaras',
  },
  'signal-hint': {
    presence:
      'Argus deduce si estás en casa (por tu conexión a la red de casa o una cámara de entrada) para decidir a quién avisar primero. Solo guarda “en casa” o “fuera”, nunca tu ubicación.',
    faceCameras:
      'Las cámaras te reconocen por tu nombre. Si lo apagas, te siguen viendo como alguien de casa, pero sin nombre.',
    voiceLearning:
      'En las llamadas con Argus aprende a reconocer tu voz. Si lo apagas, se borra lo que aprendió.',
    cameraAudio:
      'Los micrófonos de las cámaras oyen a todos. Se encienden solo si todas las personas de la casa lo permiten.',
  },
  'household-off': 'El propietario lo apagó para toda la casa.',
  'withdraw-voice-title': '¿Dejar de aprender tu voz?',
  'withdraw-voice-description':
    'Argus borrará ahora mismo lo que aprendió de tu voz y no volverá a aprenderla mientras esté apagado.',
  'withdraw-presence-title': '¿Dejar de usar tu presencia?',
  'withdraw-presence-description':
    'Argus borrará tu estado de presencia y no te tendrá en cuenta para decidir a quién avisar primero.',
  'withdraw-confirm': 'Apagar',
  section: {
    accepted: 'Aceptaste el aviso v{version} el {date}.',
    'not-accepted': 'Aún no aceptas el aviso de privacidad.',
    unavailable: 'No se pudo cargar tu privacidad.',
    loading: 'Cargando tu privacidad…',
    'terms-title': 'Términos de uso',
    'terms-summary':
      'Versión preliminar, sin garantías. No reemplaza a un servicio de monitoreo ni a emergencias.',
  },
  notice: {
    title: 'Aviso de privacidad y términos',
    version: 'Versión {version}',
    close: 'Cerrar',
    'where-title': 'Dónde quedan tus datos',
    'where-body':
      'Argus funciona por completo en el equipo de tu casa. Las cámaras, los rostros, las voces, la agenda y las notificaciones se procesan y se guardan allí. Nada se envía a la nube. Si el propietario activa el acceso remoto, el túnel solo transporta datos cifrados entre tus dispositivos y ese equipo.',
    'what-title': 'Qué procesa Argus',
    'what-body':
      'Video y, si la cámara tiene micrófono, audio de las cámaras. Tu rostro para iniciar sesión y, si lo permites, para reconocerte en las cámaras. Tu voz en las llamadas con Argus (se transcribe en el equipo de casa) y, si lo permites, para reconocerla. Tu presencia en casa, si lo permites. Notificaciones, llamadas de aviso, agenda y proyectos.',
    'sensitive-title': 'Datos sensibles',
    'sensitive-body':
      'El rostro y la voz son datos biométricos, que {laws} considera datos sensibles. Argus los guarda como patrones numéricos, no como grabaciones. La foto de tu registro queda en almacenamiento privado y nunca se sincroniza a los teléfonos.',
    'retention-title': 'Cuánto tiempo se guardan',
    'retention-body':
      'Argus no graba video de forma continua: las imágenes y el historial de eventos de seguridad se guardan 30 días (el propietario elige entre 1 y 60) y 120 días los incidentes marcados. Rostros sin nombre: 30 días sin volver a verlos (entre 1 y 60). Voz aprendida: hasta 180 días, y se borra al retirar tu permiso. Presencia: solo el estado actual, borrado al retirar tu permiso o tras 30 días sin cambios. En {country}, la normativa pide conservar las grabaciones de videovigilancia {videoDays} días (máximo {videoMaxDays}) y hasta {incidentDays} días si muestran un posible incidente.',
    'choices-title': 'Tú decides',
    'choices-body':
      'Eliges qué permites: presencia, reconocimiento en las cámaras, aprendizaje de voz, audio de las cámaras y tu ubicación. Lo cambias cuando quieras en Perfil > Privacidad; sin tu permiso esas funciones quedan apagadas para ti. El propietario puede apagar una función para toda la casa, pero nunca encenderla por ti, y ve qué elegiste.',
    'rights-title': 'Tus derechos',
    'rights-body':
      'Puedes pedir al propietario de la instalación ver, corregir o borrar tus datos, o desactivar tu cuenta. En {country} la autoridad es la {authority}.',
    'owner-title': 'Responsabilidad del propietario',
    'owner-body':
      'Quien instala y opera Argus es el responsable de los datos que procesa y debe usarlo conforme a la ley del lugar donde está instalado ({laws}): colocar avisos visibles de zona videovigilada, no apuntar cámaras a espacios ajenos más de lo necesario y, si una cámara capta audio, tratarlo como dato de videovigilancia y no activarlo en zonas de descanso de trabajadores del hogar. El autor entrega los controles y la documentación; cómo se usan en cada instalación queda fuera de su control.',
    'terms-title': 'Versión en desarrollo, sin garantías',
    'terms-body':
      'Argus está en desarrollo (antes de la beta) y se ofrece “tal cual”, sin garantías de ningún tipo. Su autor no se hace responsable del mal uso ni de fallas del software. Argus no es un sistema de seguridad ni de alarma certificado: no reemplaza un servicio de monitoreo profesional ni los servicios de emergencia. Cada usuario es responsable de cumplir las leyes locales sobre videovigilancia y datos de terceros, incluidos los avisos de zona videovigilada.',
    'legal-note': 'Este aviso no es asesoría legal.',
  },
  household: {
    title: 'Privacidad de la casa',
    signal: {
      presence: 'Presencia en casa',
      faceCameras: 'Reconocer a las personas en las cámaras',
      voiceLearning: 'Aprender voces',
      cameraAudio: 'Audio de las cámaras',
    },
    'signal-hint': {
      presence: 'Usa “en casa” o “fuera” de quienes lo permiten para decidir a quién avisar primero.',
      faceCameras: 'Las cámaras nombran a quienes lo permiten; al resto lo ven como alguien de casa, sin nombre.',
      voiceLearning: 'Argus aprende la voz de quienes lo permiten en sus llamadas. Al apagarlo se borran todas.',
      cameraAudio: 'Los micrófonos de las cámaras se encienden solo si todas las personas lo permiten.',
    },
    hint: 'Apaga una función para todos. No puedes encenderla por otra persona: cada quien decide la suya.',
    pending: '{count} sin decidir',
    'all-decided': 'Todos decidieron',
    'audio-held': 'El audio de las cámaras está apagado: {count} persona(s) no lo permiten o aún no deciden.',
    'audio-on': 'El audio de las cámaras está encendido: todos lo permiten.',
    'off-voice-title': '¿Apagar el aprendizaje de voz para todos?',
    'off-voice-description':
      'Argus borrará ahora mismo todas las voces aprendidas y no aprenderá ninguna mientras esté apagado.',
    'off-presence-title': '¿Apagar la presencia para todos?',
    'off-presence-description':
      'Argus borrará el estado de presencia de todos y avisará sin tenerlo en cuenta.',
    'off-face-title': '¿Dejar de reconocer a las personas en las cámaras?',
    'off-face-description':
      'Las cámaras seguirán sabiendo que alguien es de casa, pero sin decir quién.',
    'off-audio-title': '¿Apagar el audio de las cámaras?',
    'off-audio-description': 'Las cámaras dejarán de transmitir y escuchar sonido para todos.',
    'off-confirm': 'Apagar para todos',
    'save-failed': 'No se pudo cambiar la privacidad de la casa',
    visitors: 'Reconocer visitantes recurrentes',
    'visitors-hint':
      'Aprende los rostros de personas externas que pasan seguido (vecinos, repartidores) para no tratarlas siempre como desconocidas.',
    'visitors-acknowledged': 'Aceptado el {date}.',
    'visitors-ack-title': 'Reconocer visitantes recurrentes',
    'visitors-ack-intro': 'Antes de encenderlo, confirma que entiendes y aceptas que:',
    'visitors-ack-faces':
      'Argus procesará rostros de personas externas para reconocerlas como recurrentes. Son datos biométricos de terceros.',
    'visitors-ack-sign': 'Debes poner un aviso visible de zona videovigilada.',
    'visitors-ack-retention':
      'La conservación es limitada: un visitante sin nombre se borra tras 30 días sin verlo (configurable entre 1 y 60), y al apagar la función se borran en unas horas. Solo se guardan recortes pequeños del rostro, nunca video.',
    'visitors-ack-confirm': 'Entiendo y acepto',
    'visitors-off-title': '¿Dejar de reconocer visitantes?',
    'visitors-off-description':
      'Argus borrará los visitantes sin nombre en las próximas horas y dejará de reconocer a los que tienen nombre.',
    location: 'Ubicar a las personas en casa',
    'location-hint':
      'Argus calcula en qué habitación está cada persona que no lo apagó, para hablarle por la cámara más cercana. Solo tú lo consultas.',
    'off-location-title': '¿Dejar de ubicar a las personas?',
    'off-location-description':
      'Argus borrará dónde cree que está cada persona y no lo calculará para nadie. Solo seguirá la conversación que alguien empiece.',
    watchman: 'Argus escucha por las cámaras',
    'watchman-hint':
      'Cuando alguien dice “Argus” cerca de una cámara elegida, suena un tono y Argus contesta por su parlante. Eliges en cada cámara si escucha.',
    'watchman-ready': 'Escucha en las cámaras que lo tienen activado. Eliges en cada cámara si escucha.',
    'watchman-audio-off': 'Está encendido, pero el audio de las cámaras está apagado para la casa: no escucha.',
    'watchman-audio-held':
      'Está encendido, pero no escucha: {count} persona(s) no permiten el audio de las cámaras o aún no deciden.',
    'watchman-acknowledged': 'Aceptado el {date}.',
    'watchman-ack-title': 'Argus escucha por las cámaras',
    'watchman-ack-intro': 'Antes de encenderlo, confirma que entiendes y aceptas que:',
    'watchman-ack-installer':
      'Tú, quien instala y opera Argus, eres responsable de usarlo conforme a la ley. El audio de las cámaras cuenta como dato de videovigilancia.',
    'watchman-ack-sign': 'Debes poner un aviso visible en cada acceso a una zona con cámaras que escuchan.',
    'watchman-ack-rest':
      'No debes activar el audio en zonas de descanso de trabajadores del hogar: marca esas cámaras como “sin audio”.',
    'watchman-ack-consent':
      'Reconocer por rostro o voz a personas que no viven en la casa requiere su consentimiento, por escrito para los datos biométricos.',
    'watchman-ack-retention':
      'Argus no guarda audio antes de oír su nombre. Cada conversación empieza con un tono y se conserva como las llamadas de voz.',
    'watchman-ack-confirm': 'Entiendo y acepto',
    'watchman-off-title': '¿Dejar de escuchar por las cámaras?',
    'watchman-off-description': 'Ninguna cámara escuchará ni contestará, y las conversaciones abiertas terminan.',
    signage: 'Aviso para las entradas',
    'signage-hint': 'Un cartel de zona videovigilada listo para imprimir o compartir.',
    proximity: 'Receptores y sensores',
    'proximity-hint': 'Placas Bluetooth y radares por habitación, para saber dónde está cada persona.',
  },
  location: {
    title: 'Ubicarme en casa',
    hint: 'Argus puede saber en qué habitación estás (por las cámaras, el sonido y, si lo activas, tu celular) para hablarte por la cámara más cercana. Solo el propietario lo consulta. Si lo apagas, solo se usa para seguir la conversación que tú empezaste.',
    'withdraw-title': '¿Dejar de ubicarte en casa?',
    'withdraw-description':
      'Argus dejará de calcular en qué habitación estás. Seguirá oyéndote en la cámara a la que llamaste, solo durante esa conversación.',
  },
  signage: {
    title: 'Aviso para las entradas',
    description:
      'Colócalo en cada acceso a una zona con cámaras. Escribe quién responde por la instalación y cómo contactarlo.',
    'responsible-label': 'Responsable',
    'responsible-placeholder': 'Nombre y contacto',
    heading: 'ZONA VIDEOVIGILADA',
    'heading-audio': 'ZONA VIDEOVIGILADA CON AUDIO',
    'line-cameras': 'Esta zona tiene cámaras de seguridad.',
    'line-audio':
      'Algunas cámaras tienen micrófono y parlante: si dices “Argus”, suena un tono y un asistente automático te contesta.',
    'line-no-recording': 'No se guarda audio antes de ese tono.',
    'line-responsible': 'Responsable: {name}',
    'line-rights':
      'Puedes ejercer tus derechos de acceso, rectificación, cancelación y oposición ante el responsable. Autoridad: {authority}.',
    'line-law': 'Conforme a {laws}.',
    print: 'Imprimir',
    share: 'Compartir',
    copied: 'Aviso copiado',
    'share-failed': 'No se pudo compartir el aviso',
  },
  person: {
    title: 'Privacidad',
    undecided: 'Aún no decide. Todo está apagado para esta persona.',
    outdated: 'Decidió con un aviso anterior; se le pedirá de nuevo.',
    accepted: 'Aceptó el aviso el {date}.',
    on: 'Permite',
    off: 'No permite',
    'owner-note': 'Solo esta persona puede cambiar sus elecciones.',
  },
  minor: {
    title: 'Menor de edad',
    switch: 'Es menor de edad',
    'switch-hint': 'Argus no reconoce su rostro en las cámaras ni aprende su voz, aunque lo haya permitido.',
    consent: 'Doy mi permiso como tutor',
    'consent-hint': 'Con tu permiso valen sus propias elecciones de rostro y voz.',
    protected:
      'Sin tu permiso: las cámaras no reconocen su rostro y Argus no aprende su voz ni guarda recuerdos suyos.',
    consented: 'Con tu permiso como tutor: valen sus propias elecciones de rostro y voz, y Argus puede recordar lo que te pida.',
    camera:
      'En una cámara Argus siempre le habla como a menor: no le muestra cámaras, no responde alarmas en su nombre ni cambia la agenda o los proyectos.',
    'mark-title': '¿Marcar a {name} como menor de edad?',
    'mark-description':
      'Las cámaras dejarán de reconocer a {name} por su rostro y Argus dejará de aprender su voz; la voz que ya aprendió se borra. Tampoco guardará recuerdos suyos. Puedes dar tu permiso como tutor después.',
    'mark-confirm': 'Marcar como menor',
    'unmark-title': '¿{name} ya no es menor de edad?',
    'unmark-description': 'Volverán a valer las elecciones de privacidad de {name}, sin los límites de un menor.',
    'unmark-confirm': 'Quitar la marca',
    'consent-title': '¿Das tu permiso como tutor de {name}?',
    'consent-description':
      'Las cámaras podrán reconocer a {name} por su rostro y Argus podrá aprender su voz, solo si {name} lo permite en su privacidad. Quedas registrado como su tutor.',
    'consent-confirm': 'Dar mi permiso',
    'withdraw-title': '¿Retirar tu permiso para {name}?',
    'withdraw-description':
      'Las cámaras dejarán de reconocer a {name} por su rostro y Argus borrará la voz que aprendió.',
    'withdraw-confirm': 'Retirar el permiso',
    'save-failed': 'No se pudo guardar la marca de menor',
  },
} as const;
