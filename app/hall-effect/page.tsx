"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faPlug, faCircleCheck, faCircleXmark, faTerminal } from "@fortawesome/free-solid-svg-icons";
import { isCompanionAvailable } from "@/lib/hall-effect";

export default function HallEffectPage() {
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    isCompanionAvailable().then(setAvailable);
    const interval = setInterval(() => {
      isCompanionAvailable().then(setAvailable);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-neutral-200">
      <header className="bg-[#141414] border-b border-neutral-800/50 sticky top-0 z-10 backdrop-blur-sm">
        <div className="w-full px-6 sm:px-10 py-3 flex items-center gap-4">
          <Link href="/" className="p-3 text-neutral-300 hover:text-[#00ff88] transition-colors" aria-label="Back">
            <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
          </Link>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <FontAwesomeIcon icon={faPlug} className="w-5 h-5 text-cyan-400" />
            Hall Effect Telemetry
          </h1>
          <span className="ml-auto text-xs px-2 py-1 rounded bg-cyan-900/30 text-cyan-300 border border-cyan-700/30">Optional</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        {/* Status indicator */}
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${available ? "bg-[#00ff88]/5 border-[#00ff88]/30" : "bg-neutral-800/30 border-neutral-700/30"}`}>
          <FontAwesomeIcon
            icon={available ? faCircleCheck : faCircleXmark}
            className={`w-5 h-5 ${available ? "text-[#00ff88]" : "text-neutral-500"}`}
          />
          <div>
            <p className={`text-sm font-medium ${available ? "text-[#00ff88]" : "text-neutral-400"}`}>
              {available === null ? "Checking..." : available ? "Companion service detected" : "Companion service not running"}
            </p>
            <p className="text-xs text-neutral-500">
              {available ? "NeuralKeys is receiving analog key data" : "Install and run the companion service to enable this feature"}
            </p>
          </div>
        </div>

        {/* What is it */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold">What is this?</h2>
          <p className="text-sm text-neutral-400 leading-relaxed">
            If you have a <strong className="text-neutral-200">Keychron K2 HE</strong> (Hall Effect) keyboard, NeuralKeys can read the
            analog sensor data from your keys in real-time. Unlike normal keyboards that only detect &ldquo;pressed&rdquo; or &ldquo;not pressed&rdquo;,
            your K2 HE measures exactly how far each key travels (0-4mm) at 100 times per second.
          </p>
          <p className="text-sm text-neutral-400 leading-relaxed">
            This unlocks advanced analytics that are impossible with a regular keyboard:
          </p>
          <ul className="text-sm text-neutral-400 space-y-1 list-disc list-inside">
            <li><strong className="text-neutral-200">Press depth</strong> — are you bottoming out or typing lightly?</li>
            <li><strong className="text-neutral-200">Actuation velocity</strong> — how fast you strike each key</li>
            <li><strong className="text-neutral-200">Physical fatigue</strong> — decreasing force over time</li>
            <li><strong className="text-neutral-200">Real finger identification</strong> — each finger has a distinct press profile</li>
          </ul>
        </section>

        {/* How to install */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold">How to set up</h2>
          <p className="text-sm text-neutral-400">
            This feature requires a small companion app that runs in the background on your computer.
            It reads data from your keyboard over USB and sends it to NeuralKeys via a local connection.
          </p>

          <div className="space-y-4 mt-4">
            <Step number={1} title="Connect your K2 HE via USB">
              <p>Switch to wired mode (toggle on the back of the keyboard). Bluetooth doesn&apos;t support raw HID.</p>
            </Step>

            <Step number={2} title="Download the companion service">
              <p>
                Download the pre-built binary for your OS from the{" "}
                <a href="https://github.com/stuarthopwood/typing-trainer/releases" className="text-cyan-400 hover:text-cyan-300 underline" target="_blank" rel="noopener noreferrer">
                  Releases page
                </a>, or build from source:
              </p>
              <div className="mt-2 p-3 rounded-lg bg-neutral-900 border border-neutral-800 font-mono text-xs">
                <div className="flex items-center gap-2 text-neutral-500 mb-1">
                  <FontAwesomeIcon icon={faTerminal} className="w-3 h-3" />
                  Terminal
                </div>
                <code className="text-cyan-300">cd companion/neuralkeys-hid<br />cargo build --release</code>
              </div>
            </Step>

            <Step number={3} title="Run it">
              <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 font-mono text-xs">
                <code className="text-cyan-300">./neuralkeys-hid</code>
              </div>
              <p className="mt-2">You should see &ldquo;Connected. Polling at 100Hz...&rdquo; — that means it&apos;s working.</p>
            </Step>

            <Step number={4} title="Open NeuralKeys">
              <p>
                The status indicator above will turn green when the companion is detected.
                Analog data will automatically enrich your typing sessions.
              </p>
            </Step>
          </div>
        </section>

        {/* Privacy */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold">Privacy</h2>
          <ul className="text-sm text-neutral-400 space-y-1 list-disc list-inside">
            <li>All data stays on your computer. Nothing is sent to any server.</li>
            <li>The service only reads analog sensor values — it cannot see what you type.</li>
            <li>Keystroke content goes through the OS keyboard driver separately.</li>
            <li>No network traffic beyond <code className="text-neutral-300">localhost</code>.</li>
          </ul>
        </section>

        {/* Troubleshooting */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold">Troubleshooting</h2>
          <dl className="text-sm space-y-3">
            <dt className="text-neutral-200 font-medium">&ldquo;No Keychron K2 HE found&rdquo;</dt>
            <dd className="text-neutral-500 ml-4">Ensure USB wired mode. Try toggling the switch on the back.</dd>

            <dt className="text-neutral-200 font-medium">&ldquo;Access denied&rdquo;</dt>
            <dd className="text-neutral-500 ml-4">Close Keychron Launcher first (it holds exclusive access). On Linux, add a udev rule — see the README.</dd>

            <dt className="text-neutral-200 font-medium">Status stays red in NeuralKeys</dt>
            <dd className="text-neutral-500 ml-4">Make sure the companion is running and shows &ldquo;Connected&rdquo; in its terminal output.</dd>
          </dl>
        </section>

        {/* Supported keyboards */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold">Supported keyboards</h2>
          <p className="text-sm text-neutral-400">Currently supported:</p>
          <ul className="text-sm text-neutral-400 list-disc list-inside">
            <li>Keychron K2 HE (ANSI, ISO, JIS)</li>
          </ul>
          <p className="text-xs text-neutral-500 mt-2">
            Other Keychron HE boards (Q1 HE, K8 HE, etc.) may work but are untested.
            Any board using the same raw HID protocol (0xA9 commands) should be compatible.
          </p>
        </section>
      </div>
    </main>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="w-7 h-7 rounded-full bg-cyan-900/30 border border-cyan-700/30 flex items-center justify-center shrink-0">
        <span className="text-xs font-bold text-cyan-300">{number}</span>
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-neutral-200">{title}</h3>
        <div className="text-sm text-neutral-400">{children}</div>
      </div>
    </div>
  );
}
