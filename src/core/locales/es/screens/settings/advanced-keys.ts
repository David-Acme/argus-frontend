export const advancedKeys = {
  kws: {
    threshold: {
      label: 'Umbral de la palabra de activación',
      hint: 'Más alto exige oír «Argus» con más claridad.',
    },
    score: {
      label: 'Peso de la palabra de activación',
      hint: 'Cuánto pesa «Argus» frente a otras palabras parecidas.',
    },
    active_beams: {
      label: 'Hipótesis a la vez',
      hint: 'Cuántas formas de oír la frase compara a la vez.',
    },
    trailing_blanks: {
      label: 'Silencios al final',
      hint: 'Silencios que espera tras «Argus» antes de decidir.',
    },
  },
  guard: {
    posture_interval_s: {
      label: 'Revisión de la postura (s)',
      hint: 'Cada cuánto revisa cómo está cada persona en escena.',
    },
    episode_touch_publish_s: {
      label: 'Aviso de episodio activo (s)',
      hint: 'Cada cuánto refresca un episodio que sigue en curso.',
    },
    offline_sustained_s: {
      label: 'Cámara sin señal (s)',
      hint: 'Tiempo sin imagen antes de avisar que una cámara se cayó.',
    },
    tamper: {
      cover_s: {
        label: 'Cámara tapada (s)',
        hint: 'Tiempo tapada antes de avisar.',
      },
      whiteout_s: {
        label: 'Cámara deslumbrada (s)',
        hint: 'Tiempo con la imagen en blanco antes de avisar.',
      },
      blind_s: {
        label: 'Cámara ciega (s)',
        hint: 'Tiempo sin ver nada antes de avisar.',
      },
      blind_home_s: {
        label: 'Cámara ciega con gente en casa (s)',
        hint: 'Margen mayor cuando hay alguien en casa.',
      },
      partial_s: {
        label: 'Cámara medio tapada (s)',
        hint: 'Tiempo con parte de la imagen tapada antes de avisar.',
      },
      defocus_s: {
        label: 'Cámara desenfocada (s)',
        hint: 'Tiempo borrosa antes de avisar.',
      },
      reaim_s: {
        label: 'Cámara movida (s)',
        hint: 'Tiempo apuntando a otro lado antes de avisar.',
      },
      dark_s: {
        label: 'Cámara a oscuras (s)',
        hint: 'Tiempo a oscuras antes de avisar.',
      },
      signal_wired_s: {
        label: 'Corte de cable (s)',
        hint: 'Tiempo sin señal de una cámara cableada antes de avisar.',
      },
      signal_wifi_s: {
        label: 'Corte de wifi (s)',
        hint: 'Tiempo sin señal de una cámara wifi antes de avisar.',
      },
      group_window_s: {
        label: 'Agrupar avisos de manipulación (s)',
        hint: 'Avisos de varias cámaras en este tiempo se cuentan juntos.',
      },
      lens_notice_s: {
        label: 'Recordar limpiar el lente (s)',
        hint: 'Cada cuánto como máximo recuerda limpiar un lente sucio.',
      },
      seen_window_s: {
        label: 'Alguien cerca de la cámara (s)',
        hint: 'Si se vio a alguien en este tiempo, sospecha manipulación.',
      },
      near_share: {
        label: 'Cercanía a la cámara',
        hint: 'Qué tan grande debe verse alguien para contar como cerca.',
      },
      ask_answer_s: {
        label: 'Esperar respuesta (s)',
        hint: 'Cuánto espera tu respuesta antes de tratarlo como manipulación.',
      },
      sweep_s: {
        label: 'Revisión de manipulación (s)',
        hint: 'Cada cuánto revisa las cámaras por manipulación.',
      },
    },
    maintenance: {
      default_minutes: {
        label: 'Mantenimiento por defecto (min)',
        hint: 'Duración de una ventana de mantenimiento si no eliges otra.',
      },
      max_minutes: {
        label: 'Mantenimiento máximo (min)',
        hint: 'Lo más que puede durar una ventana de mantenimiento.',
      },
      duress_window_s: {
        label: 'Margen tras un código de coacción (s)',
        hint: 'Tiempo en que un mantenimiento sigue bajo sospecha.',
      },
    },
    look: {
      budget_ms: {
        label: 'Tiempo para mirar mejor (ms)',
        hint: 'Cuánto puede tardar en mirar de cerca algo dudoso.',
      },
      cooldown_s: {
        label: 'Pausa entre miradas (s)',
        hint: 'Tiempo mínimo antes de volver a mirar de cerca.',
      },
    },
    marked_retention_days: {
      label: 'Guardar lo marcado (días)',
      hint: 'Cuánto se guardan los episodios que marcaste.',
    },
    proximity: {
      poll_ms: {
        label: 'Consulta de receptores (ms)',
        hint: 'Cada cuánto pregunta a los receptores Bluetooth.',
      },
      rotate_seconds: {
        label: 'Cambio de identificador (s)',
        hint: 'Cada cuánto cambia la señal de tu celular para que nadie la siga.',
      },
      ble_rssi_floor: {
        label: 'Señal mínima del celular',
        hint: 'Señales más débiles que esta se ignoran.',
      },
      offline_after_ms: {
        label: 'Receptor sin respuesta (ms)',
        hint: 'Tiempo sin respuesta antes de dar un receptor por caído.',
      },
      request_timeout_ms: {
        label: 'Espera por receptor (ms)',
        hint: 'Cuánto espera cada respuesta de un receptor.',
      },
      sighting_window_ms: {
        label: 'Validez de una señal (ms)',
        hint: 'Cuánto vale una señal para ubicar a alguien.',
      },
      half_life_ms: {
        label: 'Olvido gradual (ms)',
        hint: 'En este tiempo una señal pierde la mitad de su peso.',
      },
      switch_hold_ms: {
        label: 'Espera antes de cambiar de habitación (ms)',
        hint: 'Evita saltos entre habitaciones por señales sueltas.',
      },
      forget_ms: {
        label: 'Olvidar la ubicación (ms)',
        hint: 'Sin señales en este tiempo, deja de ubicar a la persona.',
      },
      weight_face: {
        label: 'Peso del rostro',
        hint: 'Cuánto cuenta ver la cara para saber dónde estás.',
      },
      weight_radar_box: {
        label: 'Peso del radar',
        hint: 'Cuánto cuenta el radar de presencia.',
      },
      weight_voice: {
        label: 'Peso de la voz',
        hint: 'Cuánto cuenta oír tu voz.',
      },
      weight_ble: {
        label: 'Peso del celular',
        hint: 'Cuánto cuenta la señal de tu celular.',
      },
      night_face_factor: {
        label: 'Rostro de noche',
        hint: 'Cuánto vale ver la cara de noche frente al día.',
      },
      switch_margin: {
        label: 'Margen para cambiar de habitación',
        hint: 'Ventaja que necesita otra habitación para cambiar.',
      },
    },
  },
  calls: {
    call_gap_s: {
      label: 'Pausa entre llamadas (s)',
      hint: 'Tiempo mínimo entre dos llamadas de Argus.',
    },
    max_calls_per_hour: {
      label: 'Llamadas por hora',
      hint: 'Lo más que Argus puede llamarte en una hora.',
    },
    arrival_absence_s: {
      label: 'Ausencia para avisar llegadas (s)',
      hint: 'Solo avisa una llegada tras esta ausencia.',
    },
  },
  memory: {
    minor_refresh_ms: {
      label: 'Revisión de menores (ms)',
      hint: 'Cada cuánto actualiza quién es menor de edad en casa.',
    },
  },
  watch: {
    enabled: {
      label: 'Hablar por las cámaras',
      hint: 'Argus escucha y habla por los micrófonos de las cámaras.',
    },
    belief_enabled: {
      label: 'Usar quién está cerca',
      hint: 'Tiene en cuenta quién está junto a cada cámara.',
    },
    stage1: {
      label: 'Primera escucha',
      hint: 'Cómo detecta que le hablas por una cámara.',
    },
    list_refresh_ms: {
      label: 'Lista de cámaras (ms)',
      hint: 'Cada cuánto actualiza las cámaras que escuchan.',
    },
    reconnect_ms: {
      label: 'Reconexión (ms)',
      hint: 'Espera antes de volver a conectar un micrófono.',
    },
    ring_ms: {
      label: 'Tono de atención (ms)',
      hint: 'Duración del sonido que avisa que te escucha.',
    },
    post_roll_ms: {
      label: 'Escucha tras la palabra (ms)',
      hint: 'Audio que guarda tras oír «Argus».',
    },
    wake_max_distance: {
      label: 'Parecido de «Argus»',
      hint: 'Cuánto puede variar lo que oye de «Argus».',
    },
    stt_stage1_max_ms: {
      label: 'Primera escucha, máximo (ms)',
      hint: 'Lo más que dura la comprobación rápida.',
    },
    stt_stage1_min_ms: {
      label: 'Primera escucha, mínimo (ms)',
      hint: 'Lo menos que dura la comprobación rápida.',
    },
    kws_hangover_ms: {
      label: 'Retención de la palabra (ms)',
      hint: 'Cuánto mantiene oída la palabra tras terminar.',
    },
    kws_retry_ms: {
      label: 'Reintento de la escucha (ms)',
      hint: 'Espera antes de reintentar el detector de la palabra.',
    },
    fire_debounce_ms: {
      label: 'Evitar dobles activaciones (ms)',
      hint: 'Ignora una segunda activación en este tiempo.',
    },
    broadcast_window_ms: {
      label: 'Oír la misma voz en varias cámaras (ms)',
      hint: 'Ventana para juntar la misma voz oída en varias cámaras.',
    },
    broadcast_min_cameras: {
      label: 'Cámaras para descartar la tele',
      hint: 'Si tantas cámaras oyen lo mismo, es la tele o la radio.',
    },
    echo_max_lag_ms: {
      label: 'Retardo del eco (ms)',
      hint: 'Retardo máximo para reconocer su propia voz.',
    },
    fire_log_size: {
      label: 'Activaciones guardadas',
      hint: 'Cuántas activaciones recientes guarda para revisar.',
    },
    arbitration_window_ms: {
      label: 'Elegir cámara (ms)',
      hint: 'Tiempo para decidir qué cámara te oyó mejor.',
    },
    stage2_candidates: {
      label: 'Cámaras a comprobar',
      hint: 'Cuántas cámaras comprueba a fondo antes de responder.',
    },
    incomplete_hold_ms: {
      label: 'Esperar a que termines (ms)',
      hint: 'Espera si la frase parece a medias.',
    },
    max_turn_ms: {
      label: 'Turno más largo (ms)',
      hint: 'Lo más que escucha de una sola vez.',
    },
    ack_after_ms: {
      label: 'Confirmar que oyó (ms)',
      hint: 'Si tarda más, te dice que te oyó.',
    },
    fail_after_ms: {
      label: 'Rendirse (ms)',
      hint: 'Si no logra responder en este tiempo, lo dice.',
    },
    max_length_ms: {
      label: 'Conversación más larga (ms)',
      hint: 'Lo más que dura una conversación por cámara.',
    },
    resumable_ms: {
      label: 'Seguir la conversación (ms)',
      hint: 'Tiempo en que puedes retomarla en el teléfono.',
    },
    reply_gap_ms: {
      label: 'Pausa antes de responder (ms)',
      hint: 'Silencio que espera antes de hablar.',
    },
    camera_drop_ms: {
      label: 'Cámara perdida (ms)',
      hint: 'Tiempo sin audio antes de dejar esa cámara.',
    },
    face_window_ms: {
      label: 'Ver quién habla (ms)',
      hint: 'Tiempo para ver la cara de quien habla.',
    },
    belief_max_age_ms: {
      label: 'Antigüedad de quién está cerca (ms)',
      hint: 'Lo más vieja que puede ser esa información.',
    },
    visitor_consent_asks: {
      label: 'Preguntas a una visita',
      hint: 'Cuántas veces pregunta a una visita si quiere dejar un mensaje.',
    },
    visitor_consent_max_words: {
      label: 'Palabras para aceptar',
      hint: 'Lo más larga que puede ser la respuesta «sí».',
    },
    visitor_reply_accept_ms: {
      label: 'Tiempo para responder a una visita (ms)',
      hint: 'Cuánto puedes tardar en contestar a una visita.',
    },
    visitor_reply_hold_ms: {
      label: 'Guardar tu respuesta (ms)',
      hint: 'Cuánto espera tu respuesta para decírsela a la visita.',
    },
    visitor_reply_max_chars: {
      label: 'Respuesta más larga',
      hint: 'Lo más larga que puede ser tu respuesta a una visita.',
    },
    stt_stage1_min_snr_db: {
      label: 'Claridad mínima para escuchar (dB)',
      hint: 'Por debajo, no intenta entender.',
    },
    min_wake_snr_db: {
      label: 'Claridad mínima de «Argus» (dB)',
      hint: 'Por debajo, ignora la palabra.',
    },
    broadcast_spread_db: {
      label: 'Diferencia entre cámaras (dB)',
      hint: 'Si todas oyen casi igual, viene de un aparato.',
    },
    tv_raise_db: {
      label: 'Margen sobre la tele (dB)',
      hint: 'Cuánto más fuerte que la tele debes hablar.',
    },
    echo_correlation: {
      label: 'Parecido con su propia voz',
      hint: 'Más alto descarta menos su propio eco.',
    },
    echo_raise_db: {
      label: 'Margen sobre su eco (dB)',
      hint: 'Cuánto más fuerte que su eco debes hablar.',
    },
    floor_rise_db_per_s: {
      label: 'Subida del ruido de fondo (dB/s)',
      hint: 'Qué tan rápido acepta que hay más ruido.',
    },
    floor_fall_db_per_s: {
      label: 'Bajada del ruido de fondo (dB/s)',
      hint: 'Qué tan rápido acepta que hay menos ruido.',
    },
    weight_wake: {
      label: 'Peso de la palabra',
      hint: 'Cuánto pesa oír «Argus» al elegir cámara.',
    },
    weight_snr: {
      label: 'Peso de la claridad',
      hint: 'Cuánto pesa la claridad del audio al elegir cámara.',
    },
    weight_stage2: {
      label: 'Peso de la comprobación',
      hint: 'Cuánto pesa la comprobación a fondo al elegir cámara.',
    },
    gain_weight: {
      label: 'Peso del volumen',
      hint: 'Cuánto pesa el volumen de cada micrófono.',
    },
    gain_alpha: {
      label: 'Ajuste del volumen',
      hint: 'Qué tan rápido se adapta al volumen de cada cámara.',
    },
    belief_min_confidence: {
      label: 'Certeza de quién está cerca',
      hint: 'Certeza mínima para usar quién está junto a la cámara.',
    },
    belief_margin: {
      label: 'Margen de quién está cerca',
      hint: 'Ventaja mínima entre dos personas posibles.',
    },
    mic_frame_ms: {
      label: 'Trozo de audio (ms)',
      hint: 'Duración de cada trozo que envía el micrófono.',
    },
    mic_reconnect_ms: {
      label: 'Reconectar micrófono (ms)',
      hint: 'Primera espera antes de reconectar un micrófono.',
    },
    mic_reconnect_max_ms: {
      label: 'Espera máxima para reconectar (ms)',
      hint: 'La espera más larga entre reintentos.',
    },
    mic_linger_ms: {
      label: 'Mantener el micrófono (ms)',
      hint: 'Tiempo abierto tras dejar de escuchar.',
    },
    mic_queue_frames: {
      label: 'Audio en espera',
      hint: 'Cuántos trozos de audio guarda si se atrasa.',
    },
    gate_recheck_ms: {
      label: 'Revisar permisos (ms)',
      hint: 'Cada cuánto revisa si puede escuchar por cada cámara.',
    },
    board_refresh_ms: {
      label: 'Estado de las cámaras (ms)',
      hint: 'Cada cuánto actualiza qué cámaras escuchan.',
    },
    max_listeners: {
      label: 'Cámaras escuchando a la vez',
      hint: 'Lo más que escucha al mismo tiempo.',
    },
    earcon_ms: {
      label: 'Sonido de aviso (ms)',
      hint: 'Duración del sonido antes de hablar.',
    },
    lead_silence_ms: {
      label: 'Silencio al empezar (ms)',
      hint: 'Silencio antes de su voz por la cámara.',
    },
    tail_pad_ms: {
      label: 'Silencio al terminar (ms)',
      hint: 'Silencio tras su voz por la cámara.',
    },
    packet_ms: {
      label: 'Trozo de voz (ms)',
      hint: 'Duración de cada trozo que envía a la cámara.',
    },
    speak_queue_ms: {
      label: 'Cola para hablar (ms)',
      hint: 'Lo más que espera un mensaje para decirse.',
    },
    speak_idle_ms: {
      label: 'Cerrar el altavoz (ms)',
      hint: 'Tiempo sin hablar antes de cerrar el altavoz.',
    },
    face_window_max_ms: {
      label: 'Buscar la cara, máximo (ms)',
      hint: 'Lo más que busca la cara de quien habla.',
    },
    face_window_max_crops: {
      label: 'Rostros a revisar',
      hint: 'Cuántos recortes de cara revisa.',
    },
    sighting_hold_ms: {
      label: 'Recordar a quien vio (ms)',
      hint: 'Cuánto recuerda a quien vio junto a la cámara.',
    },
    aim_in_frame_ms: {
      label: 'Persona en imagen (ms)',
      hint: 'Tiempo para encontrar a la persona en la imagen.',
    },
    aim_hfov_degrees: {
      label: 'Campo horizontal para apuntar (°)',
      hint: 'Ángulo de lado a lado que usa para apuntar.',
    },
    aim_vfov_degrees: {
      label: 'Campo vertical para apuntar (°)',
      hint: 'Ángulo de arriba abajo que usa para apuntar.',
    },
    aim_dead_zone_percent: {
      label: 'Zona sin mover (%)',
      hint: 'Cerca del centro no mueve la cámara.',
    },
    aim_settle_ms: {
      label: 'Estabilizar al apuntar (ms)',
      hint: 'Espera tras moverse antes de mirar.',
    },
    aim_look_ms: {
      label: 'Mirar al apuntar (ms)',
      hint: 'Cuánto mira tras apuntar.',
    },
    aim_max_presets: {
      label: 'Posiciones a probar',
      hint: 'Cuántas posiciones guardadas prueba para encontrarte.',
    },
    aim_return_ms: {
      label: 'Volver tras apuntar (ms)',
      hint: 'Tiempo antes de volver a su posición.',
    },
    aim_radar_enabled: {
      label: 'Apuntar con el radar',
      hint: 'Usa el radar de presencia para apuntar.',
    },
    aim_radar_max_age_ms: {
      label: 'Antigüedad del radar (ms)',
      hint: 'Lo más vieja que puede ser una lectura del radar.',
    },
    aim_radar_max_range_mm: {
      label: 'Alcance del radar (mm)',
      hint: 'Distancia máxima que usa del radar.',
    },
  },
  operator: {
    detection_publish_s: {
      label: 'Aviso de detección (s)',
      hint: 'Cada cuánto como máximo avisa la misma detección.',
    },
  },
  recording: {
    pre_roll_s: {
      label: 'Antes del evento (s)',
      hint: 'Segundos que guarda antes de lo detectado.',
    },
    post_roll_s: {
      label: 'Después del evento (s)',
      hint: 'Segundos que guarda después de lo detectado.',
    },
    segment_s: {
      label: 'Trozo de grabación (s)',
      hint: 'Duración de cada trozo grabado.',
    },
    pre_roll_bytes: {
      label: 'Memoria para lo anterior (bytes)',
      hint: 'Espacio para guardar lo previo al evento.',
    },
    max_clip_bytes: {
      label: 'Clip más grande (bytes)',
      hint: 'Lo más que puede ocupar un clip.',
    },
  },
  tamper: {
    saturated_share: {
      label: 'Imagen quemada',
      hint: 'Parte de la imagen en blanco para contar como deslumbrada.',
    },
    whiteout_edge_ratio: {
      label: 'Bordes con deslumbramiento',
      hint: 'Bordes que quedan para contar como deslumbrada.',
    },
    blind_edge_ratio: {
      label: 'Bordes con cámara ciega',
      hint: 'Bordes que quedan para contar como ciega.',
    },
    cover_entropy: {
      label: 'Detalle con cámara tapada',
      hint: 'Detalle por debajo del cual se considera tapada.',
    },
    cover_edge_ratio: {
      label: 'Bordes con cámara tapada',
      hint: 'Bordes que quedan para contar como tapada.',
    },
    partial_block_share: {
      label: 'Parte tapada',
      hint: 'Qué parte tapada cuenta como medio tapada.',
    },
    defocus_sharpness: {
      label: 'Nitidez mínima',
      hint: 'Por debajo, la cámara cuenta como desenfocada.',
    },
    reaim_shift_px: {
      label: 'Desplazamiento de la cámara (px)',
      hint: 'Movimiento de la imagen para contar como movida.',
    },
    infrared_chroma: {
      label: 'Color en modo nocturno',
      hint: 'Color máximo para reconocer el modo infrarrojo.',
    },
    protect_interval_ms: {
      label: 'Revisión de la imagen (ms)',
      hint: 'Cada cuánto analiza la imagen por manipulación.',
    },
    day_night_hold_s: {
      label: 'Pausa al cambiar día o noche (s)',
      hint: 'No juzga la imagen durante este cambio.',
    },
  },
  ptz: {
    park_seconds: {
      label: 'Volver a la posición de reposo (s)',
      hint: 'Tiempo quieta antes de volver a su posición.',
    },
    idle_release_seconds: {
      label: 'Soltar el control (s)',
      hint: 'Tiempo sin uso antes de soltar la cámara.',
    },
    settle_ms: {
      label: 'Esperar a que se detenga (ms)',
      hint: 'Tiempo para que la imagen se estabilice tras moverse.',
    },
    return_after_look_seconds: {
      label: 'Volver tras mirar (s)',
      hint: 'Tiempo antes de volver después de mirar algo.',
    },
    return_after_follow_seconds: {
      label: 'Volver tras seguir (s)',
      hint: 'Tiempo antes de volver después de seguir a alguien.',
    },
    calibrate_every_seconds: {
      label: 'Calibrar cada (s)',
      hint: 'Cada cuánto recalibra el movimiento.',
    },
    daily_moves: {
      label: 'Movimientos por día',
      hint: 'Lo más que se mueve en un día, para cuidar el motor.',
    },
    moves_per_minute: {
      label: 'Movimientos por minuto',
      hint: 'Lo más que se mueve en un minuto.',
    },
    dead_zone: {
      label: 'Zona sin movimiento',
      hint: 'Cerca del centro no se mueve.',
    },
    fov_h_deg: {
      label: 'Campo de visión horizontal (°)',
      hint: 'Ángulo que ve la cámara de lado a lado.',
    },
    fov_v_deg: {
      label: 'Campo de visión vertical (°)',
      hint: 'Ángulo que ve la cámara de arriba abajo.',
    },
    look_budget_ms: {
      label: 'Tiempo para mirar (ms)',
      hint: 'Cuánto puede tardar en apuntar a algo.',
    },
    follow_lost_seconds: {
      label: 'Dejar de seguir (s)',
      hint: 'Tiempo sin ver a la persona antes de dejar de seguirla.',
    },
    lead_min_samples: {
      label: 'Muestras para anticipar',
      hint: 'Posiciones que necesita para prever hacia dónde va alguien.',
    },
    lead_consistency: {
      label: 'Coherencia para anticipar',
      hint: 'Qué tan constante debe ser el movimiento para anticiparse.',
    },
    patrol_enabled: {
      label: 'Ronda automática',
      hint: 'Recorre sus posiciones guardadas cuando no hay nada.',
    },
    patrol_every_seconds: {
      label: 'Ronda cada (s)',
      hint: 'Cada cuánto empieza una ronda.',
    },
    patrol_dwell_seconds: {
      label: 'Pausa en cada punto (s)',
      hint: 'Tiempo que se queda en cada posición de la ronda.',
    },
  },
  look: {
    enabled: {
      label: 'Mirar mejor lo dudoso',
      hint: 'Recorta y amplía lo que no está claro antes de avisar.',
    },
    doubt_min_conf: {
      label: 'Desde qué duda mirar',
      hint: 'Certeza mínima para que valga la pena mirar mejor.',
    },
    small_box_share: {
      label: 'Objeto pequeño',
      hint: 'Tamaño por debajo del cual mira mejor.',
    },
    grabs: {
      label: 'Imágenes por mirada',
      hint: 'Cuántas imágenes toma para mirar mejor.',
    },
    budget_ms: {
      label: 'Tiempo por mirada (ms)',
      hint: 'Cuánto puede tardar una mirada.',
    },
    crop_scale: {
      label: 'Ampliación',
      hint: 'Cuánto amplía la zona dudosa.',
    },
    confirm_conf: {
      label: 'Certeza para confirmar',
      hint: 'Certeza que necesita para confirmar lo visto.',
    },
    cooldown_s: {
      label: 'Pausa entre miradas (s)',
      hint: 'Tiempo mínimo antes de volver a mirar.',
    },
  },
} as const;
