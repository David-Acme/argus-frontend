export const sheetCopy = {
  openLong: 'Nuevo evento',
  openShort: 'Recordatorio',
  longTitle: 'Nuevo evento',
  shortTitle: 'Recordatorio',
  save: 'Guardar',
  more: 'Más opciones',
  saved: 'Guardado',
  fields: {
    title: { label: 'Título', value: 'Visita del técnico' },
    day: { label: 'Día', value: 'Jue 22 oct' },
    time: { label: 'Hora', value: '10:00' },
    repeat: { label: 'Repetir', value: 'No se repite' },
    notes: { label: 'Notas', value: 'Llevar el router viejo y la factura. Preguntar por la' },
    place: { label: 'Lugar', value: 'Av. José Larco 1232, Miraflores' },
    remind: { label: 'Avisarme', value: '30 min antes' },
    share: { label: 'Compartir con', value: 'Luis' },
    who: { label: 'Quién', value: 'Yo' },
    reminder: { label: 'Recordatorio', value: 'Pagar la luz' },
    when: { label: 'Cuándo', value: 'Hoy 17:00' },
  },
} as const;

export const presenceCopy = {
  states: 'Estados',
  sizes: 'Tamaños',
  events: 'Eventos',
  stage: 'Escenario',
} as const;
