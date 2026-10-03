export const pairing = {
  title: 'Vincula tu servidor',
  subtitle:
    'Escanea el código QR que aparece en la terminal de tu servidor Argus, o ingresa el código manualmente.',
  'link-server': 'Vincular servidor',
  scan: 'Escanear código QR',
  parsing: 'Validando el código…',
  discovering: 'Buscando el servidor en la red…',
  pairing: 'Vinculando…',
  'scan-again': 'Escanear de nuevo',
  'enter-code': 'Ingresar código manualmente',
  'code-placeholder': 'Código de vinculación',
  'desktop-hint':
    'En este equipo introduce el código que aparece en la terminal del servidor Argus. El escaneo con cámara solo está disponible en el móvil.',
  success: 'Servidor vinculado',
  'success-subtitle': 'Todo listo para continuar.',
  'address-open': '¿No aparece tu servidor? Escribe su dirección',
  'address-label': 'Dirección del servidor',
  'address-placeholder': '192.168.1.20',
  'address-hint': 'La IP del equipo donde corre Argus. Úsala si tu red no permite descubrirlo solo.',
  errors: {
    'invalid-address': 'Escribe una IP válida, por ejemplo 192.168.1.20.',
    'invalid-code': 'Código inválido.',
    'already-paired': 'Este servidor ya está vinculado.',
    'not-found': 'No se encontró el servidor en la red.',
    'fingerprint-mismatch': 'El servidor no coincide con el código escaneado.',
    network: 'No se pudo conectar con el servidor.',
  },
} as const;