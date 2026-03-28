import { useStore } from '../../store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef } from 'react';

/**
 * RecoveryToast — Animated notification that appears when an incident is resolved.
 * Auto-dismisses after 10 seconds.
 */
export default function RecoveryToast() {
    const toast = useStore((s) => s.recoveryToast);
    const setRecoveryToast = useStore((s) => s.setRecoveryToast);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Auto-dismiss after 10 seconds
    useEffect(() => {
        if (toast) {
            timerRef.current = setTimeout(() => {
                setRecoveryToast(null);
            }, 10000);
            return () => {
                if (timerRef.current) clearTimeout(timerRef.current);
            };
        }
    }, [toast, setRecoveryToast]);

    return (
        <AnimatePresence>
            {toast && (
                <motion.div
                    initial={{ y: -60, opacity: 0, scale: 0.95 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: -60, opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-6 py-3 rounded-lg border shadow-2xl"
                    style={{
                        backgroundColor: 'rgba(22, 163, 98, 0.12)',
                        borderColor: '#22C55E',
                        backdropFilter: 'blur(12px)',
                    }}
                >
                    {/* Green checkmark icon */}
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(22, 163, 98, 0.2)' }}>
                        <span className="text-[16px]" style={{ color: '#22C55E' }}>✓</span>
                    </div>

                    {/* Message */}
                    <div className="flex flex-col">
                        <span className="font-sora text-[13px] font-semibold" style={{ color: '#22C55E' }}>
                            Incident Resolved
                        </span>
                        <span className="font-mono text-[11px] text-muted">
                            {toast.message}
                        </span>
                    </div>

                    {/* Dismiss button */}
                    <button
                        onClick={() => setRecoveryToast(null)}
                        className="ml-4 font-mono text-[11px] text-muted hover:text-primary transition-colors"
                    >
                        ✕
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
