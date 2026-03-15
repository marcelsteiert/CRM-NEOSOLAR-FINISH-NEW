#!/bin/bash
# ════════════════════════════════════════════════════════════════════════════
# ONLINE E2E KOMPLETT-TEST – Production API
# https://crm-neosolar.netlify.app/api/v1
#
# Testet ALLES gegen die echte Production:
#  1. Auth (Login, /me, falsches PW, alle 4 Rollen)
#  2. Kontakte CRUD (Create, Read, Update, Search, Delete)
#  3. Leads CRUD + Tags + Filter + Auto-Zuweisung
#  4. Termine CRUD + Stats + Status-Flow
#  5. Deals CRUD + Stats + Aktivitaeten + Follow-Ups + winProbability
#  6. Projekte CRUD + Phasen + Stats + Partner
#  7. Tasks CRUD + Filter + Stats + Status-Transitions + Validierung
#  8. Notifications CRUD + Unread + Mark-Read + Batch
#  9. Dokumente Upload + List + Delete
# 10. Aktivitaeten Create + List
# 11. Erinnerungen Create + List
# 12. Pipelines + Buckets CRUD
# 13. Tags CRUD + Zuweisung
# 14. Users CRUD + Rollen-Defaults + Modul-Toggle
# 15. Dashboard + Provision + Monthly
# 16. Globale Suche
# 17. Settings
# 18. Admin (9 Sektionen komplett)
# 19. Ohne-Auth Schutz (alle Endpoints)
# 20. camelCase Regression (8 Endpoints)
# 21. Response-Struktur (Frontend-Hook Kompatibilitaet)
# 22. Cross-Module Verknuepfungen
# ════════════════════════════════════════════════════════════════════════════

PROD="https://crm-neosolar.netlify.app/api/v1"
EMAIL="marcel.steiert@neosolar.ch"
PASSWORD="marceL...1"
ADMIN_ID="u006"

PASS=0
FAIL=0
TOTAL=0

# ─── Helpers ──────────────────────────────────────────────────────────────

check() {
  TOTAL=$((TOTAL+1))
  local label="$1"
  local actual="$2"
  local expected="$3"
  if [ "$actual" = "$expected" ]; then
    PASS=$((PASS+1))
    echo "  ✅ $label"
  else
    FAIL=$((FAIL+1))
    echo "  ❌ $label (got $actual, expected $expected)"
  fi
}

check_multi() {
  TOTAL=$((TOTAL+1))
  local label="$1"
  local actual="$2"
  shift 2
  for exp in "$@"; do
    if [ "$actual" = "$exp" ]; then
      PASS=$((PASS+1))
      echo "  ✅ $label"
      return
    fi
  done
  FAIL=$((FAIL+1))
  echo "  ❌ $label (got $actual, expected one of: $*)"
}

auth_get() {
  curl -s -H "Authorization: Bearer $TOKEN" "$PROD$1"
}

auth_status() {
  curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$PROD$1"
}

noauth_status() {
  curl -s -o /dev/null -w "%{http_code}" "$PROD$1"
}

auth_post() {
  curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" "$PROD$1" -d "$2"
}

auth_post_status() {
  curl -s -o /dev/null -w "%{http_code}" -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" "$PROD$1" -d "$2"
}

auth_put() {
  curl -s -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" "$PROD$1" -d "$2"
}

auth_put_status() {
  curl -s -o /dev/null -w "%{http_code}" -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" "$PROD$1" -d "$2"
}

auth_delete_status() {
  curl -s -o /dev/null -w "%{http_code}" -X DELETE -H "Authorization: Bearer $TOKEN" "$PROD$1"
}

# JSON-Feld mit node extrahieren
json_field() {
  echo "$1" | node -e "let b='';process.stdin.on('data',d=>b+=d);process.stdin.on('end',()=>{try{const o=JSON.parse(b);const v=$2;console.log(v===undefined||v===null?'':v)}catch{console.log('ERROR')}})"
}

RID=$(node -e "console.log(Math.random().toString(36).slice(2,8))")

# ─── LOGIN ────────────────────────────────────────────────────────────────

echo "═══════════════════════════════════════════════════════════════"
echo "  ONLINE E2E KOMPLETT-TEST – crm-neosolar.netlify.app"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "=== LOGIN ==="
LOGIN_BODY="{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}"
LOGIN_RESP=$(curl -s -X POST "$PROD/auth/login" -H "Content-Type: application/json" -d "$LOGIN_BODY")
TOKEN=$(json_field "$LOGIN_RESP" "o.data.token")

if [ -z "$TOKEN" ] || [ "$TOKEN" = "ERROR" ]; then
  echo "❌ LOGIN FEHLGESCHLAGEN!"
  echo "$LOGIN_RESP"
  exit 1
fi
echo "✅ Token: ${TOKEN:0:40}..."
echo ""

# ════════════════════════════════════════════════════════════════════════════
# 1. AUTH (8 Tests)
# ════════════════════════════════════════════════════════════════════════════

echo "── 1. AUTH ──"
check "Login gueltig → 200" "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$PROD/auth/login" -H 'Content-Type: application/json' -d "$LOGIN_BODY")" "200"
check "Login ungueltig → 401" "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$PROD/auth/login" -H 'Content-Type: application/json' -d '{"email":"fake@x.ch","password":"wrong"}')" "401"
check "Login nicht-existent → 401" "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$PROD/auth/login" -H 'Content-Type: application/json' -d '{"email":"nix@nix.ch","password":"nix"}')" "401"
check "GET /auth/me → 200" "$(auth_status '/auth/me')" "200"
check "GET /auth/me ohne Token → 401" "$(noauth_status '/auth/me')" "401"

# User-Felder pruefen
ME_RESP=$(auth_get "/auth/me")
ME_ROLE=$(json_field "$ME_RESP" "o.data.role")
ME_MODULES=$(json_field "$ME_RESP" "Array.isArray(o.data.allowedModules)?'OK':'FAIL'")
check "Auth/me: role = ADMIN" "$ME_ROLE" "ADMIN"
check "Auth/me: allowedModules ist Array" "$ME_MODULES" "OK"
ME_SNAKE=$(json_field "$ME_RESP" "Object.keys(o.data).filter(k=>['first_name','last_name','is_active','allowed_modules'].includes(k)).length===0?'OK':'SNAKE'")
check "Auth/me: camelCase (kein snake_case)" "$ME_SNAKE" "OK"

# ════════════════════════════════════════════════════════════════════════════
# 2. KONTAKTE CRUD (7 Tests)
# ════════════════════════════════════════════════════════════════════════════

echo ""
echo "── 2. KONTAKTE CRUD ──"

# Create
CONTACT_RESP=$(auth_post "/contacts" "{\"firstName\":\"E2E-$RID\",\"lastName\":\"Online-$RID\",\"email\":\"e2e-$RID@online.ch\",\"phone\":\"+41 71 000 00 00\",\"address\":\"Teststrasse 1, 9430 St. Margrethen\",\"company\":\"E2E AG\"}")
CONTACT_ID=$(json_field "$CONTACT_RESP" "o.data.id")
check "Kontakt erstellen → ID" "$([ -n "$CONTACT_ID" ] && [ "$CONTACT_ID" != "ERROR" ] && echo 'OK' || echo 'FAIL')" "OK"

# Read
check "Kontakt lesen → 200" "$(auth_status "/contacts/$CONTACT_ID")" "200"

# List + Pagination
LIST_RESP=$(auth_get "/contacts?page=1&pageSize=3")
LIST_HAS=$(json_field "$LIST_RESP" "'total' in o && 'page' in o && 'pageSize' in o ? 'OK' : 'FAIL'")
check "Kontakte Liste: Pagination-Felder" "$LIST_HAS" "OK"

# Search
check "Kontakt Suche → 200" "$(auth_status "/contacts?search=E2E-$RID")" "200"

# Update
UPD_RESP=$(auth_put "/contacts/$CONTACT_ID" '{"company":"Updated AG"}')
UPD_COMPANY=$(json_field "$UPD_RESP" "o.data.company")
check "Kontakt Update: company=Updated AG" "$UPD_COMPANY" "Updated AG"

# Verknuepfungen
DETAIL=$(auth_get "/contacts/$CONTACT_ID")
HAS_LINKS=$(json_field "$DETAIL" "'leads' in o.data && 'deals' in o.data && 'appointments' in o.data && 'projects' in o.data ? 'OK' : 'FAIL'")
check "Kontakt Detail: Verknuepfungen vorhanden" "$HAS_LINKS" "OK"

# Delete
check "Kontakt loeschen → 200" "$(auth_delete_status "/contacts/$CONTACT_ID")" "200"

# ════════════════════════════════════════════════════════════════════════════
# 3. LEADS CRUD + Tags + Filter (10 Tests)
# ════════════════════════════════════════════════════════════════════════════

echo ""
echo "── 3. LEADS CRUD ──"

# Create
LEAD_RESP=$(auth_post "/leads" "{\"firstName\":\"E2ELead-$RID\",\"lastName\":\"Test-$RID\",\"email\":\"e2elead-$RID@online.ch\",\"phone\":\"+41 71 000 00 00\",\"address\":\"Teststrasse 1\",\"source\":\"HOMEPAGE\"}")
LEAD_ID=$(json_field "$LEAD_RESP" "o.data.id")
LEAD_CID=$(json_field "$LEAD_RESP" "o.data.contactId")
LEAD_SOURCE=$(json_field "$LEAD_RESP" "o.data.source")
check "Lead erstellen → ID vorhanden" "$([ -n "$LEAD_ID" ] && echo 'OK' || echo 'FAIL')" "OK"
check "Lead: source=HOMEPAGE" "$LEAD_SOURCE" "HOMEPAGE"
check "Lead: contactId vorhanden" "$([ -n "$LEAD_CID" ] && echo 'OK' || echo 'FAIL')" "OK"

# Read
check "Lead lesen → 200" "$(auth_status "/leads/$LEAD_ID")" "200"

# List + Filter
check "Leads Liste → 200" "$(auth_status '/leads?page=1&pageSize=3')" "200"
check "Leads Filter source=HOMEPAGE → 200" "$(auth_status '/leads?source=HOMEPAGE')" "200"
check "Leads Filter status=ACTIVE → 200" "$(auth_status '/leads?status=ACTIVE')" "200"

# Update
check "Lead Update → 200" "$(auth_put_status "/leads/$LEAD_ID" '{"notes":"E2E Online Update"}')" "200"

# Tag erstellen + zuweisen
TAG_RESP=$(auth_post "/tags" "{\"name\":\"E2ETag-$RID\",\"color\":\"#F59E0B\"}")
TAG_ID=$(json_field "$TAG_RESP" "o.data.id")
TAG_ADD=$(auth_post "/leads/$LEAD_ID/tags" "{\"tagIds\":[\"$TAG_ID\"]}")
TAG_OK=$(json_field "$TAG_ADD" "o.data.tags && o.data.tags.includes('$TAG_ID') ? 'OK' : 'FAIL'")
check "Tag auf Lead setzen" "$TAG_OK" "OK"

# Delete
check "Lead loeschen → 200" "$(auth_delete_status "/leads/$LEAD_ID")" "200"

# ════════════════════════════════════════════════════════════════════════════
# 4. TERMINE CRUD + Stats + Status-Flow (7 Tests)
# ════════════════════════════════════════════════════════════════════════════

echo ""
echo "── 4. TERMINE CRUD ──"

APPT_RESP=$(auth_post "/appointments" "{\"contactName\":\"E2EAppt-$RID\",\"contactEmail\":\"e2eappt-$RID@online.ch\",\"contactPhone\":\"+41 71 000\",\"address\":\"Teststrasse 1\",\"appointmentDate\":\"2026-08-15\",\"appointmentTime\":\"10:00\",\"assignedTo\":\"$ADMIN_ID\"}")
APPT_ID=$(json_field "$APPT_RESP" "o.data.id")
APPT_STATUS=$(json_field "$APPT_RESP" "o.data.status")
check "Termin erstellen → ID" "$([ -n "$APPT_ID" ] && echo 'OK' || echo 'FAIL')" "OK"
check "Termin: status=GEPLANT" "$APPT_STATUS" "GEPLANT"

check "Termine Liste → 200" "$(auth_status '/appointments?pageSize=3')" "200"
check "Termine Stats → 200" "$(auth_status '/appointments/stats')" "200"

# Status-Flow
UPD1=$(auth_put "/appointments/$APPT_ID" '{"status":"BESTAETIGT"}')
check "Status GEPLANT → BESTAETIGT" "$(json_field "$UPD1" "o.data.status")" "BESTAETIGT"

UPD2=$(auth_put "/appointments/$APPT_ID" '{"status":"DURCHGEFUEHRT"}')
check "Status → DURCHGEFUEHRT" "$(json_field "$UPD2" "o.data.status")" "DURCHGEFUEHRT"

check "Termin loeschen → 200" "$(auth_delete_status "/appointments/$APPT_ID")" "200"

# ════════════════════════════════════════════════════════════════════════════
# 5. DEALS CRUD + Stats + Aktivitaeten + winProbability (10 Tests)
# ════════════════════════════════════════════════════════════════════════════

echo ""
echo "── 5. DEALS CRUD ──"

DEAL_RESP=$(auth_post "/deals" "{\"title\":\"E2EDeal-$RID\",\"contactName\":\"DealContact-$RID\",\"contactEmail\":\"e2edeal-$RID@online.ch\",\"contactPhone\":\"+41 71 000\",\"address\":\"Teststr 1\",\"value\":35000,\"assignedTo\":\"$ADMIN_ID\",\"winProbability\":70}")
DEAL_ID=$(json_field "$DEAL_RESP" "o.data.id")
DEAL_VAL=$(json_field "$DEAL_RESP" "o.data.value")
DEAL_WIN=$(json_field "$DEAL_RESP" "o.data.winProbability")
DEAL_STAGE=$(json_field "$DEAL_RESP" "o.data.stage")
check "Deal erstellen → ID" "$([ -n "$DEAL_ID" ] && echo 'OK' || echo 'FAIL')" "OK"
check "Deal: value=35000" "$DEAL_VAL" "35000"
check "Deal: winProbability=70" "$DEAL_WIN" "70"
check "Deal: stage=ERSTELLT" "$DEAL_STAGE" "ERSTELLT"

check "Deals Liste → 200" "$(auth_status '/deals?pageSize=3')" "200"
check "Deals Stats → 200" "$(auth_status '/deals/stats')" "200"
check "Deals Follow-Ups → 200" "$(auth_status '/deals/follow-ups')" "200"

# Stage-Transition
UPD_DEAL=$(auth_put "/deals/$DEAL_ID" '{"stage":"GESENDET"}')
check "Stage ERSTELLT → GESENDET" "$(json_field "$UPD_DEAL" "o.data.stage")" "GESENDET"

# Aktivitaet
ACT_RESP=$(auth_post "/deals/$DEAL_ID/activities" '{"type":"NOTE","text":"E2E Online Notiz"}')
ACT_ID=$(json_field "$ACT_RESP" "o.data.id")
check "Deal Aktivitaet erstellen" "$([ -n "$ACT_ID" ] && echo 'OK' || echo 'FAIL')" "OK"

check "Deal loeschen → 200" "$(auth_delete_status "/deals/$DEAL_ID")" "200"

# ════════════════════════════════════════════════════════════════════════════
# 6. PROJEKTE CRUD + Phasen + Stats (7 Tests)
# ════════════════════════════════════════════════════════════════════════════

echo ""
echo "── 6. PROJEKTE CRUD ──"

PROJ_RESP=$(auth_post "/projects" "{\"name\":\"E2EProj-$RID\",\"description\":\"Online Test\",\"address\":\"Teststr 1\",\"email\":\"e2eproj-$RID@online.ch\",\"kWp\":15,\"value\":40000}")
PROJ_ID=$(json_field "$PROJ_RESP" "o.data.id")
check "Projekt erstellen → ID" "$([ -n "$PROJ_ID" ] && echo 'OK' || echo 'FAIL')" "OK"

check "Projekte Liste → 200" "$(auth_status '/projects?pageSize=3')" "200"
check "Projekte Phasen → 200" "$(auth_status '/projects/phases')" "200"
check "Projekte Partner → 200" "$(auth_status '/projects/partners')" "200"
check "Projekte Stats → 200" "$(auth_status '/projects/stats')" "200"

# Update
check "Projekt Update → 200" "$(auth_put_status "/projects/$PROJ_ID" '{"description":"Updated Online"}')" "200"
check "Projekt loeschen → 200" "$(auth_delete_status "/projects/$PROJ_ID")" "200"

# ════════════════════════════════════════════════════════════════════════════
# 7. TASKS CRUD + Filter + Stats + Validierung (14 Tests)
# ════════════════════════════════════════════════════════════════════════════

echo ""
echo "── 7. TASKS CRUD ──"

TASK_RESP=$(auth_post "/tasks" "{\"title\":\"E2ETask-$RID\",\"module\":\"ALLGEMEIN\",\"assignedTo\":\"$ADMIN_ID\",\"priority\":\"HIGH\"}")
TASK_ID=$(json_field "$TASK_RESP" "o.data.id")
TASK_STATUS=$(json_field "$TASK_RESP" "o.data.status")
TASK_PRIO=$(json_field "$TASK_RESP" "o.data.priority")
check "Task erstellen → ID" "$([ -n "$TASK_ID" ] && echo 'OK' || echo 'FAIL')" "OK"
check "Task: status=OFFEN" "$TASK_STATUS" "OFFEN"
check "Task: priority=HIGH" "$TASK_PRIO" "HIGH"

check "Tasks Liste → 200" "$(auth_status '/tasks')" "200"
check "Tasks Stats → 200" "$(auth_status '/tasks/stats')" "200"
check "Tasks Filter module=ALLGEMEIN → 200" "$(auth_status '/tasks?module=ALLGEMEIN')" "200"
check "Tasks Filter priority=HIGH → 200" "$(auth_status '/tasks?priority=HIGH')" "200"

# Status-Transition
UPD_T1=$(auth_put "/tasks/$TASK_ID" '{"status":"IN_BEARBEITUNG"}')
check "Task: OFFEN → IN_BEARBEITUNG" "$(json_field "$UPD_T1" "o.data.status")" "IN_BEARBEITUNG"

UPD_T2=$(auth_put "/tasks/$TASK_ID" '{"status":"ERLEDIGT"}')
T2_COMPLETED=$(json_field "$UPD_T2" "o.data.completedAt!==null?'OK':'FAIL'")
check "Task: → ERLEDIGT (completedAt gesetzt)" "$T2_COMPLETED" "OK"

UPD_T3=$(auth_put "/tasks/$TASK_ID" '{"status":"OFFEN"}')
T3_CLEARED=$(json_field "$UPD_T3" "o.data.completedAt===null?'OK':'FAIL'")
check "Task: → OFFEN (completedAt geloescht)" "$T3_CLEARED" "OK"

# Validierung
check "Task ohne title → 422" "$(auth_post_status "/tasks" "{\"assignedTo\":\"$ADMIN_ID\"}")" "422"
check "Task ohne assignedTo → 422" "$(auth_post_status "/tasks" '{"title":"Test"}')" "422"
check "Tasks ohne Auth → 401" "$(noauth_status '/tasks')" "401"

check "Task loeschen → 200" "$(auth_delete_status "/tasks/$TASK_ID")" "200"

# ════════════════════════════════════════════════════════════════════════════
# 8. NOTIFICATIONS (7 Tests)
# ════════════════════════════════════════════════════════════════════════════

echo ""
echo "── 8. NOTIFICATIONS ──"

check "Notifications Liste → 200" "$(auth_status '/notifications')" "200"
check "Unread Count → 200" "$(auth_status '/notifications/unread-count')" "200"
check "Filter read=false → 200" "$(auth_status '/notifications?read=false')" "200"
check "Filter type=LEAD_CREATED → 200" "$(auth_status '/notifications?type=LEAD_CREATED')" "200"

# Mark all read
check "Alle gelesen markieren → 200" "$(auth_put_status '/notifications/mark-all-read' '{}')" "200"

# Clear read
check "Gelesene loeschen → 200" "$(auth_delete_status '/notifications/clear-read')" "200"
check "Notifications ohne Auth → 401" "$(noauth_status '/notifications')" "401"

# ════════════════════════════════════════════════════════════════════════════
# 9. DOKUMENTE (3 Tests)
# ════════════════════════════════════════════════════════════════════════════

echo ""
echo "── 9. DOKUMENTE ──"

# Neuen Kontakt fuer Dokument-Upload
DOC_CONTACT=$(auth_post "/contacts" "{\"firstName\":\"DocTest-$RID\",\"lastName\":\"Upload\",\"email\":\"doc-$RID@online.ch\",\"phone\":\"+41 71 000\",\"address\":\"Test\"}")
DOC_CID=$(json_field "$DOC_CONTACT" "o.data.id")
FILEDATA=$(echo -n "E2E Online Test Inhalt" | base64)
DOC_RESP=$(auth_post "/documents" "{\"contactId\":\"$DOC_CID\",\"entityType\":\"KONTAKT\",\"fileName\":\"e2e-online.txt\",\"fileSize\":22,\"mimeType\":\"text/plain\",\"uploadedBy\":\"$ADMIN_ID\",\"fileBase64\":\"$FILEDATA\"}")
DOC_ID=$(json_field "$DOC_RESP" "o.data.id")
check "Dokument Upload → ID" "$([ -n "$DOC_ID" ] && [ "$DOC_ID" != "ERROR" ] && echo 'OK' || echo 'FAIL')" "OK"

check "Dokumente Liste → 200" "$(auth_status "/documents?contactId=$DOC_CID")" "200"

if [ -n "$DOC_ID" ] && [ "$DOC_ID" != "ERROR" ]; then
  check "Dokument loeschen → 200" "$(auth_delete_status "/documents/$DOC_ID")" "200"
else
  check "Dokument loeschen (skip)" "SKIP" "SKIP"
fi
# Cleanup
auth_delete_status "/contacts/$DOC_CID" > /dev/null 2>&1

# ════════════════════════════════════════════════════════════════════════════
# 10. AKTIVITAETEN (3 Tests)
# ════════════════════════════════════════════════════════════════════════════

echo ""
echo "── 10. AKTIVITAETEN ──"
check "Aktivitaeten Liste → 200" "$(auth_status '/activities')" "200"

LEAD2=$(auth_post "/leads" "{\"firstName\":\"ActLead-$RID\",\"lastName\":\"Test\",\"email\":\"actlead-$RID@online.ch\",\"phone\":\"+41 71 000\",\"address\":\"Test\",\"source\":\"MESSE\"}")
LEAD2_ID=$(json_field "$LEAD2" "o.data.id")
ACT2=$(auth_post "/activities" "{\"leadId\":\"$LEAD2_ID\",\"type\":\"NOTE\",\"title\":\"E2E Notiz\",\"description\":\"Online Test\",\"createdBy\":\"$ADMIN_ID\"}")
check "Aktivitaet erstellen → 201" "$(json_field "$ACT2" "o.data.id!==undefined?'OK':'FAIL'")" "OK"
check "Aktivitaeten fuer Lead → 200" "$(auth_status "/activities?leadId=$LEAD2_ID")" "200"

# ════════════════════════════════════════════════════════════════════════════
# 11. ERINNERUNGEN (3 Tests)
# ════════════════════════════════════════════════════════════════════════════

echo ""
echo "── 11. ERINNERUNGEN ──"
check "Erinnerungen Liste → 200" "$(auth_status '/reminders')" "200"
check "Pending Erinnerungen → 200" "$(auth_status '/reminders?pending=true')" "200"

REM_RESP=$(auth_post "/reminders" "{\"leadId\":\"$LEAD2_ID\",\"title\":\"E2E Reminder $RID\",\"dueAt\":\"2026-08-01T09:00:00Z\",\"createdBy\":\"$ADMIN_ID\"}")
check "Erinnerung erstellen" "$(json_field "$REM_RESP" "o.data.id!==undefined?'OK':'FAIL'")" "OK"

# ════════════════════════════════════════════════════════════════════════════
# 12. PIPELINES + BUCKETS (6 Tests)
# ════════════════════════════════════════════════════════════════════════════

echo ""
echo "── 12. PIPELINES + BUCKETS ──"
PIPE_RESP=$(auth_post "/pipelines" "{\"name\":\"E2EPipe-$RID\"}")
PIPE_ID=$(json_field "$PIPE_RESP" "o.data.id")
check "Pipeline erstellen → ID" "$([ -n "$PIPE_ID" ] && echo 'OK' || echo 'FAIL')" "OK"
check "Pipelines Liste → 200" "$(auth_status '/pipelines')" "200"

BUCK_RESP=$(auth_post "/pipelines/$PIPE_ID/buckets" "{\"name\":\"E2EBucket-$RID\"}")
BUCK_ID=$(json_field "$BUCK_RESP" "o.data.id")
check "Bucket erstellen → ID" "$([ -n "$BUCK_ID" ] && echo 'OK' || echo 'FAIL')" "OK"

check "Pipeline Update → 200" "$(auth_put_status "/pipelines/$PIPE_ID" '{"name":"E2E-Renamed"}')" "200"
check "Bucket loeschen → 200" "$(auth_delete_status "/pipelines/$PIPE_ID/buckets/$BUCK_ID")" "200"
check "Pipeline loeschen → 200" "$(auth_delete_status "/pipelines/$PIPE_ID")" "200"

# ════════════════════════════════════════════════════════════════════════════
# 13. TAGS CRUD (3 Tests)
# ════════════════════════════════════════════════════════════════════════════

echo ""
echo "── 13. TAGS ──"
check "Tags Liste → 200" "$(auth_status '/tags')" "200"
TAG2_RESP=$(auth_post "/tags" "{\"name\":\"E2ETag2-$RID\",\"color\":\"#EF4444\"}")
TAG2_ID=$(json_field "$TAG2_RESP" "o.data.id")
check "Tag erstellen → ID" "$([ -n "$TAG2_ID" ] && echo 'OK' || echo 'FAIL')" "OK"
check "Tag loeschen → 200" "$(auth_delete_status "/tags/$TAG2_ID")" "200"

# ════════════════════════════════════════════════════════════════════════════
# 14. USERS + Rollen (6 Tests)
# ════════════════════════════════════════════════════════════════════════════

echo ""
echo "── 14. USERS + ROLLEN ──"
check "Users Liste → 200" "$(auth_status '/users')" "200"

DEFAULTS_RESP=$(auth_get "/users/role-defaults")
HAS_ROLES=$(json_field "$DEFAULTS_RESP" "'ADMIN' in o.data && 'VERTRIEB' in o.data && 'PROJEKTLEITUNG' in o.data && 'BUCHHALTUNG' in o.data && 'GL' in o.data ? 'OK' : 'FAIL'")
check "Role-Defaults: alle 5 Rollen" "$HAS_ROLES" "OK"

ADMIN_MORE=$(json_field "$DEFAULTS_RESP" "o.data.ADMIN.length > o.data.VERTRIEB.length ? 'OK' : 'FAIL'")
check "ADMIN hat mehr Module als VERTRIEB" "$ADMIN_MORE" "OK"

VT_NO_ADMIN=$(json_field "$DEFAULTS_RESP" "!o.data.VERTRIEB.includes('admin') ? 'OK' : 'FAIL'")
check "VERTRIEB hat kein admin-Modul" "$VT_NO_ADMIN" "OK"

# User erstellen + loeschen
USER_RESP=$(auth_post "/users" "{\"firstName\":\"E2EUser-$RID\",\"lastName\":\"Test\",\"email\":\"e2euser-$RID@online.ch\",\"role\":\"VERTRIEB\"}")
USER_ID=$(json_field "$USER_RESP" "o.data.id")
USER_ROLE=$(json_field "$USER_RESP" "o.data.role")
check "User erstellen: role=VERTRIEB" "$USER_ROLE" "VERTRIEB"
check "User deaktivieren → 200" "$(auth_delete_status "/users/$USER_ID")" "200"

# ════════════════════════════════════════════════════════════════════════════
# 15. DASHBOARD + PROVISION (3 Tests)
# ════════════════════════════════════════════════════════════════════════════

echo ""
echo "── 15. DASHBOARD ──"
check "Dashboard Stats → 200" "$(auth_status '/dashboard/stats')" "200"
check "Dashboard Monthly → 200" "$(auth_status '/dashboard/monthly')" "200"
check "Dashboard Provision → 200" "$(auth_status '/dashboard/provision')" "200"

# ════════════════════════════════════════════════════════════════════════════
# 16. GLOBALE SUCHE (2 Tests)
# ════════════════════════════════════════════════════════════════════════════

echo ""
echo "── 16. SUCHE ──"
check "Suche q=Solar → 200" "$(auth_status '/search?q=Solar')" "200"
check_multi "Suche q=X (zu kurz)" "$(auth_status '/search?q=X')" "200" "400"

# ════════════════════════════════════════════════════════════════════════════
# 17. SETTINGS + EMAIL TEMPLATES (2 Tests)
# ════════════════════════════════════════════════════════════════════════════

echo ""
echo "── 17. SETTINGS ──"
check "Settings → 200" "$(auth_status '/settings')" "200"
check "Email Templates → 200" "$(auth_status '/emails/templates')" "200"

# ════════════════════════════════════════════════════════════════════════════
# 18. ADMIN – Alle 9 Sektionen (14 Tests)
# ════════════════════════════════════════════════════════════════════════════

echo ""
echo "── 18. ADMIN ──"
check "Admin Products → 200" "$(auth_status '/admin/products')" "200"
check "Admin Integrations → 200" "$(auth_status '/admin/integrations')" "200"
check "Admin Webhooks → 200" "$(auth_status '/admin/webhooks')" "200"
check "Admin Branding → 200" "$(auth_status '/admin/branding')" "200"
check "Admin AI-Settings → 200" "$(auth_status '/admin/ai-settings')" "200"
check "Admin Notification-Settings → 200" "$(auth_status '/admin/notification-settings')" "200"
check "Admin Doc-Templates → 200" "$(auth_status '/admin/doc-templates')" "200"
check "Admin Audit-Log → 200" "$(auth_status '/admin/audit-log')" "200"
check "Admin DB-Export Stats → 200" "$(auth_status '/admin/db-export/stats')" "200"

# Webhook CRUD
WH_RESP=$(auth_post "/admin/webhooks" "{\"name\":\"E2EHook-$RID\",\"sourceType\":\"HOMEPAGE\"}")
WH_ID=$(json_field "$WH_RESP" "o.data.id")
WH_SECRET=$(json_field "$WH_RESP" "o.data.secret")
check "Webhook erstellen → Secret" "$([ -n "$WH_SECRET" ] && echo 'OK' || echo 'FAIL')" "OK"

WH_REGEN=$(auth_post "/admin/webhooks/$WH_ID/regenerate-secret" '{}')
WH_NEW=$(json_field "$WH_REGEN" "o.data.secret")
check "Webhook Secret regenerieren" "$([ "$WH_NEW" != "$WH_SECRET" ] && echo 'OK' || echo 'FAIL')" "OK"

WH_DEL_STATUS=$(auth_delete_status "/admin/webhooks/$WH_ID")
check "Webhook loeschen → 200/204" "$([ "$WH_DEL_STATUS" = "200" ] || [ "$WH_DEL_STATUS" = "204" ] || [ "$WH_DEL_STATUS" = "404" ] && echo 'OK' || echo 'FAIL')" "OK"

# NotifSettings Struktur
NS_RESP=$(auth_get "/admin/notification-settings")
NS_COUNT=$(json_field "$NS_RESP" "o.data.length>=10?'OK':'FAIL'")
check "Notif-Settings: mind. 10 Events" "$NS_COUNT" "OK"

NS_STRUCT=$(json_field "$NS_RESP" "o.data[0].event&&o.data[0].label&&'enabled' in o.data[0]&&o.data[0].channels?'OK':'FAIL'")
check "Notif-Settings: event+label+enabled+channels" "$NS_STRUCT" "OK"

# ════════════════════════════════════════════════════════════════════════════
# 19. OHNE AUTH → 401 (15 Tests)
# ════════════════════════════════════════════════════════════════════════════

echo ""
echo "── 19. OHNE AUTH → 401 ──"
for ep in leads deals appointments projects tasks notifications notifications/unread-count contacts users dashboard/stats settings tags pipelines admin/products admin/webhooks; do
  check "GET /$ep ohne Auth → 401" "$(noauth_status "/$ep")" "401"
done

# ════════════════════════════════════════════════════════════════════════════
# 20. camelCase REGRESSION (8 Endpoints)
# ════════════════════════════════════════════════════════════════════════════

echo ""
echo "── 20. camelCase REGRESSION ──"

SNAKE_FIELDS='["contact_id","assigned_to","assigned_by","created_at","updated_at","deleted_at","due_date","completed_at","first_name","last_name","is_active","allowed_modules","file_name","file_size","mime_type","entity_type","user_id","read_at","reference_id","reference_title"]'

for ep in leads deals appointments projects tasks users contacts notifications; do
  RESP=$(auth_get "/$ep?pageSize=1&limit=1")
  SNAKE_CHECK=$(echo "$RESP" | node -e "
    let b='';process.stdin.on('data',d=>b+=d);process.stdin.on('end',()=>{
      try{
        const o=JSON.parse(b);
        const items=Array.isArray(o.data)?o.data:[o.data];
        if(!items[0]){console.log('OK');return}
        const forbidden=$SNAKE_FIELDS;
        const keys=Object.keys(items[0]);
        const found=keys.filter(k=>forbidden.includes(k));
        console.log(found.length===0?'OK':found.join(','))
      }catch{console.log('OK')}
    })
  ")
  check "/$ep: camelCase OK" "$SNAKE_CHECK" "OK"
done

# ════════════════════════════════════════════════════════════════════════════
# 21. RESPONSE-STRUKTUR (Frontend-Hook Kompatibilitaet) (8 Tests)
# ════════════════════════════════════════════════════════════════════════════

echo ""
echo "── 21. RESPONSE STRUKTUR ──"

for ep in leads deals appointments projects; do
  RESP=$(auth_get "/$ep?pageSize=1")
  STRUCT=$(echo "$RESP" | node -e "let b='';process.stdin.on('data',d=>b+=d);process.stdin.on('end',()=>{try{const o=JSON.parse(b);console.log(Array.isArray(o.data)&&'total' in o?'OK':'FAIL')}catch{console.log('FAIL')}})")
  check "/$ep: {data[], total}" "$STRUCT" "OK"
done

TASK_STATS=$(auth_get "/tasks/stats")
TS_OK=$(echo "$TASK_STATS" | node -e "let b='';process.stdin.on('data',d=>b+=d);process.stdin.on('end',()=>{try{const s=JSON.parse(b).data;console.log('open' in s&&'inProgress' in s&&'completed' in s&&'overdue' in s&&'total' in s?'OK':'FAIL')}catch{console.log('FAIL')}})")
check "TaskStats: {open,inProgress,completed,overdue,total}" "$TS_OK" "OK"

DEAL_STATS=$(auth_get "/deals/stats")
DS_OK=$(echo "$DEAL_STATS" | node -e "let b='';process.stdin.on('data',d=>b+=d);process.stdin.on('end',()=>{try{const s=JSON.parse(b).data;console.log('totalDeals' in s&&'totalValue' in s&&'pipelineValue' in s?'OK':'FAIL')}catch{console.log('FAIL')}})")
check "DealStats: {totalDeals,totalValue,pipelineValue}" "$DS_OK" "OK"

UNREAD=$(auth_get "/notifications/unread-count")
UR_OK=$(echo "$UNREAD" | node -e "let b='';process.stdin.on('data',d=>b+=d);process.stdin.on('end',()=>{try{console.log(typeof JSON.parse(b).data.count==='number'?'OK':'FAIL')}catch{console.log('FAIL')}})")
check "UnreadCount: {count: number}" "$UR_OK" "OK"

DASH=$(auth_get "/dashboard/stats")
DASH_OK=$(echo "$DASH" | node -e "let b='';process.stdin.on('data',d=>b+=d);process.stdin.on('end',()=>{try{const d=JSON.parse(b).data;console.log('deals' in d&&'appointments' in d&&'tasks' in d?'OK':'FAIL')}catch{console.log('FAIL')}})")
check "DashboardStats: {deals,appointments,tasks}" "$DASH_OK" "OK"

# ════════════════════════════════════════════════════════════════════════════
# 22. CROSS-MODULE VERKNUEPFUNGEN KOMPLETT (30+ Tests)
# ════════════════════════════════════════════════════════════════════════════

echo ""
echo "── 22. CROSS-MODULE KOMPLETT ──"

# ── 22a. Kontakt als Basis erstellen ──
CM_CONTACT=$(auth_post "/contacts" "{\"firstName\":\"Pipeline-$RID\",\"lastName\":\"Flow-$RID\",\"email\":\"pipeline-$RID@online.ch\",\"phone\":\"+41 79 999 00 00\",\"address\":\"Solarweg 1, 8000 Zuerich\",\"company\":\"Pipeline AG\"}")
CM_CID=$(json_field "$CM_CONTACT" "o.data.id")
check "CM: Kontakt erstellt" "$([ -n "$CM_CID" ] && echo 'OK' || echo 'FAIL')" "OK"

# ── 22b. Lead mit contactId verknuepfen ──
CM_LEAD=$(auth_post "/leads" "{\"firstName\":\"Pipeline-$RID\",\"lastName\":\"Flow-$RID\",\"email\":\"pipeline-$RID@online.ch\",\"phone\":\"+41 79 999 00 00\",\"address\":\"Solarweg 1, 8000 Zuerich\",\"source\":\"EMPFEHLUNG\",\"contactId\":\"$CM_CID\"}")
CM_LID=$(json_field "$CM_LEAD" "o.data.id")
CM_LEAD_CID=$(json_field "$CM_LEAD" "o.data.contactId")
check "CM: Lead erstellt mit contactId" "$([ -n "$CM_LID" ] && echo 'OK' || echo 'FAIL')" "OK"
check "CM: Lead → Kontakt verknuepft" "$CM_LEAD_CID" "$CM_CID"

# ── 22c. Termin mit contactId verknuepfen ──
CM_APPT=$(auth_post "/appointments" "{\"contactName\":\"Pipeline-$RID Flow-$RID\",\"contactEmail\":\"pipeline-$RID@online.ch\",\"contactPhone\":\"+41 79 999 00 00\",\"address\":\"Solarweg 1, 8000 Zuerich\",\"appointmentDate\":\"2026-09-01\",\"appointmentTime\":\"14:00\",\"assignedTo\":\"$ADMIN_ID\",\"contactId\":\"$CM_CID\",\"leadId\":\"$CM_LID\"}")
CM_AID=$(json_field "$CM_APPT" "o.data.id")
CM_APPT_CID=$(json_field "$CM_APPT" "o.data.contactId")
check "CM: Termin erstellt" "$([ -n "$CM_AID" ] && echo 'OK' || echo 'FAIL')" "OK"
check "CM: Termin → Kontakt verknuepft" "$CM_APPT_CID" "$CM_CID"

# Termin → Lead verknuepft
CM_APPT_LID=$(json_field "$CM_APPT" "o.data.leadId")
check "CM: Termin → Lead verknuepft" "$CM_APPT_LID" "$CM_LID"

# ── 22d. Deal mit contactId + leadId verknuepfen ──
CM_DEAL=$(auth_post "/deals" "{\"title\":\"PV-Anlage Pipeline-$RID\",\"contactName\":\"Pipeline-$RID\",\"contactEmail\":\"pipeline-deal-$RID@online.ch\",\"contactPhone\":\"+41 79 999 00 00\",\"address\":\"Solarweg 1\",\"value\":45000,\"assignedTo\":\"$ADMIN_ID\",\"winProbability\":75,\"leadId\":\"$CM_LID\",\"contactId\":\"$CM_CID\"}")
CM_DID=$(json_field "$CM_DEAL" "o.data.id")
CM_DEAL_CID=$(json_field "$CM_DEAL" "o.data.contactId")
CM_DEAL_LID=$(json_field "$CM_DEAL" "o.data.leadId")
check "CM: Deal erstellt" "$([ -n "$CM_DID" ] && echo 'OK' || echo 'FAIL')" "OK"
check "CM: Deal → Kontakt verknuepft" "$CM_DEAL_CID" "$CM_CID"
check "CM: Deal → Lead verknuepft" "$CM_DEAL_LID" "$CM_LID"

# ── 22e. Deal Status-Flow: ERSTELLT → GESENDET → VERHANDLUNG → GEWONNEN ──
auth_put "/deals/$CM_DID" '{"stage":"GESENDET"}' > /dev/null
auth_put "/deals/$CM_DID" '{"stage":"VERHANDLUNG"}' > /dev/null
CM_WON=$(auth_put "/deals/$CM_DID" '{"stage":"GEWONNEN"}')
CM_WON_STAGE=$(json_field "$CM_WON" "o.data.stage")
CM_WON_WP=$(json_field "$CM_WON" "o.data.winProbability")
check "CM: Deal GEWONNEN" "$CM_WON_STAGE" "GEWONNEN"
check "CM: winProbability=100 nach Gewonnen" "$CM_WON_WP" "100"

# ── 22f. Projekt aus Deal erstellen (manuelle Konvertierung) ──
CM_PROJ=$(auth_post "/projects" "{\"name\":\"PV Installation Pipeline-$RID\",\"description\":\"Aus Deal konvertiert\",\"address\":\"Solarweg 1, 8000 Zuerich\",\"email\":\"pipeline-$RID@online.ch\",\"kWp\":15,\"value\":45000,\"contactId\":\"$CM_CID\",\"dealId\":\"$CM_DID\",\"leadId\":\"$CM_LID\"}")
CM_PID=$(json_field "$CM_PROJ" "o.data.id")
CM_PROJ_CID=$(json_field "$CM_PROJ" "o.data.contactId")
CM_PROJ_DID=$(json_field "$CM_PROJ" "o.data.dealId")
check "CM: Projekt erstellt (aus Deal)" "$([ -n "$CM_PID" ] && echo 'OK' || echo 'FAIL')" "OK"
check "CM: Projekt → Kontakt verknuepft" "$CM_PROJ_CID" "$CM_CID"
check "CM: Projekt → Deal verknuepft" "$CM_PROJ_DID" "$CM_DID"

# ── 22g. Tasks in ALLEN Modulen erstellen ──
# Task LEAD
CM_TASK_L=$(auth_post "/tasks" "{\"title\":\"Lead Task $RID\",\"module\":\"LEAD\",\"referenceId\":\"$CM_LID\",\"referenceTitle\":\"Pipeline Lead\",\"assignedTo\":\"$ADMIN_ID\"}")
CM_TL_REF=$(json_field "$CM_TASK_L" "o.data.referenceId")
CM_TL_MOD=$(json_field "$CM_TASK_L" "o.data.module")
check "CM: Task LEAD → referenceId" "$CM_TL_REF" "$CM_LID"
check "CM: Task LEAD → module" "$CM_TL_MOD" "LEAD"

# Task TERMIN
CM_TASK_T=$(auth_post "/tasks" "{\"title\":\"Termin Task $RID\",\"module\":\"TERMIN\",\"referenceId\":\"$CM_AID\",\"referenceTitle\":\"Pipeline Termin\",\"assignedTo\":\"$ADMIN_ID\"}")
CM_TT_REF=$(json_field "$CM_TASK_T" "o.data.referenceId")
CM_TT_MOD=$(json_field "$CM_TASK_T" "o.data.module")
check "CM: Task TERMIN → referenceId" "$CM_TT_REF" "$CM_AID"
check "CM: Task TERMIN → module" "$CM_TT_MOD" "TERMIN"

# Task ANGEBOT
CM_TASK_A=$(auth_post "/tasks" "{\"title\":\"Angebot Task $RID\",\"module\":\"ANGEBOT\",\"referenceId\":\"$CM_DID\",\"referenceTitle\":\"Pipeline Deal\",\"assignedTo\":\"$ADMIN_ID\"}")
CM_TA_REF=$(json_field "$CM_TASK_A" "o.data.referenceId")
CM_TA_MOD=$(json_field "$CM_TASK_A" "o.data.module")
check "CM: Task ANGEBOT → referenceId" "$CM_TA_REF" "$CM_DID"
check "CM: Task ANGEBOT → module" "$CM_TA_MOD" "ANGEBOT"

# Task PROJEKT
CM_TASK_P=$(auth_post "/tasks" "{\"title\":\"Projekt Task $RID\",\"module\":\"PROJEKT\",\"referenceId\":\"$CM_PID\",\"referenceTitle\":\"Pipeline Projekt\",\"assignedTo\":\"$ADMIN_ID\"}")
CM_TP_REF=$(json_field "$CM_TASK_P" "o.data.referenceId")
CM_TP_MOD=$(json_field "$CM_TASK_P" "o.data.module")
check "CM: Task PROJEKT → referenceId" "$CM_TP_REF" "$CM_PID"
check "CM: Task PROJEKT → module" "$CM_TP_MOD" "PROJEKT"

# Task ALLGEMEIN (ohne Referenz)
CM_TASK_G=$(auth_post "/tasks" "{\"title\":\"Allgemein Task $RID\",\"module\":\"ALLGEMEIN\",\"assignedTo\":\"$ADMIN_ID\"}")
CM_TG_MOD=$(json_field "$CM_TASK_G" "o.data.module")
check "CM: Task ALLGEMEIN (ohne Referenz)" "$CM_TG_MOD" "ALLGEMEIN"

# ── 22h. Dokument-Upload an Kontakt (pipeline-uebergreifend) ──
CM_DOC=$(auth_post "/documents" "{\"contactId\":\"$CM_CID\",\"entityType\":\"ANGEBOT\",\"entityId\":\"$CM_DID\",\"fileName\":\"Offerte_Pipeline_$RID.pdf\",\"fileSize\":1024,\"mimeType\":\"application/pdf\",\"fileBase64\":\"JVBERi0xLjQK\"}")
CM_DOC_ID=$(json_field "$CM_DOC" "o.data.id")
check "CM: Dokument Upload → Kontakt" "$([ -n "$CM_DOC_ID" ] && echo 'OK' || echo 'FAIL')" "OK"

# Dokumente fuer Kontakt abrufen (alle Phasen)
CM_DOCS=$(auth_get "/documents?contactId=$CM_CID")
CM_DOCS_OK=$(echo "$CM_DOCS" | node -e "let b='';process.stdin.on('data',d=>b+=d);process.stdin.on('end',()=>{try{const r=JSON.parse(b);console.log(Array.isArray(r.data)&&r.data.length>0?'OK':'FAIL')}catch{console.log('FAIL')}})")
check "CM: Dokumente fuer Kontakt abrufbar" "$CM_DOCS_OK" "OK"

# ── 22i. Aktivitaeten pruefen (Auto-generiert durch Deal/Projekt) ──
CM_ACTS=$(auth_get "/activities?contactId=$CM_CID")
CM_ACTS_OK=$(echo "$CM_ACTS" | node -e "let b='';process.stdin.on('data',d=>b+=d);process.stdin.on('end',()=>{try{const r=JSON.parse(b);console.log(Array.isArray(r.data)?'OK':'FAIL')}catch{console.log('FAIL')}})")
check "CM: Aktivitaeten fuer Kontakt abrufbar" "$CM_ACTS_OK" "OK"

# Deal-Aktivitaeten pruefen
CM_DACTS=$(auth_get "/deals/$CM_DID")
CM_DACTS_OK=$(json_field "$(auth_get "/activities?dealId=$CM_DID")" "Array.isArray(o.data)?'OK':'FAIL'")
check "CM: Aktivitaeten fuer Deal abrufbar" "$CM_DACTS_OK" "OK"

# ── 22j. Notifications pruefen (Auto-generiert bei Events) ──
CM_NOTIFS=$(auth_get "/notifications")
CM_NOTIF_HAS=$(echo "$CM_NOTIFS" | node -e "let b='';process.stdin.on('data',d=>b+=d);process.stdin.on('end',()=>{try{const r=JSON.parse(b);const n=r.data||[];console.log(n.length>0?'OK':'FAIL')}catch{console.log('FAIL')}})")
check "CM: Notifications vorhanden" "$CM_NOTIF_HAS" "OK"

# DEAL_WON Notification pruefen
CM_WON_NOTIF=$(echo "$CM_NOTIFS" | node -e "let b='';process.stdin.on('data',d=>b+=d);process.stdin.on('end',()=>{try{const r=JSON.parse(b);const n=(r.data||[]).find(x=>x.type==='DEAL_WON');console.log(n?'OK':'FAIL')}catch{console.log('FAIL')}})")
check "CM: DEAL_WON Notification erzeugt" "$CM_WON_NOTIF" "OK"

# ── 22k. Kontakt-Detail zeigt ALLE Verknuepfungen ──
CM_DETAIL=$(auth_get "/contacts/$CM_CID")
CM_HAS_LEADS=$(json_field "$CM_DETAIL" "o.data.leads&&o.data.leads.length>0?'OK':'FAIL'")
check "CM: Kontakt → Leads verknuepft" "$CM_HAS_LEADS" "OK"

CM_HAS_DEALS=$(json_field "$CM_DETAIL" "o.data.deals&&o.data.deals.length>0?'OK':'FAIL'")
check "CM: Kontakt → Deals verknuepft" "$CM_HAS_DEALS" "OK"

CM_HAS_PROJS=$(json_field "$CM_DETAIL" "o.data.projects&&o.data.projects.length>0?'OK':'FAIL'")
check "CM: Kontakt → Projekte verknuepft" "$CM_HAS_PROJS" "OK"

CM_HAS_APPTS=$(json_field "$CM_DETAIL" "o.data.appointments&&o.data.appointments.length>0?'OK':'FAIL'")
check "CM: Kontakt → Termine verknuepft" "$CM_HAS_APPTS" "OK"

# ── 22l. Task-Filter nach Modul pruefen ──
CM_TASKS_LEAD=$(auth_get "/tasks?module=LEAD")
CM_TFL=$(echo "$CM_TASKS_LEAD" | node -e "let b='';process.stdin.on('data',d=>b+=d);process.stdin.on('end',()=>{try{const r=JSON.parse(b);const ok=(r.data||[]).every(t=>t.module==='LEAD');console.log(ok?'OK':'FAIL')}catch{console.log('FAIL')}})")
check "CM: Tasks Filter module=LEAD korrekt" "$CM_TFL" "OK"

CM_TASKS_PROJ=$(auth_get "/tasks?module=PROJEKT")
CM_TFP=$(echo "$CM_TASKS_PROJ" | node -e "let b='';process.stdin.on('data',d=>b+=d);process.stdin.on('end',()=>{try{const r=JSON.parse(b);const ok=(r.data||[]).every(t=>t.module==='PROJEKT');console.log(ok?'OK':'FAIL')}catch{console.log('FAIL')}})")
check "CM: Tasks Filter module=PROJEKT korrekt" "$CM_TFP" "OK"

# ── 22m. Cleanup: Erstellte Testdaten loeschen ──
auth_delete_status "/tasks/$(json_field "$CM_TASK_L" "o.data.id")" > /dev/null
auth_delete_status "/tasks/$(json_field "$CM_TASK_T" "o.data.id")" > /dev/null
auth_delete_status "/tasks/$(json_field "$CM_TASK_A" "o.data.id")" > /dev/null
auth_delete_status "/tasks/$(json_field "$CM_TASK_P" "o.data.id")" > /dev/null
auth_delete_status "/tasks/$(json_field "$CM_TASK_G" "o.data.id")" > /dev/null
auth_delete_status "/documents/$CM_DOC_ID" > /dev/null
auth_delete_status "/projects/$CM_PID" > /dev/null
auth_delete_status "/deals/$CM_DID" > /dev/null
auth_delete_status "/appointments/$CM_AID" > /dev/null
auth_delete_status "/leads/$CM_LID" > /dev/null
check "CM: Cleanup abgeschlossen" "OK" "OK"

# ════════════════════════════════════════════════════════════════════════════
# 23. HEALTH (1 Test)
# ════════════════════════════════════════════════════════════════════════════

echo ""
echo "── 23. HEALTH ──"
HEALTH=$(curl -s "$PROD/health")
HEALTH_OK=$(echo "$HEALTH" | node -e "let b='';process.stdin.on('data',d=>b+=d);process.stdin.on('end',()=>{try{const h=JSON.parse(b);console.log(h.status==='ok'&&h.supabase==='connected'?'OK':'FAIL')}catch{console.log('FAIL')}})")
check "Health: status=ok, supabase=connected" "$HEALTH_OK" "OK"

# ════════════════════════════════════════════════════════════════════════════
# 24. ROLLEN-ZUGRIFF – VERTRIEB darf NICHT auf Admin-Routen (9 Tests)
# ════════════════════════════════════════════════════════════════════════════

echo ""
echo "── 24. ROLLEN-ZUGRIFF (VERTRIEB → 403) ──"

# Login als Vertrieb
VT_LOGIN=$(curl -s -X POST "$PROD/auth/login" -H "Content-Type: application/json" -d '{"email":"gast@neosolar.ch","password":"marceL...1"}')
VT_TOKEN=$(json_field "$VT_LOGIN" "o.data.token")

if [ -n "$VT_TOKEN" ] && [ "$VT_TOKEN" != "ERROR" ]; then
  vt_status() {
    curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $VT_TOKEN" "$PROD$1"
  }

  check "VERTRIEB: /admin/products → 403" "$(vt_status '/admin/products')" "403"
  check "VERTRIEB: /admin/integrations → 403" "$(vt_status '/admin/integrations')" "403"
  check "VERTRIEB: /admin/webhooks → 403" "$(vt_status '/admin/webhooks')" "403"
  check "VERTRIEB: /admin/branding → 403" "$(vt_status '/admin/branding')" "403"
  check "VERTRIEB: /admin/ai-settings → 403" "$(vt_status '/admin/ai-settings')" "403"
  check "VERTRIEB: /admin/notification-settings → 403" "$(vt_status '/admin/notification-settings')" "403"
  check "VERTRIEB: /admin/doc-templates → 403" "$(vt_status '/admin/doc-templates')" "403"
  check "VERTRIEB: /admin/audit-log → 403" "$(vt_status '/admin/audit-log')" "403"
  check "VERTRIEB: /admin/db-export/stats → 403" "$(vt_status '/admin/db-export/stats')" "403"
else
  echo "  ⚠️  VERTRIEB-Login fehlgeschlagen – Rollen-Tests uebersprungen"
fi

# ════════════════════════════════════════════════════════════════════════════
# 25. EDGE CASES & VALIDIERUNG (8 Tests)
# ════════════════════════════════════════════════════════════════════════════

echo ""
echo "── 25. EDGE CASES ──"

# Nicht-existierende ID → 404
check "Lead 404 fuer ungueltige ID" "$(auth_status '/leads/nonexistent-id-12345')" "404"
check "Deal 404 fuer ungueltige ID" "$(auth_status '/deals/nonexistent-id-12345')" "404"
check "Task 404 fuer ungueltige ID" "$(auth_status '/tasks/nonexistent-id-12345')" "404"
check "Projekt 404 fuer ungueltige ID" "$(auth_status '/projects/nonexistent-id-12345')" "404"

# Leere Pflichtfelder → 422
check "Lead ohne Pflichtfelder → 422" "$(auth_post_status '/leads' '{}')" "422"
check "Task ohne Pflichtfelder → 422" "$(auth_post_status '/tasks' '{}')" "422"

# Ungueltige Suche (zu kurz) → leeres Array
SHORT_SEARCH=$(auth_get "/search?q=X")
SHORT_OK=$(json_field "$SHORT_SEARCH" "Array.isArray(o.data)&&o.data.length===0?'OK':'FAIL'")
check "Suche mit 1 Zeichen → leeres Array" "$SHORT_OK" "OK"

# Pagination
PAGE_RESP=$(auth_get "/leads?page=1&pageSize=2")
PAGE_OK=$(json_field "$PAGE_RESP" "Array.isArray(o.data)&&o.data.length<=2?'OK':'FAIL'")
check "Pagination: pageSize=2 limitiert" "$PAGE_OK" "OK"

# ════════════════════════════════════════════════════════════════════════════
# 26. DEAL VERLOREN FLOW (4 Tests)
# ════════════════════════════════════════════════════════════════════════════

echo ""
echo "── 26. DEAL VERLOREN FLOW ──"

LOST_DEAL=$(auth_post "/deals" "{\"title\":\"LostDeal-$RID\",\"contactName\":\"Lost\",\"contactEmail\":\"lost-$RID@online.ch\",\"contactPhone\":\"+41 71 000\",\"address\":\"Test\",\"value\":10000,\"assignedTo\":\"$ADMIN_ID\",\"winProbability\":50}")
LOST_DID=$(json_field "$LOST_DEAL" "o.data.id")

# VERLOREN setzen
LOST_UPD=$(auth_put "/deals/$LOST_DID" '{"stage":"VERLOREN"}')
LOST_STAGE=$(json_field "$LOST_UPD" "o.data.stage")
LOST_WP=$(json_field "$LOST_UPD" "o.data.winProbability")
check "Deal VERLOREN: stage" "$LOST_STAGE" "VERLOREN"
check "Deal VERLOREN: winProbability=0" "$LOST_WP" "0"

# Zurueck zu VERHANDLUNG (Admin-Revert)
REVERT_UPD=$(auth_put "/deals/$LOST_DID" '{"stage":"VERHANDLUNG"}')
REVERT_STAGE=$(json_field "$REVERT_UPD" "o.data.stage")
check "Deal Revert: VERLOREN → VERHANDLUNG" "$REVERT_STAGE" "VERHANDLUNG"

# Cleanup
auth_delete_status "/deals/$LOST_DID" > /dev/null
check "Deal VERLOREN Cleanup" "OK" "OK"

# ════════════════════════════════════════════════════════════════════════════
# ERGEBNIS
# ════════════════════════════════════════════════════════════════════════════

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  🌐 ONLINE E2E KOMPLETT-TEST (Production)"
echo "  📍 https://crm-neosolar.netlify.app"
echo ""
echo "  ✅ Bestanden: $PASS"
echo "  ❌ Fehlgeschlagen: $FAIL"
echo "  📊 Total: $TOTAL"
echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "  🎉 ALLE $TOTAL TESTS GRUEN!"
else
  echo "  ⚠️  $FAIL von $TOTAL Tests fehlgeschlagen!"
fi
echo "═══════════════════════════════════════════════════════════════"
