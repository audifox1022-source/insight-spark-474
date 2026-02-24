-- Create storage bucket for slide images
INSERT INTO storage.buckets (id, name, public)
VALUES ('slide-images', 'slide-images', true);

-- Allow anyone to view slide images (public bucket)
CREATE POLICY "Slide images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'slide-images');

-- Allow anyone to upload slide images (no auth required for this app)
CREATE POLICY "Anyone can upload slide images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'slide-images');

-- Allow anyone to delete slide images
CREATE POLICY "Anyone can delete slide images"
ON storage.objects FOR DELETE
USING (bucket_id = 'slide-images');
