import Link from "next/link";
import { ArrowRight, Shield, Zap, Monitor, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-black text-white selection:bg-purple-500/30">
      {/* Navigation */}
      <header className="fixed top-0 w-full z-50 bg-black/50 backdrop-blur-lg border-b border-white/10">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
              <Activity className="size-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">LectureSense</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/sign-in"
              className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/sign-up"
              className="bg-white text-black px-4 py-2 rounded-full text-sm font-bold hover:bg-gray-200 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col justify-center pt-20">
        <section className="relative py-20 lg:py-32 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-[25%] -right-[10%] w-[50%] h-[50%] bg-purple-500/20 blur-[120px] rounded-full" />
            <div className="absolute top-[20%] -left-[10%] w-[40%] h-[40%] bg-blue-500/20 blur-[120px] rounded-full" />
          </div>

          <div className="container mx-auto px-6 relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-8 animate-fade-in-up">
              <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-medium text-gray-300">Live Focus Tracking System</span>
            </div>

            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent max-w-4xl mx-auto">
              The End of the <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">Black Box Classroom</span>
            </h1>

            <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Empower teachers with real-time insights. See who is paying attention,
              control quizzes with your voice, and eliminate distractions without invasive cameras.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/sign-up"
                className="group relative px-8 py-4 bg-white text-black rounded-full font-bold text-lg flex items-center gap-2 hover:bg-gray-200 transition-all"
              >
                Start Teaching Now
                <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/sign-in"
                className="px-8 py-4 rounded-full font-medium text-lg text-white border border-white/20 hover:bg-white/10 transition-colors"
              >
                Join as Student
              </Link>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="py-20 bg-white/5 border-t border-white/10">
          <div className="container mx-auto px-6">
            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard
                icon={<Monitor className="size-6 text-blue-400" />}
                title="Smart Proctoring"
                description="Non-intrusive focus tracking using browser telemetry. Know when students switch tabs instantly."
              />
              <FeatureCard
                icon={<Zap className="size-6 text-yellow-400" />}
                title="Voice Command"
                description="Control your class with your voice. Say 'Topic Finished' to trigger quizzes automatically."
              />
              <FeatureCard
                icon={<Shield className="size-6 text-purple-400" />}
                title="Privacy First"
                description="No always-on cameras required. We track engagement, not faces, respecting student privacy."
              />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-white/10 text-center text-gray-500 text-sm">
        <p>© 2025 LectureSense. Built for the Future of Education.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
      <div className="mb-4 p-3 rounded-xl bg-white/5 w-fit border border-white/5">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
}
