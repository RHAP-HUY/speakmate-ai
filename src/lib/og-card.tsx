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
        padding: '68px 76px',
        backgroundColor: '#FAF9F6',
        color: '#18181B',
        fontFamily: 'sans-serif',
        position: 'relative',
      }}
    >
      {/* Left Editorial Column */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          maxWidth: '680px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '28px',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: '#18181B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
            }}
          >
            <div
              style={{
                width: '3px',
                height: '12px',
                borderRadius: '2px',
                backgroundColor: 'rgba(255,255,255,0.7)',
                display: 'flex',
              }}
            />
            <div
              style={{
                width: '3px',
                height: '22px',
                borderRadius: '2px',
                backgroundColor: '#FFFFFF',
                display: 'flex',
              }}
            />
            <div
              style={{
                width: '3px',
                height: '28px',
                borderRadius: '2px',
                backgroundColor: '#60A5FA',
                display: 'flex',
              }}
            />
            <div
              style={{
                width: '3px',
                height: '18px',
                borderRadius: '2px',
                backgroundColor: '#FFFFFF',
                display: 'flex',
              }}
            />
          </div>
          <span
            style={{
              fontSize: '24px',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: '#18181B',
            }}
          >
            SpeakMate
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: '64px',
            fontWeight: 800,
            letterSpacing: '-0.035em',
            lineHeight: 1.08,
            color: '#18181B',
            marginBottom: '22px',
          }}
        >
          Real-world English speaking practice, crafted for daily fluency.
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: '26px',
            fontWeight: 400,
            lineHeight: 1.42,
            color: '#52525B',
            marginBottom: '36px',
          }}
        >
          Interactive listening, native phrasing drills, syllable-level IPA
          feedback, and seamless Google Drive sync.
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '12px',
          }}
        >
          <div
            style={{
              display: 'flex',
              padding: '10px 18px',
              borderRadius: '10px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E4E4E7',
              color: '#18181B',
              fontSize: '18px',
              fontWeight: 600,
            }}
          >
            US · UK · AU · CA Voices
          </div>
          <div
            style={{
              display: 'flex',
              padding: '10px 18px',
              borderRadius: '10px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E4E4E7',
              color: '#1D4ED8',
              fontSize: '18px',
              fontWeight: 600,
            }}
          >
            Word-Level IPA Scoring
          </div>
          <div
            style={{
              display: 'flex',
              padding: '10px 18px',
              borderRadius: '10px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E4E4E7',
              color: '#047857',
              fontSize: '18px',
              fontWeight: 600,
            }}
          >
            5TB Cloud Backup
          </div>
        </div>
      </div>

      {/* Right Realistic Studio Card Preview */}
      <div
        style={{
          width: '340px',
          borderRadius: '20px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E4E4E7',
          boxShadow: '0 20px 48px rgba(24, 24, 27, 0.08)',
          padding: '28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #F4F4F5',
            paddingBottom: '14px',
          }}
        >
          <span
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: '#18181B',
            }}
          >
            Pronunciation Score
          </span>
          <span
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: '#047857',
              backgroundColor: '#ECFDF5',
              padding: '4px 10px',
              borderRadius: '9999px',
            }}
          >
            94 / 100
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: '22px',
            fontWeight: 700,
            lineHeight: 1.35,
            color: '#18181B',
          }}
        >
          &ldquo;Could I get an iced oat latte, please?&rdquo;
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            backgroundColor: '#FAF9F6',
            border: '1px solid #E4E4E7',
            borderRadius: '12px',
            padding: '14px',
          }}
        >
          <span
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: '#1D4ED8',
            }}
          >
            CONNECTED SPEECH
          </span>
          <span
            style={{
              fontSize: '15px',
              color: '#52525B',
              lineHeight: 1.4,
            }}
          >
            Smooth linking on &ldquo;Could I&rdquo; (/kʊd aɪ/) and crisp final /t/.
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '14px',
            color: '#71717A',
            paddingTop: '4px',
          }}
        >
          <span>speakmate-ai-nu.vercel.app</span>
          <span>Studio 5.0</span>
        </div>
      </div>
    </div>
  );
}
