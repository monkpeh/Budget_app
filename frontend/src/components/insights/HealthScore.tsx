import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { cn } from '../../lib/utils';

interface ScoreComponent {
  name: string;
  score: number;
  weight: number;
  detail: string;
}

function ScoreRing({ score, grade }: { score: number; grade: string }) {
  const circumference = 2 * Math.PI * 40;
  const dash = (score / 100) * circumference;

  const color =
    score >= 80 ? '#10b981' :
    score >= 60 ? '#14b8a6' :
    score >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative w-28 h-28 flex-shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle
          cx="50" cy="50" r="40" fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-2xl font-bold text-white">{score}</span>
        <span className="text-xs text-white/40 font-medium">Grade {grade}</span>
      </div>
    </div>
  );
}

export function HealthScore() {
  const { data, isLoading } = useQuery({
    queryKey: ['health-score'],
    queryFn: () => api.get('/insights/health-score').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Financial Health Score</CardTitle></CardHeader>
        <div className="flex gap-6 items-center">
          <Skeleton className="w-28 h-28 rounded-full" />
          <div className="flex-1 space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        </div>
      </Card>
    );
  }

  const score: number = data?.score ?? 0;
  const grade: string = data?.grade ?? '—';
  const components: ScoreComponent[] = data?.components ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Health Score</CardTitle>
        <span className={cn(
          'text-xs font-semibold px-2 py-0.5 rounded-md',
          score >= 80 ? 'bg-positive/15 text-positive' :
          score >= 60 ? 'bg-accent-2/15 text-accent-2' :
          score >= 40 ? 'bg-warning/15 text-warning' : 'bg-negative/15 text-negative'
        )}>
          {score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Needs work'}
        </span>
      </CardHeader>
      <div className="flex gap-6 items-start">
        <ScoreRing score={score} grade={grade} />
        <div className="flex-1 space-y-2.5 min-w-0">
          {components.map(c => (
            <div key={c.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-white/60">{c.name}</span>
                <span className="text-xs font-mono text-white/50">{c.score}/100</span>
              </div>
              <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${c.score}%`,
                    backgroundColor: c.score >= 80 ? '#10b981' : c.score >= 60 ? '#14b8a6' : c.score >= 40 ? '#f59e0b' : '#ef4444',
                  }}
                />
              </div>
              <p className="text-[10px] text-white/30 mt-0.5">{c.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
