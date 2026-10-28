export const login = {
  title: 'Entra con tu teléfono',
  lead: 'Abre Argus en tu teléfono y escanea este código. No hace falta escribir nada.',
  'title-phone': 'Entra con otro dispositivo',
  'lead-phone': 'Abre Argus donde ya entraste y escanea este código. No hace falta escribir nada.',
  'qr-label': 'Código para entrar',
  waiting: 'Esperando a tu teléfono · caduca en {time}',
  'waiting-phone': 'Esperando a tu otro dispositivo · caduca en {time}',
  preparing: 'Preparando el código…',
  expired: 'El código caducó',
  approved: 'Listo, ya entraste.',
  steps: {
    open: 'Abre Argus en tu teléfono',
    'open-phone': 'Abre Argus en tu otro dispositivo',
    approve: 'Toca Tú → Conectar otro dispositivo',
    confirm: 'Escanea el código y confirma',
  },
  'new-code': 'Mostrar otro código',
  face: 'Entrar con la cara',
  'waiting-owner': {
    title: 'Primero crea tu cuenta',
    lead: 'Abre Argus en tu teléfono, crea tu cuenta con tu cara y vuelve aquí.',
    done: 'Ya lo hice',
  },
  denied: {
    title: 'No se aprobó la entrada',
    lead: 'En el otro dispositivo dijeron que no eras tú. Si fuiste tú, empieza otra vez con un código nuevo.',
    again: 'Empezar de nuevo',
  },
  error: {
    title: 'No pude preparar el código',
    lead: 'Revisa que tu Argus esté encendido y en tu red.',
  },
} as const;
