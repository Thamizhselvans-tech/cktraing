import { GraduationCap } from 'lucide-react';

export default function Loader({ fullPage = true }) {
  const content = (
    <div className="flex flex-col items-center gap-4">
      <div className="relative flex items-center justify-center">
        {/* Outer Ring */}
        <div className="w-16 h-16 rounded-full border-4 border-primary-500/20 border-t-primary-500 animate-spin" />
        {/* Logo in center */}
        <div className="absolute w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-glow-blue animate-pulse-slow">
          <GraduationCap size={20} className="text-white" />
        </div>
      </div>
      <p className="text-gray-400 text-sm font-semibold tracking-wider font-display animate-pulse">
        TMS Loading...
      </p>
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-dark-900">
        {content}
      </div>
    );
  }

  return (
    <div className="w-full flex items-center justify-center py-12">
      {content}
    </div>
  );
}
