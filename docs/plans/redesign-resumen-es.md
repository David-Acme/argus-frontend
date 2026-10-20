# Rediseño de Argus: resumen

20 de octubre de 2026. Esto es una propuesta: no toca código de la app. El
detalle está en `redesign-spec.md` y el prototipo en
`redesign-prototype/index.html`, que se abre en el navegador.

## La dirección

Una app tranquila y sencilla, al estilo de Threads:

- **Fondo y texto casi en blanco y negro.** Un solo color de acento (el
  arena de siempre) y tres colores de estado: verde (calma), ámbar (atención)
  y rojo (alerta real).
- **Tipografía clara.** Fuentes del sistema, texto principal en 16 y solo seis
  tamaños.
- **Poco adorno.** Líneas finas en lugar de tarjetas con sombra, y mucho aire.
- **Lo primero, el estado.** Cada pantalla abre con una frase que dice cómo
  están las cosas («Todo tranquilo en Casa») y, como mucho, una acción
  principal.
- **Natural en cada plataforma.** En el teléfono, hojas inferiores, alertas,
  vibración y respuesta al toque nativas. En el escritorio, diálogos centrados
  y estados al pasar el ratón.

## Qué cambia

**La barra inferior** pasa de 6 iconos sin nombre y un «+» flotante a 5
destinos con nombre: **Inicio · Seguridad · Argus · Agenda · Tú**.

- Argus va en el centro, donde Threads pone «crear»: hablarle a Argus es la
  forma más fácil de crear cosas («recuérdame pagar la luz»).
- Si un módulo está apagado, su pestaña desaparece.
- Un invitado ve solo 3 pestañas, centradas.

**Inicio** deja de ser un tablero de 9 tarjetas (3.759 px de alto en el
teléfono). Ahora tiene tres partes:

- el estado de la casa;
- «Ahora», con hasta 3 pendientes;
- «Novedades», como el feed de Threads.

La campana y el menú «+» desaparecen.

**Seguridad** junta Vigilancia y Cámaras en una sola pantalla:

- el modo actual con los cuatro modos a un toque;
- cuatro cámaras en vivo;
- «Lo que pasó».

Visitas, lugares y mantenimiento pasan a filas. «Entornos» se llama
«Lugares».

**La cámara** pasaba de 4.566 px a dos pantallas:

- la de en vivo: video, mantener para hablar, llamar, sirena y tres filas;
- «Ajustes de la cámara», con todo lo demás.

Lo que no aplica se oculta. Por ejemplo, en modo privacidad no aparecen
hablar ni mover.

**Agenda** junta recordatorios, eventos y tareas en «Hoy», una sola lista
ordenada por hora. Además tiene «Calendario» y «Proyectos». En el teléfono, los
proyectos son listas por estado, no tableros que se desplazan de lado.

**Tú** reúne perfil, personas, privacidad, módulos y ajustes en filas cortas.
Antes eran páginas de unos 6.200 px.

**La bienvenida** tiene un solo botón. La vinculación tiene 3 pasos claros, y
en el escritorio ya no aparece el texto pensado para el teléfono.

**Los estados son honestos.**

- Mientras carga se ve un esqueleto con la forma final, no una ruedita.
- Sin conexión se ve «Muestro lo de las 15:32».
- Un fallo ofrece «Reintentar» y nunca dice «no hay nada».
- Las acciones reversibles se hacen al instante con «Deshacer»; ya no se
  pregunta «¿Seguro?».

## Por qué es más simple

**23 componentes en lugar de unos 300.** Hoy hay 46 primitivas, 18 archivos de
layout y 243 componentes propios de cada pantalla: 26 diálogos, 30 paneles, 20
tarjetas y 17 filas distintos. Cada uno decide por su cuenta el espacio, el
tamaño táctil y los estados.

Con el rediseño, las pantallas se arman con las mismas piezas: `Section`, `Row`,
`Status`, `Sheet`, `Field`, `ResourceView` y algunas más. Cada pieza ya trae
incluidos:

- las etiquetas de accesibilidad;
- los 48 dp de área táctil;
- el modo oscuro;
- sus estados.

Revisar una pantalla pasa a ser revisar cómo combina piezas que ya están
probadas.

**Menos código propio.** Las mecánicas difíciles pasan a librerías mantenidas y
compatibles con Expo 57:

- hojas nativas: react-native-true-sheet;
- avisos con deshacer: sonner;
- vibración: expo-haptics;
- teclado: react-native-keyboard-controller, que ya usamos.

En el escritorio y la web se siguen usando los diálogos de `@rn-primitives`,
que ya tenemos.

**Cuánto código se elimina** (estimado a partir de los conteos de hoy): de unas
39.000 líneas de UI a unas 22.500, **cerca de 40 % menos** (rango 35–45 %). El
ratchet de la fase R0 lo medirá de verdad.

**Lista de detalles.** La especificación trae una lista que cada pantalla debe
pasar: vibración solo en acciones clave, área táctil, teclado, zonas seguras,
formato de fechas para es-PE, texto que no se corta, modo oscuro, movimiento
reducido. Parte de la lista se volverá una comprobación automática en la fase
R8.

## Encaje con el plan de refactor

- **R5:** sus tokens toman los valores de esta especificación (colores,
  6 tamaños de texto, espacios, radios, breakpoints 600 / 1024 / 1440).
- **R6:** construye los 23 componentes.
- **Después:** se rehacen las pantallas, empezando por la navegación e Inicio.

## Decisiones que necesito de ti

1. **Barra:** Inicio · Seguridad · Argus (centro) · Agenda · Tú, sin campana y
   sin «+» flotante. *Recomiendo sí.*
2. **Color:** botones en tinta (negro en claro, blanco en oscuro) y el arena
   como único acento, en lugar de grafito + arena. *Recomiendo sí.*
3. **Texto:** principal en 16 y fuentes del sistema, sin fuente propia.
   *Recomiendo sí.*
4. **Cámaras dentro de Seguridad**, y la página de la cámara dividida en dos.
   *Recomiendo sí.*
5. **Agenda:** Hoy + Calendario (mes en el teléfono, semana desde tablet) +
   Proyectos; se quitan las vistas Día y Lista. *Recomiendo sí.*
6. **Hojas nativas con react-native-true-sheet v3.** Primero una prueba
   (spike) en Android e iOS; si falla, se usa gorhom. *Recomiendo sí, tras la
   prueba.*
7. **Tamaño de letra del sistema hasta 200 %** en el texto principal (hoy el
   tope es 160 %). *Recomiendo sí.*
8. **Pánico:** botón «SOS» que se mantiene presionado, en Seguridad (y en el
   Inicio del invitado). *Recomiendo sí.*
9. **La mascota solo en la bienvenida y en la llamada con Argus**; se van la
   órbita y la animación del «+». *Recomiendo sí.*
10. **Nombres:** «Entornos» pasa a «Lugares», y «Vigilancia» a «Seguridad» en
    todas partes. *Recomiendo sí.*
11. **Pestaña Argus:** abre directo la conversación con Argus, y las
    conversaciones con personas quedan en su encabezado. La alternativa es una
    lista de conversaciones con Argus fijado arriba. *Recomiendo la primera.*
