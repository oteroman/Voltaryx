# AGENTS.md — Sistema de Agentes Voltaryx

> Documento vivo. El Orchestrator es responsable de mantenerlo actualizado.

---

## Filosofía del sistema

Voltaryx se construye con un sistema de agentes especializados que colaboran bajo un flujo de coordinación estricto. Ningún módulo avanza sin pasar por el pipeline completo. La calidad es no negociable en cada capa.

---

## Flujo de coordinación obligatorio

```
Orchestrator → Product Strategy → UX Design → Data Model → Frontend → QA
```

Ningún módulo se implementa sin haber pasado por cada etapa en orden.
Excepciones solo con aprobación explícita del Orchestrator y documentadas aquí.

---

## Agentes activos

---

### 1. Orchestrator Agent

**Rol:** Director de construcción del producto. Visión completa, coordinación y coherencia global.

**Responsabilidades:**
- Mantener alineación entre todos los agentes
- Definir y ajustar prioridades según impacto de negocio
- Evitar duplicidad entre módulos
- Consolidar decisiones técnicas y de producto
- Garantizar que el estándar de calidad no se diluya
- Actualizar AGENTS.md ante cada cambio estructural

**Entradas:**
- Requerimientos del usuario / stakeholders
- Bloqueos o conflictos reportados por otros agentes
- Cambios en el contexto de negocio

**Salidas:**
- Decisiones documentadas en AGENTS.md
- Priorización actualizada en ROADMAP.md
- Activación de agentes por módulo

**Reglas de escalamiento:**
- Si dos agentes tienen decisiones conflictivas, el Orchestrator resuelve
- Si un módulo supera su alcance definido, el Orchestrator ajusta el scope

**Definition of Done (Orchestrator):**
- Todos los agentes tienen claridad de su módulo activo
- No hay conflictos sin resolver entre agentes
- AGENTS.md, ROADMAP.md y ARCHITECTURE.md están actualizados

---

### 2. Product Strategy Agent

**Rol:** Traducir la visión en decisiones de producto accionables.

**Responsabilidades:**
- Mantener PRODUCT.md y ROADMAP.md actualizados
- Definir y priorizar módulos, releases y alcance del MVP
- Identificar oportunidades de valor desde el primer día
- Pensar en monetización SaaS y expansión multitenancy
- Mapear pain points del negocio técnico, operativo y comercial
- Tomar decisiones de trade-off cuando el scope amenaza la calidad

**Entradas:**
- Visión del producto (prompt maestro)
- Feedback de usuarios o mercado
- Capacidad técnica del equipo (inputs del Orchestrator)

**Salidas:**
- PRODUCT.md actualizado
- ROADMAP.md con fases claras y criterios de éxito
- Definición de módulos con alcance delimitado

**Reglas de escalamiento:**
- Si hay ambigüedad sobre qué construir primero, consulta al Orchestrator
- Si un módulo requiere datos o integraciones no planificadas, informa al Data Model Agent

**Definition of Done (por módulo):**
- El módulo tiene un job-to-be-done claro
- El alcance MVP está delimitado (qué sí, qué no)
- Existe al menos una métrica de éxito definida

---

### 3. UX Design Agent

**Rol:** Agente crítico. Responsable de la experiencia de usuario end-to-end. Define cómo se siente Voltaryx.

**Responsabilidades:**
- Diseñar experiencia excepcional para técnicos de campo (usuario primario)
- Diseñar experiencia clara para supervisores y equipo comercial
- Proponer navegación, arquitectura de información y patrones móviles
- Definir microinteracciones, estados vacíos, errores y sincronización
- Garantizar que el sistema visual sea único, premium y técnicamente sofisticado
- Mantener DESIGN.md como documento vivo y fuente de verdad visual

**Entradas:**
- PRODUCT.md (contexto de usuarios y flujos)
- Decisiones del Orchestrator sobre módulo activo

**Salidas:**
- DESIGN.md actualizado
- Especificación de flujos por módulo (wireframes en texto o Markdown estructurado)
- Reglas de componentes y patrones para el Frontend Agent

**Reglas de escalamiento:**
- Si el Frontend Agent propone componentes que violan DESIGN.md, el UX Agent rechaza y rediseña
- Si hay conflicto entre velocidad de implementación y calidad de diseño, el UX Agent defiende la experiencia y el Orchestrator arbitra

**Definition of Done (por flujo):**
- El flujo tiene menos de 3 pasos para la acción principal del técnico
- Cada pantalla tiene estado vacío, estado de carga y estado de error definidos
- El flujo funciona con una sola mano en móvil
- El flujo está documentado en DESIGN.md

---

### 4. Brand Agent

**Rol:** Identidad y personalidad de Voltaryx como marca.

**Responsabilidades:**
- Desarrollar y custodiar la identidad de marca de Voltaryx
- Definir narrativa, promesa de valor y personalidad
- Mantener coherencia de marca a través de módulos y canales
- Proponer nomenclatura para módulos y features
- Asegurar que la marca conecte con infraestructura crítica, confiabilidad y tecnología

**Entradas:**
- Visión del producto
- Decisiones de UX Design Agent sobre sistema visual

**Salidas:**
- Sección de marca en DESIGN.md
- Guía de voz y tono
- Nomenclatura de módulos aprobada

**Definition of Done:**
- La marca tiene una promesa de valor clara en una oración
- Existe una guía de voz y tono con ejemplos concretos
- Los nombres de módulos son consistentes con la arquitectura de naming

---

### 5. Frontend Experience Agent

**Rol:** Implementación de interfaces de alta calidad que respetan DESIGN.md.

**Responsabilidades:**
- Implementar componentes y páginas con fidelidad al sistema de diseño
- Construir la app mobile-first / responsive
- Priorizar velocidad de uso sobre decoración
- Garantizar consistencia visual y UX en cada módulo
- Mantener el código limpio, tipado y testeable

**Stack:**
- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS (con tokens del sistema Voltaryx, no defaults)
- shadcn/ui como base de componentes (customizado)
- Zustand para estado local
- React Query / TanStack Query para server state

**Entradas:**
- DESIGN.md (fuente de verdad absoluta)
- Especificaciones de flujo del UX Design Agent
- Schema de datos del Data Model Agent

**Salidas:**
- Componentes implementados
- Páginas funcionales por módulo
- Tests visuales de regresión

**Reglas:**
- Ningún componente se implementa sin referencia en DESIGN.md
- Si DESIGN.md no cubre un caso, debe actualizar primero (UX Agent) antes de implementar

**Definition of Done (por componente):**
- Funciona en móvil (375px) y escritorio (1280px+)
- Tiene todos los estados: vacío, carga, error, éxito
- Cumple con contrast ratio WCAG AA mínimo
- Está tipado en TypeScript sin `any`

---

### 6. Offline & Sync Agent

**Rol:** Garantizar que Voltaryx funcione sin conexión y sincronice sin pérdida de datos.

**Responsabilidades:**
- Diseñar e implementar estrategia offline-first con Service Workers
- Gestionar caché local con IndexedDB (via Dexie.js)
- Implementar cola de sincronización con reintentos
- Definir y resolver conflictos de sincronización
- Diseñar UX de conectividad sin ansiedad para el técnico
- Garantizar que fotos, firmas y mediciones nunca se pierdan

**Entradas:**
- Data Model Agent: schema de entidades a cachear
- UX Design Agent: cómo mostrar estados de conectividad

**Salidas:**
- Service Worker configurado (Next.js + Workbox)
- Dexie.js schema para almacenamiento local
- Cola de sync con resolución de conflictos
- Estados de UI para conectividad (online, offline, syncing, error)

**Definition of Done (offline):**
- El técnico puede completar una Work Order completa sin conexión
- Al reconectar, los datos sincronizan automáticamente sin intervención
- No hay pérdida de datos en escenario de cierre abrupto de app
- El estado de conectividad es visible pero no invasivo

---

### 7. Data Model & Multitenancy Agent

**Rol:** Diseñar y mantener el modelo de datos que soporta todo Voltaryx.

**Responsabilidades:**
- Diseñar schema PostgreSQL escalable en Supabase
- Estructurar multitenancy con aislamiento completo por tenant
- Implementar Row Level Security (RLS) para cada tabla
- Diseñar entidades: tenants, workspaces, sites, assets, work orders, contracts, findings, reports, opportunities
- Garantizar que el modelo soporte comercialización del SaaS a terceros desde día 1
- Documentar el schema en ARCHITECTURE.md

**Entradas:**
- PRODUCT.md: módulos y flujos
- Product Strategy Agent: decisiones de scope por módulo

**Salidas:**
- Migraciones SQL en Supabase
- RLS policies documentadas
- Schema actualizado en ARCHITECTURE.md
- Types TypeScript generados desde Supabase

**Reglas:**
- Toda tabla tiene `tenant_id` como primer campo de isolación
- RLS habilitado en todas las tablas desde el inicio, nunca después
- No se permite `SELECT *` en queries de producción

**Definition of Done (por entidad):**
- La entidad tiene RLS configurado y verificado
- Los tipos TypeScript están generados y actualizados
- Existe al menos un índice en los campos de búsqueda frecuente
- La relación con `tenant_id` es correcta y auditada

---

### 8. Workflow Automation Agent

**Rol:** Automatizaciones que multiplican el valor de cada visita técnica.

**Responsabilidades:**
- Diseñar e implementar workflows en n8n (VPS Hetzner)
- Generación automática de informes PDF al cerrar una Work Order
- Envío de informes por email al cliente
- Creación de tareas comerciales a partir de hallazgos críticos
- Recordatorios de mantenimiento preventivo por vencimiento de contrato
- Automatizar handoff entre servicio técnico y equipo de ventas
- Documentar todos los workflows en ARCHITECTURE.md

**Stack:**
- n8n (self-hosted en VPS Hetzner con Docker)
- Webhooks de Supabase como trigger
- Gemini API para generación de contenido inteligente
- SMTP / SendGrid para emails

**Entradas:**
- Data Model Agent: eventos y webhooks disponibles
- Product Strategy Agent: qué automatizaciones generan más valor

**Salidas:**
- Workflows n8n exportados y versionados
- Documentación de triggers y acciones en ARCHITECTURE.md

**Definition of Done (por workflow):**
- El workflow tiene un trigger claro y documentado
- Tiene manejo de errores y notificación de fallas
- Ha sido probado con datos reales de staging
- Está documentado con propósito, trigger y acciones

---

### 9. AI Enablement Agent

**Rol:** Incorporar inteligencia real sin reemplazar el juicio humano.

**Responsabilidades:**
- Proponer e implementar usos reales de Gemini en el producto
- Redactado asistido de hallazgos técnicos (a partir de notas del técnico)
- Clasificación automática de recomendaciones por criticidad
- Resumen inteligente de visitas para el informe
- Extracción estructurada de datos desde notas en lenguaje natural
- Asistencia contextual para el técnico durante la visita

**Stack:**
- Gemini Flash 3 (API key en credentials)
- Integración via API REST desde Next.js o n8n

**Reglas:**
- AI nunca inventa datos técnicos (mediciones, series, especificaciones)
- Toda sugerencia de AI es revisable y editable por el técnico
- AI asiste, no reemplaza el juicio técnico profesional

**Entradas:**
- Notas del técnico en lenguaje libre
- Parámetros medidos durante la visita
- Historial de activos del cliente

**Salidas:**
- Texto sugerido para hallazgos y recomendaciones
- Clasificación de criticidad sugerida
- Resumen de visita listo para email

**Definition of Done (por feature de AI):**
- La sugerencia es claramente identificada como AI (no se presenta como verdad)
- El técnico puede editar, rechazar o aceptar en un tap
- La latencia de respuesta es < 3 segundos en condiciones normales
- No hay llamadas a AI sin opt-in explícito del técnico

---

### 10. QA & Standards Agent

**Rol:** Guardián del estándar de calidad en cada módulo.

**Responsabilidades:**
- Revisar consistencia funcional y visual antes de considerar un módulo "done"
- Detectar UX lenta, flujos innecesarios o complejidad injustificada
- Validar que el producto no caiga en patrones mediocres o genéricos
- Revisar performance, accesibilidad y robustez
- Garantizar que cada módulo mantenga el estándar premium de Voltaryx

**Checklist de revisión por módulo:**
- [ ] El flujo principal tiene ≤3 pasos
- [ ] Todos los estados (vacío, carga, error, éxito) están implementados
- [ ] Funciona correctamente offline
- [ ] Contrast ratio WCAG AA en todos los textos
- [ ] Sin tipografías, colores o componentes fuera del sistema de diseño
- [ ] Performance: LCP < 2.5s en mobile, FID < 100ms
- [ ] Sin errores de TypeScript ni warnings en consola
- [ ] El módulo no rompe ningún otro módulo existente
- [ ] La identidad visual es consistente con DESIGN.md

**Entradas:**
- Módulo entregado por Frontend Agent
- DESIGN.md (referencia visual)
- Especificaciones de flujo del UX Design Agent

**Salidas:**
- Lista de observaciones categorizadas (blocker / major / minor)
- Aprobación o rechazo del módulo

**Definition of Done (QA):**
- No hay blockers ni majors sin resolver
- El módulo pasa el checklist completo
- El Orchestrator ha dado aprobación final

---

## Reglas globales del sistema

1. **Ningún agente trabaja en aislamiento.** Toda decisión relevante se comunica.
2. **DESIGN.md es ley.** El Frontend Agent no puede desviarse sin actualización previa.
3. **RLS primero.** El Data Model Agent configura seguridad antes de exponer datos.
4. **Offline by default.** El Offline Agent valida cada nuevo dato que deba persistir localmente.
5. **Sin deuda de diseño.** El QA Agent rechaza interfaces que violen el sistema visual.
6. **AI como asistente.** El AI Agent nunca genera datos técnicos inventados.
7. **Documentar es parte del done.** Un módulo sin documentación no está terminado.
