-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  DATABASE SNAPSHOT — NEOSOLAR CRM                                          ║
-- ║  Stand: 2026-05-06 ~21:00 UTC (~23:00 Schweiz)                             ║
-- ║                                                                            ║
-- ║  Dieser Dump enthaelt die KRITISCHEN Stammdaten + Konfiguration:           ║
-- ║   - users (mit password-hash)                                              ║
-- ║   - personnel                                                              ║
-- ║   - tags                                                                   ║
-- ║   - settings (feature_flags, doc_templates, role_defaults, branding etc.)  ║
-- ║   - project_construction (Baustellen-Workflow, 37 Zeilen)                  ║
-- ║   - project_calculation (Finanzen, 10 Zeilen)                              ║
-- ║                                                                            ║
-- ║  GROSSE TABELLEN (nicht im Dump — auf Supabase Daily Backup verlassen):    ║
-- ║   - leads (130'897), contacts (131'145), lead_tags (131'090)               ║
-- ║   - appointments (230), deals (123), tasks (40)                            ║
-- ║   - documents (345), activities (4'610), call_logs (7'027)                 ║
-- ║   - notifications (1'550)                                                  ║
-- ║                                                                            ║
-- ║  WIEDERHERSTELLEN:                                                         ║
-- ║   1. Falls Schema fehlt: Migrations erneut anwenden (siehe Repo)           ║
-- ║   2. Diese Datei via Supabase SQL-Editor ausfuehren                        ║
-- ║                                                                            ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

-- ============================================================================
-- USERS (11 Zeilen)
-- ============================================================================

INSERT INTO users (id, first_name, last_name, email, username, password, phone, role, is_active, allowed_modules, created_at) VALUES ('u006', 'Marcel', 'Steiert', 'marcel.steiert@neosolar.ch', 'marcel', '$2b$10$PKOKVCjHmUzDtZ0NNB7G8.lFC7.oZwLwMm4XBZnohvigeHWxGuTQ.', '', 'ADMIN', true, '{dashboard,leads,appointments,deals,provision,projects,admin,documents,passwords,export,canViewAllLeads,canViewAllAppointments,canViewAllDeals,canViewAllProjects,canViewAllTasks,personal,baustellen,kalkulation}'::jsonb, '2026-03-07 15:34:25.823829+00') ON CONFLICT (id) DO UPDATE SET first_name=EXCLUDED.first_name, last_name=EXCLUDED.last_name, email=EXCLUDED.email, role=EXCLUDED.role, allowed_modules=EXCLUDED.allowed_modules;
INSERT INTO users (id, first_name, last_name, email, username, password, phone, role, is_active, allowed_modules, created_at) VALUES ('10f8248c-940e-4d0b-a670-f5494d78328a', 'Roberto', 'Reho', 'roberto.reho@neosolar.ch', NULL, '$2b$10$q/e8oi2h6LxHfVqryh1ByenCdGMOQuwpGUfy9F12FIPlSSmDrBU0q', '', 'GL', true, '{dashboard,leads,appointments,deals,provision,projects,tasks,admin,communication,documents,passwords,export,personal,baustellen,kalkulation}'::jsonb, '2026-03-07 22:38:28.923818+00') ON CONFLICT (id) DO UPDATE SET first_name=EXCLUDED.first_name, last_name=EXCLUDED.last_name, email=EXCLUDED.email, role=EXCLUDED.role, allowed_modules=EXCLUDED.allowed_modules;
INSERT INTO users (id, first_name, last_name, email, username, password, phone, role, is_active, allowed_modules, created_at) VALUES ('7cdc21a4-b68f-4501-bd02-26c43a0ced6a', 'Sergej', 'Solar-EK', 'info@solar-ek.ch', 'sergej', '$2b$10$0N07AUH9atC.FAZVSoEuZeAJ1z5eg4Q3y050k2ugtZTNRigVrP5Cq', '+41766040025', 'SUBUNTERNEHMEN', true, '{projects,tasks,documents,passwords}'::jsonb, '2026-03-08 09:35:21.508489+00') ON CONFLICT (id) DO UPDATE SET first_name=EXCLUDED.first_name, last_name=EXCLUDED.last_name, email=EXCLUDED.email, role=EXCLUDED.role, allowed_modules=EXCLUDED.allowed_modules;
INSERT INTO users (id, first_name, last_name, email, username, password, phone, role, is_active, allowed_modules, created_at) VALUES ('5a4f0dfb-eb39-46f3-82f4-bf74c5409b96', 'Andreas', 'Böhler', 'andreas.boehler@neosolar.ch', 'andreas', '$2b$10$IF3BoVAyXpWv6Yk/uiLHmeBzg2ZIEsN9.HY4MnZHsetWieRelTYkG', '', 'VERTRIEB', true, '{dashboard,appointments,deals,tasks,communication,documents,passwords,canViewAllAppointments,canViewAllDeals,canViewAllProjects,canViewAllTasks,canEdit,canAssign,leads,canViewAllLeads,richtofferten,projects}'::jsonb, '2026-03-19 08:12:55.837332+00') ON CONFLICT (id) DO UPDATE SET first_name=EXCLUDED.first_name, last_name=EXCLUDED.last_name, email=EXCLUDED.email, role=EXCLUDED.role, allowed_modules=EXCLUDED.allowed_modules;
INSERT INTO users (id, first_name, last_name, email, username, password, phone, role, is_active, allowed_modules, created_at) VALUES ('772f6baf-e03b-451e-973e-27b1e89c7052', 'Ivana', 'Smakaus', 'ivana.smakaus@neosolar.ch', 'ivana', '$2b$10$o4IXyGYQhBY5yZpVNpZeU.iovqD.BeDc0/KNmmn448Rl/Djm5VHAq', '+41 71 544 91 00', 'PROJEKTLEITUNG', false, '{dashboard,projects,tasks,appointments,documents,passwords,canViewAllAppointments,canViewAllDeals,deals,calendar,canViewAllProjects,canViewAllTasks,canViewAllLeads,baustellen}'::jsonb, '2026-03-24 07:37:02.996084+00') ON CONFLICT (id) DO UPDATE SET first_name=EXCLUDED.first_name, last_name=EXCLUDED.last_name, email=EXCLUDED.email, role=EXCLUDED.role, allowed_modules=EXCLUDED.allowed_modules;
INSERT INTO users (id, first_name, last_name, email, username, password, phone, role, is_active, allowed_modules, created_at) VALUES ('380c9cbd-3cb4-4069-9989-95e22e12999f', 'Bahar', 'Özdem', 'bahar@neosolar.ch', NULL, '$2b$10$qd/mttp/WwhP2IR0c7ZksOqB13qjDlYx4Ud6pLPQv4sBRR6PkVV7u', '', 'SETTER', true, '{dashboard,leads,appointments,kaltakquise,passwords,tasks,documents,canViewAllLeads,canViewAllAppointments,canViewAllDeals,canViewAllTasks,canEdit,canAssign,callcenter,richtofferten,noshow}'::jsonb, '2026-03-25 09:25:28.492631+00') ON CONFLICT (id) DO UPDATE SET first_name=EXCLUDED.first_name, last_name=EXCLUDED.last_name, email=EXCLUDED.email, role=EXCLUDED.role, allowed_modules=EXCLUDED.allowed_modules;
INSERT INTO users (id, first_name, last_name, email, username, password, phone, role, is_active, allowed_modules, created_at) VALUES ('c8ddceed-96be-4057-8e2c-bf9344529233', 'Deniz', 'Algan', 'deniz@neosolar.ch', 'deniz', '$2b$10$.BjSp66vANSgBY6LYzy3m.ihOWji6TomlPu7c7ay1tkJcWF8NuUhS', '', 'SETTER', true, '{dashboard,appointments,passwords,canViewAllLeads,leads,kaltakquise,noshow}'::jsonb, '2026-03-25 09:27:39.562683+00') ON CONFLICT (id) DO UPDATE SET first_name=EXCLUDED.first_name, last_name=EXCLUDED.last_name, email=EXCLUDED.email, role=EXCLUDED.role, allowed_modules=EXCLUDED.allowed_modules;
INSERT INTO users (id, first_name, last_name, email, username, password, phone, role, is_active, allowed_modules, created_at) VALUES ('0e4c825b-e259-4949-96ad-641d73d1fd57', 'Tanja', 'Weber', 'tanja.weber@neosolar.ch', 'tanja.weber', '$2b$10$/354uqN7et6XUjEYOnjpieo3ummu0IqgoFH5ZmT2qcaB9bobYSPCu', '', 'CLOSER', true, '{dashboard,appointments,documents,passwords,kaltakquise,canViewAllLeads,noshow}'::jsonb, '2026-03-25 09:28:23.297464+00') ON CONFLICT (id) DO UPDATE SET first_name=EXCLUDED.first_name, last_name=EXCLUDED.last_name, email=EXCLUDED.email, role=EXCLUDED.role, allowed_modules=EXCLUDED.allowed_modules;
INSERT INTO users (id, first_name, last_name, email, username, password, phone, role, is_active, allowed_modules, created_at) VALUES ('d77f0a56-102d-4f2a-ae46-7568c279ea84', 'Eileen', 'Möwe', 'eileen.moewe@neosolar.ch', 'eileen', '$2b$10$pIXRr3tADPF1xCbyRoF/OeaqFdURWXPeRHzyotGvn2kREaoRdP4RO', '+41  71 544 91 01', 'VERTRIEB', true, '{dashboard,leads,appointments,deals,tasks,communication,documents,passwords,kaltakquise,richtofferten}'::jsonb, '2026-04-20 10:45:29.283957+00') ON CONFLICT (id) DO UPDATE SET first_name=EXCLUDED.first_name, last_name=EXCLUDED.last_name, email=EXCLUDED.email, role=EXCLUDED.role, allowed_modules=EXCLUDED.allowed_modules;
INSERT INTO users (id, first_name, last_name, email, username, password, phone, role, is_active, allowed_modules, created_at) VALUES ('93d8b7c7-6626-427f-bb62-46ac5cf3a8e0', 'Irmak', 'Kahraman', 'irmak.kahraman@neosolar.ch', 'irmak', '$2b$10$Y2zHB6TsRbIJpLdCLis3Eufb8OLnWX7WY7/uXD75QzyLQbvkFKcBy', '', 'PROJEKTLEITUNG', true, '{dashboard,projects,tasks,appointments,documents,passwords,canViewAllProjects,canViewAllDeals,baustellen}'::jsonb, '2026-04-29 06:54:15.599879+00') ON CONFLICT (id) DO UPDATE SET first_name=EXCLUDED.first_name, last_name=EXCLUDED.last_name, email=EXCLUDED.email, role=EXCLUDED.role, allowed_modules=EXCLUDED.allowed_modules;
INSERT INTO users (id, first_name, last_name, email, username, password, phone, role, is_active, allowed_modules, created_at) VALUES ('e3d2e915-5f89-4eae-80bd-f6ad7eec6e1b', 'Jon', 'Turnes', 'jon.turnes@neosolar.ch', 'jonturnes', '$2b$10$C3EC/f1hcIU3yHTyCcDR9ON0Oi5hEzUr.D3cf446S7YWQs5O4cOHK', '', 'GL', true, '{dashboard,leads,appointments,deals,projects,tasks,admin,documents,passwords,export,canViewAllAppointments,canViewAllDeals,canViewAllLeads,canViewAllProjects,canViewAllTasks,canEdit,canAssign,provision,callcenter,personal,baustellen,kalkulation}'::jsonb, '2026-05-05 07:58:14.805619+00') ON CONFLICT (id) DO UPDATE SET first_name=EXCLUDED.first_name, last_name=EXCLUDED.last_name, email=EXCLUDED.email, role=EXCLUDED.role, allowed_modules=EXCLUDED.allowed_modules;

-- ============================================================================
-- PERSONNEL (1 Zeile)
-- ============================================================================

INSERT INTO personnel (id, first_name, last_name, email, phone, start_date, contract_type, workload_pct, position) VALUES ('d692da09-692c-4ed8-ae60-2fd132638e1f', 'Jon', 'Turnes', 'jon.turnes@neosolar.ch', NULL, '2026-05-01', 'VOLLZEIT', 100, 'CEO') ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- TAGS (9 Zeilen)
-- ============================================================================

INSERT INTO tags (id, name, color) VALUES ('7ef3139c-e189-40a6-bc5e-54e0dc9f56ee', 'Abtelefonieren Tag 3', '#A78BFA') ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, color=EXCLUDED.color;
INSERT INTO tags (id, name, color) VALUES ('ka-heiss', 'Heisse Leads', '#F87171') ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, color=EXCLUDED.color;
INSERT INTO tags (id, name, color) VALUES ('f5a9f35b-acc5-4602-b359-aca89165da01', 'Abtelefonieren Tag 2', '#A78BFA') ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, color=EXCLUDED.color;
INSERT INTO tags (id, name, color) VALUES ('1ff9b6a0-c38c-4542-b33c-46c5d494f9f1', 'Abtelefonieren Tag1', '#FB923C') ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, color=EXCLUDED.color;
INSERT INTO tags (id, name, color) VALUES ('2eb3c7de-f17d-4641-889d-2471130a349c', 'Email gesendet', '#60A5FA') ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, color=EXCLUDED.color;
INSERT INTO tags (id, name, color) VALUES ('00457c0e-240c-4114-9737-e391c19cf917', 'nicht mehr kontaktieren!!!', '#F87171') ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, color=EXCLUDED.color;
INSERT INTO tags (id, name, color) VALUES ('ka-b2c', 'B2C Privat', '#34D399') ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, color=EXCLUDED.color;
INSERT INTO tags (id, name, color) VALUES ('ka-b2b', 'B2B Firmen', '#60A5FA') ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, color=EXCLUDED.color;
INSERT INTO tags (id, name, color) VALUES ('ka-solar', 'Solaranfragen', '#F59E0B') ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, color=EXCLUDED.color;

-- ============================================================================
-- PROJECT_CONSTRUCTION (37 Zeilen) — siehe BACKUP_TRACKING_2026-05-06.sql
-- ============================================================================

INSERT INTO project_construction (project_id, baubewilligung, baubewilligung_am, baubewilligung_note, tag_eingereicht, tag_bewilligt, tag_note, ia_eingereicht, ia_bewilligt, dc_montage_ausgefuehrt, ac_installiert, fehlt_etwas, display_order) VALUES
('5016b6f7-6456-4445-9980-1c9282539af9', true, NULL, NULL, true, true, NULL, true, true, true, true, NULL, 1),
('bfdbc72c-92ec-4994-afbf-cb9ebde428e4', true, NULL, NULL, true, true, NULL, true, true, true, true, NULL, 2),
('40833713-654e-47bc-b2de-2a9aa04e4f0a', true, NULL, NULL, true, true, NULL, true, false, true, true, NULL, 3),
('d79b0944-afc6-4848-a8b9-40c5bd788655', true, NULL, NULL, true, true, NULL, true, true, true, true, NULL, 4),
('b3c27062-6dfd-461a-89eb-7222521bf755', true, NULL, NULL, true, true, NULL, true, true, true, true, NULL, 5),
('7eeb031b-a204-41dd-9699-f483e9061724', true, NULL, NULL, true, false, '8KW Rück!!', false, false, true, true, NULL, 6),
('9a53a35e-8caa-46a6-9492-aebf43587ae4', true, NULL, NULL, true, true, NULL, true, true, true, true, NULL, 7),
('3efaccad-bbb8-43ac-b2d7-b173016409e6', true, NULL, NULL, true, true, NULL, true, true, true, true, NULL, 8),
('00c0d86f-4d0e-43af-b69d-2b6113111e5c', true, NULL, NULL, true, false, NULL, false, false, true, true, 'Batterie spinnt', 9),
('cf46dc66-e059-44c1-a024-cab75edac0da', true, NULL, NULL, true, true, NULL, false, true, true, true, '3 Module fehlen', 10),
('f7b73d95-0663-4ddf-800b-98174996cd33', true, NULL, NULL, true, true, NULL, true, true, true, true, 'Probleme mit Pronovo', 11),
('2f1e20b8-dd38-4d06-956e-9abe2dc03902', true, NULL, NULL, true, true, NULL, true, true, true, true, NULL, 12),
('2aa2db9e-383f-4912-af60-c17bde9cac12', true, NULL, NULL, true, true, NULL, true, true, true, true, 'Batterie neu hinzufügen', 13),
('95c95dee-717b-49ee-9e69-e81bf64bed1b', true, NULL, NULL, true, false, NULL, false, false, true, true, NULL, 14),
('06ffe93b-99de-46a4-91d5-8406d237e3c6', true, NULL, NULL, true, false, NULL, false, false, true, true, NULL, 15),
('67ca1373-4b87-4490-826c-c57d4709ff53', true, NULL, NULL, true, true, NULL, false, true, true, true, NULL, 16),
('8e335db7-c512-4922-976b-4685b36320a3', true, NULL, NULL, true, true, NULL, false, false, true, true, NULL, 17),
('825de578-f781-4538-a775-8e80b315c70c', true, NULL, NULL, true, true, NULL, true, true, false, true, 'Schaltschrank fehlt', 18),
('8c10d008-98ba-4ead-b50c-962629a5d39d', true, NULL, NULL, true, false, NULL, false, false, true, true, NULL, 19),
('37e8d1c4-6d9a-4c6f-b9e6-787f292d76bc', true, NULL, NULL, true, true, NULL, true, true, true, true, NULL, 20),
('5b9b3815-6b55-4298-8a78-743f0ff08c97', true, NULL, NULL, true, true, NULL, false, true, true, true, 'Batterie fehlt', 21),
('098eda1c-8c4b-48d4-ba53-efd356046227', true, NULL, NULL, true, true, NULL, false, true, true, true, 'Dongle fehlt', 22),
('621f1f07-6f2b-4623-ba3f-2e7c18cb73fd', true, NULL, NULL, true, true, NULL, true, true, true, true, 'Rechnung fehlt', 23),
('40ed4ac6-1233-4b9d-8115-9367ce48a22a', true, NULL, NULL, true, true, NULL, true, true, true, true, 'Notstrombox fehlt', 24),
('89587c86-6168-4d6a-bfdc-da54204081b9', true, NULL, NULL, true, true, NULL, false, true, true, true, NULL, 25),
('2b888273-24d0-4e7c-b389-a43910761bd0', true, NULL, NULL, true, true, NULL, true, true, true, true, 'Dongle fehlt', 26),
('c1c2d035-5ab4-4ac1-ace5-1a36708f03bd', true, NULL, NULL, true, true, NULL, true, true, true, true, 'Batterie fehlt', 27),
('37302ea6-b77b-477e-a7bb-b146dce0e221', true, NULL, NULL, true, true, NULL, true, true, true, true, 'Elektriker TAG fehlt', 28),
('f2bc2366-c614-4d61-ac4b-dee4254e7abe', true, NULL, NULL, true, true, NULL, true, true, true, true, NULL, 29),
('e117c648-b84e-401d-a9bb-44d0684cc0db', true, NULL, NULL, true, true, NULL, false, false, false, false, NULL, 30),
('0a3251ba-85f4-487c-8584-a2c1209c41da', true, NULL, NULL, true, true, NULL, false, false, false, false, 'Tag fehlt', 31),
('516be77b-e253-4a42-b2a3-20ef5b4e2463', true, NULL, NULL, true, true, NULL, false, false, false, false, NULL, 32),
('b218bb15-7118-439a-b243-8292b1c999a7', true, NULL, NULL, true, true, NULL, false, false, false, false, NULL, 33),
('daf078bf-d6ec-4a7f-9c34-dc6b5c34b742', true, NULL, NULL, true, false, NULL, false, false, false, false, NULL, 34),
('81cc847a-ece1-446c-a365-3c5bdb45af2e', true, NULL, NULL, true, false, NULL, false, false, true, false, NULL, 35),
('d5945f95-ff93-46c6-b2ae-dc76ee36fbbf', true, '2026-05-06', NULL, false, false, NULL, false, false, false, false, NULL, NULL),
('d1bc4b1a-fc5b-4bed-9edd-df47391dd91b', true, '2026-05-06', NULL, false, false, NULL, false, false, false, false, NULL, NULL)
ON CONFLICT (project_id) DO NOTHING;

-- ============================================================================
-- PROJECT_CALCULATION (10 Zeilen)
-- ============================================================================

INSERT INTO project_calculation (project_id, material_kranich, elektriker, montage_sergej, vk_betrag, a1_anteil_prozent, a2_anteil_prozent, a3_anteil_prozent, a1_kassiert_am, a2_kassiert_am, a3_kassiert_am, a1_fakturiert_am, a2_fakturiert_am, a3_fakturiert_am, payment_status, bemerkung, provision_verkaeufer_prozent, provision_gl_prozent, provision_innendienst_prozent) VALUES
('e117c648-b84e-401d-a9bb-44d0684cc0db', 13374, 2500, 7275, 35934, 50, 40, 10, '2026-05-06', '2026-05-06', NULL, NULL, NULL, NULL, 'KASSIERT', 'A1 kassiert; nur A3 ausstehend', 5, 3, 2),
('516be77b-e253-4a42-b2a3-20ef5b4e2463', 11262, 2500, 5869, 27462, 50, 40, 10, '2026-05-06', NULL, NULL, NULL, NULL, NULL, 'KASSIERT', 'A1 kassiert; A2+A3 ausstehend', 5, 3, 2),
('c1c2d035-5ab4-4ac1-ace5-1a36708f03bd', 14414, 2500, 8572, 33000, 50, 40, 10, '2026-05-06', '2026-05-06', NULL, NULL, NULL, NULL, 'KASSIERT', 'A1 kassiert; nur A3 ausstehend', 5, 3, 2),
('37302ea6-b77b-477e-a7bb-b146dce0e221', 12589, 2500, 8902, 52002, 50, 40, 10, '2026-05-06', NULL, NULL, NULL, NULL, NULL, 'KASSIERT', 'A1 kassiert; A2+A3 ausstehend', 5, 3, 2),
('daf078bf-d6ec-4a7f-9c34-dc6b5c34b742', 4670, 2500, 4021, 19027, 50, 50, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'VERLUST', 'VERLUST! Preis nachverhandeln', 5, 3, 2),
('0a3251ba-85f4-487c-8584-a2c1209c41da', 8192, 2500, 4713, 25774, 50, 40, 10, NULL, NULL, NULL, '2026-05-06', '2026-05-06', NULL, 'FAKTURIERT', '90% bei Beginn, 10% am Schluss', 5, 3, 2),
('b218bb15-7118-439a-b243-8292b1c999a7', 13994, 2500, 9707, 39959, 50, 40, 10, '2026-05-06', '2026-05-06', '2026-05-06', NULL, NULL, NULL, 'KASSIERT', 'Vollständig bezahlt — sofort ausführen', 5, 3, 2),
('81cc847a-ece1-446c-a365-3c5bdb45af2e', 16795, 2500, 7340, 35682, 50, 40, 10, NULL, NULL, NULL, '2026-05-06', NULL, NULL, 'FAKTURIERT', '50% fakturiert; A2+A3 ausstehend', 5, 3, 2),
('76e90c46-0f64-43c9-b31f-6288d584d31b', 0, 0, 0, 0, 50, 40, 10, NULL, NULL, NULL, NULL, NULL, NULL, 'OFFEN', NULL, 5, 3, 2),
('d5945f95-ff93-46c6-b2ae-dc76ee36fbbf', 7087.85, 2500, 8000, 42524.41, 50, 40, 10, NULL, NULL, NULL, NULL, NULL, NULL, 'OFFEN', NULL, 5, 3, 2)
ON CONFLICT (project_id) DO NOTHING;

-- ============================================================================
-- SETTINGS (17 Eintraege: feature_flags, doc_templates, role_defaults, etc.)
-- ============================================================================

-- feature_flags
INSERT INTO settings (key, value) VALUES ('feature_flags', '{"ai":false,"admin":true,"deals":true,"leads":true,"tasks":true,"export":false,"calendar":true,"projects":true,"dashboard":true,"documents":true,"provision":true,"appointments":true,"calculations":false,"communication":false,"notifications":true}'::jsonb) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value;

-- role_defaults
INSERT INTO settings (key, value) VALUES ('role_defaults', '{"GL":["dashboard","leads","appointments","deals","provision","calculations","projects","tasks","admin","communication","documents","passwords","export"],"ADMIN":["dashboard","leads","appointments","deals","provision","calculations","projects","tasks","admin","communication","documents","passwords","export"],"CLOSER":["dashboard","leads","kaltakquise","appointments","documents","passwords"],"SETTER":["dashboard","leads","kaltakquise","appointments","documents","passwords"],"VERTRIEB":["dashboard","leads","appointments","deals","tasks","communication","documents","passwords"],"BUCHHALTUNG":["dashboard","provision","deals","documents","passwords","export"],"PROJEKTLEITUNG":["dashboard","projects","calculations","tasks","appointments","documents","passwords"],"SUBUNTERNEHMEN":["projects","tasks","documents","passwords"]}'::jsonb) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value;

-- doc_templates (LEAD, TERMIN, ANGEBOT, PROJEKT, PERSONAL, INTERNAL)
INSERT INTO settings (key, value) VALUES ('doc_templates', '[{"id":"tpl-001","entityType":"LEAD","folders":[{"name":"Kontaktdaten","allowedRoles":[]},{"name":"Fotos","subfolders":["Dach","Zaehlerkasten","Umgebung"],"allowedRoles":[]},{"name":"Notizen","allowedRoles":[]}]},{"id":"tpl-002","entityType":"TERMIN","folders":[{"name":"Besichtigungsfotos","subfolders":["Dachfläche","Elektroinstallation","Umgebung"],"allowedRoles":[]},{"name":"Checkliste","allowedRoles":[]}]},{"id":"tpl-003","entityType":"ANGEBOT","folders":[{"name":"Offerte","subfolders":["Entwurf","Final","Korrektur"],"allowedRoles":["VERTRIEB","ADMIN"]},{"name":"Technische Unterlagen","subfolders":["Datenblätter","Schema"],"allowedRoles":[]},{"name":"Kundenkorrespondenz","subfolders":[],"allowedRoles":["VERTRIEB","ADMIN"]}]},{"id":"tpl-004","entityType":"PROJEKT","folders":[{"name":"Planung","subfolders":["Montagepläne","Statik","Elektroplanung"],"allowedRoles":[]},{"name":"Bewilligungen","subfolders":["Baugesuch","Förderbeiträge","Netzbetreiber"],"allowedRoles":["VERTRIEB","ADMIN"]},{"name":"Ausführung","subfolders":["Fotos","Protokolle","Mängelliste"],"allowedRoles":[]},{"name":"Abnahme","subfolders":["Abnahmeprotokoll","Inbetriebnahme","Kundenübergabe"],"allowedRoles":[]}]},{"id":"tpl-005","entityType":"PERSONAL","folders":[{"name":"Arbeitsvertrag","allowedRoles":["ADMIN","GL"]},{"name":"Lohnabrechnungen","allowedRoles":["ADMIN","GL","BUCHHALTUNG"]},{"name":"Zeugnisse","allowedRoles":["ADMIN","GL"]},{"name":"Diplome","allowedRoles":["ADMIN","GL"]},{"name":"AHV / Versicherung","allowedRoles":["ADMIN","GL","BUCHHALTUNG"]},{"name":"Krankheit / Unfall","allowedRoles":["ADMIN","GL"]},{"name":"Spesen","allowedRoles":["ADMIN","GL","BUCHHALTUNG"]},{"name":"Sonstiges","allowedRoles":[]}]},{"id":"tpl-006","entityType":"INTERNAL","folders":[{"name":"Statuten / Gründung","allowedRoles":["ADMIN","GL"]},{"name":"Versicherungen","allowedRoles":["ADMIN","GL"]},{"name":"Lieferantenverträge","allowedRoles":["ADMIN","GL"]},{"name":"Bewilligungen / Lizenzen","allowedRoles":["ADMIN","GL"]},{"name":"Buchhaltung / Steuern","allowedRoles":["ADMIN","GL"]},{"name":"IT / Software-Lizenzen","allowedRoles":["ADMIN","GL"]},{"name":"Marketing / Branding","allowedRoles":["ADMIN","GL"]},{"name":"Vorlagen / Templates","allowedRoles":["ADMIN","GL"]},{"name":"Sonstiges","allowedRoles":["ADMIN","GL"]}]}]'::jsonb) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value;

-- branding
INSERT INTO settings (key, value) VALUES ('branding', '{"logoUrl":null,"companyZip":"9100","footerText":"NEOSOLAR AG – Ihr Partner für Photovoltaik in der Schweiz","companyCity":"Herisau","companyName":"NEOSOLAR AG","companyEmail":"info@neosolar.ch","companyPhone":"071 544 91 00","primaryColor":"#F59E0B","companySlogan":"Ihre Solarenergie-Partner","offerTemplate":"standard","companyAddress":"Industriestrasse 28","companyWebsite":"www.neosolar.ch","companyOpeningHours":"Mo–Fr 08:00–17:00 Uhr"}'::jsonb) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value;

-- Hinweis: Die restlichen 12 settings (project_phases, project_kanban_columns, deal_kanban_columns,
-- noShowKanbanColumns, lead_sources, notification_settings, ai_settings, follow_up_rules, etc.)
-- sind in der DB. Bei Bedarf: SELECT * FROM settings WHERE key IN ('project_phases', ...);
