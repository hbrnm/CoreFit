import { Play, Sparkles, Brain, Clock, Zap, Target, Plus } from 'lucide-react';
import { useApp } from '../../context';
import { useLive } from '../../hooks/useLive';
import { db } from '../../lib/db';
import { DOMAIN } from '../../lib/domains';
import { startSession } from '../../lib/workoutOps';
import { Panel } from '../../components/ui';

const D = DOMAIN.workouts;

export function StartPanel() {
  const { userId } = useApp();
  const { data: routines } = useLive(
    () =>
      db.routines
        .where('user_id')
        .equals(userId)
        .filter((r) => !r.deleted)
        .toArray(),
    [userId],
  );

  const begin = async (name: string, routineId: string | null) => {
    try {
      const routine = routineId ? (routines ?? []).find((r) => r.id === routineId) ?? null : null;
      await startSession(userId, name, routine);
    } catch {
      alert('Nu s-a putut porni antrenamentul.');
    }
  };

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-300">
      
      {/* AI Active Workout Card */}
      <Panel className="relative overflow-hidden border border-neon-mint/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-mint via-neon-cyan to-neon-mint" />
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-neon-mint/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-2 mb-3">
          <Brain size={20} className="text-neon-mint" />
          <h2 className="text-sm font-bold text-neon-mint uppercase tracking-wider">Antrenamentul de azi</h2>
        </div>

        <h3 className="text-2xl font-display font-bold text-white mb-2">Upper Body Power</h3>
        <p className="text-sm text-white/70 mb-4">Conceput de AI pentru forță maximală, bazat pe recuperarea ta de 88%.</p>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="flex flex-col gap-1 p-2 bg-white/5 rounded-xl border border-white/10">
            <Clock size={16} className="text-neon-cyan" />
            <span className="text-xs text-white/50">Timp Est.</span>
            <span className="text-sm font-semibold text-white">45 min</span>
          </div>
          <div className="flex flex-col gap-1 p-2 bg-white/5 rounded-xl border border-white/10">
            <Zap size={16} className="text-neon-orange" />
            <span className="text-xs text-white/50">Kcal Est.</span>
            <span className="text-sm font-semibold text-white">~320</span>
          </div>
          <div className="flex flex-col gap-1 p-2 bg-white/5 rounded-xl border border-white/10">
            <Target size={16} className="text-neon-crimson" />
            <span className="text-xs text-white/50">Echipament</span>
            <span className="text-sm font-semibold text-white">Ganteră, Bancă</span>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-neon-mint/10 rounded-xl border border-neon-mint/20 mb-5">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-neon-mint" />
            <span className="text-xs font-semibold text-neon-mint">AI Adaptive Intensity:</span>
          </div>
          <span className="text-sm font-bold text-white">+5% Volum azi</span>
        </div>

        <button 
          type="button" 
          className="btn-steel w-full h-12 shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2" 
          onClick={() => void begin('Upper Body Power (AI)', null)}
        >
          <Play size={20} className="fill-chalk" />
          <span className="text-lg">START WORKOUT</span>
        </button>
      </Panel>

      <div className="flex items-center gap-4 py-2">
        <div className="h-px bg-white/10 flex-1" />
        <span className="text-xs text-white/40 uppercase font-semibold">SAU ALEGE MANUAL</span>
        <div className="h-px bg-white/10 flex-1" />
      </div>

      <Panel edge={D.edge}>
        <button type="button" className={`btn w-full ${D.solid}`} onClick={() => void begin('Antrenament Liber', null)}>
          <Plus size={18} /> Antrenament Gol
        </button>
        <p className="mt-2 text-sm text-steel/60 text-center">Îți alegi tu exercițiile pe parcurs.</p>
      </Panel>
    </div>
  );
}
