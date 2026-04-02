
-- Add user_id to presentations table
ALTER TABLE public.presentations 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX idx_presentations_user_id ON public.presentations(user_id);

-- RLS policies for presentations (owner-scoped)
CREATE POLICY "Users can view own presentations"
ON public.presentations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own presentations"
ON public.presentations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own presentations"
ON public.presentations FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own presentations"
ON public.presentations FOR DELETE
USING (auth.uid() = user_id);

-- Fix storage policies: require authentication
DROP POLICY IF EXISTS "Anyone can upload slide images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete slide images" ON storage.objects;

CREATE POLICY "Authenticated users can upload slide images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'slide-images' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can delete their slide images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'slide-images' AND
  auth.uid() IS NOT NULL
);
