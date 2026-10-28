export const advancedKeys = {
  kws: {
    threshold: {
      label: 'Wake word threshold',
      hint: 'Higher needs a clearer «Argus».',
    },
    score: {
      label: 'Wake word weight',
      hint: 'How much «Argus» counts against similar words.',
    },
    active_beams: {
      label: 'Hypotheses at once',
      hint: 'How many readings of the phrase it compares at once.',
    },
    trailing_blanks: {
      label: 'Trailing pauses',
      hint: 'Pauses it waits for after «Argus» before deciding.',
    },
  },
  guard: {
    posture_interval_s: {
      label: 'Posture check (s)',
      hint: 'How often it checks how each person in view is.',
    },
    episode_touch_publish_s: {
      label: 'Ongoing episode refresh (s)',
      hint: 'How often it refreshes an episode still under way.',
    },
    offline_sustained_s: {
      label: 'Camera offline (s)',
      hint: 'Time without picture before reporting a camera down.',
    },
    tamper: {
      cover_s: {
        label: 'Camera covered (s)',
        hint: 'Time covered before alerting.',
      },
      whiteout_s: {
        label: 'Camera dazzled (s)',
        hint: 'Time with a white picture before alerting.',
      },
      blind_s: {
        label: 'Camera blind (s)',
        hint: 'Time seeing nothing before alerting.',
      },
      blind_home_s: {
        label: 'Camera blind with people home (s)',
        hint: 'A longer margin when someone is home.',
      },
      partial_s: {
        label: 'Camera partly covered (s)',
        hint: 'Time with part of the picture covered before alerting.',
      },
      defocus_s: {
        label: 'Camera out of focus (s)',
        hint: 'Time blurred before alerting.',
      },
      reaim_s: {
        label: 'Camera moved (s)',
        hint: 'Time pointing elsewhere before alerting.',
      },
      dark_s: {
        label: 'Camera dark (s)',
        hint: 'Time in the dark before alerting.',
      },
      signal_wired_s: {
        label: 'Wired signal lost (s)',
        hint: 'Time without signal on a wired camera before alerting.',
      },
      signal_wifi_s: {
        label: 'Wi-Fi signal lost (s)',
        hint: 'Time without signal on a Wi-Fi camera before alerting.',
      },
      group_window_s: {
        label: 'Group tamper alerts (s)',
        hint: 'Alerts from several cameras in this time are told together.',
      },
      lens_notice_s: {
        label: 'Lens cleaning reminder (s)',
        hint: 'At most how often it reminds you to clean a dirty lens.',
      },
      seen_window_s: {
        label: 'Someone near the camera (s)',
        hint: 'If someone was seen in this time, it suspects tampering.',
      },
      near_share: {
        label: 'Closeness to the camera',
        hint: 'How large someone must look to count as close.',
      },
      ask_answer_s: {
        label: 'Wait for an answer (s)',
        hint: 'How long it waits for your answer before treating it as tampering.',
      },
      sweep_s: {
        label: 'Tamper sweep (s)',
        hint: 'How often it checks the cameras for tampering.',
      },
    },
    maintenance: {
      default_minutes: {
        label: 'Default maintenance (min)',
        hint: 'Length of a maintenance window if you choose none.',
      },
      max_minutes: {
        label: 'Longest maintenance (min)',
        hint: 'The longest a maintenance window can last.',
      },
      duress_window_s: {
        label: 'Duress window (s)',
        hint: 'Time a maintenance stays under suspicion.',
      },
    },
    look: {
      budget_ms: {
        label: 'Time to look closer (ms)',
        hint: 'How long it may take to look closer at something doubtful.',
      },
      cooldown_s: {
        label: 'Pause between looks (s)',
        hint: 'Shortest time before looking closer again.',
      },
    },
    marked_retention_days: {
      label: 'Keep marked items (days)',
      hint: 'How long episodes you marked are kept.',
    },
    proximity: {
      poll_ms: {
        label: 'Receiver poll (ms)',
        hint: 'How often it asks the Bluetooth receivers.',
      },
      rotate_seconds: {
        label: 'Identifier rotation (s)',
        hint: "How often your phone's signal changes so nobody can follow it.",
      },
      ble_rssi_floor: {
        label: 'Weakest phone signal',
        hint: 'Signals weaker than this are ignored.',
      },
      offline_after_ms: {
        label: 'Receiver unanswered (ms)',
        hint: 'Time without an answer before a receiver counts as down.',
      },
      request_timeout_ms: {
        label: 'Receiver timeout (ms)',
        hint: 'How long it waits for each receiver answer.',
      },
      sighting_window_ms: {
        label: 'Signal validity (ms)',
        hint: 'How long a signal counts to place someone.',
      },
      half_life_ms: {
        label: 'Gradual fading (ms)',
        hint: 'In this time a signal loses half its weight.',
      },
      switch_hold_ms: {
        label: 'Wait before changing room (ms)',
        hint: 'Avoids jumps between rooms from stray signals.',
      },
      forget_ms: {
        label: 'Forget the location (ms)',
        hint: 'Without signals in this time, it stops placing the person.',
      },
      weight_face: {
        label: 'Face weight',
        hint: 'How much seeing your face counts to know where you are.',
      },
      weight_radar_box: {
        label: 'Radar weight',
        hint: 'How much the presence radar counts.',
      },
      weight_voice: {
        label: 'Voice weight',
        hint: 'How much hearing your voice counts.',
      },
      weight_ble: {
        label: 'Phone weight',
        hint: "How much your phone's signal counts.",
      },
      night_face_factor: {
        label: 'Face at night',
        hint: 'How much seeing a face at night counts against daytime.',
      },
      switch_margin: {
        label: 'Margin to change room',
        hint: 'Lead another room needs before it switches.',
      },
    },
  },
  calls: {
    call_gap_s: {
      label: 'Gap between calls (s)',
      hint: 'Shortest time between two calls from Argus.',
    },
    max_calls_per_hour: {
      label: 'Calls per hour',
      hint: 'The most Argus may call you in an hour.',
    },
    arrival_absence_s: {
      label: 'Absence before arrivals (s)',
      hint: 'It only reports an arrival after this absence.',
    },
  },
  memory: {
    minor_refresh_ms: {
      label: 'Minor check (ms)',
      hint: 'How often it updates who at home is a minor.',
    },
  },
  watch: {
    enabled: {
      label: 'Talk through the cameras',
      hint: "Argus listens and speaks through the cameras' microphones.",
    },
    belief_enabled: {
      label: 'Use who is near',
      hint: 'Takes into account who is next to each camera.',
    },
    stage1: {
      label: 'First listening',
      hint: 'How it detects you are talking to it through a camera.',
    },
    list_refresh_ms: {
      label: 'Camera list (ms)',
      hint: 'How often it refreshes the listening cameras.',
    },
    reconnect_ms: {
      label: 'Reconnect (ms)',
      hint: 'Wait before reconnecting a microphone.',
    },
    ring_ms: {
      label: 'Attention tone (ms)',
      hint: 'Length of the sound that says it is listening.',
    },
    post_roll_ms: {
      label: 'Listening after the word (ms)',
      hint: 'Audio kept after hearing «Argus».',
    },
    wake_max_distance: {
      label: '«Argus» likeness',
      hint: 'How much what it hears may differ from «Argus».',
    },
    stt_stage1_max_ms: {
      label: 'First listening, longest (ms)',
      hint: 'The longest the quick check lasts.',
    },
    stt_stage1_min_ms: {
      label: 'First listening, shortest (ms)',
      hint: 'The shortest the quick check lasts.',
    },
    kws_hangover_ms: {
      label: 'Word hold (ms)',
      hint: 'How long it keeps the word heard after it ends.',
    },
    kws_retry_ms: {
      label: 'Listening retry (ms)',
      hint: 'Wait before retrying the word detector.',
    },
    fire_debounce_ms: {
      label: 'Avoid double triggers (ms)',
      hint: 'Ignores a second trigger within this time.',
    },
    broadcast_window_ms: {
      label: 'Same voice on several cameras (ms)',
      hint: 'Window to join the same voice heard on several cameras.',
    },
    broadcast_min_cameras: {
      label: 'Cameras to rule out the TV',
      hint: 'If this many cameras hear the same, it is the TV or radio.',
    },
    echo_max_lag_ms: {
      label: 'Echo delay (ms)',
      hint: 'Longest delay to recognise its own voice.',
    },
    fire_log_size: {
      label: 'Kept triggers',
      hint: 'How many recent triggers it keeps for review.',
    },
    arbitration_window_ms: {
      label: 'Choose a camera (ms)',
      hint: 'Time to decide which camera heard you best.',
    },
    stage2_candidates: {
      label: 'Cameras to check',
      hint: 'How many cameras it checks closely before answering.',
    },
    incomplete_hold_ms: {
      label: 'Wait for you to finish (ms)',
      hint: 'Waits if the sentence seems unfinished.',
    },
    max_turn_ms: {
      label: 'Longest turn (ms)',
      hint: 'The most it listens to at once.',
    },
    ack_after_ms: {
      label: 'Acknowledge (ms)',
      hint: 'If it takes longer, it tells you it heard you.',
    },
    fail_after_ms: {
      label: 'Give up (ms)',
      hint: 'If it cannot answer in this time, it says so.',
    },
    max_length_ms: {
      label: 'Longest conversation (ms)',
      hint: 'The longest a camera conversation lasts.',
    },
    resumable_ms: {
      label: 'Resume the conversation (ms)',
      hint: 'Time in which you can pick it up on your phone.',
    },
    reply_gap_ms: {
      label: 'Pause before replying (ms)',
      hint: 'Silence it waits for before speaking.',
    },
    camera_drop_ms: {
      label: 'Camera lost (ms)',
      hint: 'Time without audio before leaving that camera.',
    },
    face_window_ms: {
      label: 'See who speaks (ms)',
      hint: 'Time to see the face of whoever speaks.',
    },
    belief_max_age_ms: {
      label: 'Age of who is near (ms)',
      hint: 'The oldest that information may be.',
    },
    visitor_consent_asks: {
      label: 'Questions to a visitor',
      hint: 'How many times it asks a visitor whether to leave a message.',
    },
    visitor_consent_max_words: {
      label: 'Words to accept',
      hint: 'The longest a «yes» answer can be.',
    },
    visitor_reply_accept_ms: {
      label: 'Time to answer a visitor (ms)',
      hint: 'How long you can take to answer a visitor.',
    },
    visitor_reply_hold_ms: {
      label: 'Keep your reply (ms)',
      hint: 'How long your reply waits to be told to the visitor.',
    },
    visitor_reply_max_chars: {
      label: 'Longest reply',
      hint: 'The longest your reply to a visitor can be.',
    },
    stt_stage1_min_snr_db: {
      label: 'Clearest needed to listen (dB)',
      hint: 'Below this it does not try to understand.',
    },
    min_wake_snr_db: {
      label: 'Clearest «Argus» needed (dB)',
      hint: 'Below this it ignores the word.',
    },
    broadcast_spread_db: {
      label: 'Difference between cameras (dB)',
      hint: 'If all hear nearly the same, it comes from a device.',
    },
    tv_raise_db: {
      label: 'Margin over the TV (dB)',
      hint: 'How much louder than the TV you must speak.',
    },
    echo_correlation: {
      label: 'Likeness to its own voice',
      hint: 'Higher rejects less of its own echo.',
    },
    echo_raise_db: {
      label: 'Margin over its echo (dB)',
      hint: 'How much louder than its echo you must speak.',
    },
    floor_rise_db_per_s: {
      label: 'Background noise rise (dB/s)',
      hint: 'How fast it accepts there is more noise.',
    },
    floor_fall_db_per_s: {
      label: 'Background noise fall (dB/s)',
      hint: 'How fast it accepts there is less noise.',
    },
    weight_wake: {
      label: 'Word weight',
      hint: 'How much hearing «Argus» counts when choosing a camera.',
    },
    weight_snr: {
      label: 'Clarity weight',
      hint: 'How much audio clarity counts when choosing a camera.',
    },
    weight_stage2: {
      label: 'Check weight',
      hint: 'How much the close check counts when choosing a camera.',
    },
    gain_weight: {
      label: 'Volume weight',
      hint: "How much each microphone's volume counts.",
    },
    gain_alpha: {
      label: 'Volume adjustment',
      hint: "How fast it adapts to each camera's volume.",
    },
    belief_min_confidence: {
      label: 'Certainty of who is near',
      hint: 'Least certainty to use who is next to the camera.',
    },
    belief_margin: {
      label: 'Margin of who is near',
      hint: 'Least lead between two possible people.',
    },
    mic_frame_ms: {
      label: 'Audio piece (ms)',
      hint: 'Length of each piece the microphone sends.',
    },
    mic_reconnect_ms: {
      label: 'Reconnect microphone (ms)',
      hint: 'First wait before reconnecting a microphone.',
    },
    mic_reconnect_max_ms: {
      label: 'Longest reconnect wait (ms)',
      hint: 'The longest wait between retries.',
    },
    mic_linger_ms: {
      label: 'Keep the microphone (ms)',
      hint: 'Time open after it stops listening.',
    },
    mic_queue_frames: {
      label: 'Waiting audio',
      hint: 'How many audio pieces it keeps if it falls behind.',
    },
    gate_recheck_ms: {
      label: 'Recheck permissions (ms)',
      hint: 'How often it checks it may listen on each camera.',
    },
    board_refresh_ms: {
      label: 'Camera status (ms)',
      hint: 'How often it updates which cameras listen.',
    },
    max_listeners: {
      label: 'Cameras listening at once',
      hint: 'The most it listens to at the same time.',
    },
    earcon_ms: {
      label: 'Notice sound (ms)',
      hint: 'Length of the sound before speaking.',
    },
    lead_silence_ms: {
      label: 'Silence at the start (ms)',
      hint: 'Silence before its voice through the camera.',
    },
    tail_pad_ms: {
      label: 'Silence at the end (ms)',
      hint: 'Silence after its voice through the camera.',
    },
    packet_ms: {
      label: 'Voice piece (ms)',
      hint: 'Length of each piece it sends to the camera.',
    },
    speak_queue_ms: {
      label: 'Speaking queue (ms)',
      hint: 'The longest a message waits to be said.',
    },
    speak_idle_ms: {
      label: 'Close the speaker (ms)',
      hint: 'Time without speaking before closing the speaker.',
    },
    face_window_max_ms: {
      label: 'Look for the face, longest (ms)',
      hint: "The longest it looks for the speaker's face.",
    },
    face_window_max_crops: {
      label: 'Faces to check',
      hint: 'How many face crops it checks.',
    },
    sighting_hold_ms: {
      label: 'Remember who it saw (ms)',
      hint: 'How long it remembers who it saw by the camera.',
    },
    aim_in_frame_ms: {
      label: 'Person in view (ms)',
      hint: 'Time to find the person in the picture.',
    },
    aim_hfov_degrees: {
      label: 'Horizontal field to aim (°)',
      hint: 'Side-to-side angle it uses to aim.',
    },
    aim_vfov_degrees: {
      label: 'Vertical field to aim (°)',
      hint: 'Top-to-bottom angle it uses to aim.',
    },
    aim_dead_zone_percent: {
      label: 'Still zone (%)',
      hint: 'Near the centre it does not move the camera.',
    },
    aim_settle_ms: {
      label: 'Settle when aiming (ms)',
      hint: 'Wait after moving before looking.',
    },
    aim_look_ms: {
      label: 'Look when aiming (ms)',
      hint: 'How long it looks after aiming.',
    },
    aim_max_presets: {
      label: 'Positions to try',
      hint: 'How many saved positions it tries to find you.',
    },
    aim_return_ms: {
      label: 'Return after aiming (ms)',
      hint: 'Time before going back to its position.',
    },
    aim_radar_enabled: {
      label: 'Aim with the radar',
      hint: 'Uses the presence radar to aim.',
    },
    aim_radar_max_age_ms: {
      label: 'Radar age (ms)',
      hint: 'The oldest a radar reading may be.',
    },
    aim_radar_max_range_mm: {
      label: 'Radar range (mm)',
      hint: 'Farthest distance it uses from the radar.',
    },
  },
  operator: {
    detection_publish_s: {
      label: 'Detection notice (s)',
      hint: 'At most how often it reports the same detection.',
    },
  },
  recording: {
    pre_roll_s: {
      label: 'Before the event (s)',
      hint: 'Seconds kept before what was detected.',
    },
    post_roll_s: {
      label: 'After the event (s)',
      hint: 'Seconds kept after what was detected.',
    },
    segment_s: {
      label: 'Recording piece (s)',
      hint: 'Length of each recorded piece.',
    },
    pre_roll_bytes: {
      label: 'Memory for before (bytes)',
      hint: 'Space to keep what came before the event.',
    },
    max_clip_bytes: {
      label: 'Largest clip (bytes)',
      hint: 'The most a clip can take.',
    },
  },
  tamper: {
    saturated_share: {
      label: 'Burnt picture',
      hint: 'Share of white picture to count as dazzled.',
    },
    whiteout_edge_ratio: {
      label: 'Edges when dazzled',
      hint: 'Edges left to count as dazzled.',
    },
    blind_edge_ratio: {
      label: 'Edges when blind',
      hint: 'Edges left to count as blind.',
    },
    cover_entropy: {
      label: 'Detail when covered',
      hint: 'Detail below which it counts as covered.',
    },
    cover_edge_ratio: {
      label: 'Edges when covered',
      hint: 'Edges left to count as covered.',
    },
    partial_block_share: {
      label: 'Covered share',
      hint: 'What share covered counts as partly covered.',
    },
    defocus_sharpness: {
      label: 'Least sharpness',
      hint: 'Below this the camera counts as out of focus.',
    },
    reaim_shift_px: {
      label: 'Camera shift (px)',
      hint: 'Picture movement to count as moved.',
    },
    infrared_chroma: {
      label: 'Colour in night mode',
      hint: 'Most colour to recognise infrared mode.',
    },
    protect_interval_ms: {
      label: 'Picture check (ms)',
      hint: 'How often it analyses the picture for tampering.',
    },
    day_night_hold_s: {
      label: 'Pause at day or night change (s)',
      hint: 'It does not judge the picture during this change.',
    },
  },
  ptz: {
    park_seconds: {
      label: 'Return to rest (s)',
      hint: 'Time still before returning to its rest position.',
    },
    idle_release_seconds: {
      label: 'Release control (s)',
      hint: 'Time unused before releasing the camera.',
    },
    settle_ms: {
      label: 'Wait to settle (ms)',
      hint: 'Time for the picture to steady after moving.',
    },
    return_after_look_seconds: {
      label: 'Return after a look (s)',
      hint: 'Time before returning after looking at something.',
    },
    return_after_follow_seconds: {
      label: 'Return after following (s)',
      hint: 'Time before returning after following someone.',
    },
    calibrate_every_seconds: {
      label: 'Calibrate every (s)',
      hint: 'How often it recalibrates the movement.',
    },
    daily_moves: {
      label: 'Moves per day',
      hint: 'The most it moves in a day, to spare the motor.',
    },
    moves_per_minute: {
      label: 'Moves per minute',
      hint: 'The most it moves in a minute.',
    },
    dead_zone: {
      label: 'Still zone',
      hint: 'Near the centre it does not move.',
    },
    fov_h_deg: {
      label: 'Horizontal field of view (°)',
      hint: 'Angle the camera sees side to side.',
    },
    fov_v_deg: {
      label: 'Vertical field of view (°)',
      hint: 'Angle the camera sees top to bottom.',
    },
    look_budget_ms: {
      label: 'Time to look (ms)',
      hint: 'How long it may take to aim at something.',
    },
    follow_lost_seconds: {
      label: 'Stop following (s)',
      hint: 'Time without seeing the person before it stops following.',
    },
    lead_min_samples: {
      label: 'Samples to anticipate',
      hint: 'Positions it needs to predict where someone goes.',
    },
    lead_consistency: {
      label: 'Consistency to anticipate',
      hint: 'How steady the movement must be to anticipate it.',
    },
    patrol_enabled: {
      label: 'Automatic patrol',
      hint: 'Goes round its saved positions when nothing happens.',
    },
    patrol_every_seconds: {
      label: 'Patrol every (s)',
      hint: 'How often a patrol starts.',
    },
    patrol_dwell_seconds: {
      label: 'Stay at each point (s)',
      hint: 'Time it stays at each patrol position.',
    },
  },
  look: {
    enabled: {
      label: 'Look closer at doubts',
      hint: 'Crops and enlarges what is unclear before alerting.',
    },
    doubt_min_conf: {
      label: 'Doubt worth a look',
      hint: 'Least certainty for a closer look to be worth it.',
    },
    small_box_share: {
      label: 'Small object',
      hint: 'Size below which it looks closer.',
    },
    grabs: {
      label: 'Pictures per look',
      hint: 'How many pictures it takes for a closer look.',
    },
    budget_ms: {
      label: 'Time per look (ms)',
      hint: 'How long a look may take.',
    },
    crop_scale: {
      label: 'Zoom',
      hint: 'How much it enlarges the doubtful area.',
    },
    confirm_conf: {
      label: 'Certainty to confirm',
      hint: 'Certainty it needs to confirm what it saw.',
    },
    cooldown_s: {
      label: 'Pause between looks (s)',
      hint: 'Shortest time before looking again.',
    },
  },
} as const;
