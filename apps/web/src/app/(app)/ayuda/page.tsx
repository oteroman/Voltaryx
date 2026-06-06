import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, ClipboardList, Users, MapPin, Cpu,
  Package, BookOpen, TrendingUp, FileText, BarChart3,
  User, ChevronRight, Info, Lightbulb, CheckCircle2,
  ArrowRight, Zap, Star, Keyboard, HelpCircle,
} from 'lucide-react'
import { cn } from '@/components/ui/cn'

export const dynamic = 'force-dynamic'

/* ─── Tipos ──────────────────────────────────────────────────────────── */
type Role = 'tenant_admin' | 'supervisor' | 'commercial' | 'technician' | string

interface Section {
  id: string
  icon: React.ElementType
  title: string
  roles: Role[]
  color: string
  dotColor: string
}

/* ─── Configuración de secciones ─────────────────────────────────────── */
const ALL_SECTIONS: Section[] = [
  {
    id: 'primeros-pasos',
    icon: Star,
    title: 'Primeros pasos',
    roles: ['tenant_admin', 'supervisor', 'commercial', 'technician'],
    color: 'text-volt-500',
    dotColor: 'bg-volt-500',
  },
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    title: 'Dashboard',
    roles: ['tenant_admin', 'supervisor', 'commercial'],
    color: 'text-blue-400',
    dotColor: 'bg-blue-400',
  },
  {
    id: 'ordenes',
    icon: ClipboardList,
    title: 'Órdenes de trabajo',
    roles: ['tenant_admin', 'supervisor', 'commercial', 'technician'],
    color: 'text-volt-500',
    dotColor: 'bg-volt-500',
  },
  {
    id: 'clientes',
    icon: Users,
    title: 'Clientes',
    roles: ['tenant_admin', 'supervisor', 'commercial'],
    color: 'text-purple-400',
    dotColor: 'bg-purple-400',
  },
  {
    id: 'sitios',
    icon: MapPin,
    title: 'Sitios',
    roles: ['tenant_admin', 'supervisor', 'commercial'],
    color: 'text-purple-400',
    dotColor: 'bg-purple-400',
  },
  {
    id: 'activos',
    icon: Cpu,
    title: 'Activos del cliente',
    roles: ['tenant_admin', 'supervisor', 'commercial', 'technician'],
    color: 'text-amber-400',
    dotColor: 'bg-amber-400',
  },
  {
    id: 'inventario',
    icon: Package,
    title: 'Inventario',
    roles: ['tenant_admin', 'supervisor', 'commercial'],
    color: 'text-green-400',
    dotColor: 'bg-green-400',
  },
  {
    id: 'catalogo',
    icon: BookOpen,
    title: 'Catálogo de productos',
    roles: ['tenant_admin', 'supervisor', 'commercial'],
    color: 'text-green-400',
    dotColor: 'bg-green-400',
  },
  {
    id: 'pipeline',
    icon: TrendingUp,
    title: 'Pipeline / Oportunidades',
    roles: ['tenant_admin', 'supervisor', 'commercial'],
    color: 'text-purple-400',
    dotColor: 'bg-purple-400',
  },
  {
    id: 'contratos',
    icon: FileText,
    title: 'Contratos',
    roles: ['tenant_admin', 'supervisor', 'commercial'],
    color: 'text-blue-400',
    dotColor: 'bg-blue-400',
  },
  {
    id: 'analytics',
    icon: BarChart3,
    title: 'Analytics',
    roles: ['tenant_admin', 'supervisor', 'commercial'],
    color: 'text-volt-500',
    dotColor: 'bg-volt-500',
  },
  {
    id: 'perfil',
    icon: User,
    title: 'Perfil',
    roles: ['tenant_admin', 'supervisor', 'commercial', 'technician'],
    color: 'text-ink-secondary',
    dotColor: 'bg-ink-secondary',
  },
  {
    id: 'atajos',
    icon: Keyboard,
    title: 'Consejos para tablet',
    roles: ['tenant_admin', 'supervisor', 'commercial', 'technician'],
    color: 'text-ink-secondary',
    dotColor: 'bg-ink-secondary',
  },
]

/* ─── Etiquetas de rol ────────────────────────────────────────────────── */
const ROLE_LABEL: Record<string, string> = {
  tenant_admin: 'Administrador',
  supervisor:   'Supervisor',
  commercial:   'Comercial',
  technician:   'Técnico',
}

/* ─── Página ─────────────────────────────────────────────────────────── */
export default async function AyudaPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role, full_name').eq('id', user!.id).single()
  const role = (profile?.role ?? 'technician') as Role

  const visibleSections = ALL_SECTIONS.filter(s => s.roles.includes(role))

  return (
    <div className="flex flex-col">
      {/* ── Header ── */}
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-void/90 px-4 pb-3 pt-5 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <HelpCircle size={20} className="text-volt-500" />
          <h1 className="font-display text-xl font-bold text-ink-primary">Ayuda / Manual</h1>
        </div>
        <p className="mt-0.5 text-sm text-ink-secondary">
          Voltaryx · Guía para{' '}
          <span className="font-medium text-volt-500">{ROLE_LABEL[role] ?? role}</span>
        </p>
      </header>

      <div className="flex flex-col gap-6 px-4 py-5">

        {/* ── Índice rápido ── */}
        <nav aria-label="Índice de secciones">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-tertiary">En esta guía</p>
          <div className="rounded-xl border border-border-subtle bg-surface-1 divide-y divide-border-subtle">
            {visibleSections.map((s) => {
              const Icon = s.icon
              return (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2 transition-colors"
                >
                  <Icon size={16} className={s.color} />
                  <span className="flex-1 text-sm text-ink-primary">{s.title}</span>
                  <ChevronRight size={14} className="text-ink-tertiary" />
                </a>
              )
            })}
          </div>
        </nav>

        {/* ══════════════════════════════════════════════════════════
            PRIMEROS PASOS
        ══════════════════════════════════════════════════════════ */}
        <HelpSection id="primeros-pasos" icon={Star} title="Primeros pasos" accentColor="text-volt-500">
          <p className="text-sm text-ink-secondary">
            Voltaryx es la plataforma central de operaciones para empresas de mantenimiento de equipos
            eléctricos (UPS, estabilizadores, bancos de baterías). Todo comienza desde la barra de
            navegación inferior.
          </p>

          {role === 'technician' && (
            <QuickStartCard
              role="Técnico"
              steps={[
                { label: 'Abre la app y ve a Órdenes', detail: 'Verás tus órdenes asignadas de hoy y próximas.' },
                { label: 'Toca la orden para ver los detalles', detail: 'Revisa dirección, tipo de servicio y notas.' },
                { label: 'Pulsa "Iniciar" al llegar al sitio', detail: 'Registra tu llegada y comienza la ejecución.' },
                { label: 'Completa el checklist de trabajo', detail: 'Marca cada tarea, toma fotos si corresponde.' },
                { label: 'Registra hallazgos si los hay', detail: 'Documenta fallas o mejoras detectadas en el equipo.' },
                { label: 'Finaliza con firma del cliente', detail: 'El cliente firma en pantalla para cerrar la orden.' },
              ]}
            />
          )}

          {['supervisor', 'tenant_admin'].includes(role) && (
            <QuickStartCard
              role="Supervisor / Admin"
              steps={[
                { label: 'Revisa el Dashboard al inicio del día', detail: 'KPIs de órdenes, equipos críticos y alertas.' },
                { label: 'Crea órdenes de trabajo', detail: 'Botón "+" → elige cliente → sitio → tipo → técnico → fecha.' },
                { label: 'Supervisa el inventario', detail: 'Controla qué equipos están en campo y cuáles en taller.' },
                { label: 'Gestiona activos del cliente', detail: 'Actualiza el estado operativo según los últimos servicios.' },
                { label: 'Revisa los hallazgos abiertos', detail: 'Los hallazgos críticos aparecen como alertas en el Dashboard.' },
                { label: 'Consulta Analytics para el reporte mensual', detail: 'Tasa de completado, productividad y salud de flota.' },
              ]}
            />
          )}

          {role === 'commercial' && (
            <QuickStartCard
              role="Comercial"
              steps={[
                { label: 'Abre el Pipeline en la barra inferior', detail: 'Verás oportunidades ordenadas por valor estimado.' },
                { label: 'Gestiona hallazgos como oportunidades', detail: 'Los técnicos detectan problemas; tú los conviertes en propuestas.' },
                { label: 'Avanza etapas en el pipeline', detail: 'Identificado → Calificado → Propuesta → Negociación → Ganado.' },
                { label: 'Crea o renueva contratos', detail: 'Desde Contratos → Nuevo o desde el detalle de un contrato vencido.' },
                { label: 'Revisa Analytics para el MRR', detail: 'Controla ingresos recurrentes y pipeline ponderado.' },
              ]}
            />
          )}

          <TipBox>
            La navegación principal está en la barra inferior de la pantalla. Toca los iconos para
            cambiar de módulo sin perder tu lugar en el flujo actual.
          </TipBox>
        </HelpSection>

        {/* ══════════════════════════════════════════════════════════
            DASHBOARD
        ══════════════════════════════════════════════════════════ */}
        {visibleSections.some(s => s.id === 'dashboard') && (
          <HelpSection id="dashboard" icon={LayoutDashboard} title="Dashboard" accentColor="text-blue-400">
            <p className="text-sm text-ink-secondary">
              Vista ejecutiva del estado operativo en tiempo real. Se actualiza cada vez que abres la página.
            </p>

            <SubSection title="Qué encontrarás">
              <ul className="flex flex-col gap-2">
                <BulletItem label="Alertas críticas" text="Órdenes críticas del día, hallazgos sin atender y contratos por vencer." />
                <BulletItem label="Órdenes hoy / mes" text="Cuántas están activas, completadas y pendientes en el período." />
                <BulletItem label="Estado de equipos" text="Barra de salud: operativos, degradados y críticos en tiempo real." />
                <BulletItem label="Pipeline y contratos" text="Valor total de oportunidades abiertas y contratos activos." />
                <BulletItem label="Próximas órdenes" text="Lista de las siguientes 5 órdenes programadas con hora y técnico." />
              </ul>
            </SubSection>

            <SubSection title="Cómo usar">
              <StepList steps={[
                'Las alertas en rojo en la parte superior requieren acción inmediata: tócalas para ir directo al módulo.',
                'El indicador de puntos de colores en "Próximas órdenes" muestra la prioridad: rojo = crítico, naranja = alto.',
                'El punto verde parpadeante en una orden indica que está en ejecución activa en este momento.',
                'Toca cualquier card de KPI para ir al módulo correspondiente.',
              ]} />
            </SubSection>

            <TipBox>
              Si un contrato aparece en la alerta de vencimiento, ve a Contratos y usa la opción
              de renovar antes de que expire para no perder el SLA acordado.
            </TipBox>
          </HelpSection>
        )}

        {/* ══════════════════════════════════════════════════════════
            ÓRDENES DE TRABAJO
        ══════════════════════════════════════════════════════════ */}
        <HelpSection id="ordenes" icon={ClipboardList} title="Órdenes de trabajo" accentColor="text-volt-500">
          <p className="text-sm text-ink-secondary">
            Las órdenes de trabajo (OT) son el núcleo de Voltaryx. Registran cada servicio: desde el
            mantenimiento preventivo programado hasta una emergencia nocturna.
          </p>

          {['tenant_admin', 'supervisor'].includes(role) && (
            <SubSection title="Crear una orden (solo Supervisor / Admin)">
              <StepList steps={[
                'Toca el botón "+" en la cabecera de Órdenes o el botón flotante verde en la barra inferior.',
                'Selecciona el cliente de la lista.',
                'Elige el sitio del cliente donde se realizará el servicio.',
                'Escoge el tipo de servicio: Preventivo, Correctivo, Emergencia, Instalación o Inspección.',
                'Establece la prioridad: Normal, Alta o Crítica.',
                'Asigna un técnico responsable.',
                'Fija la fecha y hora programada.',
                'Guarda. La orden queda en estado "Programada" y el técnico la verá en su lista.',
              ]} />
            </SubSection>
          )}

          <SubSection title="Estados de una orden">
            <div className="flex flex-col gap-2">
              <StatusRow status="Programada" dot="bg-ink-tertiary" text="Agendada, aún no iniciada." />
              <StatusRow status="En camino" dot="bg-amber-400" text="El técnico está en ruta al sitio." />
              <StatusRow status="En sitio" dot="bg-volt-500 animate-pulse" text="El técnico está ejecutando el trabajo." />
              <StatusRow status="En progreso" dot="bg-volt-500" text="Trabajo en curso con tareas iniciadas." />
              <StatusRow status="Completada" dot="bg-success" text="Firmada y cerrada." />
              <StatusRow status="Cancelada" dot="bg-critical" text="Anulada antes de ejecutarse." />
            </div>
          </SubSection>

          <SubSection title="Ejecutar una orden en campo (técnicos)">
            <StepList steps={[
              'Abre la orden desde tu lista de Órdenes.',
              'Toca "Iniciar orden" al llegar al sitio para cambiar el estado.',
              'Completa el checklist de tareas: marca cada punto conforme lo realizas.',
              'Si detectas una falla o mejora, usa "Agregar hallazgo" para documentarla.',
              'Toma fotos del equipo antes y después si el checklist lo requiere.',
              'Al terminar, solicita la firma del cliente en pantalla.',
              'La orden pasa a "Completada" y queda disponible para el informe.',
            ]} />
          </SubSection>

          <SubSection title="Hallazgos durante la ejecución">
            <p className="text-sm text-ink-secondary">
              Un hallazgo es cualquier problema, riesgo o mejora detectada durante el servicio. Puedes
              marcarlo como oportunidad comercial para que el equipo comercial lo gestione en el Pipeline.
            </p>
            <div className="mt-2 flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-xs text-ink-tertiary">
                <span className="h-2 w-2 rounded-full bg-critical flex-shrink-0" />
                Crítico — requiere acción inmediata
              </div>
              <div className="flex items-center gap-2 text-xs text-ink-tertiary">
                <span className="h-2 w-2 rounded-full bg-amber-400 flex-shrink-0" />
                Alto — atender en el próximo servicio
              </div>
              <div className="flex items-center gap-2 text-xs text-ink-tertiary">
                <span className="h-2 w-2 rounded-full bg-yellow-400 flex-shrink-0" />
                Medio — monitorear
              </div>
              <div className="flex items-center gap-2 text-xs text-ink-tertiary">
                <span className="h-2 w-2 rounded-full bg-success flex-shrink-0" />
                Bajo — sin urgencia
              </div>
            </div>
          </SubSection>

          <TipBox>
            Si eres técnico y no ves una orden que debería estar asignada, pide al supervisor que
            verifique que la orden tenga tu usuario como "técnico asignado" y que la fecha sea correcta.
          </TipBox>
        </HelpSection>

        {/* ══════════════════════════════════════════════════════════
            CLIENTES
        ══════════════════════════════════════════════════════════ */}
        {visibleSections.some(s => s.id === 'clientes') && (
          <HelpSection id="clientes" icon={Users} title="Clientes" accentColor="text-purple-400">
            <p className="text-sm text-ink-secondary">
              Directorio central de todas las empresas a las que Voltaryx presta servicios.
              Cada cliente puede tener múltiples sitios, activos y contratos asociados.
            </p>

            <SubSection title="Tier de cliente">
              <div className="flex flex-col gap-2">
                <TierRow tier="VIP" color="text-amber-400" border="border-amber-400/30" bg="bg-amber-400/10"
                  text="Clientes de mayor facturación o contratos premium. Prioridad máxima en respuesta." />
                <TierRow tier="Premium" color="text-purple-400" border="border-purple-400/30" bg="bg-purple-400/10"
                  text="Clientes con contrato activo de mantenimiento regular." />
                <TierRow tier="Standard" color="text-ink-secondary" border="border-border-subtle" bg="bg-surface-2"
                  text="Clientes en modo ad-hoc o con contrato básico." />
              </div>
            </SubSection>

            <SubSection title="Crear un cliente">
              <StepList steps={[
                'Ve a Clientes en el menú lateral o mediante la URL /customers.',
                'Toca "Nuevo cliente".',
                'Completa: nombre de empresa, RUC (opcional), teléfono y persona de contacto.',
                'Asigna el tier (VIP / Premium / Standard).',
                'Guarda. El cliente queda activo y podrás agregar sitios de inmediato.',
              ]} />
            </SubSection>

            <SubSection title="Detalle del cliente">
              <p className="text-sm text-ink-secondary">
                Desde el detalle puedes ver todos los sitios registrados, el historial de órdenes
                y los contratos vinculados. Usa el botón "Nuevo sitio" para agregar ubicaciones.
              </p>
            </SubSection>

            <TipBox>
              Antes de crear una orden, verifica que el cliente y su sitio existan en el sistema.
              Un cliente sin sitios no puede recibir órdenes de trabajo.
            </TipBox>
          </HelpSection>
        )}

        {/* ══════════════════════════════════════════════════════════
            SITIOS
        ══════════════════════════════════════════════════════════ */}
        {visibleSections.some(s => s.id === 'sitios') && (
          <HelpSection id="sitios" icon={MapPin} title="Sitios" accentColor="text-purple-400">
            <p className="text-sm text-ink-secondary">
              Un sitio es cada ubicación física del cliente donde se realizan servicios.
              Un mismo cliente puede tener varios sitios: oficinas, almacenes, centros de datos, etc.
            </p>

            <SubSection title="Crear un sitio">
              <StepList steps={[
                'Ingresa al detalle del cliente.',
                'Toca "Nuevo sitio".',
                'Escribe el nombre del sitio (ej. "Sede Miraflores", "Data Center Lima Norte").',
                'Ingresa la dirección completa para que el técnico pueda llegar.',
                'Agrega notas de acceso: cómo entrar, a quién preguntar, código de puerta, etc.',
                'Añade el contacto en sitio: nombre y teléfono de la persona que recibirá al técnico.',
                'Guarda. El sitio quedará disponible al crear órdenes para este cliente.',
              ]} />
            </SubSection>

            <TipBox>
              Las notas de acceso son clave para los técnicos. Incluye información como
              "Ingresar por puerta lateral, preguntar por Seguridad, parqueo en sótano 1".
            </TipBox>
          </HelpSection>
        )}

        {/* ══════════════════════════════════════════════════════════
            ACTIVOS
        ══════════════════════════════════════════════════════════ */}
        <HelpSection id="activos" icon={Cpu} title="Activos del cliente" accentColor="text-amber-400">
          <p className="text-sm text-ink-secondary">
            Los activos son los equipos que el cliente tiene en sus instalaciones y que Voltaryx
            mantiene: UPS, estabilizadores, bancos de baterías, entre otros. Cada activo tiene su
            propio historial de servicios.
          </p>

          <SubSection title="Estados de un activo">
            <div className="flex flex-col gap-2">
              <StatusRow status="Operativo" dot="bg-success" text="Funcionando correctamente sin alertas." />
              <StatusRow status="Degradado" dot="bg-amber-400" text="Con fallas menores o en monitoreo. Requiere atención pronto." />
              <StatusRow status="Crítico" dot="bg-critical" text="En riesgo de falla o fuera de servicio. Acción urgente." />
            </div>
          </SubSection>

          {['tenant_admin', 'supervisor', 'commercial'].includes(role) && (
            <SubSection title="Crear un activo">
              <StepList steps={[
                'Ve a Activos desde el menú.',
                'Toca "Nuevo activo".',
                'Selecciona el cliente y el sitio donde está el equipo.',
                'Elige el tipo de activo (UPS, estabilizador, banco de baterías, etc.).',
                'Ingresa el nombre descriptivo, número de serie y marca/modelo.',
                'Establece el estado inicial.',
                'Guarda. El activo queda vinculado al sitio y aparecerá en futuras órdenes.',
              ]} />
            </SubSection>
          )}

          <SubSection title="Historial de un activo">
            <p className="text-sm text-ink-secondary">
              Desde el detalle de cualquier activo puedes ver todas las órdenes de trabajo
              realizadas sobre ese equipo, organizadas cronológicamente. Esto te permite
              rastrear la evolución del estado del equipo a lo largo del tiempo.
            </p>
          </SubSection>

          <TipBox>
            Actualiza el estado del activo al cerrar cada orden. Un activo en estado "Crítico"
            aparece en las alertas del Dashboard para que el equipo tome acción rápidamente.
          </TipBox>
        </HelpSection>

        {/* ══════════════════════════════════════════════════════════
            INVENTARIO
        ══════════════════════════════════════════════════════════ */}
        {visibleSections.some(s => s.id === 'inventario') && (
          <HelpSection id="inventario" icon={Package} title="Inventario" accentColor="text-green-400">
            <p className="text-sm text-ink-secondary">
              El inventario registra los equipos propios de Mafort/Voltaryx: las unidades que se
              alquilan, se despliegan en campo o se tienen en stock. Cada unidad se identifica por
              número de serie.
            </p>

            <SubSection title="Estados del inventario">
              <div className="flex flex-col gap-2">
                <StatusRow status="En stock" dot="bg-success" text="Disponible en almacén, listo para desplegar." />
                <StatusRow status="En operación" dot="bg-blue-400" text="Desplegado en instalaciones de un cliente (alquiler activo)." />
                <StatusRow status="En taller" dot="bg-amber-400" text="En reparación o mantenimiento interno." />
                <StatusRow status="En tránsito" dot="bg-purple-400" text="En movimiento entre almacén y sitio del cliente." />
              </div>
            </SubSection>

            <SubSection title="Agregar una unidad al inventario">
              <StepList steps={[
                'Ve a Inventario → "Unidad" (botón superior derecho).',
                'Selecciona el producto del catálogo (tipo de equipo).',
                'Ingresa el número de serie o código de ítem único.',
                'Establece el estado inicial (normalmente "En stock").',
                'Si está en almacén, indica la ubicación física (ej. "Estante A-3").',
                'Guarda. La unidad aparecerá en la sección correspondiente.',
              ]} />
            </SubSection>

            <SubSection title="Alerta: equipo en taller sin reemplazo">
              <p className="text-sm text-ink-secondary">
                Cuando un equipo está en taller y el cliente no tiene unidad sustituta asignada,
                el sistema genera una alerta naranja en la parte superior del Inventario. Usa
                la ficha de la unidad para asignar un equipo de reemplazo desde el stock disponible.
              </p>
            </SubSection>

            <TipBox>
              Accede al Catálogo desde el botón "Catálogo" en la cabecera del Inventario para
              ver o editar los tipos de productos y sus precios antes de agregar unidades.
            </TipBox>
          </HelpSection>
        )}

        {/* ══════════════════════════════════════════════════════════
            CATÁLOGO
        ══════════════════════════════════════════════════════════ */}
        {visibleSections.some(s => s.id === 'catalogo') && (
          <HelpSection id="catalogo" icon={BookOpen} title="Catálogo de productos" accentColor="text-green-400">
            <p className="text-sm text-ink-secondary">
              El catálogo define los tipos de equipos que maneja Voltaryx: marca, modelo, potencia y
              estructura de precios. Cada unidad del inventario deriva de un producto del catálogo.
            </p>

            <SubSection title="Precios duales">
              <div className="rounded-lg border border-border-subtle bg-surface-2 divide-y divide-border-subtle">
                <div className="px-4 py-3">
                  <p className="text-sm font-semibold text-ink-primary">Precio distribuidor</p>
                  <p className="text-xs text-ink-tertiary mt-0.5">
                    Precio de costo o precio especial para distribuidores y revendedores.
                  </p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm font-semibold text-ink-primary">Precio final</p>
                  <p className="text-xs text-ink-tertiary mt-0.5">
                    Precio de venta al cliente final. Este es el precio que se usa en cotizaciones y contratos.
                  </p>
                </div>
              </div>
            </SubSection>

            <SubSection title="Producto rentable">
              <p className="text-sm text-ink-secondary">
                Si activas el interruptor "Rentable" en un producto, las unidades de ese tipo
                en el Inventario podrán tener una tarifa mensual de alquiler configurada.
              </p>
            </SubSection>
          </HelpSection>
        )}

        {/* ══════════════════════════════════════════════════════════
            PIPELINE
        ══════════════════════════════════════════════════════════ */}
        {visibleSections.some(s => s.id === 'pipeline') && (
          <HelpSection id="pipeline" icon={TrendingUp} title="Pipeline / Oportunidades" accentColor="text-purple-400">
            <p className="text-sm text-ink-secondary">
              El pipeline convierte los hallazgos técnicos en oportunidades comerciales.
              Cuando un técnico detecta una mejora o falla importante, el equipo comercial
              puede convertirla en una propuesta formal.
            </p>

            <SubSection title="Etapas del pipeline">
              <div className="flex flex-col gap-2">
                <PipelineStage label="Identificado" pct={10} cls="bg-surface-3 text-ink-secondary"
                  text="El hallazgo está documentado pero aún no se ha contactado al cliente." />
                <PipelineStage label="Calificado" pct={25} cls="bg-blue-500/20 text-blue-400"
                  text="Se confirmó el interés del cliente. Vale la pena invertir tiempo." />
                <PipelineStage label="Propuesta" pct={50} cls="bg-purple-500/20 text-purple-400"
                  text="Se envió cotización formal al cliente." />
                <PipelineStage label="Negociación" pct={75} cls="bg-amber-500/20 text-amber-400"
                  text="El cliente está revisando condiciones. Hay intercambio activo." />
                <PipelineStage label="Ganado" pct={100} cls="bg-success/20 text-success"
                  text="El cliente aprobó. Se procede a facturar o crear contrato." />
              </div>
            </SubSection>

            <SubSection title="Cómo avanzar una oportunidad">
              <StepList steps={[
                'Desde el Pipeline, toca el botón de flecha "→ Etapa siguiente" en la oportunidad.',
                'Confirma el avance en la pantalla de confirmación.',
                'La barra de progreso superior de la oportunidad refleja el avance porcentual.',
                'Si la oportunidad se pierde, usa la opción de marcar como "Perdido" para registrarlo.',
              ]} />
            </SubSection>

            <SubSection title="Gestionar hallazgos sin propuesta">
              <p className="text-sm text-ink-secondary">
                La sección "Hallazgos sin gestionar" muestra los hallazgos marcados como oportunidad
                por técnicos que aún no tienen propuesta formal. Toca "Gestionar" para crear la
                oportunidad con los datos del hallazgo pre-cargados.
              </p>
            </SubSection>

            <TipBox>
              El valor del pipeline se muestra en la cabecera. El mini-funnel con los contadores
              por etapa te da una vista rápida del embudo de ventas sin entrar al detalle.
            </TipBox>
          </HelpSection>
        )}

        {/* ══════════════════════════════════════════════════════════
            CONTRATOS
        ══════════════════════════════════════════════════════════ */}
        {visibleSections.some(s => s.id === 'contratos') && (
          <HelpSection id="contratos" icon={FileText} title="Contratos" accentColor="text-blue-400">
            <p className="text-sm text-ink-secondary">
              Los contratos formalizan la relación con cada cliente: SLA de respuesta, ciclo de
              facturación, número de visitas anuales y fechas de vigencia.
            </p>

            <SubSection title="Ciclo de vida de un contrato">
              <div className="flex flex-col gap-2">
                <StatusRow status="Borrador" dot="bg-surface-3" text="En elaboración. No tiene efectos aún." />
                <StatusRow status="Activo" dot="bg-success" text="Vigente. El SLA aplica para todas las órdenes del cliente." />
                <StatusRow status="Vencido" dot="bg-critical" text="Fuera de fecha. Requiere renovación para continuar." />
              </div>
            </SubSection>

            <SubSection title="Crear un contrato">
              <StepList steps={[
                'Ve a Contratos → "Nuevo".',
                'Selecciona el cliente.',
                'Define el tipo: Mantenimiento, Monitoreo, Proyecto o Ad-hoc.',
                'Establece el SLA: horas máximas de respuesta y resolución.',
                'Configura el ciclo de facturación (mensual, anual) y el valor.',
                'Ingresa las visitas incluidas por año.',
                'Fija la fecha de inicio y vencimiento.',
                'Guarda como borrador. Cuando esté listo, usa "Activar contrato" en el detalle.',
              ]} />
            </SubSection>

            <SubSection title="Alertas de vencimiento">
              <p className="text-sm text-ink-secondary">
                El sistema alerta cuando un contrato activo vence en los próximos 30 días.
                La alerta aparece en la cabecera de Contratos y en el Dashboard. Contacta
                al cliente para renovar antes del vencimiento.
              </p>
            </SubSection>

            <TipBox>
              El MRR (ingreso mensual recurrente) se calcula automáticamente sumando el valor
              de todos los contratos activos con ciclo mensual. Consúltalo en Analytics.
            </TipBox>
          </HelpSection>
        )}

        {/* ══════════════════════════════════════════════════════════
            ANALYTICS
        ══════════════════════════════════════════════════════════ */}
        {visibleSections.some(s => s.id === 'analytics') && (
          <HelpSection id="analytics" icon={BarChart3} title="Analytics" accentColor="text-volt-500">
            <p className="text-sm text-ink-secondary">
              Métricas operativas y comerciales de los últimos 6 meses. Útil para reportes
              gerenciales, revisiones de equipo y planificación de capacidad.
            </p>

            <SubSection title="Métricas disponibles">
              <ul className="flex flex-col gap-2">
                <BulletItem label="Tasa de completado" text="% de órdenes completadas vs. programadas en los últimos 6 meses." />
                <BulletItem label="Órdenes por mes" text="Gráfico de barras con total y completadas mes a mes." />
                <BulletItem label="Por tipo de servicio" text="Desglose: preventivo, correctivo, emergencia, instalación, inspección." />
                <BulletItem label="Productividad técnicos" text="Top 5 técnicos por órdenes completadas con tasa individual." />
                <BulletItem label="Salud de flota" text="% de activos operativos, degradados y críticos." />
                <BulletItem label="Hallazgos" text="Críticos abiertos y potencial de facturación en oportunidades detectadas." />
                <BulletItem label="MRR / ARR" text="Ingresos recurrentes de contratos mensuales y su proyección anual." />
                <BulletItem label="Pipeline ponderado" text="Valor de oportunidades ajustado por probabilidad de cierre." />
              </ul>
            </SubSection>

            <TipBox>
              El gráfico de barras muestra en verde la proporción completada sobre el total.
              Una barra completamente verde indica un mes con alta eficiencia operativa.
            </TipBox>
          </HelpSection>
        )}

        {/* ══════════════════════════════════════════════════════════
            PERFIL
        ══════════════════════════════════════════════════════════ */}
        <HelpSection id="perfil" icon={User} title="Perfil" accentColor="text-ink-secondary">
          <p className="text-sm text-ink-secondary">
            Tu perfil muestra los datos de tu cuenta, el rol asignado y la empresa a la que perteneces.
          </p>

          <SubSection title="Datos que verás">
            <ul className="flex flex-col gap-2">
              <BulletItem label="Email" text="La dirección de correo con la que accediste." />
              <BulletItem label="Teléfono" text="Número de contacto registrado (si aplica)." />
              <BulletItem label="Empresa" text="Nombre del tenant al que pertenece tu cuenta." />
              <BulletItem label="Plan" text="Plan de suscripción activo de la empresa." />
            </ul>
          </SubSection>

          <SubSection title="Roles y permisos">
            <div className="flex flex-col gap-2">
              <RoleRow role="Administrador" color="text-volt-500"
                perms="Acceso completo a todos los módulos. Puede crear órdenes y usuarios." />
              <RoleRow role="Supervisor" color="text-blue-400"
                perms="Dashboard, Órdenes, Inventario y todos los módulos de gestión." />
              <RoleRow role="Comercial" color="text-purple-400"
                perms="Dashboard, Pipeline, Inventario y Contratos. Sin acceso a ejecución de órdenes." />
              <RoleRow role="Técnico" color="text-amber-400"
                perms="Solo sus propias órdenes asignadas y el módulo de Activos." />
            </div>
          </SubSection>

          <SubSection title="Cerrar sesión">
            <p className="text-sm text-ink-secondary">
              Usa el botón "Cerrar sesión" en la parte inferior del Perfil. Tus datos y órdenes
              quedan guardados en el servidor; al volver a ingresar verás todo igual.
            </p>
          </SubSection>
        </HelpSection>

        {/* ══════════════════════════════════════════════════════════
            ATAJOS Y CONSEJOS PARA TABLET
        ══════════════════════════════════════════════════════════ */}
        <HelpSection id="atajos" icon={Keyboard} title="Consejos para tablet" accentColor="text-ink-secondary">
          <p className="text-sm text-ink-secondary">
            Voltaryx está optimizado para uso en tablet en campo. Estos consejos te ayudarán
            a trabajar más rápido.
          </p>

          <SubSection title="Navegación eficiente">
            <div className="flex flex-col gap-3">
              <TipItem icon="👆" tip="Toca y mantén" detail="En la mayoría de listas, toca y mantén para ver opciones rápidas." />
              <TipItem icon="↩" tip="Botón Atrás del navegador" detail="Funciona para volver a la pantalla anterior sin perder datos del formulario." />
              <TipItem icon="🔄" tip="Desliza hacia abajo para refrescar" detail="En la lista de órdenes y en el Dashboard puedes recargar los datos arrastrando la pantalla hacia abajo." />
              <TipItem icon="🔗" tip="URLs directas" detail="Cada módulo tiene su URL fija: /dashboard, /orders, /customers, /assets, /inventory, /opportunities, /contracts, /reports." />
            </div>
          </SubSection>

          <SubSection title="Trabajo sin conexión">
            <p className="text-sm text-ink-secondary">
              El indicador de conectividad en la parte superior de la pantalla muestra si hay conexión
              a internet. Cuando estás offline, puedes consultar los datos ya cargados, pero los cambios
              no se guardarán hasta recuperar la conexión.
            </p>
            <TipBox>
              Antes de ir a un sitio sin cobertura, abre las órdenes del día para que los datos
              queden en caché del navegador.
            </TipBox>
          </SubSection>

          <SubSection title="Firma en pantalla">
            <div className="flex flex-col gap-2 text-sm text-ink-secondary">
              <p>Al completar una orden, el cliente firma directamente en la pantalla táctil de la tablet.</p>
              <ul className="flex flex-col gap-1 pl-4 list-disc text-ink-tertiary">
                <li>Entrega la tablet al cliente con la pantalla de firma visible.</li>
                <li>El cliente traza su firma con el dedo o lápiz stylus.</li>
                <li>Toca "Confirmar firma" para guardar y cerrar la orden.</li>
                <li>Si el cliente no está disponible, usa "Omitir firma" y documenta el motivo.</li>
              </ul>
            </div>
          </SubSection>

          <SubSection title="Fotos de evidencia">
            <p className="text-sm text-ink-secondary">
              Durante la ejecución de una orden puedes capturar fotos directamente desde la cámara
              de la tablet. Las fotos quedan adjuntas a la orden y son accesibles en el historial.
            </p>
            <ul className="mt-2 flex flex-col gap-1 pl-4 list-disc text-xs text-ink-tertiary">
              <li>Usa iluminación adecuada para que las placas del equipo sean legibles.</li>
              <li>Toma foto del estado inicial y del estado final después del servicio.</li>
              <li>Las fotos de los hallazgos críticos son especialmente importantes para el cliente.</li>
            </ul>
          </SubSection>

          <SubSection title="Atajos de módulos">
            <div className="rounded-lg border border-border-subtle bg-surface-1 divide-y divide-border-subtle">
              {[
                { shortcut: '/dashboard',     label: 'Dashboard' },
                { shortcut: '/orders',        label: 'Órdenes de trabajo' },
                { shortcut: '/orders/new',    label: 'Nueva orden' },
                { shortcut: '/customers',     label: 'Clientes' },
                { shortcut: '/assets',        label: 'Activos' },
                { shortcut: '/inventory',     label: 'Inventario' },
                { shortcut: '/opportunities', label: 'Pipeline' },
                { shortcut: '/contracts',     label: 'Contratos' },
                { shortcut: '/reports',       label: 'Analytics' },
                { shortcut: '/profile',       label: 'Mi perfil' },
              ].map((row) => (
                <div key={row.shortcut} className="flex items-center gap-3 px-4 py-2.5">
                  <code className="rounded bg-surface-3 px-2 py-0.5 font-mono text-xs text-volt-500">
                    {row.shortcut}
                  </code>
                  <span className="text-sm text-ink-secondary">{row.label}</span>
                </div>
              ))}
            </div>
          </SubSection>
        </HelpSection>

        {/* ── Footer ── */}
        <footer className="rounded-xl border border-border-subtle bg-surface-1 px-4 py-5 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Zap size={16} className="text-volt-500" />
            <p className="text-sm font-semibold text-ink-primary">Voltaryx</p>
          </div>
          <p className="text-xs text-ink-tertiary">
            Plataforma de gestión de servicios de campo para mantenimiento eléctrico.
          </p>
          <p className="mt-1 text-xs text-ink-tertiary">
            ¿Necesitas ayuda adicional? Contacta a tu administrador de cuenta.
          </p>
          <Link href="/profile" className="mt-3 inline-flex items-center gap-1 text-xs text-volt-500 hover:underline">
            Ir a mi perfil <ArrowRight size={12} />
          </Link>
        </footer>

      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   Sub-componentes
═══════════════════════════════════════════════════════════════════════ */

function HelpSection({
  id, icon: Icon, title, accentColor, children,
}: {
  id: string
  icon: React.ElementType
  title: string
  accentColor: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <div className="mb-3 flex items-center gap-2">
        <Icon size={18} className={accentColor} />
        <h2 className="text-base font-bold text-ink-primary">{title}</h2>
      </div>
      <div className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-1 px-4 py-4">
        {children}
      </div>
    </section>
  )
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-tertiary">{title}</p>
      {children}
    </div>
  )
}

function StepList({ steps }: { steps: string[] }) {
  return (
    <ol className="flex flex-col gap-2">
      {steps.map((step, i) => (
        <li key={i} className="flex items-start gap-3 text-sm text-ink-secondary">
          <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-volt-500/10 text-xs font-bold text-volt-500">
            {i + 1}
          </span>
          {step}
        </li>
      ))}
    </ol>
  )
}

function BulletItem({ label, text }: { label: string; text: string }) {
  return (
    <li className="flex items-start gap-2 text-sm text-ink-secondary">
      <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0 text-volt-500" />
      <span>
        <span className="font-semibold text-ink-primary">{label}:</span>{' '}
        {text}
      </span>
    </li>
  )
}

function StatusRow({ status, dot, text }: { status: string; dot: string; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-surface-2 px-3 py-2.5">
      <span className={cn('mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full', dot)} />
      <div>
        <p className="text-sm font-semibold text-ink-primary">{status}</p>
        <p className="text-xs text-ink-tertiary">{text}</p>
      </div>
    </div>
  )
}

function TierRow({
  tier, color, border, bg, text,
}: {
  tier: string; color: string; border: string; bg: string; text: string
}) {
  return (
    <div className={cn('rounded-lg border px-3 py-2.5', border, bg)}>
      <p className={cn('text-sm font-bold', color)}>{tier}</p>
      <p className="text-xs text-ink-tertiary mt-0.5">{text}</p>
    </div>
  )
}

function RoleRow({ role, color, perms }: { role: string; color: string; perms: string }) {
  return (
    <div className="rounded-lg bg-surface-2 px-3 py-2.5">
      <p className={cn('text-sm font-semibold', color)}>{role}</p>
      <p className="text-xs text-ink-tertiary mt-0.5">{perms}</p>
    </div>
  )
}

function PipelineStage({
  label, pct, cls, text,
}: {
  label: string; pct: number; cls: string; text: string
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-surface-2 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', cls)}>{label}</span>
        <span className="text-xs text-ink-tertiary">{pct}%</span>
      </div>
      <div className="h-1 rounded-full bg-surface-3">
        <div className="h-full rounded-full bg-volt-500/60" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-ink-tertiary">{text}</p>
    </div>
  )
}

function TipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-volt-500/20 bg-volt-500/5 px-3 py-2.5">
      <Lightbulb size={14} className="mt-0.5 flex-shrink-0 text-volt-500" />
      <p className="text-xs text-ink-secondary">{children}</p>
    </div>
  )
}

function TipItem({ icon, tip, detail }: { icon: string; tip: string; detail: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-base flex-shrink-0">{icon}</span>
      <div>
        <p className="text-sm font-semibold text-ink-primary">{tip}</p>
        <p className="text-xs text-ink-tertiary">{detail}</p>
      </div>
    </div>
  )
}

function QuickStartCard({ role, steps }: { role: string; steps: { label: string; detail: string }[] }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-2">
      <div className="flex items-center gap-2 border-b border-border-subtle px-4 py-2.5">
        <Info size={14} className="text-volt-500" />
        <p className="text-sm font-semibold text-ink-primary">Flujo para {role}</p>
      </div>
      <div className="flex flex-col divide-y divide-border-subtle">
        {steps.map((s, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-3">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-volt-500/10 text-xs font-bold text-volt-500 mt-0.5">
              {i + 1}
            </span>
            <div>
              <p className="text-sm font-medium text-ink-primary">{s.label}</p>
              <p className="text-xs text-ink-tertiary">{s.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
