export const privacy = {
  title: 'Privacidad',
  subtitle: 'Tú decides qué hace Argus con tus datos. Puedes cambiarlo cuando quieras.',
  step: 'Privacidad',
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
      'Argus no graba video de forma continua: las imágenes de eventos de seguridad se borran solas. Rostros de desconocidos: 30 días sin volver a verlos. Voz aprendida: hasta 180 días, y se borra al retirar tu permiso. Presencia: solo el estado actual, borrado al retirar tu permiso o tras 30 días sin cambios. En {country}, la normativa pide conservar las grabaciones de videovigilancia {videoDays} días (máximo {videoMaxDays}) y hasta {incidentDays} días si muestran un posible incidente.',
    'choices-title': 'Tú decides',
    'choices-body':
      'Eliges qué permites: presencia, reconocimiento en las cámaras, aprendizaje de voz y audio de las cámaras. Lo cambias cuando quieras en Perfil > Privacidad; sin tu permiso esas funciones quedan apagadas para ti. El propietario puede apagar una función para toda la casa, pero nunca encenderla por ti, y ve qué elegiste.',
    'rights-title': 'Tus derechos',
    'rights-body':
      'Puedes pedir al propietario de la instalación ver, corregir o borrar tus datos, o desactivar tu cuenta. En {country} la autoridad es la {authority}.',
    'owner-title': 'Responsabilidad del propietario',
    'owner-body':
      'Quien instala Argus debe cumplir las leyes sobre videovigilancia y datos de terceros ({laws}), colocar avisos visibles de zona videovigilada y no apuntar cámaras a espacios ajenos más de lo necesario.',
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
      'La conservación es limitada: un visitante sin nombre se borra tras 30 días sin verlo, y al apagar la función se borran en unas horas. Solo se guardan recortes pequeños del rostro, nunca video.',
    'visitors-ack-confirm': 'Entiendo y acepto',
    'visitors-off-title': '¿Dejar de reconocer visitantes?',
    'visitors-off-description':
      'Argus borrará los visitantes sin nombre en las próximas horas y dejará de reconocer a los que tienen nombre.',
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
} as const;
