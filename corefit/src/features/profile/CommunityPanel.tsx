import { Trophy, Medal, ArrowUp, Star } from 'lucide-react';
import { Panel } from '../../components/ui';

export function CommunityPanel() {
  const leaderboard = [
    { name: 'Alex M.', points: 1450, change: '+120', rank: 1 },
    { name: 'Sarah J.', points: 1200, change: '+80', rank: 2 },
    { name: 'Campionule', points: 950, change: '+150', rank: 3 },
    { name: 'Mike T.', points: 840, change: '-20', rank: 4 },
  ];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-3 mb-2">
        <Trophy size={28} className="text-neon-orange" />
        <div>
          <h2 className="text-xl font-display font-bold text-white">Community Leaderboard</h2>
          <p className="text-sm text-white/60">Concurează cu prietenii și câștigă puncte AI.</p>
        </div>
      </div>

      <Panel className="p-0 overflow-hidden">
        <div className="divide-y divide-white/10">
          {leaderboard.map((user) => (
            <div key={user.name} className={`flex items-center justify-between p-4 ${user.name === 'Campionule' ? 'bg-neon-mint/10' : ''}`}>
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 border border-white/10 text-lg font-bold font-display text-white">
                  {user.rank === 1 ? <Medal className="text-yellow-400" size={20} /> : user.rank}
                </div>
                <div className="flex flex-col">
                  <span className={`font-semibold ${user.name === 'Campionule' ? 'text-neon-mint' : 'text-white'}`}>{user.name}</span>
                  <span className="text-xs text-white/50 flex items-center gap-1">
                    <Star size={12} className="text-neon-orange" /> {user.points} pts
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-sm font-medium">
                {user.change.startsWith('+') ? (
                  <ArrowUp size={14} className="text-neon-mint" />
                ) : (
                  <span className="w-3.5" />
                )}
                <span className={user.change.startsWith('+') ? 'text-neon-mint' : 'text-white/40'}>
                  {user.change}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
