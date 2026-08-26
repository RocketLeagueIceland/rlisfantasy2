-- Keep users.avatar_url in sync with Discord.
-- handle_new_user() copies the avatar once at signup and never again, so
-- changing your Discord photo invalidates the stored CDN URL and the app
-- falls back to the letter avatar. Auth refreshes raw_user_meta_data on each
-- OAuth login; mirror that into public.users when it changes.

CREATE OR REPLACE FUNCTION handle_user_metadata_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET avatar_url = COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture',
    avatar_url
  )
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_updated
  AFTER UPDATE OF raw_user_meta_data ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_user_metadata_update();

-- One-time backfill from the freshest auth metadata we have
UPDATE public.users u
SET avatar_url = COALESCE(
  au.raw_user_meta_data->>'avatar_url',
  au.raw_user_meta_data->>'picture',
  u.avatar_url
)
FROM auth.users au
WHERE au.id = u.id;
