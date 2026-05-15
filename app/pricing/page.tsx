import Link from 'next/link'
import { CheckCircle, ArrowLeft, Zap } from 'lucide-react'

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 19,
    desc: 'Weekend warriors and casual racers',
    color: '#888',
    features: [
      '3 active cars',
      '5 tracks',
      'Race Chief OR Sim Chief',
      'Full setup sheet builder',
      'Maintenance log',
      '50 AI asks per month',
      'Setup history',
      'Email support',
    ],
    notIncluded: ['Both Race + Sim Chief', 'Screenshot analysis', 'Team members', 'Chief memory (advanced)'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 39,
    desc: 'Serious competitors who want to win',
    color: '#f5c518',
    popular: true,
    features: [
      '10 active cars',
      'Unlimited tracks',
      'Race Chief + Sim Chief',
      'Full setup history with memory',
      'Chief memory system (what worked where)',
      'Screenshot analysis with AI',
      '500 AI asks per month',
      'Team (3 members)',
      'Change delta tracking',
      'Priority support',
    ],
    notIncluded: ['Unlimited AI asks', 'Team (10 members)', 'API access'],
  },
  {
    id: 'elite',
    name: 'Elite',
    price: 79,
    desc: 'Pro teams, series regulars, serious programs',
    color: '#39ff14',
    features: [
      'Unlimited cars',
      'Unlimited tracks',
      'Race Chief + Sim Chief',
      'Unlimited AI asks',
      'Team (10 members)',
      'Full Chief memory across team',
      'API access',
      'Video analysis (coming soon)',
      'Dedicated Chief setup',
      'White-glove onboarding',
    ],
    notIncluded: [],
  },
]

const FAQS = [
  { q: 'What happens after the 7-day trial?', a: 'Your card is charged at the end of the trial. You can cancel any time before then with no charge.' },
  { q: 'Can I switch plans?', a: 'Yes. You can upgrade or downgrade at any time from your billing page. Changes take effect immediately.' },
  { q: 'What car types are supported in Race Chief?', a: 'Dirt late model, pavement late model, wing sprint, non-wing sprint, wing micro, non-wing micro, dirt modified, and street stock. Each has its own complete setup sheet template.' },
  { q: 'What sims does Sim Chief support?', a: 'iRacing (asphalt + dirt), Assetto Corsa, rFactor 2, Automobilista 2, Gran Turismo 7, F1 games, and more. We add platforms on request.' },
  { q: 'How does Chief memory work?', a: "Chief stores every setup change, driver feeling, and lap time improvement. When you return to a track or run in similar conditions, Chief references what previously worked and proactively tells you." },
  { q: 'Is there a setup fee?', a: 'No setup fee. Just the monthly subscription, starting after your 7-day trial.' },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Nav */}
      <nav className="border-b border-[#1a1a1a] px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="font-display text-2xl text-[#f5c518] tracking-widest">CHIEF</div>
          <div className="text-[#888] text-xs font-mono">BY WALKER SPORTS</div>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/login" className="btn-ghost text-sm">Sign In</Link>
          <Link href="/signup" className="btn-chief text-sm py-2 px-4 !text-base">Start Free Trial</Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-20">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-[#111] border border-[#222] rounded-full px-4 py-1.5 mb-6">
            <Zap size={12} className="text-[#f5c518]" />
            <span className="font-mono text-xs text-[#888] tracking-widest">7-DAY FREE TRIAL ON ALL PLANS</span>
          </div>
          <h1 className="font-display text-6xl sm:text-8xl text-white mb-4">PRICING</h1>
          <p className="text-[#888] text-xl max-w-xl mx-auto">
            Simple plans. No tricks. Card required for trial, charged after 7 days. Cancel any time.
          </p>
          <div className="chief-accent-line max-w-48 mx-auto mt-8" />
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-3 gap-6 mb-24">
          {PLANS.map(plan => (
            <div key={plan.id} className={`relative rounded-lg p-7 flex flex-col ${
              plan.popular
                ? 'bg-[#111] border-2 shadow-[0_0_60px_#f5c51815]'
                : 'chief-panel'
            }`} style={{ borderColor: plan.popular ? plan.color : undefined }}>

              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 font-display text-xs tracking-widest px-4 py-1 rounded-full bg-[#f5c518] text-black">
                  MOST POPULAR
                </div>
              )}

              <div className="mb-6">
                <div className="font-display text-3xl tracking-wider mb-1" style={{ color: plan.color }}>{plan.name}</div>
                <div className="text-[#555] text-sm mb-4">{plan.desc}</div>
                <div className="flex items-end gap-1">
                  <span className="font-display text-6xl text-white">${plan.price}</span>
                  <span className="text-[#555] font-mono mb-2 text-lg">/mo</span>
                </div>
                <p className="text-[#555] text-xs font-mono mt-1">Billed monthly after 7-day trial</p>
              </div>

              <Link
                href={`/signup?plan=${plan.id}`}
                className={`block w-full text-center py-3.5 rounded font-display text-lg tracking-wide transition-all mb-6 ${
                  plan.popular
                    ? 'bg-[#f5c518] text-black hover:bg-[#ffd700]'
                    : 'border border-[#333] text-white hover:border-[#555] hover:bg-[#161616]'
                }`}
              >
                Start Free Trial
              </Link>

              <div className="space-y-2 flex-1">
                <div className="font-display text-xs tracking-widest text-[#555] mb-3">INCLUDED</div>
                {plan.features.map(f => (
                  <div key={f} className="flex items-start gap-2">
                    <CheckCircle size={13} className="shrink-0 mt-0.5" style={{ color: plan.color }} />
                    <span className="text-sm text-[#888]">{f}</span>
                  </div>
                ))}
                {plan.notIncluded.length > 0 && (
                  <>
                    <div className="font-display text-xs tracking-widest text-[#333] mt-4 mb-2 pt-3 border-t border-[#1a1a1a]">NOT INCLUDED</div>
                    {plan.notIncluded.map(f => (
                      <div key={f} className="flex items-start gap-2">
                        <span className="text-[#333] text-xs shrink-0 mt-0.5">✕</span>
                        <span className="text-sm text-[#444]">{f}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Feature comparison */}
        <div className="mb-24">
          <h2 className="font-display text-4xl text-white text-center mb-10">FEATURE COMPARISON</h2>
          <div className="chief-panel rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1a1a1a]">
                  <th className="text-left p-4 font-display text-xs text-[#888] tracking-widest">FEATURE</th>
                  {PLANS.map(p => (
                    <th key={p.id} className="p-4 font-display text-sm tracking-wide" style={{ color: p.color }}>{p.name.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Cars', '3', '10', '∞'],
                  ['Tracks', '5', '∞', '∞'],
                  ['AI Asks / Month', '50', '500', '∞'],
                  ['Race Chief', '✓', '✓', '✓'],
                  ['Sim Chief', 'Race OR Sim', '✓', '✓'],
                  ['Setup History', '✓', '✓', '✓'],
                  ['Chief Memory', '—', '✓', '✓'],
                  ['Screenshot Analysis', '—', '✓', '✓'],
                  ['Team Members', '—', '3', '10'],
                  ['API Access', '—', '—', '✓'],
                  ['Video Analysis', '—', 'Coming', 'Coming'],
                ].map(([feature, ...vals]) => (
                  <tr key={feature} className="border-b border-[#111] hover:bg-[#0d0d0d] transition-colors">
                    <td className="p-4 text-sm text-[#888]">{feature}</td>
                    {vals.map((v, i) => (
                      <td key={i} className="p-4 text-center">
                        <span className={`font-mono text-sm ${
                          v === '✓' ? 'text-[#39ff14]' :
                          v === '—' ? 'text-[#333]' :
                          v === '∞' ? 'text-[#f5c518]' :
                          'text-[#888]'
                        }`}>{v}</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto mb-24">
          <h2 className="font-display text-4xl text-white text-center mb-10">FAQ</h2>
          <div className="space-y-3">
            {FAQS.map(faq => (
              <div key={faq.q} className="chief-panel rounded-lg p-5">
                <div className="font-display text-sm text-[#f5c518] tracking-wide mb-2">{faq.q}</div>
                <p className="text-[#888] text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center chief-panel-glow rounded-lg p-12">
          <div className="chief-accent-line max-w-32 mx-auto mb-6" />
          <h2 className="font-display text-5xl text-white mb-4">START WINNING</h2>
          <p className="text-[#888] mb-8">7 days free. No commitment. Just results.</p>
          <Link href="/signup" className="btn-chief text-xl py-4 px-12 inline-flex">
            Start Free Trial →
          </Link>
        </div>
      </div>
    </div>
  )
}
