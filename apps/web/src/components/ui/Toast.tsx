'use client';

interface ToastProps {
  type: 'success' | 'error' | 'info';
  message: string;
  onClose: () => void;
}

export function Toast({ type, message, onClose }: ToastProps) {
  const config = {
    success: { bg: 'bg-green-500/10 border-green-500/30', text: 'text-green-400', icon: '✓' },
    error: { bg: 'bg-red-500/10 border-red-500/30', text: 'text-red-400', icon: '✕' },
    info: { bg: 'bg-blue-500/10 border-blue-500/30', text: 'text-blue-400', icon: 'ℹ' },
  };
  const c = config[type];

  return (
    <div className={`fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-4 py-3 rounded-lg border ${c.bg} animate-fade-in shadow-xl max-w-sm`}>
      <span className={`${c.text} font-bold text-lg`}>{c.icon}</span>
      <p className={`text-sm ${c.text}`}>{message}</p>
      <button onClick={onClose} className="ml-2 text-gray-500 hover:text-gray-300 transition">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </button>
    </div>
  );
}
