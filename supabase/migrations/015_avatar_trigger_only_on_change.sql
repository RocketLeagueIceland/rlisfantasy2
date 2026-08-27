-- Only fire the avatar sync when the metadata actually changed.
-- Postgres fires "UPDATE OF col" triggers whenever the column appears in the
-- UPDATE statement even if the value is identical, and GoTrue rewrites
-- raw_user_meta_data on many logins/refreshes - so migration 014's trigger
-- was adding a public.users write (and lock coupling) to a large share of
-- auth traffic. The WHEN clause limits it to genuine metadata changes.
CREATE OR REPLACE TRIGGER on_auth_user_updated
  AFTER UPDATE OF raw_user_meta_data ON auth.users
  FOR EACH ROW
  WHEN (OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data)
  EXECUTE FUNCTION handle_user_metadata_update();
