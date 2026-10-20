# Rediseño de Argus: resumen (v3)

20 de octubre de 2026. Es una propuesta: no toca código de la app. El detalle
está en `redesign-spec.md` y el prototipo en `redesign-prototype/index.html`,
que se abre en el navegador y tiene botones para reducir movimiento y
transparencia. Como decidiste, las reglas, el refactor y el rediseño se
implementan juntos cuando apruebes el diseño final.

## La base: el Argus de hoy, mejorado

Me dijiste que la v2 se sentía demasiado simple y que te gusta cómo se ve la
app actual. Por eso la v3 parte del diseño de hoy y lo mejora:

- **Se mantiene:**
  - el carbón cálido con tarjetas `#24231E`;
  - el papel cálido `#F4F1ED` en claro;
  - los botones crema;
  - los íconos dorados en sus cuadritos;
  - los títulos en negrita;
  - los chips;
  - la mascota con gorro, lupa y bracitos.
- **Se arregla lo que fallaba:** el saludo cortado a la mitad de la palabra,
  los chips y contadores truncados, Inicio con nueve tarjetas, la cámara de
  4.566 px, la barra lateral cortada en horizontal y la hoja que se sube
  sobre la barra de estado con el teclado.
- **Encima va la capa nueva:** el Aura, el vidrio en lo que flota, el
  movimiento con resortes y la mascota viva.

En el prototipo, cada pantalla principal muestra la **captura real de hoy**
junto al rediseño, para compararlas.

## La capa nueva: Argus es una presencia, no un tablero

- **El Aura.** Una luz suave en la parte de arriba de Inicio y Seguridad que
  respira con el estado de la casa:
  - arena cuando todo está tranquilo;
  - índigo cuando Argus vigila de noche o estás fuera;
  - ámbar si hay algo que revisar;
  - rojo con pulso más rápido en una alerta real;
  - gris si no hay conexión.
- **Una frase grande.** Una sola por pantalla: «Todo tranquilo.», «Buenas
  noches.», «Alguien en el patio.». Todo lo demás queda en silencio, al estilo
  Threads.
- **Argus vivo.** La mascota de siempre (con su gorro de detective y su lupa)
  aparece en toda la app con 11 estados: atento, de guardia, escuchando,
  pensando, hablando, contento, preocupado, alerta, descansando, sin conexión
  y saludando.
  - **El gorro significa «estoy vigilando»:** lo lleva en Noche, Fuera, Armado
    y en las alertas.
  - Nunca hay más de una mascota por pantalla, y siempre va junto a una frase
    que dice lo mismo con palabras.
- **El gesto propio: mantener el centro para hablar.** Desde cualquier
  pantalla mantienes presionada la mascota del centro de la barra. El borde de
  la pantalla se ilumina, Argus se inclina para escucharte y, al soltar, se
  envía. Un toque abre el chat.
- **Vidrio solo en lo que flota:** la barra flotante, las hojas, la barra
  lateral del escritorio y ⌘K. Nunca va detrás del texto que se lee.
- **Movimiento con física.** Tres resortes para todo: rápido para los toques,
  suave para las hojas y juguetón solo para la mascota.

Todo esto son piezas reutilizables (`Aura`, `Presence`, `Command`, el material
y los resortes); ninguna pantalla trae animaciones propias.

## Rendimiento primero

- **Dónde corre.** Toda animación corre en el hilo de UI (Reanimated o el
  motor nativo de Rive).
- **Límites por pantalla.** Como máximo dos animaciones continuas (el Aura y
  la mascota), que se pausan si no se ven, y una sola capa de desenfoque.
- **Medición.** Se mide en un Android de gama baja.
- **En Android antiguo o de gama baja**, la app pasa sola a modo ligero: sin
  desenfoque, con el Aura quieta y una mascota más simple. El mismo modo se
  puede activar a mano («Reducir efectos»).
- **Con «Reducir movimiento»**, todo queda quieto.

## Errores que la gente entiende

Nunca se muestra un código ni un mensaje del servidor. Cada código se
traduce a una frase corta que dice qué pasó y qué hacer. Si un código es
desconocido, aparece un mensaje amable genérico. Dónde aparece depende del
caso:

- **Junto al campo** si falta un dato.
- **Aviso con «Reintentar»** si falló un guardado. Por ejemplo: «No pudimos
  guardar el recordatorio. Revisa tu conexión e inténtalo de nuevo.»
- **Aviso en línea** si algo no está permitido.
- **Estado de fallo en la sección** si algo no cargó. Nunca se muestra como
  «vacío».
- **Pantalla completa** solo si se perdió la sesión.

El prototipo muestra tres ejemplos. Los textos los define la especificación
de mensajes de error del otro agente.

## La librería de hojas: tu elección se confirma

Investigué con evidencia (documentación, código fuente e issues) y
**react-native-true-sheet 3.11.x es la mejor opción**.

- Es nativa en iOS y Android.
- Se mantiene muy activamente.
- Tiene un encabezado fijo y desplazamiento interno.
- Está verificado en su código que, con el teclado abierto, no pasa de la
  barra de estado.

Las alternativas quedan descartadas:

- **@gorhom/bottom-sheet:** la animan en JavaScript y no recibe cambios desde
  mayo; sus fallos los cierra un bot.
- **El formSheet de Expo Router:** deja de subir con el teclado cuando está
  `KeyboardProvider`, que nosotros usamos.
- **La hoja de @expo/ui:** ignora el teclado.

No existe un benchmark serio de fotogramas en Android para ninguna, así que
lo mediremos en tu S21 FE antes de adoptarla.

## Diálogos, hojas y teclado

- **Cerrar.** Todo diálogo u hoja se cierra al tocar fuera, con Esc en el
  escritorio o con Atrás en Android. Hay dos excepciones:
  - las confirmaciones destructivas;
  - los formularios con algo escrito, que preguntan «¿Descartar…?» y por
    defecto siguen editando.
- **Hoja con teclado** (lo que falló hoy en tu S21 FE):
  - la hoja nunca pasa de la barra de estado;
  - su encabezado (Cancelar · título · Guardar) queda fijo;
  - el contenido se desplaza dentro de la hoja;
  - el campo activo siempre se ve, 16 dp por encima del teclado.

  Hoy esto falla porque la hoja entera sube la altura del teclado y en el
  teléfono no tiene tope.

  La especificación trae 13 pruebas que deben pasar en tu S21 FE. Entre
  ellas: el teclado Samsung con su barra de sugerencias, la vista horizontal,
  la letra al máximo y pasar de un campo a otro sin saltos.

## Escritorio y teléfono, cada uno a su manera

- **Escritorio:**
  - barra lateral;
  - ⌘K para buscar, actuar o preguntarle a Argus;
  - atajos (N nuevo, 1–5 secciones, Esc, mantener Espacio para hablar);
  - efectos al pasar el ratón;
  - columnas que aprovechan el ancho: Seguridad con cuadrícula de cámaras,
    Agenda en vista semana, Argus con un panel de contexto.
- **Teléfono:**
  - acciones al alcance del pulgar;
  - hojas nativas;
  - gestos;
  - vibración en las acciones clave.

## Lo que se mantiene de la v1

- **Barra:** Inicio · Seguridad · Argus (centro) · Agenda · Tú.
- **Inicio:** el estado, «Ahora» y Novedades.
- **Seguridad:** junta Vigilancia y Cámaras.
- **Cámara:** en vivo y sus ajustes, en dos pantallas.
- **Agenda:** Hoy, Calendario y Proyectos.
- **Componentes:** 26 en lugar de unos 300.

## Cuánto código se elimina

Se estima un 40 % menos de código de interfaz, de unas 39.000 líneas a unas
22.000. La identidad suma unas 700 líneas. La mascota pasa de unas 1.600 líneas
dibujadas a mano a un archivo de Rive y un envoltorio de unas 200.

## Decisiones que necesito de ti (nuevas en la v2)

1. **Identidad:** el Aura, la frase grande, vidrio solo en lo que flota y
   movimiento con resortes. *Recomiendo sí.*
2. **Gesto propio:** mantener el centro para hablar desde cualquier pantalla.
   Reemplaza «mantener = crear rápido» de la v1. *Recomiendo sí.*
3. **El gorro significa «vigilando»**, y la mascota nunca da a entender que la
   seguridad está apagada. *Recomiendo sí.*
4. **La mascota se hace con Rive**, nativa en iOS y Android.
   - Requiere una licencia del editor de Rive (unos 9 USD al mes) y que
     alguien rehaga la figura actual en Rive.
   - Antes, una prueba de rendimiento en un Android de gama baja.
   - *Recomiendo sí, tras la prueba.*
5. **Escritorio con la mascota animada.** Hay que permitir
   `'wasm-unsafe-eval'` en la política de seguridad de Tauri (solo con el wasm
   propio). Si WebKitGTK no lo acepta, el escritorio usa poses fijas.
   *Recomiendo sí, si la prueba pasa.*
6. **⌘K como puerta única** en el escritorio, y el botón de búsqueda en el
   teléfono. *Recomiendo sí.*
7. **Ajuste «Reducir efectos»** y modo ligero automático en Android de gama
   baja. *Recomiendo sí.*
8. **Cierre al tocar fuera**, con las dos excepciones de arriba. *Recomiendo
   sí.*
9. **Base v3:** evolucionar el aspecto de hoy en lugar de reemplazarlo.
   *Recomiendo sí.*
10. **Hoja con teclado:** tope en la barra de estado + 16 dp, encabezado fijo
    y desplazamiento interno. Se acepta solo si pasa las 13 pruebas en tu
    S21 FE. *Recomiendo sí.*
11. **Tamaño de letra del sistema hasta 200 %.** Contradice el 160 % de la
   regla F20 del plan. *Recomiendo sí y actualizar la regla.*

Siguen abiertas las decisiones de la v1 (barra, letra 16, SOS, nombres
«Lugares» y «Seguridad»). La propuesta de botones en tinta de la v1 queda
retirada: se mantiene la paleta de hoy. La sección
15 de la especificación lista dónde este diseño cambia algo del plan de
refactor, para que lo confirmes.
