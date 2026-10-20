# Refactor del frontend: resumen ejecutivo

20 de octubre de 2026. Todo está medido sobre `master` en el commit `09cf103`.
Detalle en `frontend-refactor-plan.md` y `frontend-rules-proposal.md`.

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

El orden es R0, luego R1 y R2 en paralelo con R5 y R6. **El rediseño empieza
cuando terminen R5 y R6.**

## Reglas propuestas

Son 33 reglas (F1–F33), casi todas medidas por una puerta con línea base que
solo puede bajar. Las principales: capas y dirección de imports, sin ciclos,
rutas de una línea, validar los datos del servidor, puertas tri-estado que
fallan cerradas, una máquina de sesión, nunca mostrar un fallo como un hecho,
una fuente de tokens, sin valores arbitrarios, un solo vocabulario
responsive, sistema de diseño dueño de lo interactivo, accesibilidad en el
tipo, presupuestos de complejidad, auditoría de layout y tests al nivel donde
vive el comportamiento.

## Lo que tienes que decidir

1. Nombres de capas: FSD-lite (`platform`/`entities`/`widgets`), o seguir con
   `core/`.
2. Runner de tests de componente: bun + happy-dom + react-native-web, o
   jest-expo como un segundo runner.
3. Si se adopta Maestro para un smoke en Android.
4. Qué hacer con las ~30 ramas abiertas del frontend antes de los movimientos
   de R3 y R4.
5. Formato de los tokens: un objeto TypeScript, o DTCG con Style Dictionary.
6. Los presupuestos: complejidad 15, funciones de 80 líneas, archivos de 300
   líneas, 10 props.
7. Cuándo empieza el rediseño (recomendación: tras R5 y R6).
8. Un commit de formato que toca 641 archivos.
9. Si se integra el arnés del mapa de UI como puerta.
10. Los objetivos de arranque y de tamaño de bundle.
