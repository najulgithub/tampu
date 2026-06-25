// Traducción de la interfaz. La "clave" es el texto en español tal cual aparece
// en el código; el diccionario de abajo da su versión en alemán. Si una clave no
// está traducida todavía, se muestra el español (degradación elegante).
//
// Uso en componentes:  const { t } = useStore();  ... t("Nuevo pago")
// (el hook lee config.idioma del store y llama a `traducir`).
//
// El diccionario se arma por bloques (uno por pantalla) y se fusiona con spread,
// así no hay choques de claves repetidas entre pantallas.
import type { Idioma } from "./types";

const COMUN: Record<string, string> = {
  // Navegación / chrome
  "Inicio": "Start",
  "Unidades": "Einheiten",
  "Gastos": "Ausgaben",
  "Reportes": "Berichte",
  "Equipo": "Team",
  "Documentos": "Dokumente",
  "Configuración": "Einstellungen",
  "Mensajes": "Nachrichten",
  "Cerrar sesión": "Abmelden",

  // Configuración
  "Localización": "Region",
  "País": "Land",
  "Idioma": "Sprache",
  "Moneda por defecto": "Standardwährung",
  "Día de vencimiento mensual": "Monatlicher Fälligkeitstag",
  "Ajuste por inflación": "Inflationsanpassung",

  // Acciones comunes
  "Guardar": "Speichern",
  "Cancelar": "Abbrechen",
  "Eliminar": "Löschen",
  "Editar": "Bearbeiten",
  "Agregar": "Hinzufügen",
  "Registrar": "Erfassen",
  "Volver": "Zurück",
  "Cerrar": "Schließen",
  "Quitar": "Entfernen",
  "Nota (opcional)": "Notiz (optional)",
  "Nombre": "Name",
  "Email": "E-Mail",
  "Enviar": "Senden",

  // Pagos / reservas (parcial)
  "Pagos": "Zahlungen",
  "Cuenta corriente": "Kontokorrent",
  "Saldo": "Saldo",
  "Pagado": "Bezahlt",
  "Total": "Gesamt",
  "Saldar": "Ausgleichen",
  "pesos": "Pesos",
  "Es la seña (queda registrada con su fecha)": "Ist die Anzahlung (wird mit Datum erfasst)",
  "Adjuntar comprobante": "Beleg anhängen",
  "Huésped": "Gast",
  "Reservar": "Reservieren",
  "Nueva reserva": "Neue Reservierung",
  "Editar reserva": "Reservierung bearbeiten",
};

// Valores de enums que se muestran como texto (tipos de unidad, ambientes, roles).
const ENUMS: Record<string, string> = {
  // Tipos de unidad
  "Departamento": "Wohnung",
  "Casa": "Haus",
  "Cabaña": "Hütte",
  "Monoambiente": "Einzimmerwohnung",
  "PH": "Stadthaus",
  "Local": "Ladenlokal",
  "Cochera": "Garage",
  "Otro": "Sonstiges",
  // Ambientes de grupo
  "Edificio": "Gebäude",
  "Playa": "Strand",
  "Montaña": "Berge",
  "Río": "Fluss",
  "Nieve": "Schnee",
  "Ciudad": "Stadt",
  "Campo": "Land",
  // Roles
  "Propietario": "Inhaber",
  "Administrador": "Administrator",
  "Encargado": "Verwalter",
  "Lectura": "Nur Lesen",
};

const INICIO: Record<string, string> = {
  "Hoy": "Heute",
  "Mañana": "Morgen",
  "Llegadas hoy": "Anreisen heute",
  "Salidas hoy": "Abreisen heute",
  "Ocupadas": "Belegt",
  "Libres": "Frei",
  "Próximos eventos": "Nächste Termine",
  "Sin eventos en los próximos 14 días.": "Keine Termine in den nächsten 14 Tagen.",
  "Calendario": "Kalender",
  "Sin tareas este día.": "Keine Aufgaben an diesem Tag.",
  "Debe": "Schuldet",
  "Vence": "Läuft ab",
  "Manual": "Manuell",
  "Llegada": "Anreise",
  "Salida / limpieza": "Abreise / Reinigung",
  "Cobro": "Zahlung",
  "Ajuste": "Anpassung",
  "Fin de contrato": "Vertragsende",
  "Reservas por aprobar": "Zu bestätigende Reservierungen",
  "Seña": "Anzahlung",
  "Ver": "Ansehen",
  "Todavía no subió el comprobante de la seña.": "Der Anzahlungsbeleg wurde noch nicht hochgeladen.",
  "¿Rechazar la reserva?": "Reservierung ablehnen?",
  "Rechazar": "Ablehnen",
  "Aprobar": "Bestätigen",
  "Comprobante de seña": "Anzahlungsbeleg",
};

const UNIDADES: Record<string, string> = {
  "Mis unidades": "Meine Einheiten",
  "unidad": "Einheit",
  "unidades": "Einheiten",
  "grupo": "Gruppe",
  "grupos": "Gruppen",
  "reservas": "Reservierungen",
  "Agregar unidad": "Einheit hinzufügen",
  "Todavía no cargaste unidades. Empezá agregando una.": "Sie haben noch keine Einheiten angelegt. Beginnen Sie, indem Sie eine hinzufügen.",
  "Esto carga un set de datos de PRUEBA (unidades, reservas, pagos…) en tu cuenta. Es solo para explorar la app. ¿Continuar?": "Dies lädt einen TEST-Datensatz (Einheiten, Reservierungen, Zahlungen…) in Ihr Konto. Es dient nur zum Ausprobieren der App. Fortfahren?",
  "(admin) Cargar datos de ejemplo": "(Admin) Beispieldaten laden",
  "Sin grupo": "Ohne Gruppe",
  "Editar grupo": "Gruppe bearbeiten",
  "Cambiar foto": "Foto ändern",
  "Subir foto": "Foto hochladen",
  "Ambiente": "Umgebung",
  "Color": "Farbe",
  "¿Eliminar el grupo": "Gruppe löschen",
  "Las unidades quedarán sin grupo.": "Die Einheiten bleiben ohne Gruppe.",
  "Eliminar grupo": "Gruppe löschen",
  "Listo": "Fertig",
  "Ocupada": "Belegt",
  "Libre": "Frei",
  "apta camioneta": "für Transporter geeignet",
  "ambientes": "Zimmer",
  "Hasta": "Bis zu",
  "huéspedes": "Gäste",
  "cochera": "Garage",
  "camioneta": "Transporter",
  "Próxima": "Nächste",
  "Sin próximas reservas": "Keine bevorstehenden Reservierungen",
  "Nueva unidad": "Neue Einheit",
  "ej: Depto Güemes": "z. B. Wohnung Güemes",
  "Grupo": "Gruppe",
  "Tipo": "Typ",
  "Dirección": "Adresse",
  "Calle y número": "Straße und Hausnummer",
  "Localidad": "Ort",
  "Ambientes": "Zimmer",
  "Capacidad (huéspedes)": "Kapazität (Gäste)",
  "Tiene cochera": "Hat Garage",
  "Apta para camioneta / pickup": "Für Transporter / Pickup geeignet",
  "Ubicación de la cochera": "Lage der Garage",
  "ej: Subsuelo 2, lugar 14": "z. B. Untergeschoss 2, Platz 14",
};

const EQUIPO: Record<string, string> = {
  "colaborador": "Mitarbeiter",
  "colaboradores": "Mitarbeiter",
  "Invitar colaborador": "Mitarbeiter einladen",
  "Todas las unidades": "Alle Einheiten",
  "Prototipo: la invitación por email, el login de cada colaborador y el control real de permisos se activan al conectar el backend (Supabase Auth).": "Prototyp: Die E-Mail-Einladung, das Login der einzelnen Mitarbeiter und die echte Berechtigungssteuerung werden beim Anbinden des Backends (Supabase Auth) aktiviert.",
  "Link para clientes": "Link für Kunden",
  "Nombre del negocio": "Name des Unternehmens",
  "Poner nombre": "Namen festlegen",
  "editar": "bearbeiten",
  "Compartí este link. Quien se registre desde acá entra como cliente y solo puede reservar tus unidades y subir la seña.": "Teile diesen Link. Wer sich hierüber registriert, tritt als Kunde bei und kann nur deine Einheiten buchen und die Anzahlung hochladen.",
  "Dirección:": "Adresse:",
  "personalizar": "anpassen",
  "¡Copiado!": "Kopiert!",
  "Copiar": "Kopieren",
  "Ver código QR": "QR-Code anzeigen",
  "Código QR para clientes": "QR-Code für Kunden",
  "Código QR": "QR-Code",
  "Tu negocio": "Dein Unternehmen",
  "escaneá para reservar": "scannen zum Buchen",
  "Descargar QR": "QR herunterladen",
  "Editar colaborador": "Mitarbeiter bearbeiten",
  "Nombre y apellido": "Vor- und Nachname",
  "Rol (preset de permisos)": "Rolle (Berechtigungsvorlage)",
  "¿Qué puede gestionar?": "Was darf verwaltet werden?",
  "Ve todo el negocio. Tildá lo que puede crear/editar.": "Sieht das gesamte Unternehmen. Hake an, was erstellt/bearbeitet werden darf.",
  "Acceso": "Zugriff",
  "¿Quitar a este colaborador?": "Diesen Mitarbeiter entfernen?",
  "Solo lectura": "Nur Lesen",
  "Acceso total y gestión del equipo.": "Vollzugriff und Teamverwaltung.",
  "Gestiona unidades, reservas, gastos y reportes.": "Verwaltet Einheiten, Buchungen, Ausgaben und Berichte.",
  "Carga reservas y gastos del día a día.": "Erfasst tägliche Buchungen und Ausgaben.",
  "Solo puede ver, no edita.": "Kann nur ansehen, nicht bearbeiten.",
  "Ver montos ($)": "Beträge anzeigen ($)",
  "Si está apagado, los importes se ocultan (estilo banco).": "Wenn deaktiviert, werden die Beträge ausgeblendet (Bank-Stil).",
  "Ver reportes (datos de plata)": "Berichte anzeigen (Finanzdaten)",
  "Panel económico, cobranzas y cronograma. Información sensible.": "Wirtschaftspanel, Inkasso und Zeitplan. Sensible Informationen.",
  "Unidades y grupos": "Einheiten und Gruppen",
  "Crear/editar unidades y grupos.": "Einheiten und Gruppen erstellen/bearbeiten.",
  "Reservas, pagos y mensajes": "Buchungen, Zahlungen und Nachrichten",
  "Cargar reservas, registrar pagos, chatear.": "Buchungen erfassen, Zahlungen registrieren, chatten.",
  "Gastos y proveedores": "Ausgaben und Lieferanten",
  "Cargar gastos, proveedores y presupuestos.": "Ausgaben, Lieferanten und Budgets erfassen.",
  "Cambiar parámetros del negocio.": "Unternehmensparameter ändern.",
  "Agregar/editar colaboradores.": "Mitarbeiter hinzufügen/bearbeiten.",
};

const DOCUMENTOS: Record<string, string> = {
  "Todos los comprobantes cargados: pagos, gastos y servicios.": "Alle hochgeladenen Belege: Zahlungen, Ausgaben und Nebenkosten.",
  "Todos": "Alle",
  "Servicios": "Nebenkosten",
  "Buscar…": "Suchen…",
  "No hay documentos": "Keine Dokumente",
  "para este filtro": "für diesen Filter",
  "cargados todavía": "bisher hochgeladen",
  "Pago": "Zahlung",
  "Gasto": "Ausgabe",
  "Servicio": "Nebenkosten",
  "Descargar": "Herunterladen",
};

const MENSAJES: Record<string, string> = {
  "Conversaciones con tus inquilinos.": "Unterhaltungen mit deinen Mietern.",
  "Todavía no hay mensajes. Cuando un inquilino te escriba desde su portal, lo vas a ver acá.": "Noch keine Nachrichten. Wenn dir ein Mieter aus seinem Portal schreibt, siehst du es hier.",
  "Inquilino": "Mieter",
  "Vos:": "Du:",
  "Sin mensajes.": "Keine Nachrichten.",
  "Escribir respuesta…": "Antwort schreiben…",
};

// Diccionario español → alemán fusionado (spread: si una clave se repite, gana la última).
const DE: Record<string, string> = {
  ...COMUN, ...ENUMS, ...INICIO, ...UNIDADES, ...EQUIPO, ...DOCUMENTOS, ...MENSAJES,
};

const DICCIONARIOS: Record<Idioma, Record<string, string>> = {
  es: {}, // el español es el texto base, no necesita diccionario
  de: DE,
};

// Devuelve el texto en el idioma pedido (o el original si no hay traducción).
export function traducir(idioma: Idioma, texto: string): string {
  if (idioma === "es") return texto;
  return DICCIONARIOS[idioma]?.[texto] ?? texto;
}

// Idioma del dispositivo (navegador). Se usa como arranque cuando la cuenta
// todavía no tiene un idioma elegido. Alemán si el celular está en alemán.
export function idiomaDispositivo(): Idioma {
  if (typeof navigator === "undefined") return "es";
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
  return langs.some((l) => l?.toLowerCase().startsWith("de")) ? "de" : "es";
}
