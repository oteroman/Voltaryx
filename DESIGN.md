# DESIGN.md — Sistema de Diseño Voltaryx

> Documento mantenido por el UX Design Agent y Brand Agent.
> Es la fuente de verdad visual y de experiencia. El Frontend Agent no puede desviarse de este documento.

---

## Visión de diseño

**Voltaryx no es un panel de administración. Es una herramienta de campo.**

El diseño de Voltaryx parte de una premisa diferente a la del SaaS corporativo típico: el usuario primario no está en una oficina, frente a un monitor, con tiempo y comodidad. Está en una sala de servidores, con guantes, apurado, con el cliente esperando afuera.

Cada decisión visual y de interacción se juzga contra una sola pregunta:
**¿Esto le quita o le suma tiempo real al técnico en campo?**

La identidad visual de Voltaryx es **industrial-premium**. Técnica. Sobria. Sin adornos innecesarios. Construida para inspirar confianza en el cliente final y hacer que el técnico se sienta respaldado por una herramienta profesional seria.

---

## Identidad de marca

### Nombre
**Voltaryx** — Derivado de "volt" (unidad de tensión eléctrica). Evoca energía, precisión, infraestructura crítica. El sufijo "-ryx" aporta modernidad y unicidad de marca.

### Promesa de valor en una oración
> "Voltaryx convierte cada visita técnica en un activo de negocio."

### Personalidad de marca
- **Preciso:** Como los instrumentos que usan los técnicos
- **Confiable:** Como la infraestructura crítica que mantienen
- **Directo:** Sin adornos, sin ambigüedad
- **Tecnológico:** No frío, sino técnicamente sofisticado
- **Premium:** No lujoso, sino de categoría superior

### Tono de voz
- Directo y técnico. Sin jerga corporativa.
- Habla al técnico como a un profesional, no como a un usuario genérico.
- Los mensajes de error explican qué pasó y qué hacer. Sin culpa.
- Los mensajes de éxito son concisos: confirman, no celebran en exceso.
- Sin exclamaciones innecesarias. Sin emojis en contextos funcionales.

**Ejemplos de tono:**

| Situación | MAL (genérico) | BIEN (Voltaryx) |
|---|---|---|
| Confirmación | "¡Genial! Tu informe fue enviado 🎉" | "Informe enviado a cliente@empresa.com" |
| Error de sync | "¡Algo salió mal!" | "Sin conexión. Los datos están guardados y sincronizarán al reconectar." |
| Campo vacío | "Este campo es requerido" | "Registra las mediciones antes de cerrar este ítem" |
| Estado vacío | "No hay datos" | "No hay órdenes asignadas para hoy" |

---

## Sistema de color

### Filosofía de color
El sistema de color de Voltaryx parte de un fondo oscuro neutro con un acento de alto voltaje. El color oscuro reduce la fatiga visual en salas técnicas con poca luz. El acento de alto contraste garantiza visibilidad inmediata de acciones primarias.

**El color acento es Volt Yellow.** No es amarillo de advertencia. Es el amarillo del voltaje, de la energía eléctrica, de la precisión. Conectado directamente con el rubro del producto.

### Paleta completa

```
--- BASES ---
--color-void:       #080A0D   // Fondo de pantalla (casi negro azulado)
--color-surface-1:  #0F1217   // Superficie primaria (cards, modales)
--color-surface-2:  #161B22   // Superficie secundaria (sidebars, headers)
--color-surface-3:  #1E2530   // Superficie terciaria (hover states, inputs)
--color-border:     #2A3140   // Bordes y separadores
--color-border-subtle: #1C2230 // Bordes muy sutiles

--- VOLT (Acento primario) ---
--color-volt-500:   #C8FF00   // Volt Yellow principal (acciones primarias)
--color-volt-400:   #D4FF33   // Volt hover
--color-volt-600:   #A0CC00   // Volt pressed / active
--color-volt-100:   #C8FF001A // Volt con 10% opacidad (backgrounds sutiles)
--color-volt-200:   #C8FF0033 // Volt con 20% opacidad

--- TEXTO ---
--color-text-primary:   #F0F4F8  // Texto principal (casi blanco)
--color-text-secondary: #8B97A8  // Texto secundario (labels, subtítulos)
--color-text-tertiary:  #5A6672  // Texto terciario (placeholders, hints)
--color-text-disabled:  #374151  // Texto deshabilitado
--color-text-inverse:   #080A0D  // Texto sobre fondo Volt Yellow

--- ESTADOS SEMÁNTICOS ---
--color-critical:   #FF4444   // Crítico / Error (rojo eléctrico)
--color-critical-bg: #FF44441A
--color-warning:    #FF9500   // Advertencia (naranja técnico)
--color-warning-bg: #FF95001A
--color-success:    #00D97E   // Éxito / OK (verde técnico)
--color-success-bg: #00D97E1A
--color-info:       #4A9EBF   // Informativo (azul acero)
--color-info-bg:    #4A9EBF1A

--- STEEL (escala de grises técnica) ---
--color-steel-100:  #E8EDF2
--color-steel-200:  #C8D0DA
--color-steel-300:  #9AA5B4
--color-steel-400:  #6B7A8D
--color-steel-500:  #4A5568
--color-steel-600:  #2D3748
--color-steel-700:  #1A2332
```

### Reglas de uso de color

1. **Volt Yellow SOLO para acciones primarias, estados activos y datos críticos de métricas.** No decoración.
2. **El fondo nunca es blanco.** El modo oscuro es el modo principal.
3. **Rojo para crítico y error.** No usar rojo para decoración ni énfasis neutro.
4. **El texto secundario (#8B97A8) para labels, metadatos, timestamps.** No para información importante.
5. **Sin gradientes decorativos.** Los gradientes solo para elementos funcionales específicos (ej: indicadores de batería, barras de progreso).
6. **Sin color en texto sobre Volt Yellow.** Solo `--color-text-inverse` (#080A0D).

---

## Sistema tipográfico

### Filosofía tipográfica
Tres fuentes con roles distintos. Ninguna es la elección obvia.

### Familias tipográficas

**Display / Brand: Space Grotesk**
- Uso: headings grandes (H1, H2), nombre del producto, pantallas de bienvenida
- Por qué: Geométrica pero con carácter. Técnica sin ser fría. Distinguible a distancia.
- Peso: 500 (Medium) y 700 (Bold)
- CDN: Google Fonts

**Funcional / UI: DM Sans**
- Uso: todo el texto de interfaz (labels, botones, body, navegación, formularios)
- Por qué: Óptima legibilidad en pantallas pequeñas a bajas resoluciones. Neutral sin ser genérica.
- Peso: 400 (Regular), 500 (Medium), 600 (SemiBold)
- CDN: Google Fonts

**Técnico / Datos: JetBrains Mono**
- Uso: valores técnicos (voltaje: 220.4V), números de serie, timestamps, IDs, mediciones
- Por qué: Legibilidad máxima en datos numéricos. Evita ambigüedad entre 0/O, 1/l/I.
- Peso: 400 (Regular), 500 (Medium)
- CDN: Google Fonts

### Escala tipográfica

```
--text-xs:    11px / line-height: 16px  // Microlabels, badges, timestamps
--text-sm:    13px / line-height: 18px  // Secondary info, hints, captions
--text-base:  15px / line-height: 22px  // Body, labels, inputs (tamaño base de UI)
--text-md:    17px / line-height: 24px  // Texto destacado, subtítulos
--text-lg:    20px / line-height: 28px  // H3, section headers
--text-xl:    24px / line-height: 32px  // H2, page titles
--text-2xl:   30px / line-height: 38px  // H1, pantallas principales
--text-3xl:   38px / line-height: 46px  // Display, métricas grandes
--text-4xl:   48px / line-height: 56px  // Hero, onboarding
```

### Reglas tipográficas

1. **El tamaño mínimo de texto interactivo es 15px.** Sin excepciones para guantes.
2. **Los valores técnicos siempre en JetBrains Mono.** Voltaje, corriente, temperatura, series.
3. **Sin itálica en interfaz funcional.** Reservada para notas y citas.
4. **Letter-spacing negativo en headings grandes** (-0.02em en texto > 24px).
5. **Line-height 1.4–1.5 en body.** No más, no menos.
6. **Peso máximo en acciones primarias: 600 (SemiBold).** El 700 es solo para display.

---

## Sistema de espaciado

### Escala base: 4px

```
--space-1:   4px
--space-2:   8px
--space-3:   12px
--space-4:   16px
--space-5:   20px
--space-6:   24px
--space-8:   32px
--space-10:  40px
--space-12:  48px
--space-16:  64px
--space-20:  80px
--space-24:  96px
```

### Reglas de espaciado

1. **Área de toque mínima: 44x44px.** Absoluto en móvil. Sin excepciones.
2. **Padding interno de botones primarios: 12px vertical, 20px horizontal** (mínimo).
3. **Separación entre secciones de formulario: 24px.**
4. **Separación entre items de lista: 12px** (suficiente sin desperdiciar pantalla).
5. **Margen lateral en móvil: 16px** a cada lado.
6. **Padding interno de cards: 20px.**

---

## Sistema de componentes

### Filosofía de componentes
Funcionales primero. Cada componente resuelve un problema real. Sin decoración que no cumpla función.

### Componentes clave

#### Botón primario
```
Background: --color-volt-500
Text: --color-text-inverse (negro)
Font: DM Sans 600, 15px
Padding: 12px 20px
Border-radius: 8px
Height mínima: 44px
Hover: --color-volt-400
Active: --color-volt-600
Disabled: --color-surface-3, text --color-text-disabled
```

#### Botón secundario
```
Background: --color-surface-3
Text: --color-text-primary
Border: 1px solid --color-border
Font: DM Sans 500, 15px
Mismo sizing que primario
```

#### Botón destructivo
```
Background: --color-critical-bg
Text: --color-critical
Border: 1px solid --color-critical (30% opacidad)
```

#### Input / Campo de formulario
```
Background: --color-surface-3
Border: 1px solid --color-border
Border-focus: 1px solid --color-volt-500
Text: --color-text-primary, 15px DM Sans
Label: --color-text-secondary, 13px DM Sans 500
Placeholder: --color-text-tertiary
Border-radius: 8px
Padding: 12px 16px
Height: 44px mínimo
```

#### Card
```
Background: --color-surface-1
Border: 1px solid --color-border-subtle
Border-radius: 12px
Padding: 20px
Shadow: none (el borde define la card, no la sombra)
```

#### Badge de estado
```
Crítico:   background --color-critical-bg, text --color-critical
Advertencia: background --color-warning-bg, text --color-warning
OK:        background --color-success-bg, text --color-success
Info:      background --color-info-bg, text --color-info
Pendiente: background --color-surface-3, text --color-text-secondary
Font: DM Sans 500, 11px
Padding: 4px 8px
Border-radius: 6px
```

#### Item de checklist (componente crítico)
```
Altura: 52px mínimo (toque fácil con guantes)
Background activo: --color-surface-2
Checkmark: --color-volt-500 sobre fondo completado
Border-bottom: 1px solid --color-border-subtle
Transición: 150ms ease (snap, no suave excesivo)
```

#### Indicador de conectividad
```
Online:   punto --color-success, texto "Sincronizado"
Offline:  punto --color-warning, texto "Sin conexión · guardando local"
Syncing:  animación de pulso --color-volt-500, texto "Sincronizando..."
Error:    punto --color-critical, texto "Error de sync · reintentar"
Posición: esquina superior del header, siempre visible
```

---

## Arquitectura de navegación

### Mobile (pantalla principal del técnico)

**Bottom navigation bar — 4 items máximo:**
```
[Mis Órdenes] [Activos] [Scanner] [Perfil]
```
- Íconos funcionales, sin decoración
- Label siempre visible (no solo íconos)
- Estado activo: ícono y label en --color-volt-500
- Altura: 64px con safe area

**Gestos:**
- Swipe horizontal para navegar entre estados de una orden (checklist ← → fotos ← → firma)
- Pull-to-refresh en listas
- Long press en foto para eliminar (no botón flotante)

### Web / Desktop (supervisores)

**Layout: sidebar colapsable (260px expandida, 64px colapsada)**
- Sidebar con fondo --color-surface-2
- Contenido principal con fondo --color-void
- Header fijo con búsqueda global, notificaciones y perfil
- Sin mega-menús ni dropdowns anidados

---

## Principios UX para técnicos en campo

### 1. Cero fricción en la acción principal
La acción más frecuente del técnico (registrar ítem de checklist) debe hacerse en 1 tap. No en 3.

### 2. Captura en el momento, no después
El sistema registra datos mientras el técnico trabaja. Ningún paso de "consolidar informe" al final.

### 3. Defaults inteligentes siempre
- El tipo de equipo pre-selecciona el checklist correspondiente
- La fecha y hora se pre-llenan con el momento actual
- La ubicación se pre-llena desde el site asignado
- Los parámetros tienen rangos normales pre-definidos por modelo de equipo

### 4. Formularios condicionales
Solo muestra los campos relevantes. Si el equipo es UPS, no aparecen campos de AAP.

### 5. Una mano, siempre
Las acciones críticas son alcanzables con el pulgar en un teléfono de 6 pulgadas. El botón primario nunca está en la esquina superior izquierda.

### 6. Offline como modo normal
El técnico no sabe si está online u offline. La app funciona igual. El indicador de sync es informativo, no bloqueante.

### 7. Fotos sin fricciones
Tap en la cámara → foto → queda asociada al ítem actual. Sin galería intermedia, sin confirmar, sin nombrar. La app infiere el contexto.

### 8. La firma es el cierre
La firma del cliente es el último paso de la orden. Es un momento de checkpoint emocional y legal. La pantalla de firma es limpia, grande y clara.

### 9. Sin pantallas de confirmación innecesarias
"¿Estás seguro?" solo para acciones destructivas irreversibles. Nunca para guardar datos.

### 10. Feedback inmediato
Cada tap tiene respuesta visual en < 100ms. No hay botones que "no responden".

---

## Principios UX para supervisores y equipo comercial

### 1. Vista panorámica primero
El supervisor necesita ver el estado de todo el equipo de un vistazo. El dashboard principal es una vista de operaciones, no una lista de métricas.

### 2. Drill-down sin perder contexto
Puede pasar de "equipo → técnico → orden → hallazgo" sin perder el contexto de dónde estaba. Breadcrumbs claros.

### 3. Alertas que importan
Solo notificaciones de hallazgos críticos, vencimientos de SLA y órdenes retrasadas. Sin ruido.

### 4. Aprobación de informes en < 30 segundos
El supervisor puede revisar el resumen de una visita, ver las fotos clave y aprobar el informe sin leer cada campo. La UI prioriza las fotos y los hallazgos.

### 5. Contexto completo para el equipo comercial
Cuando el comercial recibe una oportunidad, tiene todo: qué equipo, qué falla, desde cuándo, qué recomienda el técnico y fotos de evidencia.

---

## Lineamientos para formularios de alta velocidad

1. **Un campo a la vez en móvil** cuando el formulario es largo. Wizard paso a paso.
2. **Teclado numérico automático** para campos de medición (voltaje, corriente, temperatura).
3. **Unidades visibles** junto al campo, no en el placeholder (que desaparece).
4. **Indicador de progreso** en checklists largos (ej: "5 de 12 ítems completados").
5. **Auto-advance** al completar campos de longitud fija (ej: número de serie de 12 dígitos).
6. **Guardar automáticamente** cada campo al salir de él. Sin botón "guardar" intermedio.
7. **Agrupación visual** por sección (Datos del equipo / Mediciones / Observaciones).
8. **Campos opcionales claramente marcados** con "(opcional)". No marcar los obligatorios con asterisco — todo lo sin marcar es obligatorio.

---

## Estados de experiencia completos

### Estado de carga
- Skeleton screens, no spinners globales
- El contenido conocido se muestra inmediatamente; el que carga llega después
- Nunca bloquear la interfaz completa por una carga parcial

### Estado vacío
Cada vista vacía tiene:
- Ícono técnico relevante (no ilustración genérica)
- Mensaje claro en primera persona del técnico ("No tienes órdenes asignadas para hoy")
- Acción sugerida cuando aplica ("Contacta a tu coordinador")

### Estado de error
- Mensaje que explica qué pasó (sin jerga técnica)
- Acción concreta para resolverlo
- Opción de reintentar siempre presente
- Los datos ingresados no se pierden por un error de red

### Estado de sincronización
- Visible pero no invasivo
- El técnico puede seguir trabajando mientras sincroniza
- Confirmación silenciosa cuando termina (sin modal, sin popup)

### Estado offline
- Banner sutil en la parte superior: "Sin conexión · trabajando localmente"
- Todo funciona igual
- Al reconectar: "Sincronizado" por 3 segundos, luego desaparece

---

## Experiencia de evidencia fotográfica

### Captura
- Acceso directo a cámara desde cada ítem de checklist
- Las fotos se comprimen automáticamente (max 1200px de ancho, calidad 85%)
- Se almacenan localmente de inmediato, se sincronizan en background

### Visualización
- Thumbnail de la foto en el ítem del checklist
- Tap para ver en pantalla completa con gesto de swipe entre fotos
- Contador visible: "3 fotos" en el ítem

### En el informe
- Fotos organizadas por sección de checklist (no en galería plana)
- Cada foto tiene su contexto: nombre del ítem al que corresponde
- Resolución suficiente para impresión (150 DPI mínimo en el PDF)

---

## Experiencia de firma digital

### Pantalla de firma
- Fondo blanco (excepción al fondo oscuro) para máxima legibilidad en pantalla brillante en campo
- Instrucción clara: "Firma aquí para confirmar la visita"
- Área de firma grande (mínimo 300x150px útiles)
- Botón para limpiar y firmar de nuevo
- Nombre del firmante (pre-llenado desde el contacto del cliente)
- Cargo del firmante (campo editable)
- Timestamp automático e irremovible

### Cierre de orden post-firma
- Resumen de lo completado en la visita
- Confirmación de envío de informe
- La orden cambia a estado "Completada" con un feedback visual claro

---

## Anti-patterns explícitos

### Visual
- No usar gradientes decorativos azul-morado o teal-purple
- No usar cards con sombra box-shadow pronunciada (no es neumorfismo)
- No usar sidebars con íconos coloridos por módulo
- No usar tipografía Inter como fuente de display o marca
- No usar ilustraciones de "personas trabajando" o stock art
- No usar el estilo de Tailwind UI por defecto sin customización
- No usar el estilo de shadcn/ui sin redefinir todos los tokens de color
- No usar fondos blancos en la app principal (solo en firma y PDF)

### UX
- No agregar confirmaciones para guardar datos (guardar es automático)
- No usar modales para información que puede estar en línea
- No usar tablas densas en móvil (usar cards o listas adaptadas)
- No usar dropdowns anidados en navegación móvil
- No usar sliders para valores técnicos (inputs numéricos directos son más precisos)
- No mostrar todos los campos de un formulario largo en una sola pantalla
- No usar placeholders como labels (el placeholder desaparece y el usuario pierde contexto)
- No requerir conexión para mostrar datos ya descargados

### Contenido
- No usar términos como "Dashboard", "Módulo", "Panel" en la UI visible al usuario
- No usar mensajes de error genéricos ("Error 500", "Algo salió mal")
- No usar mayúsculas completas (ALL CAPS) en más de 2 palabras
- No usar exclamaciones en mensajes de sistema ("¡Éxito!")

---

## Referencias aspiracionales

| Producto | Por qué es referencia |
|---|---|
| **Linear** | Velocidad de interacción, densidad de información sin ruido, identidad visual oscura premium |
| **Vercel Dashboard** | Claridad extrema en datos técnicos, jerarquía tipográfica, tokens de color bien definidos |
| **Raycast** | Velocidad de uso, teclado como ciudadano de primera clase, onboarding sin fricción |
| **Superhuman** | Obsesión por velocidad, cada microsegundo importa, experiencia que hace sentir al usuario profesional |
| **Figma** | Toolbar funcional en móvil, gestos naturales, persistencia de estado |
| **Apple Health** | Visualización de datos técnicos en tarjetas claras, navegación contextual sin tabs |

**Lo que NO es referencia:** Cualquier template de admin panel de Tailwind UI, Bootstrap Admin, cualquier SaaS con sidebar colorida y cards 4-up con gradiente.

---

## Criterios de QA visual

Un módulo pasa QA visual si:

- [ ] Todos los colores vienen del sistema definido en este documento. Cero valores hardcoded.
- [ ] La tipografía corresponde a Space Grotesk, DM Sans o JetBrains Mono según el contexto.
- [ ] Los datos técnicos (mediciones, series, voltajes) están en JetBrains Mono.
- [ ] El contrast ratio de todo texto sobre su fondo es WCAG AA mínimo (4.5:1 para normal, 3:1 para large).
- [ ] Ningún elemento interactivo tiene área de toque < 44x44px.
- [ ] Todos los estados (vacío, carga, error, éxito, offline) están implementados.
- [ ] No hay ningún elemento visual que no exista en este sistema de diseño.
- [ ] La interfaz funciona correctamente en iPhone SE (375px) y en escritorio (1440px).
- [ ] No hay texto sobre Volt Yellow que no sea --color-text-inverse.
- [ ] Los íconos son consistentes (mismo set, mismo tamaño, mismo grosor de stroke).

---

## Sistema de íconos

**Set oficial: Lucide Icons**
- Stroke width: 1.5px (no 2px del default — más técnico, menos cartoon)
- Tamaños: 16px (inline), 20px (UI standard), 24px (acciones), 32px (vacíos de estado)
- Color: heredado del contexto, nunca hardcoded en el ícono
- Sin íconos puramente decorativos

**Íconos clave del dominio:**
- Work Order: `clipboard-list`
- Activo / Equipo: `cpu` o `server`
- UPS: `battery-charging`
- Hallazgo crítico: `alert-triangle`
- Foto: `camera`
- Firma: `pen-line`
- Sync: `refresh-cw`
- Offline: `wifi-off`
- Técnico: `hard-hat`
- Contrato: `file-check`

---

## Principios de diseño para generar confianza

### En el técnico
- La app guarda todo automáticamente. El técnico nunca pierde trabajo.
- Los datos que registró son solo suyos hasta que cierra la orden.
- El sistema le da información relevante del activo antes de empezar (historial, última visita, alertas).

### En el cliente final
- El informe tiene evidencia fotográfica numerada y organizada.
- Las mediciones tienen valores de referencia para contexto (ej: "220.4V — rango normal: 210–230V").
- La firma digital tiene timestamp y nombre del firmante claramente visibles.
- El informe tiene el logo del cliente técnico (no de Voltaryx).
- El lenguaje del informe es profesional pero comprensible para un gerente no técnico.

### En el supervisor
- Puede ver en tiempo real que la orden está siendo ejecutada.
- Puede revisar el informe antes de enviarlo al cliente.
- Los hallazgos críticos generan alertas inmediatas, no reportes semanales.
