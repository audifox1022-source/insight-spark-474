
CREATE TABLE public.visitor_stats (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  visited_at timestamptz DEFAULT now() NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text NOT NULL
);

CREATE INDEX idx_visitor_stats_visited_at ON public.visitor_stats(visited_at);
CREATE INDEX idx_visitor_stats_user_id ON public.visitor_stats(user_id);
CREATE INDEX idx_visitor_stats_session_id ON public.visitor_stats(session_id);

ALTER TABLE public.visitor_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert visitor stats"
ON public.visitor_stats FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view own visits"
ON public.visitor_stats FOR SELECT
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.get_visitor_stats()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'total_visits',  (SELECT COUNT(*) FROM visitor_stats),
    'unique_users',  (SELECT COUNT(DISTINCT user_id) FROM visitor_stats WHERE user_id IS NOT NULL),
    'today_visits',  (SELECT COUNT(*) FROM visitor_stats WHERE visited_at >= CURRENT_DATE),
    'today_unique',  (SELECT COUNT(DISTINCT user_id) FROM visitor_stats WHERE visited_at >= CURRENT_DATE AND user_id IS NOT NULL)
  );
$$;
