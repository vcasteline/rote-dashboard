/**
 * Calculates the date of the next Monday.
 * If today is Monday, it returns today's date.
 * @returns {Date} The date object representing the upcoming Monday.
 */
export function getNextMonday(): Date {
  const today = new Date();
  const dayOfWeek = today.getDay(); // Sunday = 0, Monday = 1, ..., Saturday = 6
  const diff = dayOfWeek === 0 ? 1 : 8 - dayOfWeek; // Days to add to get to next Monday
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + diff);
  nextMonday.setHours(0, 0, 0, 0); // Set time to midnight
  return nextMonday;
} 