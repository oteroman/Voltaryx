# PRODUCT.md — Definición de Producto Voltaryx

> Documento mantenido por el Product Strategy Agent. Aprobado por el Orchestrator.

---

## Visión

**Voltaryx es el sistema operativo para la excelencia en field service técnico.**

No es un formulario digital. No es un ERP liviano. Es la plataforma que convierte cada visita técnica en un activo de negocio: datos de calidad, informes automáticos, hallazgos comercializables y memoria institucional que crece con el tiempo.

---

## El problema que resuelve

### Problema central
Las empresas de field service (mantenimiento de UPS, estabilizadores, AAP, tableros y equipos de infraestructura crítica) enfrentan un problema estructural que se repite en toda la industria:

**El técnico trabaja durante 2–4 horas en campo. Luego pasa 30–90 minutos llenando un informe en papel o en Excel, de memoria, con datos que ya no recuerda con precisión.**

### Consecuencias directas
- Pérdida de calidad del dato técnico (mediciones recordadas, no registradas en el momento)
- Informes inconsistentes entre técnicos del mismo equipo
- Hallazgos críticos que no se documentan o se documentan tarde
- Oportunidades comerciales que se pierden porque nadie convierte el hallazgo en una cotización
- Tiempo no facturable que destruye la rentabilidad del servicio
- Clientes que no confían en el informe porque se ve hecho a último momento

### El problema secundario (igual de importante)
Las empresas de servicio técnico **no tienen memoria institucional**. Si un técnico se va, se va el conocimiento de ese cliente, ese equipo, ese historial de fallas. No hay base de activos instalados confiable. No hay historial de visitas consultable. No hay trazabilidad.

---

## Usuarios

### Usuario primario: El Técnico de Campo
**Perfil:** Profesional técnico (electricista, electrónico, ingeniero junior) con 2–10 años de experiencia. Trabaja solo o en duplas. Visita 2–5 clientes por día. Opera en salas técnicas, data centers, plantas industriales y edificios de oficinas.

**Contexto real de uso:**
- Móvil en mano, guantes puestos a veces
- Poca luz en salas técnicas
- Apuro constante: el cliente lo espera para cerrar el acceso
- Conectividad variable (sótanos, salas de servidores)
- Necesita evidencia fotográfica confiable

**Jobs-to-be-done:**
1. Registrar lo que hice durante la visita sin perder tiempo
2. Capturar mediciones en el momento en que las tomo, no después
3. Tomar fotos y asociarlas automáticamente a lo que estoy revisando
4. Obtener la firma del cliente antes de irme
5. No tener que redactar el informe: que salga solo
6. Saber qué revisé la última vez que vine aquí

### Usuario secundario: El Supervisor / Coordinador de Servicio
**Perfil:** Técnico senior o ingeniero que coordina al equipo. Responsable de calidad, cumplimiento de SLA y relación con clientes clave.

**Jobs-to-be-done:**
1. Ver en tiempo real dónde está cada técnico y en qué estado está la orden
2. Revisar y aprobar informes antes de enviarlos al cliente
3. Detectar hallazgos críticos que requieren escalamiento
4. Asegurar que el equipo cumple los checklists correctamente
5. Tener visibilidad de qué contratos vencen y qué preventivos están pendientes

### Usuario terciario: El Equipo Comercial
**Perfil:** Vendedor o ejecutivo de cuenta que maneja la relación con el cliente post-servicio.

**Jobs-to-be-done:**
1. Recibir automáticamente las oportunidades generadas por los técnicos
2. Ver el historial técnico del cliente para preparar una propuesta
3. Saber qué equipos están próximos a fin de vida útil
4. Convertir hallazgos en cotizaciones con información técnica real

### Usuario cuaternario: El Administrador del Tenant
**Perfil:** Gerente de operaciones o TI en la empresa cliente del SaaS.

**Jobs-to-be-done:**
1. Configurar el workspace de su empresa
2. Gestionar usuarios, roles y permisos
3. Personalizar plantillas de informes con su marca
4. Ver analytics de productividad del equipo técnico

---

## Propuesta de valor

### Para técnicos
> "Cierra la orden en campo. El informe lo genera Voltaryx."

### Para supervisores
> "Visibilidad total. Calidad garantizada. Sin perseguir informes."

### Para el equipo comercial
> "Cada visita técnica genera oportunidades. Voltaryx las entrega listas."

### Para la empresa (tenant)
> "Convierte tu operación técnica en una ventaja competitiva medible."

---

## Diferenciación

| Dimensión | Competencia típica | Voltaryx |
|---|---|---|
| Experiencia técnico | Formularios genéricos lentos | Flujo optimizado para 1 mano, offline |
| Informes | Redacción manual o templates Word | Generación automática desde la visita |
| Hallazgos | Se pierden o se anotan en papel | Estructurados, priorizados, comercializables |
| Offline | No funciona o pierde datos | Diseñado offline-first desde el día 1 |
| Identidad visual | Dashboard admin genérico | Producto premium con identidad técnica propia |
| Multitenancy | Mono-empresa | SaaS comercializable a cualquier empresa del rubro |

---

## Módulos del producto

### MVP (Fase 1 — Alto impacto inmediato)

#### M1: Field Work Orders
El núcleo del producto. El técnico ejecuta la visita desde el móvil.

**Alcance MVP:**
- Crear y asignar órdenes de trabajo
- Checklists dinámicos por tipo de equipo / tipo de servicio
- Captura de parámetros técnicos (voltaje, corriente, temperatura, etc.)
- Captura de evidencia fotográfica asociada a cada ítem
- Registro de tiempo (inicio / fin de visita, inicio / fin de trabajo)
- Registro de repuestos utilizados
- Firma digital del cliente en pantalla
- Estado de orden: pendiente → en curso → completada → informada

**Fuera de scope MVP:**
- Asignación automática por geolocalización
- Integración con calendario externo

---

#### M2: Technical Report Engine
El informe sale automáticamente al cerrar la orden.

**Alcance MVP:**
- Generación de PDF desde la Work Order completada
- Plantilla estándar: encabezado del cliente, activos visitados, checklists, mediciones, fotos, hallazgos, firma
- Envío automático por email al cliente
- Versión del informe archivada en el sistema

**Fuera de scope MVP:**
- Múltiples plantillas personalizables por tenant
- Informe con branding del tenant (V1)

---

#### M3: Customers, Sites & Assets
La base de datos de clientes y equipos instalados.

**Alcance MVP:**
- Clientes con datos de contacto
- Sedes / sitios por cliente
- Activos instalados por sede (UPS, estabilizadores, AAP, tableros)
- Ficha del activo: marca, modelo, serie, fecha de instalación, estado
- Historial de órdenes por activo

**Fuera de scope MVP:**
- Importación masiva de activos (V1)
- Integración con ERP del cliente (V2)

---

### V1 (Fase 2 — Consolidación)

#### M4: Findings & Recommendations
Hallazgos técnicos estructurados que generan valor comercial.

- Registro de hallazgos durante la visita
- Clasificación por criticidad (crítico / mayor / menor / informativo)
- Recomendación estructurada con urgencia y acción sugerida
- Seguimiento de hallazgos entre visitas
- Asistencia de Gemini para redacción de hallazgos

#### M5: Contracts & Maintenance Plans
Contratos de mantenimiento y visitas programadas.

- Contratos preventivos, correctivos y mixtos
- Frecuencia de visitas y activos incluidos
- SLA y tiempos de respuesta
- Dashboard de vencimientos y alertas
- Programación de visitas desde el contrato

#### M6: Tenant Administration
Configuración del workspace por empresa.

- Onboarding de nuevos tenants
- Gestión de usuarios y roles (admin, supervisor, técnico, comercial)
- Configuración de plantillas de informe
- Branding básico del tenant (logo, colores en informe)

---

### V2 (Fase 3 — Expansión de valor)

#### M7: Sales Handoff / Opportunity Module
Convertir la operación técnica en pipeline comercial.

- Convertir hallazgos críticos en oportunidades de venta
- Propuesta de reemplazo de equipos con datos técnicos
- Handoff automático al CRM / equipo comercial vía n8n
- Vista comercial de activos próximos a fin de vida

#### M8: Analytics & Productivity
Inteligencia operativa para supervisores y gerentes.

- Tiempo promedio de visita por técnico y por tipo de servicio
- Tiempo de llenado vs. tiempo de trabajo técnico
- Órdenes completadas vs. pendientes vs. atrasadas
- Hallazgos por técnico y por cliente
- Oportunidades generadas y convertidas
- Tasa de cumplimiento de SLA

#### M9: Inventory / Catalog Bridge
Trazabilidad de repuestos y equipos.

- Catálogo de repuestos con número de parte y precio
- Registro de repuestos utilizados en cada orden
- Stock por técnico / por bodega
- Trazabilidad de series instaladas

#### M10: AI Enablement (transversal desde V1)
Gemini integrado en los flujos de mayor carga cognitiva.

- Redactado asistido de hallazgos desde notas de voz o texto libre
- Resumen de visita para el cuerpo del email al cliente
- Clasificación automática de criticidad de hallazgos
- Extracción de parámetros desde fotos (futura)

---

## Flujos clave

### Flujo 1: Ejecución de visita técnica (flujo principal)
```
Técnico recibe notificación de orden asignada
  → Abre la orden en móvil
  → Registra llegada al sitio (un tap)
  → Ejecuta checklist por activo
    → Registra parámetros (voltaje, corriente, temperatura)
    → Toma foto de cada hallazgo relevante
    → Registra hallazgos y recomendaciones
    → Registra repuestos utilizados
  → Registra salida del sitio
  → Cliente firma en pantalla
  → Orden se cierra
  → Sistema genera informe PDF automáticamente
  → Email al cliente se envía (automático o con confirmación del supervisor)
```

**KPI objetivo:** < 5 minutos de tiempo administrativo adicional por visita

### Flujo 2: Revisión y aprobación de informe (supervisor)
```
Supervisore recibe notificación de orden completada
  → Revisa resumen de la visita en web
  → Revisa fotos y hallazgos
  → Aprueba informe o solicita correcciones
  → Informe se envía al cliente
```

### Flujo 3: Generación de oportunidad comercial
```
Técnico registra hallazgo crítico (ej: batería deteriorada, requiere reemplazo)
  → Sistema clasifica como oportunidad comercial
  → n8n crea tarea en CRM / notifica al comercial
  → Comercial recibe contexto técnico completo
  → Genera propuesta con información real del activo
```

---

## Métricas de éxito del producto

### Para técnicos
- Reducción del tiempo de documentación por visita: objetivo > 60%
- Tasa de informes generados automáticamente sin edición manual: objetivo > 80%
- NPS de técnicos: objetivo > 50

### Para la empresa (tenant)
- Tiempo entre cierre de visita y envío de informe al cliente: objetivo < 30 min (vs. 24–72h típico)
- Tasa de hallazgos convertidos en oportunidades: objetivo > 30%
- Reducción de reclamos por calidad de informe: objetivo > 70%

### Para Voltaryx como SaaS
- Tenants activos con > 10 órdenes/mes: indicador de retención
- MRR por módulo activo
- Tiempo de onboarding de nuevo tenant: objetivo < 2 horas

---

## Decisiones de producto no negociables

1. **Offline primero.** El técnico nunca pierde datos por falta de conexión.
2. **Informe automático.** La visita genera el informe, no la redacción post-visita.
3. **Mobile-first.** El técnico opera desde el móvil. La web es para supervisores.
4. **Multitenancy desde día 1.** No como feature, como arquitectura base.
5. **Calidad visual no negociable.** Voltaryx no puede parecer un sistema corporativo viejo.
6. **AI como asistente, no como reemplazo.** El técnico siempre tiene la última palabra.
