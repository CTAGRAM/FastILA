-- Fast-ILA seed data — mirrors data.jsx exactly so first run looks identical.

-- Services
insert into public.services (id, slug, name, short_name, price, price_net, price_vat, duration,
  badge, badge_style, min_notice_hours, attendee_count, requires_wet_sig, weekends, delivery, description, icon, sort_order)
values
  ('urgent',   'urgent-same-day',      'Urgent / Same-Day ILA Booking',     'Urgent / Same-Day',         175, 145.83, 29.17, 60, 'Fastest Service',  'lime',  2,  1, false, false, 'digital', 'Same-day certificate · Google Meet · digital delivery',          'bolt',  1),
  ('standard', 'ila-standard',         'ILA — Standard Appointment',        'ILA Standard',              145, 120.83, 24.17, 45, 'Most Popular',     'navy',  48, 1, false, false, 'digital', '45-minute Google Meet · digital certificate within 24h',         'doc',   2),
  ('couples',  'ila-couples',          'ILA for Couples / Joint Signatories','ILA for Couples',          250, 208.33, 41.67, 60, 'Best Value',       'cream', 48, 2, true,  false, 'postal',  'Both signatories · Google Meet · postage included',              'users', 3),
  ('wet',      'wet-signature-weekend','Wet Signature / Weekend',            'Wet Signature / Weekend',  200, 166.67, 33.33, 60, 'Includes Postage', 'navy',  48, 1, true,  true,  'postal',  'Google Meet · signed in ink · Royal Mail Special Delivery',      'stamp', 4)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  description = excluded.description,
  updated_at = now();

-- Lawyers
insert into public.lawyers (id, name, initials, sra, photo_bg, languages, services, rating, reviews, bio)
values
  ('amelia', 'Amelia Hart',    'AH', 'SRA 8214091', '#1f7497', '{English,French}',                        '{urgent,standard,couples}',     4.9, 312, '12 years in property finance ILA. Bridging, JBSP, complex personal guarantees.'),
  ('raj',    'Raj Patel',      'RP', 'SRA 6109823', '#0a4a67', '{English,Hindi,Gujarati}',                '{urgent,standard,couples,wet}', 4.9, 401, 'Specialist in joint signatory matters and secured lending.'),
  ('sofia',  'Sofia Martín',   'SM', 'SRA 7331205', '#115d7e', '{English,Spanish,Portuguese}',            '{standard,couples,wet}',        5.0, 188, 'Cross-border ILA, weekends, wet-signature dispatch.'),
  ('tom',    'Tom Whitfield',  'TW', 'SRA 5982017', '#042b3d', '{English}',                               '{standard,urgent}',             4.8, 226, 'Fast turnaround urgent ILA. Plain-English explainer.')
on conflict (id) do update set
  name = excluded.name,
  rating = excluded.rating,
  reviews = excluded.reviews,
  updated_at = now();

-- Matter types
insert into public.matter_types (id, name, short_name, description, sort_order) values
  ('personal-guarantee',   'Personal Guarantee',           'Personal Guarantee',     'Director or third-party guaranteeing a company facility', 1),
  ('occupiers-consent',    'Occupier''s Consent',          'Occupier''s Consent',    'Non-borrowing adult occupier postponing rights to a lender', 2),
  ('transfer-of-equity',   'Transfer of Equity',           'Transfer of Equity',     'Adding / removing a name on a property title', 3),
  ('disponer-certificate', 'Disponer Certificate',         'Disponer Certificate',   'Confirmation of independent advice on a transfer / disposition', 4),
  ('jbsp-mortgage',        'Joint Borrower Sole Proprietor','JBSP Mortgage',         'Co-borrower with no legal title (typically parent/child)', 5),
  ('bridging-loan',        'Bridging Loan',                'Bridging Loan',          'Short-term secured lending — usually with personal guarantee', 6),
  ('deed-of-subordination','Deed of Subordination',        'Deed of Subordination',  'Subordinating a director''s loan / charge behind a senior lender', 7)
on conflict (id) do nothing;

-- A handful of well-known UK lenders to seed the knowledge base
insert into public.lenders (name, category, accepts_digital, requires_wet, notes) values
  ('Shawbrook Bank',       'High-street SME',     true,  false, 'Accepts digital ILA certs in most cases'),
  ('Together Money',       'Specialist',          true,  false, 'Digital accepted'),
  ('Aldermore',            'High-street SME',     true,  false, ''),
  ('Funding Circle',       'SME platform',        true,  false, ''),
  ('Precise Mortgages',    'Specialist',          false, true,  'Wet-signature mandatory for personal guarantees'),
  ('United Trust Bank',    'Specialist',          false, true,  'Wet-signature only'),
  ('OakNorth Bank',        'Challenger',          true,  false, ''),
  ('Kensington Mortgages', 'Specialist',          true,  false, ''),
  ('Paragon Bank',         'Specialist',          true,  false, ''),
  ('Hampshire Trust Bank', 'Specialist',          false, true,  '')
on conflict do nothing;

-- AI prompts (admin curated)
insert into public.ai_prompts (id, label, prompt) values
  ('precall_brief',
   'Pre-call brief',
   'You are preparing a pre-call brief for an SRA-regulated independent legal advice (ILA) appointment. Read the uploaded matter documents and produce a 5-bullet brief covering: (1) the transaction in one sentence, (2) the specific instrument the client is being asked to sign, (3) the top three risks the lawyer must walk the client through, (4) any red flags around duress or capacity, (5) suggested questions for the lawyer to test understanding.'),
  ('assistant_dashboard',
   'Dashboard assistant',
   'You are the in-dashboard AI assistant for Fast-ILA, an SRA-regulated UK firm offering Independent Legal Advice. You see today''s bookings, completed appointments, and the current booking detail context. Answer concisely, in British English. Never invent facts about a booking — ask if unsure.')
on conflict (id) do nothing;

-- Templates
insert into public.templates (id, channel, subject, body) values
  ('booking_confirmation_email', 'email',
   'Your Fast-ILA appointment is booked — {{ref}}',
   E'Hello {{client_name}},\n\nYour Independent Legal Advice appointment is confirmed.\n\nReference: {{ref}}\nService: {{service_name}}\nDate: {{date}}\nTime: {{time}} Europe/London\nLawyer: {{lawyer_name}}\nFee: £{{amount}}\n\nNext, open your client portal: {{portal_url}}\n\nThanks,\nFast-ILA · Nexa Law Ltd'),
  ('reminder_24h_email', 'email',
   'Reminder · your Fast-ILA call tomorrow ({{ref}})',
   E'Hi {{client_name}},\n\nFriendly reminder that your ILA Google Meet is tomorrow at {{time}}.\n\nMeet link: {{meet_link}}\n\nPlease have your ID to hand.\n\nFast-ILA · Nexa Law Ltd'),
  ('care_letter_signed_email', 'email',
   'Care letter signed — what''s next',
   E'Hi {{client_name}},\n\nThanks — we''ve recorded your signed client care letter.\n\nNext steps in your portal: upload ID, pay by bank transfer, upload matter documents.\n\n{{portal_url}}\n\nFast-ILA')
on conflict (id) do nothing;
