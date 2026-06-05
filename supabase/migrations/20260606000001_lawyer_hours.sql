-- ============================================================================
-- Fast-ILA · Lawyer working-hours (diary-driven availability)
-- ============================================================================
-- Adds per-lawyer working hours + slot length so real bookable availability can
-- be generated (working hours − Google-calendar busy − existing bookings),
-- replacing the synthetic random slots. work_days uses JS getDay() numbering:
-- 0=Sun, 1=Mon … 6=Sat (default Mon–Fri). Additive; idempotent.
-- ============================================================================

alter table public.lawyers
  add column if not exists work_days      integer[] default '{1,2,3,4,5}',
  add column if not exists work_start     time      default '09:00',
  add column if not exists work_end       time      default '17:00',
  add column if not exists slot_minutes   integer   default 45,
  add column if not exists buffer_minutes integer   default 0;
