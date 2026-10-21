# Refactor del frontend: resumen ejecutivo

20 de octubre de 2026. Todo está medido sobre `master` en el commit `09cf103`.
Detalle en `frontend-refactor-plan.md`, `frontend-rules-final.md` y
`error-messages-spec.md`.

## Dónde estamos

El plan del 3 de octubre funcionó. Dejó 0 violaciones de fronteras, bajó el
bundle de 8,5 a 5,3 MB y cortó `shared/components` de 11,8k a 3,9k líneas.
Desde entonces hubo 475 commits en 17 días y el código pasó de 30.800 a 92.900
líneas. Las puertas que ya existen siguen en verde: comentarios, fronteras y
lint. Lo que no se medía es justo lo que creció, y ahí es donde aparecen los
bugs que encuentran las pruebas reales.

## Los diez hallazgos

1. **Tamaño y complejidad sin presupuesto.** 76 funciones superan la
   complejidad 15. `CameraDetailScreen` llega a 70, con 528 líneas, y cambió 23
   veces en 17 días. Hay 133 funciones de más de 80 líneas y 32 archivos de
   más de 300.
2. **Un ciclo entre features.** cámaras, seguridad, voz y respuesta forman un
   ciclo de 21 archivos. El gate actual no detecta ciclos.
3. **`core/` es un cajón.** Tiene 26.300 líneas, 13 servicios de dominio y 100
   archivos de tipos, interfaces y contratos en barriles globales. Hay 71
   imports que se saltan el barril.
4. **El arranque es una secuencia imperativa.** Hay 61 singletons. Las
   respuestas que llegan durante el arranque se pierden: Home muestra 0
   detecciones en vez de 5.
5. **La puerta de privacidad falla abierta**, verificado en el código:
   `if (!me || !needsConsent(me)) return children;`. Mientras carga o si
   falla, la app entra sin consentimiento.
6. **Errores mostrados como hechos.** Hay unos 14 casos, por ejemplo "Sin
   sesiones abiertas" cuando la petición falló. No existe un estado "dato
   viejo".
7. **Datos del servidor sin validar.** 85 de 164 llamadas HTTP no pasan por
   ningún esquema. Por eso la pantalla mostró la clave cruda
   `screens.security.episodes.subject.household`. Hay además 132 claves de
   traducción construidas con plantillas.
8. **Tokens y responsive duplicados.** Los 59 colores HEX se copian a mano a
   OKLCH, hay 74 colores literales y 114 valores arbitrarios. Además conviven
   dos sistemas de breakpoints, uno en CSS (480) y otro en JS (640). La auditoría del mapa de UI encontró texto cortado en 863 de 1.740
   capturas, solapamientos en 416 y objetivos táctiles pequeños en 304.
9. **Tests sin componentes.** Hay 1.861 tests unitarios, pero ninguno renderiza
   un componente. 14 tests leen el código fuente como texto. Ninguno de los 40
   hallazgos web se volvió a probar, y dos arreglos rompieron la navegación.
10. **Higiene.** El bundle creció a 6,6 MB sin presupuesto, 641 archivos no
    pasan Prettier y hay 347 `useCallback` con el React Compiler activo. La
    duplicación es baja (0,5 %), así que no es el problema.

## Fases

| Fase | Qué hace |
|---|---|
| R0 | Puertas como trinquete: complejidad, ciclos, formato, tamaño de bundle y contadores con línea base. No cambia ningún comportamiento |
| R1 | Confianza: una máquina de estados de sesión (`AppPhase`), puertas que fallan cerradas y `Resource<T>` con `ResourceView` |
| R2 | Validar todo dato del servidor con zod. Enums abiertos y traducciones por mapa |
| R3 | Capas `platform/` y `entities/` en lugar de `core/`, un dominio por commit |
| R4 | `widgets/` para romper el ciclo |
| R5 | Una sola fuente de tokens y de breakpoints. **Base del rediseño** |
| R6 | Completar el sistema de diseño: primitivas táctiles, de estado y de layout. **Base del rediseño** |
| R7 | Partir los puntos calientes (cámara, agenda, proyectos, módulos, voz) |
| R8 | Tests de componente reales, navegación, auditoría de layout, WebKit y un smoke con Maestro |
| R9 | Rendimiento y arranque |
| R10 | Documentación por slice |

Desde tu decisión del 20 de octubre, las fases y el rediseño forman un solo
programa, en los pasos S0–S4 que se explican más abajo. Ya no hay que esperar
a que terminen R5 y R6 para empezar el rediseño.

## Reglas del frontend

Las reglas finales están en `frontend-rules-final.md`. Son 36 y sustituyen a
las F1–F33. El texto listo para pegar en `AGENTS.md` está en
`AGENTS-rules-section.md`. Las fuentes que las respaldan están en
`docs/references.md`.

**Todavía no se ha implementado nada.** Se implementan junto con el rediseño,
como un solo programa (ver más abajo).

Cada regla tiene una puerta automática con una línea base que solo puede
bajar, igual que en el backend.

**Cómo funcionan las reglas**

1. Toda regla se mide con una puerta. Si una puerta no puede ejecutarse,
   falla.
2. ESLint se configura solo en `eslint.config.js`:
   - Los comentarios `eslint-disable` no tienen efecto y además están
     prohibidos.
   - Una regla solo se apaga de una en una, para las rutas que lo
     necesitan, y con su motivo anotado en `CONTEXT.md`.
   - Nunca se apagan todas ni se desactiva un preset entero.
   - No hay avisos: todo es error.
   - La deuda vieja va al archivo de supresiones de ESLint, que solo puede
     encogerse.
3. Ningún comentario en el código. Esta regla se mantiene.
4. Las dudas se resuelven con las fuentes de `docs/references.md`, que dice
   qué fuente manda en cada tema.
5. Todo agente recibe estas reglas cuando se le delega trabajo.

**Estructura: un solo sitio para cada cosa**

6. Las capas son `app`, `features`, `widgets`, `entities`, `platform` y
   `shared`. Cada una importa solo de las capas que tiene debajo.
7. Cada slice se usa solo a través de su `index.ts`. No se importa nada de
   su interior y no se usa `export *`.
8. No hay ciclos de imports.
9. Las rutas son una sola línea. Los layouts solo componen.
10. **Un único sitio para cada tipo de cosa:**
    - los colores y medidas, en los tokens;
    - los iconos, en su registro;
    - los textos, en los diccionarios;
    - los errores, en un único mapa;
    - las fechas, en el formateador;
    - los tipos, sacados del esquema.
11. **Nada duplicado y nada muerto:**
    - Una puerta mide el código copiado con jscpd.
    - Ningún nombre exportado está repetido. Hoy hay 5.
    - El código muerto se detecta con knip.
    - Solo pasa a `shared/` lo que usan dos o más consumidores.
12. Cada slice tiene siempre las mismas carpetas, y todos los archivos se
    nombran en kebab-case.

**Datos y confianza**

13. Todo dato del servidor se valida con zod. Nunca se fuerza su tipo.
14. Las puertas de acceso, consentimiento y privacidad tienen tres estados y
    fallan cerradas. Si falta la respuesta, la puerta deniega.
15. Una sola máquina de estados gobierna la sesión.
16. **Un fallo nunca se muestra como un hecho.** Mientras algo carga se ve un
    esqueleto, nunca "no hay nada".
17. Cada dato tiene un solo dueño.
18. Las acciones no se disparan dos veces:
    - Lo que se puede deshacer se hace al momento y ofrece Deshacer.
    - Lo irreversible se confirma antes de hacerlo.
19. La persistencia local y el pintado desde la caché se mantienen como
    están.
20. **Errores con palabras humanas:**
    - El usuario nunca ve un código, un estado HTTP ni un mensaje del
      servidor.
    - Cada código se traduce a un mensaje corto en español e inglés, que dice
      qué pasó y qué hacer.
    - El mensaje aparece en el lugar adecuado: bajo el campo, en un aviso con
      Reintentar, en la propia sección o a pantalla completa.
    - Los códigos solo van a los registros.

**Interfaz**

21. Los tokens tienen una sola fuente, `tokens.ts`, con los valores del
    rediseño. De ahí se genera el CSS y se comprueba el contraste.
22. No hay valores arbitrarios, ni colores sueltos, ni tamaños en estilos en
    línea.
23. Un solo sistema responsive, con los puntos de corte 600, 1024 y 1440.
24. **El sistema de diseño son 26 componentes**, y las pantallas solo los
    combinan:
    - Ninguna pantalla usa directamente `Pressable`, `Image` ni las listas de
      React Native.
    - Todo panel se cierra tocando fuera de él, salvo las confirmaciones
      destructivas y los formularios con cambios sin guardar.
25. La accesibilidad está en los tipos:
    - Botones de 48 dp.
    - Texto que crece hasta 2,0.
    - Contraste AA.
    - Etiquetas obligatorias.
    - Se respetan "reducir movimiento" y "reducir transparencia".
26. **Animaciones elegantes y baratas:**
    - Todo se anima en el hilo de UI con Reanimated, Rive o las curvas
      nativas.
    - Solo se animan `transform` y `opacity`.
    - Como mucho hay dos animaciones continuas por pantalla.
    - Cada bucle tiene una versión quieta para "reducir movimiento".
    - Los teléfonos lentos reciben la versión sencilla.
27. Todo texto viene de una clave tipada:
    - Los plurales se hacen bien.
    - Las unidades se escriben en palabras.
    - El tono es el del rediseño: tú, breve y sin tecnicismos.
28. Las diferencias entre plataformas viven en archivos `.native` y `.web`.
29. El diseño se audita con el mapa de UI en todas las pantallas, tamaños,
    escalas de texto y temas.

**Rendimiento**

30. **Arranque y tamaño:**
    - Primero se mide el arranque en frío en el Samsung de referencia.
    - Antes del primer fotograma no se hace nada que no sea imprescindible.
    - El bundle web no pasa de 6,6 MB.
    - Las llamadas, el reproductor, Rive, el escáner de QR y la cámara facial
      se cargan solo cuando hacen falta.
31. **Fluidez:**
    - Como mucho un 1 % de fotogramas lentos al desplazarse por Inicio.
    - Las listas largas se virtualizan.
    - Las imágenes pasan por un único componente.
    - Con el React Compiler activo no se añaden `useMemo` ni `useCallback`,
      salvo excepciones medidas y anotadas.

**Forma del código y pruebas**

32. Presupuestos de tamaño:
    - complejidad 15;
    - 80 líneas por función;
    - 300 por archivo;
    - 3 parámetros;
    - 10 props.
33. Prettier formatea todo. Las convenciones pequeñas de hoy se mantienen.
34. Las pruebas van en el nivel donde vive el comportamiento:
    - Cada componente y cada pantalla tienen una prueba de render.
    - La navegación se prueba con `renderRouter`.
    - Los flujos tienen pruebas E2E en Chromium y WebKit, y en Android un
      pequeño conjunto con Maestro.
35. La red y el almacenamiento seguro no cambian. La CSP solo cambia si tú lo
    decides.
36. Los contratos con el backend se comprueban con pruebas. Ahora incluyen
    también los códigos de error.

**ESLint elegido.** Se parte de la base de Expo y se añade:

- las 17 reglas de `react-hooks` 7, que incluyen las del React Compiler;
- reglas concretas de `@typescript-eslint` con tipos (promesas, `switch`
  exhaustivos, nada de `any`);
- `better-tailwindcss` para las clases;
- `i18next/no-literal-string` para los textos;
- `sonarjs/no-identical-functions` para las funciones duplicadas;
- los presupuestos y prohibiciones de ESLint.

No se adoptan presets completos. Tampoco el plugin de accesibilidad de React
Native, que está abandonado: la accesibilidad queda en los tipos y en axe.

## Orden de implementación junto al rediseño

La idea es construir cada cosa una sola vez, ya en su forma final.

| Paso | Qué se hace |
|---|---|
| S0 | Puertas y líneas base, el commit de formato y la **medición del arranque y la fluidez**. Cuatro pruebas técnicas: las pruebas de componente con bun, TrueSheet, Rive en Android y en escritorio, y better-tailwindcss con Uniwind. No cambia nada visible |
| S1 | Los cimientos que leen las pantallas nuevas: la sesión, las puertas que fallan cerradas, `Resource<T>`, la validación de datos, el mapa de errores, los tokens con los valores del rediseño, los puntos de corte y el movimiento |
| S2 | Los 26 componentes, una sola vez, en `ui-lab`, con pruebas, auditoría de accesibilidad y capturas de referencia. El mapa de UI entra como puerta |
| S3 | Dominio por dominio, en el orden del rediseño (navegación e Inicio, Seguridad y Cámara, Agenda y Proyectos, Argus, Tú, Ajustes y Personas, y la bienvenida). En cada uno: mover los datos a `entities/` con sus esquemas, reconstruir las pantallas con los componentes nuevos, probarlas, borrar lo viejo y bajar las líneas base |
| S4 | Cierre: desaparece `core/`, se borran los tokens y componentes viejos, todos los contadores llegan a 0, se comparan los resultados de rendimiento y se aplica el nuevo `AGENTS.md` |

R6 (completar el sistema de diseño de hoy) y R7 (partir los archivos
enormes) ya no se hacen sobre la interfaz vieja. Los sustituyen los 26
componentes nuevos y la reconstrucción de cada pantalla.

## Lo que todavía tienes que decidir

1. **E1.** Que el backend añada un campo `reason` a cada error, por ejemplo
   `camera.camera-privacy-on`. Es un cambio aditivo y lo recomiendo: sin él,
   28 tipos de "conflicto" comparten un mismo mensaje genérico.
2. **E2.** Que los errores de validación del backend digan qué regla falló.
   También es aditivo y también lo recomiendo.
3. **E3.** La voz de Argus en los errores. La propuesta: primera persona
   cuando Argus es quien actúa ("No te reconocí"), y si no, una descripción
   ("No hay conexión con Argus"). Nunca "nosotros".
4. **P1.** El límite de 6,6 MB. Hoy el bundle mide 6.612.933 bytes, unos
   13 kB por encima. Propuesta: que no pueda crecer desde S0 y que el límite
   sea obligatorio al terminar S1.
5. **P2.** Usar `expo-image` para todas las imágenes, después de una prueba
   con las miniaturas de las cámaras.
6. **P3.** Los objetivos de arranque y de fluidez, una vez medidos en S0.
7. **L1.** Seguir con ESLint 9.39, que ya no recibe soporte, hasta que la
   configuración de Expo admita ESLint 10. La alternativa es cambiar
   `eslint-plugin-import` por `import-x`.
8. **L2.** Volver a activar `react-hooks/immutability`, después de cambiar
   `.value` por `.get()` y `.set()` en Reanimated, como recomienda su
   documentación.
9. Las del rediseño que dependen de las pruebas técnicas: TrueSheet, Rive y
   el permiso `'wasm-unsafe-eval'` en la CSP.
