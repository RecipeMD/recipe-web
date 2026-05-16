const MONTHS = [
    ["Januar", "January", "jan", "winter"],
    ["Februar", "February", "feb", "winter"],
    ["März", "March", "mar", "spring", "frühling"],
    ["April", "April", "apr", "spring", "frühling"],
    ["Mai", "May", "may", "spring", "frühling"],
    ["Juni", "June", "jun", "summer", "sommer"],
    ["Juli", "July", "jul", "summer", "sommer"],
    ["August", "August", "aug", "summer", "sommer"],
    ["September", "September", "sep", "fall", "autumn", "herbst"],
    ["Oktober", "October", "oct", "fall", "autumn", "herbst"],
    ["November", "November", "nov", "fall", "autumn", "herbst"],
    ["Dezember", "December", "dec", "winter"],
];

const MONTHS_LOWER = MONTHS.map(row => row.map(col => col.toLowerCase()));

const MONTHS_FLAT = MONTHS_LOWER.flat();

function monthTagged(tags: string[], month: number): boolean {
  const lowerTags = tags.map(tag => tag.toLowerCase());
  if (month < 0 || month >= MONTHS.length) {
      return false;
  }
  return lowerTags.some(t => MONTHS_LOWER[month].includes(t));
}

function isMonth(target: string): boolean {
    return MONTHS_FLAT.includes(target.toLowerCase());
}

function matchMonth(target: string): string {
    const lowerTarget = target.toLowerCase();
    const match = MONTHS_LOWER.filter(m => m.includes(lowerTarget))[0];
    return match ? match[1] : '';
}

function humanizeMonth(month: number, language: string): string {
    if (month < 0 || month > MONTHS.length) {
        return month.toString();
    }
    return MONTHS[month][language === 'english' ? 1 : 0];
}

export { monthTagged, isMonth, matchMonth, humanizeMonth };

