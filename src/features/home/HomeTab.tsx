import { Activity, Droplet, Heart, Moon, Play, Sparkles, User, Zap } from 'lucide-react';
import { useApp } from '../../context';
import { Panel } from '../../components/ui';
import { PLATE } from '../../lib/domains';
import { Bar } from '../nutrition/components/Bar';
import { useLive } from '../../hooks/useLive';
import { db } from '../../lib/db';
import { useToday } from '../../hooks/useToday';

export function HomeTab() {
  const { userId, profile, goTo } = useApp();
  const today = useToday();

  // Fetch some real data if we want (e.g., water)
  const { data: dayRow } = useLive(() => db.nutritionLogs.get([userId, today]), [userId, today]);
  const water = dayRow?.water_ml ?? 0;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neon-mint/10 border border-neon-mint/30">
            <User size={24} className="text-neon-mint" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-white">Salut, {profile?.full_name?.split(' ')[0] || 'Campionule'}!</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-mint opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-mint"></span>
              </span>
              <span className="text-xs text-neon-mint font-semibold uppercase tracking-wider">AI Status: Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Widget - Daily Activity Overview */}
      <Panel className="relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-neon-orange/20 rounded-full blur-3xl pointer-events-none" />
        
        <h2 className="text-sm font-semibold text-white/80 mb-4 flex items-center gap-2">
          <Zap size={16} className="text-neon-orange" /> Activitate Zilnică
        </h2>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-end">
              <span className="text-xs text-white/50 uppercase">Pași</span>
              <span className="text-xs text-white/80">8.4k / 10k</span>
            </div>
            <Bar value={8400} target={10000} color={PLATE.yellow} />
          </div>
          
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-end">
              <span className="text-xs text-white/50 uppercase">Kcal</span>
              <span className="text-xs text-white/80">450 / 600</span>
            </div>
            <Bar value={450} target={600} color={PLATE.red} />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-end">
              <span className="text-xs text-white/50 uppercase">Minute</span>
              <span className="text-xs text-white/80">45 / 60</span>
            </div>
            <Bar value={45} target={60} color={PLATE.blue} />
          </div>
        </div>
      </Panel>

      {/* Section - AI Recommendation Banner */}
      <div className="relative rounded-2xl p-px bg-gradient-to-r from-neon-mint via-neon-cyan to-neon-mint/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
        <div className="bg-panel/90 backdrop-blur-xl rounded-[15px] p-5">
          <div className="flex items-start gap-3">
            <div className="mt-1">
              <Sparkles className="text-neon-mint" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-neon-mint uppercase tracking-wider mb-1">AI Coach Recommends</h3>
              <p className="text-sm text-white/80 leading-relaxed mb-4">
                Astăzi ai recuperare activă! Încearcă 20 min de Yoga & Mobility pe baza somnului tău de azi-noapte.
              </p>
              <button className="btn-steel w-full h-10 text-sm" onClick={() => goTo('workouts')}>
                <Play size={16} /> Start Workout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid - Health & Metrics Cards */}
      <div className="grid grid-cols-2 gap-4">
        <button className="panel p-4 flex flex-col text-left transition-all active:scale-95 border-l-4 border-l-neon-cyan" onClick={() => goTo('health')}>
          <div className="flex items-center gap-2 mb-2">
            <Moon size={18} className="text-neon-cyan" />
            <span className="text-sm font-semibold text-white/70">Somn</span>
          </div>
          <p className="num text-2xl text-white">7h 45m</p>
          <p className="text-xs text-neon-cyan mt-1">Quality 88%</p>
        </button>
        
        <button className="panel p-4 flex flex-col text-left transition-all active:scale-95 border-l-4 border-l-neon-crimson" onClick={() => goTo('health')}>
          <div className="flex items-center gap-2 mb-2">
            <Heart size={18} className="text-neon-crimson" />
            <span className="text-sm font-semibold text-white/70">Ritm Cardiac</span>
          </div>
          <p className="num text-2xl text-white">68 BPM</p>
          <p className="text-xs text-neon-crimson mt-1">Repaus (Media)</p>
        </button>

        <button className="panel p-4 flex flex-col text-left transition-all active:scale-95 border-l-4 border-l-plate-blue" onClick={() => goTo('nutrition')}>
          <div className="flex items-center gap-2 mb-2">
            <Droplet size={18} className="text-plate-blue" />
            <span className="text-sm font-semibold text-white/70">Hidratare</span>
          </div>
          <p className="num text-2xl text-white">{water} ml</p>
          <p className="text-xs text-plate-blue mt-1">+250ml Quick Add</p>
        </button>
        
        <button className="panel p-4 flex flex-col text-left transition-all active:scale-95 border-l-4 border-l-plate-green" onClick={() => goTo('health')}>
          <div className="flex items-center gap-2 mb-2">
            <Activity size={18} className="text-plate-green" />
            <span className="text-sm font-semibold text-white/70">Stres</span>
          </div>
          <p className="num text-2xl text-white">Nivel 2</p>
          <p className="text-xs text-plate-green mt-1">Stare Optimă</p>
        </button>
      </div>

      {/* Progress Graph (Placeholder) */}
      <Panel title="Evoluție (30 zile)">
        <div className="h-32 w-full mt-2 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden relative">
           {/* Mock line graph using SVG or just a placeholder */}
           <svg viewBox="0 0 100 40" className="w-full h-full stroke-neon-mint fill-none" preserveAspectRatio="none">
             <path d="M0,40 L10,35 L20,38 L30,25 L40,28 L50,15 L60,18 L70,10 L80,12 L90,5 L100,2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
             <path d="M0,40 L10,35 L20,38 L30,25 L40,28 L50,15 L60,18 L70,10 L80,12 L90,5 L100,2 L100,40 L0,40 Z" className="fill-neon-mint/10 stroke-none" />
           </svg>
           <div className="absolute inset-0 bg-gradient-to-t from-panel/80 to-transparent" />
        </div>
      </Panel>
    </div>
  );
}
