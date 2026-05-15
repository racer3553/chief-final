"use client";

import Link from "next/link";

export default function DownloadPage() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-[#0a0a0a] border border-[#9eff0033] rounded-lg p-8 mb-6 text-center">
        <div className="inline-block text-xs text-[#9eff00] uppercase tracking-wider mb-3 px-3 py-1 border border-[#9eff0033] rounded font-mono">Chief iRacing Logger</div>
        <h1 className="text-4xl text-white mb-3 font-bold">Chief Logger for Windows</h1>
        <p className="text-gray-400 mb-8 max-w-xl mx-auto">Connect iRacing directly to Chief. Live telemetry, per-corner analysis, and real-time voice coaching.</p>
        <div className="flex gap-3 justify-center mb-6 flex-wrap">
          <a href="https://github.com/racer3553/chief-iracing-logger/releases/download/v1.0.1/ChiefLogger.exe" className="bg-[#9eff00] hover:bg-[#a5ff20] text-black font-bold px-8 py-4 rounded text-lg inline-block">Download ChiefLogger.exe</a>
          <a href="https://github.com/racer3553/chief-iracing-logger/releases" target="_blank" rel="noreferrer" className="border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white px-6 py-4 rounded inline-block">All Releases</a>
        </div>
        <div className="text-xs text-gray-400">Windows 10/11 - Free and Open Source - Zero FPS Impact</div>
      </div>
      <div className="bg-[#0a0a0a] border border-gray-800 rounded-lg p-6 mb-6">
        <h2 className="text-lg text-white mb-4 font-bold">System Requirements</h2>
        <ul className="text-sm text-gray-300 space-y-2">
          <li>Operating System: Windows 10 or Windows 11</li>
          <li>iRacing: Latest version installed</li>
          <li>Disk Space: ~100 MB available</li>
          <li>RAM: 512 MB minimum</li>
        </ul>
      </div>
      <div className="bg-[#0a0a0a] border border-gray-800 rounded-lg p-6">
        <h2 className="text-lg text-white mb-4 font-bold">Installation and Setup</h2>
        <ol className="text-sm text-gray-300 space-y-3 list-decimal list-inside">
          <li>Download ChiefLogger.exe using the green button above. Standalone exe, no installer.</li>
          <li>Double-click ChiefLogger.exe. If Windows shows SmartScreen, click More info then Run anyway.</li>
          <li>Login with your Chief Racing account credentials.</li>
          <li>Launch iRacing as normal. Chief detects sessions automatically.</li>
          <li>View every captured session and lap telemetry on the <Link href="/dashboard/sessions" className="text-[#f5c518] underline">Sessions + Telemetry</Link> page.</li>
        </ol>
      </div>
    </div>
  );
}
