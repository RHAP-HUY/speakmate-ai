export interface ConnectedSpeechGuide {
  linkedDisplay: string;
  linkPairs: string[];
  stressedWords: string[];
  coachNoteVi: string;
}

const FUNCTION_WORDS = new Set([
  'a',
  'an',
  'the',
  'to',
  'of',
  'for',
  'in',
  'on',
  'at',
  'by',
  'with',
  'from',
  'as',
  'and',
  'or',
  'but',
  'so',
  'if',
  'is',
  'am',
  'are',
  'was',
  'were',
  'be',
  'been',
  'do',
  'does',
  'did',
  'can',
  'could',
  'would',
  'should',
  'will',
  'have',
  'has',
  'had',
  'i',
  'you',
  'he',
  'she',
  'it',
  'we',
  'they',
  'me',
  'him',
  'her',
  'us',
  'them',
  'my',
  'your',
  'our',
  'their',
  'this',
  'that',
]);

function endsWithConsonantSound(word: string): boolean {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!clean) return false;
  // Words ending in silent 'e' preceded by consonant (like 'take', 'have', 'make', 'time', 'latte' -> 'latte' ends in vowel!)
  if (clean === 'latte' || clean === 'coffee' || clean === 'see' || clean === 'free') {
    return false;
  }
  if (clean.endsWith('e') && clean.length > 2) {
    const beforeE = clean[clean.length - 2];
    if (!'aeiouy'.includes(beforeE)) {
      return true; // take, have, make, give, some, love -> ends in consonant sound!
    }
  }
  const last = clean[clean.length - 1];
  return !'aeiouwy'.includes(last);
}

function startsWithVowelSound(word: string): boolean {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!clean) return false;
  if (clean.startsWith('hour') || clean.startsWith('honest')) return true;
  if (clean.startsWith('uni') || clean.startsWith('use') || clean === 'one') {
    return false;
  }
  return 'aeiou'.includes(clean[0]);
}

/**
 * Generates an intuitive visual Connected Speech & Sentence Stress map
 * showing consonant-to-vowel linking (‿), natural blends (could you -> /kʊdʒuː/),
 * and stressed content words for shadowing practice.
 */
export function analyzeConnectedSpeech(sentence: string): ConnectedSpeechGuide {
  const rawWords = sentence.trim().split(/\s+/).filter(Boolean);
  if (rawWords.length === 0) {
    return {
      linkedDisplay: '',
      linkPairs: [],
      stressedWords: [],
      coachNoteVi: '',
    };
  }

  const linkPairs: string[] = [];
  const stressedWords: string[] = [];
  let specialNote = '';

  const formattedTokens: string[] = [];

  for (let i = 0; i < rawWords.length; i++) {
    const cur = rawWords[i];
    const cleanCur = cur.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, '');
    const lowerCur = cleanCur.toLowerCase();
    const hasTrailingPunct = /[,.;!?—–-]$/.test(cur);

    if (
      cleanCur.length >= 2 &&
      !FUNCTION_WORDS.has(lowerCur) &&
      !lowerCur.endsWith("n't")
    ) {
      stressedWords.push(cleanCur);
    }

    const next = i + 1 < rawWords.length ? rawWords[i + 1] : null;
    const cleanNext = next
      ? next.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, '')
      : '';
    const lowerNext = cleanNext.toLowerCase();

    let shouldLink = false;
    if (!hasTrailingPunct && cleanNext) {
      if (
        (lowerCur === 'could' || lowerCur === 'would' || lowerCur === 'did') &&
        lowerNext === 'you'
      ) {
        shouldLink = true;
        specialNote = `Biến âm tự nhiên: "${cleanCur} ${cleanNext}" đọc nối mượt thành âm /dʒuː/.`;
      } else if (
        endsWithConsonantSound(cleanCur) &&
        startsWithVowelSound(cleanNext)
      ) {
        shouldLink = true;
      }
    }

    if (shouldLink) {
      linkPairs.push(`${cleanCur}‿${cleanNext}`);
    }

    formattedTokens.push(shouldLink ? `${cur}‿` : `${cur} `);
  }

  const linkedDisplay = formattedTokens.join('').trim();
  const coachNoteVi =
    specialNote ||
    (linkPairs.length > 0
      ? `Nối âm mượt tại ${linkPairs.slice(0, 3).join(', ')} và nhấn rõ các từ mang nghĩa chính.`
      : 'Đọc lướt nhẹ các từ nối (a, to, for) và nhấn giọng rõ vào động từ / danh từ chính.');

  return {
    linkedDisplay,
    linkPairs,
    stressedWords: Array.from(new Set(stressedWords)).slice(0, 6),
    coachNoteVi,
  };
}
