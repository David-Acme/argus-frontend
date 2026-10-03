export const settings = {
  title: 'Configuración',
  subtitle: 'Ajusta cómo trabaja cada parte de Argus. Los cambios se guardan al momento.',
  search: 'Buscar opción',
  'load-error': 'No se pudo cargar la configuración.',
  'owner-unreachable': 'No disponible ahora',
  'owner-unreachable-hint':
    'Este servicio no responde. Sus ajustes aparecerán cuando vuelva a estar en línea.',
  'owner-empty': 'Nada que ajustar en este nivel',
  'owner-empty-hint': 'Cambia a Avanzado para ver todas las opciones de este servicio.',
  'count-basic': '{count} básicas',
  'more-advanced': 'Hay {count} opciones avanzadas más para quien quiera afinar el detalle.',
  'show-advanced': 'Ver avanzadas',
  'count-all': '{count} opciones',
  level: {
    label: 'Nivel de detalle',
    basic: 'Básico',
    advanced: 'Avanzado',
  },
  apply: {
    live: 'Se aplica al instante',
    nextSession: 'Se aplica en la próxima llamada',
    restart: 'Se aplica al reiniciar el servicio',
  },
  owners: {
    llm: { name: 'Asistente', hint: 'Cómo piensa y responde Argus.' },
    voice: { name: 'Conversación', hint: 'Cómo escucha y cuándo te deja hablar.' },
    tts: { name: 'Voz de Argus', hint: 'Cómo suena cuando te habla.' },
    stt: { name: 'Transcripción', hint: 'Cómo entiende lo que dices.' },
    vlm: { name: 'Visión', hint: 'Cómo describe lo que ven las cámaras.' },
    guard: { name: 'Vigilancia', hint: 'Cuándo avisa, habla o hace sonar la sirena.' },
    camera: { name: 'Cámaras', hint: 'Detección, transmisión y salud de las cámaras.' },
    notification: { name: 'Avisos', hint: 'Cuántos avisos recibes y cuándo guardan silencio.' },
  },
  groups: {
    voice: 'Voz',
    synthesis: 'Síntesis',
    sampling: 'Respuestas',
    memory: 'Memoria',
    engine: 'Motor',
    conversation: 'Conversación',
    listening: 'Escucha',
    network: 'Red',
    noise: 'Ruido',
    descriptions: 'Descripciones',
    recognition: 'Reconocimiento',
    detection: 'Detección',
    alerts: 'Avisos',
    actions: 'Acciones',
    streaming: 'Transmisión',
    health: 'Estado de la imagen',
    quiet: 'Silencio',
    delivery: 'Entrega',
    history: 'Historial',
    response: 'Respuesta',
    alarm: 'Alarma',
    visitors: 'Visitas',
    decisions: 'Decisiones',
    limits: 'Límites',
    dialogue: 'Diálogo',
    tracking: 'Seguimiento',
    general: 'General',
  },
  choices: {
    pocket: 'Pocket (rápido)',
    supertonic: 'Supertonic (equilibrado)',
    fast: 'Rápida',
    quality: 'Máxima calidad',
    lola: 'Lola',
    alba: 'Alba',
    eve: 'Eve',
    fantine: 'Fantine',
    giovanni: 'Giovanni',
    marius: 'Marius',
    javert: 'Javert',
    michael: 'Michael',
    jane: 'Jane',
    mary: 'Mary',
    george: 'George',
    shadow: 'Observar',
    enforce: 'Aplicar',
    notify: 'Avisos',
    communication: 'Avisos y voz',
    all: 'Todo',
    nemo_transducer: 'FastConformer',
    whisper: 'Whisper',
    canary: 'Canary',
    nemo_ctc: 'NeMo CTC',
    omnilingual: 'Omnilingüe',
    f16: 'F16',
    q8_0: 'Q8',
    q4_0: 'Q4',
    auto: 'Automática',
    low: 'Rápida',
    medium: 'Equilibrada',
    high: 'Máxima',
    on: 'Activado',
    off: 'Desactivado',
    es: 'Español',
    en: 'Inglés',
  },
  keys: {
    tts: {
      engine_es: {
        label: 'Motor de voz en español',
        hint: 'Pocket responde al instante; Supertonic puede sonar más natural en español pero tarda más.',
      },
      engine_en: {
        label: 'Motor de voz en inglés',
        hint: 'Pocket es rápido y suena bien en inglés; Supertonic es la alternativa equilibrada.',
      },
      pocket_variant_es: {
        label: 'Modelo Pocket para español',
        hint: 'Rápida responde en milisegundos; Máxima calidad usa un modelo más grande y algo más lento.',
      },
      pocket_voice_es: {
        label: 'Voz en español',
        hint: 'La voz que usa Pocket cuando Argus habla en español.',
      },
      pocket_voice_en: {
        label: 'Voz en inglés',
        hint: 'La voz que usa Pocket cuando Argus habla en inglés.',
      },
      pocket_temperature: {
        label: 'Expresividad de Pocket',
        hint: 'Más alto suena más variado; más bajo, más estable.',
      },
      pocket_lsd_steps: {
        label: 'Pasos de Pocket',
        hint: 'Más pasos afinan el sonido a cambio de tiempo.',
      },
      pocket_reference_es: {
        label: 'Voz de referencia en español',
        hint: 'Archivo .wav de la carpeta de referencias para imitar una voz; vacío usa la voz elegida.',
      },
      pocket_reference_en: {
        label: 'Voz de referencia en inglés',
        hint: 'Archivo .wav de la carpeta de referencias para imitar una voz; vacío usa la voz elegida.',
      },
      normalize_text: {
        label: 'Leer números y abreviaturas',
        hint: 'Convierte horas, cifras, porcentajes y abreviaturas en palabras antes de hablar.',
      },
      speed: {
        label: 'Velocidad al hablar',
        hint: '1 es el ritmo normal; más alto habla más rápido.',
      },
      quality: {
        label: 'Calidad de la voz',
        hint: 'Más calidad suena más natural pero tarda un poco más.',
      },
      steps_low: {
        label: 'Pasos en calidad rápida',
        hint: 'Iteraciones de síntesis en el modo rápido.',
      },
      steps_medium: {
        label: 'Pasos en calidad equilibrada',
        hint: 'Iteraciones de síntesis en el modo equilibrado.',
      },
      steps_high: {
        label: 'Pasos en calidad máxima',
        hint: 'Iteraciones de síntesis en el modo máximo.',
      },
      steps_cap: {
        label: 'Límite de pasos',
        hint: '0 deja que cada calidad use sus propios pasos.',
      },
      max_chunk_len: {
        label: 'Longitud de cada fragmento',
        hint: 'Caracteres que se sintetizan de una vez.',
      },
      edge_silence_ms: {
        label: 'Silencio en los bordes (ms)',
        hint: 'Pausa al inicio y al final de cada frase.',
      },
      join_silence_ms: {
        label: 'Silencio entre fragmentos (ms)',
        hint: 'Pausa al unir fragmentos de una misma respuesta.',
      },
      threads: { label: 'Hilos de cómputo', hint: '0 los ajusta según tu equipo.' },
    },
    llm: {
      temperature: {
        label: 'Creatividad',
        hint: 'Más bajo es más preciso; más alto, más variado.',
      },
      max_tokens: {
        label: 'Largo máximo de respuesta',
        hint: 'Límite de palabras aproximadas por respuesta.',
      },
      top_k: { label: 'Top-k', hint: 'Cuántas opciones considera en cada palabra.' },
      top_p: { label: 'Top-p', hint: 'Probabilidad acumulada que se considera en cada palabra.' },
      penalty_last_n: {
        label: 'Ventana de repetición',
        hint: 'Tokens recientes que se revisan para no repetir.',
      },
      penalty_repeat: { label: 'Penalización por repetir', hint: 'Más alto evita repetir frases.' },
      penalty_freq: {
        label: 'Penalización por frecuencia',
        hint: 'Reduce palabras que ya aparecieron mucho.',
      },
      penalty_present: {
        label: 'Penalización por presencia',
        hint: 'Favorece temas nuevos en la respuesta.',
      },
      seed: { label: 'Semilla', hint: '0 usa una semilla distinta cada vez.' },
      context_size: {
        label: 'Memoria de la conversación',
        hint: 'Tokens que el modelo mantiene a la vista.',
      },
      gpu_layers: { label: 'Capas en la GPU', hint: '-1 usa la GPU todo lo posible.' },
      threads: { label: 'Hilos de respuesta', hint: '0 los ajusta según tu equipo.' },
      batch_threads: { label: 'Hilos de lectura', hint: '0 los ajusta según tu equipo.' },
      kv_type: { label: 'Precisión de la caché', hint: 'Menor precisión ahorra memoria.' },
      flash_attn: {
        label: 'Atención acelerada',
        hint: 'Acelera respuestas largas si tu equipo lo soporta.',
      },
      n_batch: {
        label: 'Lote de lectura',
        hint: 'Tokens que se procesan juntos al leer tu mensaje.',
      },
      n_ubatch: { label: 'Micro-lote', hint: 'Tamaño de cada paso del lote de lectura.' },
    },
    memory: {
      recall_top_k: {
        label: 'Recuerdos por respuesta',
        hint: 'Cuántos recuerdos puede usar al contestar.',
      },
      recall_deadline_ms: {
        label: 'Tiempo para recordar (ms)',
        hint: 'Cuánto espera a la memoria antes de responder.',
      },
      recall_max_tokens: {
        label: 'Espacio para recuerdos',
        hint: 'Tokens que ocupan los recuerdos en cada respuesta.',
      },
      extract_wait_ms: {
        label: 'Espera para aprender (ms)',
        hint: 'Cuánto espera para guardar lo que le cuentas.',
      },
      compact_max_tokens: {
        label: 'Tamaño de los resúmenes',
        hint: 'Largo de los resúmenes de conversaciones antiguas.',
      },
      observe_camera_events: {
        label: 'Recordar lo que ven las cámaras',
        hint: 'Guarda en la memoria los encuentros de las cámaras.',
      },
      embedding_preload: {
        label: 'Cargar la memoria al iniciar',
        hint: 'Recuerda más rápido a cambio de usar memoria desde el arranque.',
      },
    },
    stt: {
      language: { label: 'Idioma de la conversación', hint: 'El idioma en que le hablas a Argus.' },
      engine: {
        label: 'Motor de reconocimiento',
        hint: 'El modelo que convierte tu voz en texto.',
      },
    },
    vision: {
      max_input_px: {
        label: 'Detalle de lo que ven las cámaras',
        hint: 'Más detalle describe mejor pero tarda más.',
      },
      max_tokens: {
        label: 'Largo de cada descripción',
        hint: 'Cuánto puede extenderse al describir una imagen.',
      },
      prompt: {
        label: 'Instrucción para describir',
        hint: 'Lo que se le pide al modelo en cada imagen.',
      },
      caption_cache_slots: {
        label: 'Descripciones en caché',
        hint: 'Imágenes recientes que no necesita volver a describir.',
      },
      image_max_tokens: { label: 'Tokens por imagen', hint: '0 deja que el modelo decida.' },
      context_size: {
        label: 'Contexto de visión',
        hint: 'Tokens que el modelo de visión mantiene a la vista.',
      },
      threads: { label: 'Hilos de visión', hint: '0 los ajusta según tu equipo.' },
      gpu_layers: { label: 'Capas en la GPU', hint: '-1 usa la GPU todo lo posible.' },
    },
    objects: {
      enabled: {
        label: 'Detectar personas y objetos',
        hint: 'Reconoce lo que aparece en las cámaras.',
      },
      conf: {
        label: 'Sensibilidad de detección',
        hint: 'Más alto evita falsas alarmas; más bajo detecta más.',
      },
    },
    operator: {
      night_start: {
        label: 'Inicio de la noche',
        hint: 'Hora desde la que se vigila como de noche.',
      },
      night_end: { label: 'Fin de la noche', hint: 'Hora en que termina la vigilancia nocturna.' },
      cooldown_ms: {
        label: 'Pausa entre avisos (ms)',
        hint: 'Tiempo mínimo entre dos avisos de la misma cámara.',
      },
      person_recheck_ms: {
        label: 'Revisión de personas (ms)',
        hint: 'Cada cuánto vuelve a mirar a una persona presente.',
      },
    },
    actions: {
      enabled: {
        label: 'Acciones de las cámaras',
        hint: 'Permite que Argus hable o use la sirena de una cámara.',
      },
    },
    streaming: {
      max_viewers_per_camera: {
        label: 'Vistas por cámara',
        hint: 'Personas que pueden ver una cámara a la vez.',
      },
      max_total_viewers: {
        label: 'Vistas en total',
        hint: 'Transmisiones simultáneas en toda la casa.',
      },
      hub_window_bytes: {
        label: 'Búfer de transmisión',
        hint: 'Datos en vuelo por cada conexión de video.',
      },
    },
    health: {
      enabled: {
        label: 'Vigilar el estado de la imagen',
        hint: 'Avisa si una cámara se tapa, se oscurece o se desenfoca.',
      },
      interval_ms: {
        label: 'Cada cuánto revisar (ms)',
        hint: 'Intervalo entre revisiones de la imagen.',
      },
      dark_threshold: {
        label: 'Umbral de oscuridad',
        hint: 'Por debajo de este brillo se considera tapada.',
      },
      bright_threshold: {
        label: 'Umbral de deslumbramiento',
        hint: 'Por encima de este brillo se considera saturada.',
      },
      blur_threshold: {
        label: 'Umbral de desenfoque',
        hint: 'Por debajo de esta nitidez se considera desenfocada.',
      },
      scene_diff: {
        label: 'Cambio de escena',
        hint: 'Cuánto debe cambiar la imagen para avisar que la movieron.',
      },
      rebaseline_after_s: {
        label: 'Aceptar escena nueva (s)',
        hint: 'Tras este tiempo la nueva escena pasa a ser la normal.',
      },
    },
    notifications: {
      budget_per_hour: {
        label: 'Avisos por hora',
        hint: 'Máximo de avisos de cámara que recibes cada hora.',
      },
      fallback_suppress_known: {
        label: 'Callar a personas conocidas',
        hint: 'No avisa cuando reconoce a alguien de la casa.',
      },
      fallback_min_score_median: {
        label: 'Confianza mínima',
        hint: 'Seguridad necesaria en la detección para avisar.',
      },
      fallback_min_dwell_ms: {
        label: 'Permanencia mínima (ms)',
        hint: 'Tiempo que algo debe quedarse a la vista para avisar.',
      },
      guard_heartbeat_timeout_s: {
        label: 'Espera a la vigilancia (s)',
        hint: 'Si la vigilancia no responde en este tiempo, avisa igual.',
      },
      silent_start: {
        label: 'Inicio del silencio',
        hint: 'Hora desde la que no recibes avisos; -1 lo desactiva.',
      },
      silent_end: {
        label: 'Fin del silencio',
        hint: 'Hora en que vuelven los avisos; -1 lo desactiva.',
      },
      ack_window_s: {
        label: 'Ventana de confirmación (s)',
        hint: 'Tiempo para dar por visto un aviso.',
      },
      selftest_interval_s: {
        label: 'Autoprueba de avisos (s)',
        hint: 'Cada cuánto comprueba que los avisos llegan; 0 la apaga.',
      },
      fallback_retention_days: {
        label: 'Días de historial',
        hint: 'Cuánto tiempo se guardan los avisos de cámara.',
      },
    },
    guard: {
      notify_level: {
        label: 'Nivel para avisarte',
        hint: 'Desde qué gravedad recibes un aviso (1 = todo).',
      },
      announce_level: {
        label: 'Nivel para hablar',
        hint: 'Desde qué gravedad Argus le habla a quien llega (5 = nunca).',
      },
      alarm_level: {
        label: 'Nivel para la alarma',
        hint: 'Desde qué gravedad suena la alarma (5 = nunca).',
      },
      alarm_seconds: {
        label: 'Duración de la alarma (s)',
        hint: 'Cuánto suena la alarma de aviso.',
      },
      arm_siren: {
        label: 'Sirena en modo armado',
        hint: 'Permite la sirena cuando la casa está armada.',
      },
      siren_seconds: { label: 'Duración de la sirena (s)', hint: 'Cuánto suena la sirena.' },
      greet_enabled: { label: 'Saludar a quien llega', hint: 'Argus habla con las visitas.' },
      greet_known: {
        label: 'Saludar a conocidos',
        hint: 'También saluda a las personas de la casa.',
      },
      expected_guests: {
        label: 'Visitas esperadas',
        hint: 'Baja la alerta para quien estás esperando.',
      },
      decision_mode: {
        label: 'Modo de decisión',
        hint: 'Observar solo anota; aplicar deja que la confianza filtre avisos.',
      },
      belief_refresh_s: {
        label: 'Recarga de criterios (s)',
        hint: 'Cada cuánto se releen los criterios por cámara.',
      },
      action_cooldown_s: {
        label: 'Pausa entre acciones (s)',
        hint: 'Tiempo mínimo entre dos acciones sobre la misma situación.',
      },
      repeat_window_s: {
        label: 'Ventana de repetición (s)',
        hint: 'Durante este tiempo no repite la misma acción.',
      },
      max_actions_per_hour: {
        label: 'Acciones por hora',
        hint: 'Máximo de acciones de vigilancia cada hora.',
      },
      max_dialogue_turns: {
        label: 'Turnos de diálogo',
        hint: 'Cuántas veces conversa con una visita.',
      },
      greet_listen_seconds: {
        label: 'Escucha tras saludar (s)',
        hint: 'Cuánto espera la respuesta de la visita.',
      },
      greet_reply_enabled: {
        label: 'Responder a la visita',
        hint: 'Contesta lo que la visita dice.',
      },
      cross_camera_window_s: {
        label: 'Seguimiento entre cámaras (s)',
        hint: 'Tiempo para reconocer a la misma persona en otra cámara.',
      },
      continuity_window_s: {
        label: 'Continuidad (s)',
        hint: 'Tiempo para considerar que es el mismo encuentro.',
      },
      signature_min_similarity: {
        label: 'Parecido mínimo',
        hint: 'Similitud necesaria para unir dos apariciones.',
      },
      loiter_checks: {
        label: 'Revisiones por merodeo',
        hint: 'Veces que debe verse a alguien quieto para alertar.',
      },
      staging: { label: 'Escalado gradual', hint: 'Responde de menos a más según la situación.' },
      encounter_timeout_s: {
        label: 'Fin de un encuentro (s)',
        hint: 'Sin ver a nadie este tiempo, el encuentro termina.',
      },
      tamper_sustained_s: {
        label: 'Sabotaje sostenido (s)',
        hint: 'Una cámara tapada este tiempo genera una alerta propia.',
      },
      health_stale_s: {
        label: 'Vigencia del estado de imagen (s)',
        hint: 'Tras este tiempo un estado de cámara deja de contar.',
      },
      journal_retention_days: {
        label: 'Días del diario',
        hint: 'Cuánto se guarda el diario de decisiones.',
      },
      quiet_hours: {
        enabled: {
          label: 'Horas de silencio',
          hint: 'Avisos de menor gravedad se guardan para más tarde.',
        },
        start_hour: { label: 'Inicio del silencio', hint: 'Hora en que empieza.' },
        end_hour: { label: 'Fin del silencio', hint: 'Hora en que termina.' },
        daily_budget: {
          label: 'Avisos diarios en silencio',
          hint: 'Máximo de avisos por día durante el silencio.',
        },
      },
      belief: {
        gate_scope: {
          label: 'Alcance del filtro',
          hint: 'Qué tipo de acciones puede frenar la confianza.',
        },
        threshold_critical: {
          label: 'Umbral crítico',
          hint: 'Confianza necesaria para actuar ante lo crítico.',
        },
        threshold_high: { label: 'Umbral alto', hint: 'Confianza necesaria ante gravedad alta.' },
        threshold_medium: {
          label: 'Umbral medio',
          hint: 'Confianza necesaria ante gravedad media.',
        },
        threshold_low: { label: 'Umbral bajo', hint: 'Confianza necesaria ante gravedad baja.' },
        detector_strong: {
          label: 'Detección fuerte',
          hint: 'Desde aquí una detección cuenta como segura.',
        },
        detector_weak: {
          label: 'Detección débil',
          hint: 'Por debajo de esto una detección se ignora.',
        },
        zone_dwell_alert_ms: {
          label: 'Permanencia en zona de alerta (ms)',
          hint: 'Tiempo en una zona de alerta para sumar sospecha.',
        },
        zone_dwell_monitor_ms: {
          label: 'Permanencia en zona vigilada (ms)',
          hint: 'Tiempo en una zona vigilada para sumar sospecha.',
        },
      },
    },
    vad: {
      barge_threshold: {
        label: 'Facilidad para interrumpir',
        hint: 'Más bajo te deja interrumpir a Argus con menos voz.',
      },
      min_silence_frames: {
        label: 'Paciencia al escuchar',
        hint: 'Cuánto silencio espera antes de responder.',
      },
      threshold: {
        label: 'Umbral de voz',
        hint: 'Confianza necesaria para considerar que hablas.',
      },
      neg_threshold: {
        label: 'Umbral de silencio',
        hint: 'Por debajo de esto se considera silencio.',
      },
      min_speech_frames: {
        label: 'Voz mínima',
        hint: 'Duración mínima para tomar en cuenta lo que dices.',
      },
      max_turn_frames: {
        label: 'Turno máximo',
        hint: 'Duración máxima de un turno antes de cortarlo.',
      },
      pre_roll_frames: {
        label: 'Audio previo',
        hint: 'Audio que conserva antes de que empieces a hablar.',
      },
      min_turn_ms: { label: 'Turno mínimo (ms)', hint: 'Turnos más cortos se descartan.' },
      min_mean_prob: {
        label: 'Calidad mínima del turno',
        hint: 'Descarta turnos con poca voz clara.',
      },
      barge_min_frames: {
        label: 'Voz para interrumpir',
        hint: 'Duración de voz necesaria para cortar a Argus.',
      },
      barge_guard_ms: {
        label: 'Protección al empezar (ms)',
        hint: 'Evita que su propia voz lo interrumpa al arrancar.',
      },
      denoise: { label: 'Reducción de ruido', hint: 'Limpia el ruido de fondo antes de escuchar.' },
      denoise_gate_rms: {
        label: 'Nivel de la puerta de ruido',
        hint: 'Sonidos por debajo de este nivel se ignoran.',
      },
    },
  },
} as const;
