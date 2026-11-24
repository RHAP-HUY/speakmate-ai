export function renderSpeakMateOgCard() {
  return (
    <div
      style={{
        width: '1200px',
        height: '630px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '72px 84px',
        backgroundColor: '#FBF9F5',
        color: '#1C1917',
        fontFamily: 'Georgia, serif',
        borderTop: '10px solid #14532D',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span
            style={{
              fontSize: '34px',
              fontWeight: 700,
              color: '#1C1917',
            }}
          >
            SpeakMate
          </span>
          <span
            style={{
              fontSize: '34px',
              fontWeight: 700,
              color: '#C2410C',
            }}
          >
            .
          </span>
        </div>
        <span
          style={{
            fontFamily: 'sans-serif',
            fontSize: '18px',
            color: '#78716C',
          }}
        >
          US · UK · AU · CA Spoken English
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          maxWidth: '920px',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: '68px',
            fontWeight: 700,
            lineHeight: 1.12,
            color: '#1C1917',
            marginBottom: '24px',
          }}
        >
          Practice natural English through everyday conversation.
        </div>

        <div
          style={{
            display: 'flex',
            fontFamily: 'sans-serif',
            fontSize: '26px',
            lineHeight: 1.45,
            color: '#57534E',
          }}
        >
          Short listening & phrasing exercises, live roleplay with six native
          accents, and syllable-by-syllable IPA feedback.
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid #E7E2D8',
          paddingTop: '24px',
          fontFamily: 'sans-serif',
          fontSize: '18px',
          color: '#57534E',
        }}
      >
        <span>speakmate-ai-nu.vercel.app</span>
        <span style={{ color: '#14532D', fontWeight: 600 }}>
          Start practicing for free →
        </span>
      </div>
    </div>
  );
}
