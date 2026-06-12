-- Server-authoritative trial reset (replaces the former client-side reconcile).
-- When a user's lifetime tokens_used drops back below the trial cap (e.g. an admin sets it
-- low), revert a churned-trial 'limited' user to 'trial'. Running this in the DB means it
-- fires regardless of which client (if any) is online.
--
-- The `subscription_end IS NULL` guard preserves the churned-subscriber protection: a user
-- who has ever held a subscription is NOT resurrected to a fresh trial - they stay 'limited'.
-- (So a test user with a non-null subscription_end will intentionally NOT revert.)
--
-- NOTE: the 100 below must match TRIAL_TOKEN_LIMIT in src/lib/useConversionCount.ts.
-- The plan change propagates back to the app via the users-table Realtime subscription.

create or replace function public.reset_plan_on_low_tokens()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update public.users
  set plan = 'trial'
  where id = new.user_id
    and plan = 'limited'
    and subscription_end is null;
  return new;
end;
$$;

drop trigger if exists trg_reset_plan_on_low_tokens on public.conversion_counts;

create trigger trg_reset_plan_on_low_tokens
after update on public.conversion_counts
for each row
when (new.tokens_used < 100)
execute function public.reset_plan_on_low_tokens();
