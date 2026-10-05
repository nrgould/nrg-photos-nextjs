-- Photos Nicholas marked for removal from preview (src/app/api/curate). Lightroom rejects them;
-- a mark whose src has left the manifest is done. RLS on with no policies, as for commerce.
create table photo_removals (
  src text primary key,
  marked_at timestamptz not null default now()
);
alter table photo_removals enable row level security;
