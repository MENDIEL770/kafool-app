-- Campaign style: 'hierarchical' (master campaign → branches with coordinators)
-- or 'flat' (single campaign, the manager does everything, no coordinators).
-- Chosen when the campaign is created; the super-admin can change it later.
alter table kp_campaigns
  add column if not exists style text not null default 'hierarchical'
  check (style in ('hierarchical','flat'));
