// Traducción de la interfaz. La "clave" es el texto en español tal cual aparece
// en el código; el diccionario de abajo da su versión en alemán. Si una clave no
// está traducida todavía, se muestra el español (degradación elegante).
//
// Uso en componentes:  const { t } = useStore();  ... t("Nuevo pago")
// (el hook lee config.idioma del store y llama a `traducir`).
import type { Idioma } from "./types";

// Diccionario español → alemán. Se va completando pantalla por pantalla.
// Mantener las claves EXACTAS al texto en español del código.
const DE: Record<string, string> = {
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
  "Nota (opcional)": "Notiz (optional)",

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

const DICCIONARIOS: Record<Idioma, Record<string, string>> = {
  es: {}, // el español es el texto base, no necesita diccionario
  de: DE,
};

// Devuelve el texto en el idioma pedido (o el original si no hay traducción).
export function traducir(idioma: Idioma, texto: string): string {
  if (idioma === "es") return texto;
  return DICCIONARIOS[idioma]?.[texto] ?? texto;
}
