export const qr = {
  'blocked-title': 'Sin acceso a la cámara',
  'blocked-description':
    'Argus necesita la cámara para leer el código. Actívala en los ajustes del sistema.',
  'detected-description': 'Listo, volviendo…',
  'invalid-fallback': 'Ese código no es válido.',
  'close-scanner': 'Cerrar el escáner',
  'torch-on': 'Encender la linterna',
  'torch-off': 'Apagar la linterna',
  'back-to-camera': 'Volver a la cámara',
  purpose: {
    server: {
      title: 'Vincular servidor',
      hint: 'Escanea el código QR que aparece en la terminal de tu servidor Argus.',
      'manual-label': 'Ingresar código manualmente',
      'manual-placeholder': 'Código de vinculación',
      'invalid-message': 'Ese QR no corresponde a un servidor Argus.',
    },
    invite: {
      title: 'Invitación de Argus',
      hint: 'Escanea el código QR de la invitación.',
      'manual-label': 'Ingresar código de invitación',
      'manual-placeholder': 'Código de invitación',
      'invalid-message': 'Ese código de invitación no es válido.',
    },
    generic: {
      title: 'Escanear código',
      hint: 'Encuadra el código QR dentro del marco.',
    },
    login: {
      title: 'Conectar otro dispositivo',
      hint: 'Escanea el código QR que muestra tu equipo para iniciar sesión allí.',
      'invalid-message': 'Ese QR no corresponde a un inicio de sesión.',
    },
  },
  feedback: {
    requesting: 'Solicitando cámara',
    searching: 'Buscando código',
    detected: 'Código detectado',
    invalid: 'Código no válido',
    blocked: 'Cámara bloqueada',
  },
} as const;
