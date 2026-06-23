'use client'
import { generatePKCE, buildAuthUrl } from '../../lib/auth'

export default function LoginPage() {
  async function handleLogin() {
    const { verifier, challenge } = await generatePKCE()
    sessionStorage.setItem('pkce_verifier', verifier)
    window.location.href = buildAuthUrl(challenge)
  }

  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: '#050508' }}>
      {/* Animated grid background */}
      <div className="absolute inset-0" style={{
        backgroundImage: 'linear-gradient(rgba(0,255,136,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,0.04) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }} />

      {/* Radial glow center */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(0,255,136,0.08) 0%, transparent 70%)',
      }} />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-sm w-full">
        {/* Logo */}
        <div className="mb-8">
          <div
            className="text-7xl font-black tracking-tight mb-1"
            style={{
              color: '#00ff88',
              textShadow: '0 0 60px rgba(0,255,136,0.5), 0 0 120px rgba(0,255,136,0.2)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            CRASH
          </div>
          <div className="text-sm font-medium tracking-widest uppercase" style={{ color: '#94a3b8', letterSpacing: '0.3em' }}>
            Jungle Gaming
          </div>
        </div>

        {/* Stats row */}
        <div className="flex justify-center gap-8 mb-10">
          {[
            { label: 'Ao vivo', value: '🟢' },
            { label: 'Multiplicador', value: 'e^(t×0.06)' },
            { label: 'Provably Fair', value: '✓' },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <div className="text-xs font-bold mb-0.5" style={{ color: '#00ff88' }}>{value}</div>
              <div className="text-xs" style={{ color: '#4a5568' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={handleLogin}
          className="w-full py-4 rounded-xl font-black text-lg tracking-wide text-black transition-all active:scale-95"
          style={{
            backgroundColor: '#00ff88',
            boxShadow: '0 0 32px rgba(0,255,136,0.4), 0 4px 24px rgba(0,255,136,0.2)',
          }}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 48px rgba(0,255,136,0.6), 0 4px 32px rgba(0,255,136,0.3)')}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 32px rgba(0,255,136,0.4), 0 4px 24px rgba(0,255,136,0.2)')}
        >
          Entrar
        </button>

        <p className="mt-4 text-xs" style={{ color: '#2d3748' }}>
          Autenticado via Keycloak · OIDC PKCE S256
        </p>
      </div>

      <style>{`
        @keyframes gridPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </main>
  )
}
