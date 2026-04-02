-- Enable RLS on presentations table (currently unused, localStorage is primary storage)
ALTER TABLE public.presentations ENABLE ROW LEVEL SECURITY;

-- Since there's no auth in the app, add a restrictive default:
-- No policies = no access via PostgREST (safe default)
-- When auth is implemented, add user-scoped policies