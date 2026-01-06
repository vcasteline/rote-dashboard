import { DateTime } from 'luxon';

// Zona horaria de Ecuador
export const ECUADOR_TIMEZONE = 'America/Guayaquil';

/**
 * Obtiene la fecha actual en la zona horaria de Ecuador
 */
export function getNowInEcuador(): DateTime {
  return DateTime.now().setZone(ECUADOR_TIMEZONE);
}

/**
 * Obtiene el lunes de la semana actual en zona horaria de Ecuador.
 * Si hoy es lunes, devuelve hoy. Si es cualquier otro día, devuelve el lunes de esta semana.
 * @returns {DateTime} El DateTime del lunes de la semana actual.
 */
export function getThisWeekMonday(): DateTime {
  const today = getNowInEcuador();
  const dayOfWeek = today.weekday; // Monday = 1, Tuesday = 2, ..., Sunday = 7
  
  if (dayOfWeek === 1) {
    // Si hoy es lunes, devolver hoy a medianoche
    return today.startOf('day');
  } else {
    // Calcular el lunes de esta semana (restar días para llegar al lunes)
    const daysToSubtract = dayOfWeek - 1; // Si es martes (2), restar 1 para llegar a lunes
    return today.minus({ days: daysToSubtract }).startOf('day');
  }
}

/**
 * Obtiene el lunes de la PRÓXIMA semana en zona horaria de Ecuador.
 * Si hoy es lunes, devuelve el lunes de la semana siguiente (hoy + 7 días).
 */
export function getNextMonday(): DateTime {
  const today = getNowInEcuador();
  const dayOfWeek = today.weekday; // Monday = 1 ... Sunday = 7
  const daysToAdd = dayOfWeek === 1 ? 7 : 8 - dayOfWeek; // si es lunes -> 7; si es domingo (7) -> 1; etc.
  return today.plus({ days: daysToAdd }).startOf('day');
}

/**
 * Convierte una fecha ISO string a DateTime de Ecuador
 */
export function toEcuadorDateTime(isoString: string): DateTime {
  return DateTime.fromISO(isoString).setZone(ECUADOR_TIMEZONE);
}

/**
 * Convierte una DateTime a formato ISO para la base de datos
 */
export function toISOString(dateTime: DateTime): string {
  return dateTime.toISO()!;
}

/**
 * Formatea una fecha para mostrar en la interfaz
 */
export function formatDate(dateTime: DateTime): string {
  return dateTime.toFormat('dd/MM/yyyy');
}

/**
 * Formatea una fecha desde string (solo fecha) para mostrar en interfaz
 * Asume que la fecha ya está en zona horaria correcta
 */
export function formatDateFromString(dateString: string): string {
  // Crear DateTime directamente en zona horaria de Ecuador sin conversión
  const dateTime = DateTime.fromFormat(dateString, 'yyyy-MM-dd', { zone: ECUADOR_TIMEZONE });
  return dateTime.toFormat('dd/MM/yyyy');
}

/**
 * Formatea una hora para mostrar en la interfaz
 * Puede recibir un DateTime o un string en formato "HH:mm"
 */
export function formatTime(time: DateTime | string): string {
  if (typeof time === 'string') {
    // Si es un string, verificar que tenga formato válido y retornarlo
    if (!time) return 'N/A';
    const [hours, minutes] = time.split(':');
    return `${hours}:${minutes}`;
  }
  // Si es DateTime, formatear con Luxon
  return time.toFormat('HH:mm');
}

/**
 * Crea un DateTime de Ecuador desde una fecha y hora
 */
export function createEcuadorDateTime(date: string, time: string): DateTime {
  return DateTime.fromFormat(`${date} ${time}`, 'yyyy-MM-dd HH:mm', { zone: ECUADOR_TIMEZONE });
}

/**
 * Obtiene el inicio del día actual en Ecuador
 */
export function getTodayStartInEcuador(): DateTime {
  return getNowInEcuador().startOf('day');
}

/**
 * Calcula la fecha de expiración de un paquete en zona horaria de Guayaquil
 * @param expirationDays Número de días desde hoy hasta la expiración
 * @returns Fecha de expiración en formato ISO string (UTC) que representa el final del día en Guayaquil
 */
export function calculateExpirationDate(expirationDays: number | null | undefined): string | null {
  if (!expirationDays || typeof expirationDays !== 'number') {
    return null;
  }

  // Obtener la fecha actual en zona horaria de Guayaquil
  const now = getNowInEcuador();
  
  // Calcular la fecha de expiración sumando los días
  // Usamos endOf('day') para que expire al final del día (23:59:59)
  const expirationDate = now.plus({ days: expirationDays }).endOf('day');
  
  // Convertir a ISO string (UTC) para almacenar en la base de datos
  return expirationDate.toISO();
}

/**
 * Formatea una fecha de expiración para mostrar en la UI (en zona horaria de Guayaquil)
 * @param expirationDateString Fecha ISO string desde la base de datos
 * @returns Fecha formateada como dd/MM/yyyy
 */
export function formatExpirationDate(expirationDateString: string | null | undefined): string {
  if (!expirationDateString) return 'N/A';
  
  try {
    // Interpretar la fecha como UTC y convertir a Guayaquil
    const expirationDate = DateTime.fromISO(expirationDateString, { zone: 'utc' })
      .setZone(ECUADOR_TIMEZONE);
    
    return expirationDate.toFormat('dd/MM/yyyy');
  } catch (error) {
    return 'N/A';
  }
}

/**
 * Verifica si una fecha de expiración ha vencido (comparando por día en zona horaria de Guayaquil)
 * @param expirationDateString Fecha ISO string desde la base de datos
 * @returns true si la fecha ya pasó (comparando por día, no por hora exacta)
 */
export function isExpirationDateExpired(expirationDateString: string | null | undefined): boolean {
  if (!expirationDateString) return false;
  
  try {
    const now = getNowInEcuador();
    const expirationDate = DateTime.fromISO(expirationDateString, { zone: 'utc' })
      .setZone(ECUADOR_TIMEZONE);
    
    const expirationDateOnly = expirationDate.toISODate();
    const todayOnly = now.toISODate();
    
    // Si alguna fecha es null, no está expirado
    if (!expirationDateOnly || !todayOnly) return false;
    
    // Comparar por día (no por hora exacta)
    return expirationDateOnly < todayOnly;
  } catch (error) {
    return false;
  }
}

/**
 * Calcula los días hasta que expire una fecha (en zona horaria de Guayaquil)
 * @param expirationDateString Fecha ISO string desde la base de datos
 * @returns Número de días hasta la expiración (0 si expira hoy, negativo si ya expiró)
 */
export function daysUntilExpiration(expirationDateString: string | null | undefined): number | null {
  if (!expirationDateString) return null;
  
  try {
    const now = getNowInEcuador();
    const expirationDate = DateTime.fromISO(expirationDateString, { zone: 'utc' })
      .setZone(ECUADOR_TIMEZONE);
    
    // Calcular diferencia en días (comparando fechas, no timestamps exactos)
    const nowDate = now.startOf('day');
    const expirationDateOnly = expirationDate.startOf('day');
    
    return Math.ceil(expirationDateOnly.diff(nowDate, 'days').days);
  } catch (error) {
    return null;
  }
} 