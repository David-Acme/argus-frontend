export const invitation = {
  title: 'Unirse a Argus',
  subtitle: 'Escanea la invitación del administrador para conectar tu teléfono de forma segura.',
  'scan-title': 'Invitación segura',
  scan: 'Escanear invitación',
  validating: 'Verificando la invitación y el servidor…',
  accepted: 'Servidor verificado. Ahora registra tu rostro.',
  error: 'No pudimos verificar esta invitación. Pide al administrador un código nuevo.',
  'mismatch-title': 'Este servidor no es el de la invitación.',
  'mismatch-hint':
    'No se envió nada. Asegúrate de estar en la red de casa y pide al administrador que te muestre la invitación otra vez.',
  revoked: {
    title: 'Esta invitación ya no sirve',
    hint: 'Pídele a quien te invitó una nueva cuando vuelva a estar activo.',
    back: 'Volver al inicio',
  },
  'revoked-module': 'Se revocó porque se apagó {module} en esa casa. Una invitación revocada no vuelve a usarse.',
  modules: {
    surveillance: 'Vigilancia',
    productivity: 'Productividad',
    agronomy: 'Agronomía',
    other: 'un módulo',
  },
} as const;
