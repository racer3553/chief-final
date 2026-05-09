// chief-final/app/dashboard/ai-chat/page.tsx
// Replace your existing ai-chat page with this — wires up voice + history.
import AskChiefVoice from '@/components/AskChiefVoice'

export default function AskChiefPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <AskChiefVoice />

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl p-4 border" style={{ background: 'rgba(20,20,32,0.6)', borderColor: 'rgba(255,255,255,0.08)' }}>
          <h3 className="font-bold text-white mb-2">Try asking</h3>
          <ul className="text-sm text-slate-400 space-y-2">
            <li>• "What was my setup last time at Eldora?"</li>
            <li>• "Compare my best laps from yesterday vs today"</li>
            <li>• "How is the track different now? Track temp is up 15 degrees."</li>
            <li>• "Recommend a setup change for tonight's race."</li>
            <li>• "What do my Coach Dave files say for this combo?"</li>
          </ul>
        </div>
        <div className="rounded-xl p-4 border" style={{ background: 'rgba(20,20,32,0.6)', borderColor: 'rgba(255,255,255,0.08)' }}>
          <h3 className="font-bold text-white mb-2">Auto-Capture Status</h3>
          <p className="text-sm text-slate-400">
            Chief reads from your Documents/ChiefAutoCapture folder + cloud-stored sessions.
            Run <code className="text-cyan-300">chief-autocapture.bat</code> on your sim PC to start logging every session.
          </p>
        </div>
      </div>
    </div>
  )
}
