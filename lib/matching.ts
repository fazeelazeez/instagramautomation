/**
 * Helper functions for Fuzzy String Matching, Sentence Keyword Detection,
 * Intent/Alias Mapping (PP, ethrayavum, etc.), and Appreciation Comment Detection.
 */

// Calculate Levenshtein distance between two strings
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Keyword Aliases & Shorthand mapping.
 * Maps primary flow triggers (PRICE, RATE, DETAILS) to shorthand & Manglish variants.
 */
export const KEYWORD_ALIASES: Record<string, string[]> = {
  PRICE: [
    'PP', 'PRC', 'PRZE', 'PRZ', 'AMT', 'AMOUNT', 'COST', 'VILA', 'VILAYENTHA',
    'ETHRA', 'ETHRAYA', 'ETHRAYAVUM', 'ETHRAA', 'ETHRAAYI', 'PRICE PLS', 'PP PLS', 'RATE'
  ],
  RATE: [
    'PP', 'PRC', 'PRZE', 'PRZ', 'AMT', 'AMOUNT', 'COST', 'VILA', 'VILAYENTHA',
    'ETHRA', 'ETHRAYA', 'ETHRAYAVUM', 'ETHRAA', 'ETHRAAYI', 'PRICE PLS', 'PP PLS', 'PRICE'
  ],
  DETAILS: [
    'DTL', 'DTAIL', 'DTAILS', 'DETAILS PLS', 'DTLS', 'INFO', 'DETAILS PLEASE'
  ]
};

/**
 * Checks if word matches target keyword using fuzzy logic.
 */
export function isFuzzyMatch(word: string, targetKeyword: string): boolean {
  const w = word.trim().toUpperCase();
  const t = targetKeyword.trim().toUpperCase();

  if (w === t) return true;
  if (w.length < 2 || t.length < 2) return false;

  // Exact short shorthand (e.g. PP, PRC) should not be fuzzy matched loosely against long words
  if (t === 'PP' || w === 'PP') return w === t;

  const distance = levenshteinDistance(w, t);

  // Short words (3-4 chars, e.g. PRZ vs PRICE, DTAL vs DETAIL)
  if (t.length <= 4 && distance <= 2) return true;
  // Medium words (5-7 chars, e.g. DTAILS vs DETAILS)
  if (t.length >= 5 && t.length <= 7 && distance <= 2) return true;
  // Longer words (8+ chars)
  if (t.length >= 8 && distance <= 3) return true;

  return false;
}

/**
 * Checks if text contains keyword as exact substring, alias (PP, ethraya, etc.), or fuzzy match within sentence.
 */
export function matchesKeywordInSentence(text: string, targetKeyword: string): boolean {
  const textUpper = text.toUpperCase();
  const targetUpper = targetKeyword.trim().toUpperCase();

  // 1. Direct substring match
  if (textUpper.includes(targetUpper)) return true;

  // 2. Check Aliases (e.g., PP, PRC, ethraya for PRICE/RATE flows)
  const aliases = KEYWORD_ALIASES[targetUpper] || [];
  const words = textUpper.split(/[\s,!?.-]+/).filter(Boolean);

  for (const alias of aliases) {
    if (textUpper.includes(alias)) return true;
    for (const word of words) {
      if (word === alias) return true;
    }
  }

  // 3. Tokenize and test each word fuzzy
  for (const word of words) {
    if (isFuzzyMatch(word, targetUpper)) {
      return true;
    }
  }

  return false;
}

// Appreciation Keywords and Emojis
export const APPRECIATION_KEYWORDS = [
  'SUPER', 'ADIPOLI', 'CONGRATULATIONS', 'CONGRATS', 'NICE', 'LOVE',
  'BEAUTIFUL', 'GORGEOUS', 'AWESOME', 'AMAZING', 'LOVELY', 'PRETTY',
  'STUNNING', 'CUTE', 'GOOD', 'FIRE', 'POLI', 'KIDU', 'KOLLAM', 'SUNDARI',
  'അടിപൊളി', 'സുന്ദരി', 'കിടു', 'പൊളി', 'സൂപ്പർ'
];

export const APPRECIATION_EMOJIS = ['❤️', '😍', '🥰', '🔥', '👏', '🙌', '✨', '💖', '💕', '💯', '👌'];

export const INQUIRY_KEYWORDS = [
  'PRICE', 'DETAILS', 'RATE', 'COST', 'DM', 'BUY', 'ORDER', 'HOW MUCH',
  'RS', 'RUPEES', 'ഡീറ്റെയിൽസ്', 'വില', 'PP', 'PRC', 'AMT', 'AMOUNT',
  'ETHRA', 'ETHRAYA', 'ETHRAYAVUM', 'ETHRAAYI', 'ETHRAA', 'VILA', 'VILAYENTHA'
];

export const DEFAULT_APPRECIATION_REPLIES = [
  'Thank you so much! ❤️',
  'Thank you! Glad you liked it ✨',
  'Appreciate the love! 🥰',
  'Thanks a lot! ❤️✨',
  'Thank you for your sweet comment! 💕',
  'Thanks for the support! 🙌',
  'Thank you! Means a lot to us 🥰✨'
];

/**
 * Checks if a comment is a general appreciation/compliment without asking for price/details.
 */
export function isAppreciationComment(commentText: string): boolean {
  const textUpper = commentText.toUpperCase();

  // Check if comment contains inquiry keywords (if it asks for price/details, it's NOT just an appreciation)
  for (const inq of INQUIRY_KEYWORDS) {
    if (textUpper.includes(inq)) return false;
  }

  // Check if comment contains appreciation keywords
  for (const kw of APPRECIATION_KEYWORDS) {
    if (textUpper.includes(kw)) return true;
  }

  // Check if comment contains appreciation emojis
  for (const emoji of APPRECIATION_EMOJIS) {
    if (commentText.includes(emoji)) return true;
  }

  return false;
}
