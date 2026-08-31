/**
 * Backend Multi-Language Search Query Builder
 * Supports English, Amharic (Ethiopic Script), and Afaan Oromo (Qubbee Script).
 * Constructs flexible Prisma OR search arrays for text fields.
 */

const ETHIOPIC_HOMOPHONES = {
  'ሐ': 'ሀ', 'ሑ': 'ሁ', 'ሒ': 'ሂ', 'ሓ': 'ሃ', 'ሔ': 'ሄ', 'ሕ': 'ህ', 'ሖ': 'ሆ',
  'ኀ': 'ሀ', 'ኁ': 'ሁ', 'ኂ': 'ሂ', 'ኃ': 'ሃ', 'ኄ': 'ሄ', 'ኅ': 'ህ', 'ኆ': 'ሆ',
  'ኸ': 'ሀ', 'ኹ': 'ሁ', 'ኺ': 'ሂ', 'ኻ': 'ሃ', 'ኼ': 'ሄ', 'ኽ': 'ህ', 'ኾ': 'ሆ',
  'ሠ': 'ሰ', 'ሡ': 'ሱ', 'ሢ': 'ሲ', 'ሣ': 'ሳ', 'ሤ': 'ሴ', 'ሥ': 'ስ', 'ሦ': 'ሶ',
  'ዐ': 'አ', 'ዑ': 'ኡ', 'ዒ': 'ኢ', 'ዓ': 'ኣ', 'ዔ': 'ኤ', 'ዕ': 'እ', 'ዖ': 'ኦ',
  'ፀ': 'ጸ', 'ፁ': 'ጹ', 'ፂ': 'ጺ', 'ፃ': 'ጻ', 'ፄ': 'ጼ', 'ፅ': 'ጽ', 'ፆ': 'ጾ',
};

const TRANSLATION_GROUPS = [
  ['book', 'books', 'መጽሐፍ', 'መጽሃፍ', 'መጻሕፍት', 'macaafa', 'kitaba'],
  ['history', 'historical', 'ታሪክ', 'ታሪካዊ', 'seenaa'],
  ['science', 'scientific', 'ሳይንስ', 'ሳይንሳዊ', 'saayinsi'],
  ['fiction', 'novel', 'የፈጠራ', 'ልብወለድ', 'asoosama'],
  ['author', 'writer', 'ደራሲ', 'barreessaa'],
  ['category', 'categories', 'ምድብ', 'ramaddii', 'kattagarii'],
  ['student', 'user', 'users', 'students', 'ተማሪ', 'ተጠቃሚ', 'barataa', 'fayyadamaa'],
  ['borrowed', 'rented', 'active', 'ተበድሯል', 'የተበደረ', 'ኪራይ', 'liqeeffame', 'kiraa'],
  ['returned', 'completed', 'ተመልሷል', 'deebi\'e', 'deebie'],
  ['overdue', 'late', 'penalty', 'ጊዜው ያለፈበት', 'yeroon darbe'],
  ['digital', 'pdf', 'ዲጂታል', 'dijitaala'],
  ['physical', 'hardcopy', 'አካላዊ', 'qaama'],
];

export const normalizeQueryVariants = (rawQuery) => {
  if (!rawQuery || typeof rawQuery !== 'string') return [];
  const q = rawQuery.trim();
  if (!q) return [];

  const variants = new Set([q]);

  // Standardize apostrophe variations for Oromo/English
  const apostropheNormalized = q.replace(/[’‘`ʼʻ]/g, "'");
  variants.add(apostropheNormalized);
  variants.add(q.replace(/'/g, "’"));

  // Ethiopic homophone variants for Amharic
  let ethiopicAlt = '';
  for (const ch of q) {
    ethiopicAlt += ETHIOPIC_HOMOPHONES[ch] || ch;
  }
  if (ethiopicAlt !== q) variants.add(ethiopicAlt);

  // Strip diacritics
  const asciiNormalized = q.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (asciiNormalized !== q) variants.add(asciiNormalized);

  // Add cross-lingual equivalent variants if query matches any translation group
  const lowerQ = q.toLowerCase();
  for (const group of TRANSLATION_GROUPS) {
    if (group.some((term) => term.toLowerCase().includes(lowerQ) || lowerQ.includes(term.toLowerCase()))) {
      group.forEach((term) => variants.add(term));
    }
  }

  return Array.from(variants);
};

export const buildMultiLangWhere = (rawQuery, fields) => {
  const variants = normalizeQueryVariants(rawQuery);
  if (variants.length === 0 || !fields || fields.length === 0) return undefined;

  const OR = [];
  for (const variant of variants) {
    for (const field of fields) {
      if (typeof field === 'string') {
        OR.push({ [field]: { contains: variant, mode: 'insensitive' } });
      } else if (typeof field === 'object' && field !== null) {
        OR.push(field);
      }
    }
  }
  return OR;
};
