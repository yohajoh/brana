/**
 * Multi-Language Search Utility for Brana System
 * Supports English, Amharic (አማርኛ - Ethiopic Script), and Afaan Oromo (Qubbee Script).
 *
 * Features:
 * 1. Ethiopic script homophone normalization (ሀ/ሐ/ኀ, ሠ/ሰ, ዐ/አ, ፀ/ጸ, ዉ/ው, ፖ/ፓ, ኸ/ሀ, etc.)
 * 2. Afaan Oromo Qubbee diacritic & hudhaa (') normalization (' vs ’ vs ‘ vs `)
 * 3. Double-vowel/consonant flex matching for Qubbee (e.g. Macaafa vs Macafa, Seenaa vs Sena)
 * 4. Cross-lingual keyword equivalents matching across EN, AM, and OR (e.g. "book" <-> "መጽሐፍ" <-> "macaafa" / "kitaba")
 * 5. Safe multi-field searching across strings, numbers, and nested data
 */

// Ethiopic homophone map
const ETHIOPIC_HOMOPHONES: Record<string, string> = {
  // Ha family -> ሀ
  'ሐ': 'ሀ', 'ሑ': 'ሁ', 'ሒ': 'ሂ', 'ሓ': 'ሃ', 'ሔ': 'ሄ', 'ሕ': 'ህ', 'ሖ': 'ሆ',
  'ኀ': 'ሀ', 'ኁ': 'ሁ', 'ኂ': 'ሂ', 'ኃ': 'ሃ', 'ኄ': 'ሄ', 'ኅ': 'ህ', 'ኆ': 'ሆ',
  'ኸ': 'ሀ', 'ኹ': 'ሁ', 'ኺ': 'ሂ', 'ኻ': 'ሃ', 'ኼ': 'ሄ', 'ኽ': 'ህ', 'ኾ': 'ሆ',
  // Se family -> ሰ
  'ሠ': 'ሰ', 'ሡ': 'ሱ', 'ሢ': 'ሲ', 'ሣ': 'ሳ', 'ሤ': 'ሴ', 'ሥ': 'ስ', 'ሦ': 'ሶ',
  // A family -> አ
  'ዐ': 'አ', 'ዑ': 'ኡ', 'ዒ': 'ኢ', 'ዓ': 'ኣ', 'ዔ': 'ኤ', 'ዕ': 'እ', 'ዖ': 'ኦ',
  // Tse family -> ጸ
  'ፀ': 'ጸ', 'ፁ': 'ጹ', 'ፂ': 'ጺ', 'ፃ': 'ጻ', 'ፄ': 'ጼ', 'ፅ': 'ጽ', 'ፆ': 'ጾ',
  // Labialized / variations
  'ኋ': 'ሃ', 'ሿ': 'ሻ', 'ቋ': 'ቃ', 'ቛ': 'ቃ', 'ኳ': 'ካ', 'ዟ': 'ዛ', 'ዷ': 'ዳ', 'ጇ': 'ጃ', 'ጧ': 'ጣ', 'ጯ': 'ጫ', 'ጷ': 'ጳ', '<ctrl42>': 'ላ', 'ሟ': 'ማ', 'ሯ': 'ራ', 'ሷ': 'ሳ', 'ቧ': 'ባ', 'ቷ': 'ታ', 'ኗ': 'ና', 'ኟ': 'ኛ', 'ኧ': 'አ',
};

// Cross-lingual keyword translation groups (English <-> Amharic <-> Afaan Oromo)
const TRANSLATION_GROUPS: string[][] = [
  ['book', 'books', 'መጽሐፍ', 'መጽሃፍ', 'መጻሕፍት', 'macaafa', 'kitaba'],
  ['title', 'titles', 'ርዕስ', 'ርዕሶች', 'mataduree'],
  ['history', 'historical', 'ታሪክ', 'ታሪካዊ', 'seenaa'],
  ['science', 'scientific', 'ሳይንስ', 'ሳይንሳዊ', 'saayinsi'],
  ['fiction', 'novel', 'የፈጠራ', 'ልብወለድ', 'ልብ ወለድ', 'asoosama'],
  ['author', 'writer', 'ደራሲ', 'ደራሲያን', 'barreessaa'],
  ['category', 'categories', 'ምድብ', 'ምድቦች', 'ramaddii', 'kattagarii'],
  ['student', 'user', 'users', 'students', 'ተማሪ', 'ተማሪዎች', 'ተጠቃሚ', 'barataa', 'fayyadamaa'],
  ['admin', 'administrator', 'አስተዳዳሪ', 'bulchaa'],
  ['borrowed', 'rented', 'active', 'ተበድሯል', 'የተበደረ', 'ኪራይ', 'liqeeffame', 'kiraa'],
  ['returned', 'completed', 'ተመልሷል', 'የተመለሰ', 'deebi\'e', 'deebie'],
  ['overdue', 'late', 'penalty', 'ጊዜው ያለፈበት', 'ዘግይቷል', 'yeroon darbe'],
  ['reservation', 'reserved', 'queue', 'ማስያዝ', 'የተያዘ', 'ቦታ መያዝ', 'qabsiisuu', 'kaffaltii duraa'],
  ['active', 'available', 'ንቁ', 'ዝግጁ', 'hojii irra', 'qophii'],
  ['digital', 'pdf', 'ebook', 'ዲጂታል', 'ኢቡክ', 'dijitaala'],
  ['physical', 'hardcopy', 'አካላዊ', 'qaama'],
  ['order', 'orders', 'delivery', 'ትዕዛዝ', 'ትዕዛዞች', 'ማድረሻ', 'ajaja', 'ergaa'],
  ['fine', 'fines', 'penalty', 'ቅጣት', 'ቅጣቶች', 'adabbii'],
  ['technology', 'tech', 'ቴክኖሎጂ', 'tekkenoolojii'],
  ['business', 'ንግድ', 'daldala'],
  ['law', 'legal', 'ሕግ', 'ህግ', 'seerotii', 'seera'],
  ['health', 'medicine', 'ጤና', 'ሕክምና', 'fayyaa'],
  ['education', 'learning', 'ትምህርት', 'barnoota'],
];

/**
 * Normalizes text for search matching across EN, AM, and OR.
 */
export function normalizeSearchText(text: string | number | null | undefined): string {
  if (text === null || text === undefined) return '';
  let str = String(text).toLowerCase();

  // Standardize apostrophes / hudhaa for Oromo & English (' vs ’ vs ‘ vs `)
  str = str.replace(/[’‘`ʼʻ]/g, "'");

  // Ethiopic homophone replacement for Amharic
  let ethiopicNormalized = '';
  for (const ch of str) {
    ethiopicNormalized += ETHIOPIC_HOMOPHONES[ch] || ch;
  }
  str = ethiopicNormalized;

  // Strip diacritical marks (accents)
  str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  return str.trim();
}

/**
 * Collapses duplicate consecutive characters to handle Qubbee vowel/consonant flexing.
 * e.g., "macaafa" -> "macafa", "seenaa" -> "sena"
 */
function flexText(text: string): string {
  return text.replace(/(.)\1+/g, '$1');
}

/**
 * Evaluates whether target text matches query under EN, AM, or OR search rules.
 */
export function matchesMultiLangQuery(
  targetText: string | number | null | undefined,
  query: string
): boolean {
  if (!query || !query.trim()) return true;
  if (targetText === null || targetText === undefined) return false;

  const normTarget = normalizeSearchText(targetText);
  const normQuery = normalizeSearchText(query);

  if (!normTarget || !normQuery) return false;

  // 1. Direct substring match
  if (normTarget.includes(normQuery)) return true;

  // 2. Qubbee flex match (handles single vs double vowels/consonants in Afaan Oromo)
  const flexTarget = flexText(normTarget);
  const flexQuery = flexText(normQuery);
  if (flexTarget.includes(flexQuery)) return true;

  // 3. Multi-word search token match
  const queryTokens = normQuery.split(/\s+/).filter(Boolean);
  if (queryTokens.length > 1) {
    const allTokensMatch = queryTokens.every(
      (token) => normTarget.includes(token) || flexTarget.includes(flexText(token))
    );
    if (allTokensMatch) return true;
  }

  // 4. Cross-lingual keyword equivalents matching
  for (const group of TRANSLATION_GROUPS) {
    const queryMatchesGroup = group.some((eq) => {
      const normEq = normalizeSearchText(eq);
      return (
        normQuery.includes(normEq) ||
        flexQuery.includes(flexText(normEq)) ||
        normEq.includes(normQuery)
      );
    });

    if (queryMatchesGroup) {
      const targetMatchesGroup = group.some((eq) => {
        const normEq = normalizeSearchText(eq);
        return normTarget.includes(normEq) || flexTarget.includes(flexText(normEq));
      });

      if (targetMatchesGroup) return true;
    }
  }

  return false;
}

/**
 * Filters an array of items by checking multiple object properties against a query.
 */
export function filterMultiLang<T>(
  items: T[],
  query: string,
  getSearchableValues: (item: T) => (string | number | null | undefined)[]
): T[] {
  if (!query || !query.trim()) return items;
  return items.filter((item) => {
    const values = getSearchableValues(item);
    return values.some((val) => matchesMultiLangQuery(val, query));
  });
}
