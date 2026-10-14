export function displayDate(date: string) { return new Intl.DateTimeFormat('fr', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(date)); }
