export function renderSpeakMateOgCard() {
  return (
    <div
      style={{
        width: '1200px',
        height: '630px',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '64px 72px',
        background:
          'linear-gradient(135deg, #0B1120 0%, #17153B 48%, #0F172A 100%)',
        color: '#F8FAFC',
        fontFamily: 'sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient Aurora glow blobs */}
      <div
        style={{
          position: 'absolute',
          top: '-140px',
          left: '-80px',
          width: '480px',
          height: '480px',
          borderRadius: '9999px',
          background:
            'radial-gradient(circle, rgba(99,102,241,0.34) 0%, rgba(99,102,241,0) 70%)',
          display: 'flex',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-180px',
          right: '60px',
          width: '540px',
          height: '540px',
          borderRadius: '9999px',
          background:
            'radial-gradient(circle, rgba(6,182,212,0.28) 0%, rgba(6,182,212,0) 70%)',
          display: 'flex',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '80px',
          right: '-100px',
          width: '360px',
          height: '360px',
          borderRadius: '9999px',
          background:
            'radial-gradient(circle, rgba(168,85,247,0.26) 0%, rgba(168,85,247,0) 70%)',
          display: 'flex',
        }}
      />

      {/* Left copy block */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          maxWidth: '720px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            alignSelf: 'flex-start',
            padding: '10px 20px',
            borderRadius: '9999px',
            background: 'rgba(99, 102, 241, 0.2)',
            border: '1px solid rgba(165, 180, 252, 0.35)',
            fontSize: '20px',
            fontWeight: 700,
            color: '#C7D2FE',
            letterSpacing: '0.04em',
            marginBottom: '26px',
          }}
        >
          <span>AURORA VOICE STUDIO</span>
          <span style={{ color: '#22D3EE' }}>•</span>
          <span>AI COACH NOVA</span>
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: '74px',
            fontWeight: 900,
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
            color: '#FFFFFF',
            marginBottom: '18px',
          }}
        >
          SpeakMate AI
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: '30px',
            fontWeight: 500,
            lineHeight: 1.38,
            color: '#CBD5E1',
            marginBottom: '36px',
          }}
        >
          Play-to-Learn English Speaking Studio with real-time AI voice coaching,
          word-level pronunciation scoring, and 5TB cloud sync.
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: '14px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 22px',
              borderRadius: '16px',
              background: 'rgba(15, 23, 42, 0.72)',
              border: '1px solid rgba(99, 102, 241, 0.45)',
              color: '#E0E7FF',
              fontSize: '20px',
              fontWeight: 700,
            }}
          >
            5 Play-to-Learn Modes
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 22px',
              borderRadius: '16px',
              background: 'rgba(15, 23, 42, 0.72)',
              border: '1px solid rgba(34, 211, 238, 0.45)',
              color: '#CFFAFE',
              fontSize: '20px',
              fontWeight: 700,
            }}
          >
            AI Pronunciation Coach
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 22px',
              borderRadius: '16px',
              background: 'rgba(15, 23, 42, 0.72)',
              border: '1px solid rgba(251, 191, 36, 0.45)',
              color: '#FEF3C7',
              fontSize: '20px',
              fontWeight: 700,
            }}
          >
            Streaks & Weekly Leagues
          </div>
        </div>
      </div>

      {/* Right luminous Nova AI Orb emblem */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '320px',
          height: '320px',
          borderRadius: '9999px',
          background:
            'radial-gradient(circle at 35% 30%, rgba(129,140,248,0.28), rgba(15,23,42,0.55) 72%)',
          border: '2px solid rgba(165, 180, 252, 0.3)',
          boxShadow: '0 24px 80px rgba(79, 70, 229, 0.42)',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '220px',
            height: '220px',
            borderRadius: '9999px',
            background:
              'linear-gradient(145deg, #4F46E5 0%, #7C3AED 50%, #06B6D4 100%)',
            boxShadow: '0 16px 48px rgba(6, 182, 212, 0.35)',
            border: '3px solid rgba(255,255,255,0.35)',
          }}
        >
          {/* Animated soundwave bars emblem */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: '12px',
              height: '92px',
            }}
          >
            <div
              style={{
                width: '16px',
                height: '42px',
                borderRadius: '9999px',
                background: 'rgba(255,255,255,0.82)',
                display: 'flex',
              }}
            />
            <div
              style={{
                width: '18px',
                height: '82px',
                borderRadius: '9999px',
                background: '#FFFFFF',
                display: 'flex',
              }}
            />
            <div
              style={{
                width: '18px',
                height: '62px',
                borderRadius: '9999px',
                background: '#A5F3FC',
                display: 'flex',
              }}
            />
            <div
              style={{
                width: '16px',
                height: '92px',
                borderRadius: '9999px',
                background: '#FFFFFF',
                display: 'flex',
              }}
            />
            <div
              style={{
                width: '16px',
                height: '48px',
                borderRadius: '9999px',
                background: 'rgba(255,255,255,0.82)',
                display: 'flex',
              }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: '14px',
              fontSize: '18px',
              fontWeight: 800,
              letterSpacing: '0.14em',
              color: '#E0F2FE',
            }}
          >
            NOVA AI
          </div>
        </div>
      </div>

      {/* Footer URL strip */}
      <div
        style={{
          position: 'absolute',
          bottom: '28px',
          left: '72px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '18px',
          color: '#94A3B8',
          fontWeight: 600,
        }}
      >
        <span>speakmate-ai-nu.vercel.app</span>
        <span style={{ color: '#475569' }}>•</span>
        <span>Enterprise 5.0</span>
      </div>
    </div>
  );
}
