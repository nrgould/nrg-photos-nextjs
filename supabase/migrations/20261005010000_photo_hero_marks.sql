-- Hero marks join the removal list: both are requests Nicholas carries out in Lightroom.
-- Existing rows stay removal marks.
alter table photo_removals
  add column mark text not null default 'remove' check (mark in ('remove', 'hero'));
alter table photo_removals drop constraint photo_removals_pkey;
alter table photo_removals add primary key (src, mark);
