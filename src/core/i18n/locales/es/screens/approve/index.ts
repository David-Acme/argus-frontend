export const approve = {
  title: 'Conectar otro dispositivo',
  subtitle:
    'Escanea el código QR que muestra tu equipo para iniciar sesión allí automáticamente.',
  scan: 'Escanear código QR',
  checking: 'Comprobando la solicitud…',
  'confirm-title': '¿Eres tú?',
  'confirm-hint': 'Aprueba solo si eres tú quien está entrando ahora en este dispositivo.',
  origin: {
    lan: 'En tu red de casa',
    loopback: 'En este mismo equipo',
    tunnel: 'Desde fuera de casa',
    external: 'Desde fuera de casa',
    unknown: 'Desde un origen desconocido',
  },
  address: 'Dirección {ip}',
  'remote-warning':
    'Esta solicitud llega desde fuera de tu red. Si alguien te pidió escanear este código, cancélala.',
  confirm: 'Aprobar acceso',
  approving: 'Aprobando el acceso…',
  approved: '¡Listo! El otro dispositivo ha iniciado sesión.',
  expired: 'El código ya no es válido. Genera uno nuevo en el otro dispositivo.',
  error: 'No se pudo aprobar el acceso. Inténtalo de nuevo.',
} as const;
