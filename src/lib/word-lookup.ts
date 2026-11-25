export interface SentenceToken {
  raw: string;
  cleanWord: string | null;
}

export interface WordLookupEntry {
  word: string;
  phonetic: string | null;
  partOfSpeech: string | null;
  meaningVi: string | null;
  definitionEn: string | null;
  exampleEn: string | null;
}

const CORE_SPOKEN_GLOSSARY: Record<
  string,
  { phonetic: string; pos: string; vi: string }
> = {
  actually: { phonetic: 'ˈæktʃuəli', pos: 'trạng từ', vi: 'thực ra là, thật sự thì' },
  allergy: { phonetic: 'ˈælərdʒi', pos: 'danh từ', vi: 'dị ứng (thực phẩm / thời tiết)' },
  allergies: { phonetic: 'ˈælərdʒiz', pos: 'danh từ', vi: 'các chứng dị ứng' },
  awesome: { phonetic: 'ˈɔːsəm', pos: 'tính từ', vi: 'tuyệt vời, quá hay' },
  available: { phonetic: 'əˈveɪləbl', pos: 'tính từ', vi: 'có sẵn, rảnh rỗi' },
  boarding: { phonetic: 'ˈbɔːrdɪŋ', pos: 'danh từ', vi: 'việc lên máy bay / tàu' },
  blocker: { phonetic: 'ˈblɒkər', pos: 'danh từ', vi: 'điểm nghẽn, vướng mắc trong việc' },
  blockers: { phonetic: 'ˈblɒkərz', pos: 'danh từ', vi: 'các vướng mắc cản trở tiến độ' },
  budget: { phonetic: 'ˈbʌdʒɪt', pos: 'danh từ', vi: 'ngân sách, chi phí dự kiến' },
  catch: { phonetic: 'kætʃ', pos: 'động từ', vi: 'bắt kịp, nghe kịp, gặp lại (catch up)' },
  checkout: { phonetic: 'ˈtʃekaʊt', pos: 'danh từ', vi: 'thủ tục trả phòng / thanh toán' },
  chill: { phonetic: 'tʃɪl', pos: 'tính từ', vi: 'thư thái, thoải mái, dễ chịu' },
  colleague: { phonetic: 'ˈkɒliːɡ', pos: 'danh từ', vi: 'đồng nghiệp' },
  confirm: { phonetic: 'kənˈfɜːrm', pos: 'động từ', vi: 'xác nhận lại cho chắc chắn' },
  connect: { phonetic: 'kəˈnekt', pos: 'động từ', vi: 'kết nối, trò chuyện' },
  convenient: { phonetic: 'kənˈviːniənt', pos: 'tính từ', vi: 'thuận tiện, tiện lợi' },
  croissant: { phonetic: 'kwɑːˈsɒ̃', pos: 'danh từ', vi: 'bánh sừng bò' },
  currently: { phonetic: 'ˈkʌrəntli', pos: 'trạng từ', vi: 'hiện tại, đang trong giai đoạn' },
  deadline: { phonetic: 'ˈdedlaɪn', pos: 'danh từ', vi: 'hạn chót hoàn thành' },
  definitely: { phonetic: 'ˈdefɪnətli', pos: 'trạng từ', vi: 'chắc chắn rồi, nhất định' },
  delicious: { phonetic: 'dɪˈlɪʃəs', pos: 'tính từ', vi: 'rất ngon miệng' },
  destination: { phonetic: 'ˌdestɪˈneɪʃn', pos: 'danh từ', vi: 'điểm đến' },
  draft: { phonetic: 'dræft', pos: 'danh từ', vi: 'bản nháp, bản thảo' },
  especially: { phonetic: 'ɪˈspeʃəli', pos: 'trạng từ', vi: 'đặc biệt là' },
  experience: { phonetic: 'ɪkˈspɪriəns', pos: 'danh từ', vi: 'kinh nghiệm, trải nghiệm' },
  favorite: { phonetic: 'ˈfeɪvərɪt', pos: 'tính từ', vi: 'yêu thích nhất' },
  feedback: { phonetic: 'ˈfiːdbæk', pos: 'danh từ', vi: 'nhận xét, góp ý phản hồi' },
  flight: { phonetic: 'flaɪt', pos: 'danh từ', vi: 'chuyến bay' },
  honestly: { phonetic: 'ˈɒnɪstli', pos: 'trạng từ', vi: 'thành thật mà nói' },
  included: { phonetic: 'ɪnˈkluːdɪd', pos: 'tính từ', vi: 'đã bao gồm sẵn' },
  interview: { phonetic: 'ˈɪntərvjuː', pos: 'danh từ', vi: 'buổi phỏng vấn' },
  latte: { phonetic: 'ˈlɑːteɪ', pos: 'danh từ', vi: 'cà phê pha sữa nóng/đá (latte)' },
  lovely: { phonetic: 'ˈlʌvli', pos: 'tính từ', vi: 'tuyệt đẹp, dễ mến (hay dùng ở Anh)' },
  luggage: { phonetic: 'ˈlʌɡɪdʒ', pos: 'danh từ', vi: 'hành lý mang theo' },
  medium: { phonetic: 'ˈmiːdiəm', pos: 'tính từ', vi: 'cỡ vừa, mức trung bình' },
  menu: { phonetic: 'ˈmenjuː', pos: 'danh từ', vi: 'thực đơn' },
  opportunity: { phonetic: 'ˌɒpərˈtuːnəti', pos: 'danh từ', vi: 'cơ hội' },
  passport: { phonetic: 'ˈpæspɔːrt', pos: 'danh từ', vi: 'hộ chiếu' },
  pastry: { phonetic: 'ˈpeɪstri', pos: 'danh từ', vi: 'bánh ngọt nướng' },
  popular: { phonetic: 'ˈpɒpjələr', pos: 'tính từ', vi: 'phổ biến, được ưa chuộng' },
  prefer: { phonetic: 'prɪˈfɜːr', pos: 'động từ', vi: 'thích hơn, ưu tiên hơn' },
  priority: { phonetic: 'praɪˈɒrəti', pos: 'danh từ', vi: 'mức ưu tiên hàng đầu' },
  proposal: { phonetic: 'prəˈpoʊzl', pos: 'danh từ', vi: 'bản đề xuất' },
  recommend: { phonetic: 'ˌrekəˈmend', pos: 'động từ', vi: 'gợi ý, giới thiệu món/điều hay' },
  regular: { phonetic: 'ˈreɡjələr', pos: 'tính từ', vi: 'thông thường, cỡ chuẩn' },
  relax: { phonetic: 'rɪˈlæks', pos: 'động từ', vi: 'thư giãn, nghỉ ngơi' },
  reservation: { phonetic: 'ˌrezərˈveɪʃn', pos: 'danh từ', vi: 'chỗ đặt trước (bàn / phòng)' },
  responsible: { phonetic: 'rɪˈspɒnsəbl', pos: 'tính từ', vi: 'chịu trách nhiệm phụ trách' },
  schedule: { phonetic: 'ˈskedʒuːl', pos: 'danh từ / động từ', vi: 'lịch trình; sắp xếp lịch hẹn' },
  standup: { phonetic: 'ˈstændʌp', pos: 'danh từ', vi: 'cuộc họp nhanh đầu ngày của nhóm' },
  strength: { phonetic: 'streŋθ', pos: 'danh từ', vi: 'điểm mạnh, thế mạnh' },
  strengths: { phonetic: 'streŋθs', pos: 'danh từ', vi: 'các thế mạnh nổi bật' },
  subway: { phonetic: 'ˈsʌbweɪ', pos: 'danh từ', vi: 'tàu điện ngầm' },
  update: { phonetic: 'ˈʌpdeɪt', pos: 'danh từ / động từ', vi: 'bản cập nhật; báo tiến độ mới' },
  vacation: { phonetic: 'veɪˈkeɪʃn', pos: 'danh từ', vi: 'kỳ nghỉ, chuyến du lịch' },
  workflow: { phonetic: 'ˈwɜːrkfloʊ', pos: 'danh từ', vi: 'quy trình phối hợp công việc' },
  worries: { phonetic: 'ˈwɜːriz', pos: 'danh từ', vi: 'điều bận tâm (No worries = Không sao đâu!)' },
};

const remoteWordCache = new Map<string, WordLookupEntry>();

export function normalizeLookupWord(raw: string): string {
  return raw
    .trim()
    .replace(/^[^a-zA-Z']+|[^a-zA-Z']+$/g, '')
    .toLowerCase();
}

/**
 * Splits an English sentence into alternating word and punctuation/whitespace tokens
 * so each word can be tapped interactively without altering typography or spacing.
 */
export function tokenizeInteractiveSentence(sentence: string): SentenceToken[] {
  if (!sentence) return [];
  const parts = sentence.match(/[A-Za-z]+(?:'[A-Za-z]+)?|[^A-Za-z]+/g) ?? [sentence];
  return parts.map((raw) => {
    const isWord = /^[A-Za-z]/.test(raw);
    const clean = isWord ? normalizeLookupWord(raw) : null;
    return {
      raw,
      cleanWord: clean && clean.length >= 2 ? clean : null,
    };
  });
}

export async function lookupEnglishWord(wordRaw: string): Promise<WordLookupEntry> {
  const clean = normalizeLookupWord(wordRaw);
  if (!clean) {
    return {
      word: wordRaw,
      phonetic: null,
      partOfSpeech: null,
      meaningVi: null,
      definitionEn: null,
      exampleEn: null,
    };
  }

  const cached = remoteWordCache.get(clean);
  if (cached) return cached;

  const localHit = CORE_SPOKEN_GLOSSARY[clean];
  const baseEntry: WordLookupEntry = {
    word: clean,
    phonetic: localHit?.phonetic ?? null,
    partOfSpeech: localHit?.pos ?? null,
    meaningVi: localHit?.vi ?? null,
    definitionEn: null,
    exampleEn: null,
  };

  if (typeof fetch === 'undefined') {
    return baseEntry;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3_200);

  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(clean)}`,
      { signal: controller.signal }
    );
    if (res.ok) {
      const json = (await res.json()) as Array<{
        phonetic?: string;
        phonetics?: Array<{ text?: string }>;
        meanings?: Array<{
          partOfSpeech?: string;
          definitions?: Array<{ definition?: string; example?: string }>;
        }>;
      }>;
      const first = json?.[0];
      const phonetic =
        baseEntry.phonetic ||
        first?.phonetic?.replace(/^\/|\/$/g, '') ||
        first?.phonetics?.find((p) => p.text)?.text?.replace(/^\/|\/$/g, '') ||
        null;
      const firstMeaning = first?.meanings?.[0];
      const firstDef = firstMeaning?.definitions?.[0];

      const enriched: WordLookupEntry = {
        word: clean,
        phonetic,
        partOfSpeech: baseEntry.partOfSpeech || firstMeaning?.partOfSpeech || null,
        meaningVi: baseEntry.meaningVi,
        definitionEn: firstDef?.definition ?? null,
        exampleEn: firstDef?.example ?? null,
      };
      remoteWordCache.set(clean, enriched);
      return enriched;
    }
  } catch {
    // Offline or API miss — return instant local glossary entry gracefully
  } finally {
    clearTimeout(timer);
  }

  remoteWordCache.set(clean, baseEntry);
  return baseEntry;
}
