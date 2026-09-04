ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS attachment_type text,
  ADD COLUMN IF NOT EXISTS attachment_size integer;

ALTER TABLE public.messages ADD CONSTRAINT messages_content_or_attachment
  CHECK (length(trim(content)) > 0 OR attachment_url IS NOT NULL);

-- Files are stored as <conversation_id>/<sender_id>/<file>. Participants of the conversation can read.
CREATE POLICY message_files_participant_read ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'message-files'
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid())
  )
);

CREATE POLICY message_files_participant_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'message-files'
  AND (storage.foldername(name))[2] = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid())
  )
);

CREATE POLICY message_files_owner_delete ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'message-files' AND (storage.foldername(name))[2] = auth.uid()::text);