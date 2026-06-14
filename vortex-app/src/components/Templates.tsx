import { AppStack, AppTarget } from '../types'

export interface Template {
  id: string
  name: string
  icon: string
  description: string
  prompt: string
  stack: AppStack
  target: AppTarget
  color: string
}

export const TEMPLATES: Template[] = [
  {
    id: 'ecommerce',
    name: 'E-Commerce',
    icon: 'shopping_cart',
    color: '#3525CD',
    description: 'Tienda online con catálogo, carrito y checkout',
    stack: 'flutter',
    target: 'mobile',
    prompt: 'App de e-commerce de ropa con pantalla de inicio con banners y productos destacados, catálogo con filtros por categoría (remeras, pantalones, calzado) y búsqueda, detalle de producto con galería de fotos, talle y color seleccionables y botón agregar al carrito, carrito de compras con resumen de items y total, pantalla de checkout con formulario de envío y métodos de pago (tarjeta, transferencia). Datos de ejemplo reales con productos y precios en pesos argentinos.',
  },
  {
    id: 'fitness',
    name: 'Fitness Tracker',
    icon: 'fitness_center',
    color: '#E53935',
    description: 'Rastreador de ejercicios con rutinas y estadísticas',
    stack: 'flutter',
    target: 'mobile',
    prompt: 'App de fitness con pantalla de inicio con resumen del día (calorías, pasos, minutos activos), biblioteca de ejercicios con filtros por grupo muscular (pecho, espalda, piernas, core) con instrucciones y videos, pantalla de rutina activa con temporizador, series y repeticiones con botón completar set, historial de entrenamientos con gráficos de progreso semanal, y perfil con metas personales. Incluir datos de ejemplo de ejercicios reales.',
  },
  {
    id: 'delivery',
    name: 'App de Delivery',
    icon: 'delivery_dining',
    color: '#F57C00',
    description: 'Delivery de comida con restaurantes y pedidos en tiempo real',
    stack: 'flutter',
    target: 'mobile',
    prompt: 'App de delivery de comida tipo PedidosYa con pantalla de inicio con restaurantes cercanos organizados por categoría (pizzerías, sushi, hamburguesas, empanadas), menú de restaurante con secciones y items con foto y precio, pantalla de carrito con modificadores de cantidad y costo de envío, seguimiento del pedido con estado en tiempo real (confirmado, preparando, en camino, entregado) con mapa simplificado, y historial de pedidos anteriores. Precios en pesos argentinos.',
  },
  {
    id: 'finanzas',
    name: 'Control de Gastos',
    icon: 'account_balance_wallet',
    color: '#2E7D32',
    description: 'Finanzas personales con presupuesto y estadísticas',
    stack: 'flutter',
    target: 'mobile',
    prompt: 'App de finanzas personales con dashboard principal mostrando saldo total, gastos del mes por categoría (alimentación, transporte, entretenimiento, servicios) con gráfico de torta, pantalla para agregar transacción con tipo (ingreso/gasto), monto, categoría y nota, historial de transacciones con búsqueda y filtro por mes, pantalla de presupuestos por categoría con barra de progreso indicando cuánto se usó, y resumen estadístico mensual comparando con el mes anterior.',
  },
  {
    id: 'streaming_tv',
    name: 'Streaming TV',
    icon: 'play_circle',
    color: '#B71C1C',
    description: 'App de streaming para Android TV con contenido y reproducción',
    stack: 'flutter',
    target: 'tv',
    prompt: 'App de streaming de series y películas para Android TV con pantalla de inicio con carrusel de destacados navegable con D-pad, filas de categorías (Tendencias, Acción, Drama, Documentales) con cards horizontales focusables, pantalla de detalle del contenido con descripción, elenco y botón reproducir grande, pantalla del reproductor con controles de reproducción (play/pause, adelantar, atrasar) navegables con control remoto, y mi lista de contenido guardado. Diseño oscuro optimizado para TV con fuentes grandes y alto contraste.',
  },
  {
    id: 'social',
    name: 'Red Social',
    icon: 'group',
    color: '#6A1B9A',
    description: 'Red social con feed, perfiles y mensajes',
    stack: 'flutter',
    target: 'mobile',
    prompt: 'App de red social con feed principal con posts de texto e imagen con likes, comentarios y compartir, pantalla de crear post con editor de texto y opción de agregar foto, perfil de usuario con fotos, seguidores/seguidos y grilla de publicaciones, pantalla de búsqueda y explorar con usuarios sugeridos y posts populares, y sistema de mensajes directos con lista de conversaciones y chat. Incluir datos de ejemplo con usuarios y posts realistas en español.',
  },
  {
    id: 'recetas',
    name: 'App de Recetas',
    icon: 'restaurant_menu',
    color: '#00695C',
    description: 'Recetas con búsqueda, favoritos y modo cocina',
    stack: 'flutter',
    target: 'mobile',
    prompt: 'App de recetas de cocina con pantalla de inicio con recetas destacadas del día y búsqueda por ingrediente o nombre, explorador de recetas con filtros por tipo (desayuno, almuerzo, cena, postre) y tiempo de preparación, pantalla de detalle de receta con ingredientes con cantidades ajustables por porciones y pasos numerados con fotos, modo cocina paso a paso con pantalla encendida y navegación entre pasos, y colección de favoritos guardados. Recetas típicas argentinas y latinas.',
  },
  {
    id: 'tv_launcher',
    name: 'TV Launcher',
    icon: 'tv',
    color: '#1565C0',
    description: 'Launcher personalizado para Android TV con apps y widgets',
    stack: 'flutter',
    target: 'tv',
    prompt: 'Launcher para Android TV con pantalla principal tipo grid de apps favoritas (Netflix, YouTube, Spotify, juegos) con iconos grandes focusables y D-pad, fila de contenido reciente, widget de clima y reloj en la esquina superior, barra lateral de categorías (Apps, Juegos, Configuración), pantalla de todas las apps instaladas en grilla, y configuración de fondo personalizable. Diseño oscuro premium con animaciones de foco suaves y soporte completo para control remoto.',
  },
  {
    id: 'tv_player',
    name: 'Media Player TV',
    icon: 'play_circle',
    color: '#4A148C',
    description: 'Reproductor multimedia para TV con biblioteca y listas',
    stack: 'flutter',
    target: 'tv',
    prompt: 'App de reproductor multimedia para Android TV con pantalla de biblioteca con videos, música y fotos organizados en categorías navegables con D-pad, reproductor de video a pantalla completa con controles de transporte (play/pause, adelantar 10s, atrasar 10s, volumen) operables con control remoto, barra de progreso con preview de capítulos al navegar, lista de reproducción lateral deslizable, pantalla de música con carátula grande y letras sincronizadas, y ajustes de calidad de video y audio. Fondo negro, tipografía blanca de alto contraste.',
  },
  {
    id: 'turnos',
    name: 'Gestión de Turnos',
    icon: 'calendar_month',
    color: '#0277BD',
    description: 'Sistema de turnos para negocio (barbería, médico, etc.)',
    stack: 'flutter',
    target: 'mobile',
    prompt: 'App para gestión de turnos de una barbería con pantalla de inicio mostrando próximos turnos del día con estado (confirmado, pendiente, completado), calendario de disponibilidad semanal para seleccionar fecha y horario, formulario de nuevo turno con selección de servicio (corte, barba, combo), barbero disponible y datos del cliente, pantalla de gestión de clientes con historial de visitas y gasto total, y pantalla de estadísticas con ingresos del mes, turnos completados y servicio más popular.',
  },
  {
    id: 'tv_noticias',
    name: 'TV Noticias',
    icon: 'newspaper',
    color: '#C62828',
    description: 'Portal de noticias para Android TV con categorías y video',
    stack: 'flutter',
    target: 'tv',
    prompt: 'App de noticias para Android TV con pantalla principal con titular destacado en hero grande y grilla de noticias recientes por categoría (Nacionales, Internacionales, Economía, Deportes, Tecnología), navegable con D-pad, pantalla de categoría con lista de artículos en dos columnas con imagen, título y tiempo de publicación, pantalla de artículo con texto completo, imágenes y botón de reproducir video si disponible, sección de videos cortos tipo shorts horizontal, y barra de búsqueda por palabra clave. Diseño oscuro con tipografía de alto contraste y fuentes grandes para distancia de lectura en TV.',
  },
  {
    id: 'tv_dashboard',
    name: 'TV Dashboard',
    icon: 'dashboard',
    color: '#006064',
    description: 'Dashboard de métricas y estadísticas para pantalla grande',
    stack: 'flutter',
    target: 'tv',
    prompt: 'Dashboard de KPIs empresariales para Android TV con pantalla principal dividida en secciones: fila superior con 4 cards de métricas clave (ventas del día, usuarios activos, pedidos pendientes, ingresos del mes) con número grande y variación porcentual, sección central con gráfico de líneas de ventas últimos 7 días ocupando 2/3 del ancho y gráfico de torta de categorías al lado, fila inferior con tabla de últimas transacciones y mapa de calor de actividad. Navegación con D-pad entre widgets. Tema oscuro con acentos en cyan/verde para datos positivos y rojo para negativos. Datos de ejemplo reales en pesos argentinos.',
  },
  {
    id: 'compose_starter',
    name: 'Compose Starter',
    icon: 'android',
    color: '#1B5E20',
    description: 'App Android nativa con Jetpack Compose y arquitectura limpia',
    stack: 'kotlin',
    target: 'mobile',
    prompt: 'App Android nativa con Jetpack Compose para gestión de tareas con arquitectura MVVM limpia. Pantalla principal con LazyColumn de tareas con estado (pendiente/en progreso/completada), cada item con Checkbox, título, prioridad (chip de color) y fecha límite. Bottom sheet para crear/editar tarea con TextField, DatePicker y selector de prioridad con SegmentedButton. Filtros por estado con FilterChip en la top bar. Pantalla de estadísticas con Cards de resumen y LinearProgressIndicator por categoría. Navegación con NavController y BottomNavigationBar. Material3 Dynamic Color, soporte modo oscuro, sin librerías externas innecesarias.',
  },
  {
    id: 'react_native_starter',
    name: 'React Native',
    icon: 'integration_instructions',
    color: '#1565C0',
    description: 'App cross-platform con React Native y Expo Router',
    stack: 'react_native',
    target: 'mobile',
    prompt: 'App React Native con Expo Router para gestión de notas personales. Pantalla principal con FlatList de notas con título, preview del contenido y fecha, búsqueda en tiempo real con filtro. Pantalla de detalle/edición con TextInput multilinea, selector de color para la nota y opción de fijar nota al inicio. Pantalla de configuración con opciones de tema (claro/oscuro/sistema), tamaño de fuente y backup. Navegación con Stack y Tabs de Expo Router, AsyncStorage para persistencia local, NativeWind para estilos, sin backend. Compatible iOS y Android.',
  },
]

interface Props {
  onSelect: (template: Template) => void
  loading: boolean
}

export function TemplatesGrid({ onSelect, loading }: Props) {
  return (
    <div className="flex flex-col gap-md w-full">
      <p className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wide">
        Plantillas listas para generar
      </p>
      <div className="grid grid-cols-2 gap-sm">
        {TEMPLATES.map(t => (
          <button
            key={t.id}
            disabled={loading}
            onClick={() => onSelect(t)}
            className="flex flex-col gap-xs p-md bg-surface-container-lowest border border-outline-variant rounded-xl text-left hover:border-primary hover:shadow-md transition-all duration-200 disabled:opacity-50 group"
          >
            <div className="flex items-center gap-sm">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: t.color + '20' }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 16, color: t.color }}
                >
                  {t.icon}
                </span>
              </div>
              <span className="text-[12px] font-semibold text-on-surface group-hover:text-primary transition-colors leading-tight">
                {t.name}
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              {t.description}
            </p>
            <div className="flex items-center gap-xs mt-xs">
              <span className="text-[10px] font-medium px-xs py-xs bg-surface-container rounded border border-outline-variant text-on-surface-variant">
                {t.stack === 'flutter' ? 'Flutter' : t.stack === 'kotlin' ? 'Compose' : 'RN'}
              </span>
              {t.target !== 'mobile' && (
                <span className="text-[10px] font-medium px-xs py-xs bg-secondary-container/30 rounded border border-secondary/20 text-on-secondary-container">
                  {t.target === 'tv' ? 'TV' : 'Phone+TV'}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
