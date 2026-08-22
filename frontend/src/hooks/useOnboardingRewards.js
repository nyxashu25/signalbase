import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useGetOnboardingQuery, dashboardApi } from '../api/dashboardApi.js';
import { useToast } from '../components/ui/toast.jsx';

// Mounted once in AppLayout. The checklist endpoint pays out any newly
// earned reward as a side effect of being read (see
// onboardingService.getProgress), and tells us what it just paid in
// `justRewarded` — this turns that into "+5 credits" toasts and refreshes
// the credits pill. Deduped by key so a cached response re-rendering
// doesn't toast twice.
export function useOnboardingRewards() {
  const { data } = useGetOnboardingQuery();
  const toast = useToast();
  const dispatch = useDispatch();
  const seen = useRef(new Set());

  useEffect(() => {
    const rewards = data?.justRewarded ?? [];
    const fresh = rewards.filter((r) => !seen.current.has(r.key));
    if (fresh.length === 0) return;
    fresh.forEach((r) => seen.current.add(r.key));

    const total = fresh.reduce((sum, r) => sum + r.credits, 0);
    const isGroup = (r) => r.key.startsWith('group:');
    const groupHit = fresh.find(isGroup);
    const title = groupHit
      ? `+${total} credits · ${groupHit.label} complete`
      : fresh.length === 1
        ? `+${total} credits · ${fresh[0].label}`
        : `+${total} credits · ${fresh.length} tasks done`;
    toast.success(title, 'Getting-started reward added to your balance.', {
      action: 'View checklist',
      actionTo: '/app?view=getting-started',
    });
    dispatch(dashboardApi.util.invalidateTags(['BillingSummary']));
  }, [data, toast, dispatch]);

  return data;
}
