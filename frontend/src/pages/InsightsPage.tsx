import { HealthScore } from '../components/insights/HealthScore';
import { SpendingInsights } from '../components/insights/SpendingInsights';
import { NetWorthProjection } from '../components/insights/NetWorthProjection';
import { CashFlowForecast } from '../components/insights/CashFlowForecast';

export function InsightsPage() {
  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold">Insights</h1>
        <p className="text-sm text-white/40 mt-0.5">AI-powered analysis of your finances</p>
      </div>

      {/* Health score full width */}
      <HealthScore />

      {/* Insights + Forecast */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SpendingInsights />
        <CashFlowForecast />
      </div>

      {/* Projection full width */}
      <NetWorthProjection />
    </div>
  );
}
