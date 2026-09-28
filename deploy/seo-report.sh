#!/usr/bin/env bash
# datapit.io weekly SEO health report — installed as /usr/local/bin/datapit-seo-report.sh,
# run every Monday at 07:00 server time by datapit-seo-report.timer.
# See RUNBOOK.md "Weekly SEO report".
#
# Checks:
#   1. every <loc> in sitemap.xml answers 200 without a redirect, has a
#      canonical pointing at itself, is not noindex, and has a <title> that is
#      present, unique across the sitemap and at most 60 characters
#   2. robots.txt (with its Sitemap line), llms.txt and llms-full.txt, the
#      www -> bare-domain and http -> https redirects, and a real 404
#   3. stale competitor facts: the "Last updated" date on /alternatives/ and
#      /compare/ pages, and the competitor-prices "Checked" date on /pricing,
#      older than STALE_DAYS (90) — competitor prices are re-checked quarterly
#   4. the search/AI crawler summary from ai-crawlers.sh for the last 7 days
#
# and emails one HTML report, with every page's details attached as a CSV,
# through the same Resend account as healthwatch.sh (key read from backend/.env).
#
#   datapit-seo-report.sh --test      print the report instead of emailing it
#   datapit-seo-report.sh --dry-run   same as --test
#   datapit-seo-report.sh --html      print the email's HTML instead (also sends nothing)
#
# Exits 0 once the report is sent (whatever it found), 1 if it could not be.
set -uo pipefail
shopt -u patsub_replacement 2>/dev/null || true   # bash 5.2+: keep '&' literal in ${x//a/b}
export LC_ALL=C.UTF-8                             # ${#title} counts characters, not bytes
umask 077                                         # the temp dir holds the API key header

ENV_FILE=/var/www/datapit.io/app/backend/.env
ALERT_TO="${ALERT_TO:-help.datapit@gmail.com}"
SITE="${SITE:-https://datapit.io}"; SITE=${SITE%/}
HOST=${SITE#*://}
STALE_DAYS="${STALE_DAYS:-90}"
DUE_SOON_DAYS=14     # mention content that goes stale within this many days
PERIOD_DAYS=7        # crawler summary window
MAX_TITLE=60
MAX_ROWS=200         # issue rows in the email; the attached CSV always has every page
MAX_CRAWL_LINES=150  # crawler summary lines in the email (a long "Turned away" list is cut)
# Seconds for the sitemap pages. When a slow site uses it up, the rest are
# reported as not checked, so the email still goes out well inside the unit's
# TimeoutStartSec=30min (site checks ~3 min + this + crawlers 5 min + mail).
PAGE_BUDGET="${PAGE_BUDGET:-1080}"
UA="datapit-seo-report/1.0 (+$SITE)"
US=$'\x1f'           # field separator for curl's --write-out
NOINDEX_RE='noindex|[,; ]none[,; ]'   # "none" means noindex,nofollow; max-image-preview:none doesn't

# ai-crawlers.sh lives in the repo; this script is usually a copy in /usr/local/bin.
CRAWLERS="${CRAWLERS:-}"
if [ -z "$CRAWLERS" ]; then
  for c in "$(dirname "$(readlink -f "$0")")/ai-crawlers.sh" /var/www/datapit.io/app/deploy/ai-crawlers.sh; do
    if [ -f "$c" ]; then CRAWLERS=$c; break; fi
  done
fi

MODE=mail FORMAT=text
for arg in "$@"; do
  case $arg in
    --test|--dry-run) MODE=print ;;
    --html) MODE=print FORMAT=html ;;   # never mails, with or without --test
    -h|--help) sed -n '2,/^set -uo/{/^set -uo/d;s/^# \{0,1\}//;p;}' "$0"; exit 0 ;;
    *) echo "unknown option: $arg (try --help)" >&2; exit 2 ;;
  esac
done

TMP=$(mktemp -d) || exit 1
trap 'rm -rf "$TMP"' EXIT

# ---------------------------------------------------------------- helpers

trim() { local s=$1; s=${s#"${s%%[![:space:]]*}"}; s=${s%"${s##*[![:space:]]}"}; printf '%s' "$s"; }

# h and json_str run byte-wise (LC_ALL=C): every character they replace is
# ASCII, and UTF-8 never uses those bytes inside a multibyte character, so the
# output is the same, but bash's ${s//x/y} is quadratic in a UTF-8 locale: a
# 165 kB string (a long crawler section) took over a minute instead of < 1s.

# HTML-escape a value for the email body.
h() {
  local LC_ALL=C s=$1
  s=${s//&/"&amp;"}; s=${s//</"&lt;"}; s=${s//>/"&gt;"}; s=${s//\"/"&quot;"}; s=${s//\'/"&#39;"}
  printf '%s' "$s"
}

# Decode the entities React writes into <title> and attribute values.
unent() {
  local s=$1
  s=${s//"&lt;"/"<"}; s=${s//"&gt;"/">"}; s=${s//"&quot;"/"\""}; s=${s//"&#39;"/"'"}
  s=${s//"&#x27;"/"'"}; s=${s//"&#x2F;"/"/"}; s=${s//"&nbsp;"/" "}; s=${s//"&amp;"/"&"}
  printf '%s' "$s"
}

# A JSON string literal (quotes included) for the Resend request body. Titles,
# the HTML and the crawler output hold quotes, backslashes and newlines.
json_str() {
  local LC_ALL=C s=$1 bs='\'
  s=${s//"$bs"/"$bs$bs"}
  s=${s//\"/"$bs\""}
  s=${s//$'\n'/"${bs}n"}
  s=${s//$'\r'/"${bs}r"}
  s=${s//$'\t'/"${bs}t"}
  s=${s//[$'\001'-$'\037']/}
  printf '"%s"' "$s"
}

# One CSV row, every field quoted.
csv() { local out="" f; for f in "$@"; do out+="\"${f//\"/\"\"}\","; done; printf '%s\n' "${out%,}"; }

# attr NAME: the value of attribute NAME (any case) in the tag(s) on stdin.
attr() {
  sed -n -e "s/.*[[:space:]]$1=\"\([^\"]*\)\".*/\1/Ip;t" -e "s/.*[[:space:]]$1='\([^']*\)'.*/\1/Ip"
}

count_lines() { if [ -z "$1" ]; then echo 0; else printf '%s\n' "$1" | grep -c .; fi; }

# The path of a URL on this site, or the whole URL for anything else.
pth() { local p=${1#"$SITE"}; [ "$p" = "$1" ] && p=$1; printf '%s' "${p:-/}"; }

# fetch URL [curl options]: body -> $TMP/body, response headers -> $TMP/headers.
# Sets F_RC (curl exit), F_CODE, F_URL (final URL), F_MS, F_REDIRS, F_TYPE and
# F_LOC (where a redirect points, when not following it).
fetch() {
  local url=$1 out secs frac; shift
  : > "$TMP/body"; : > "$TMP/headers"
  out=$(curl -sS -m 20 --compressed -A "$UA" -o "$TMP/body" -D "$TMP/headers" \
    -w "%{http_code}$US%{url_effective}$US%{time_total}$US%{num_redirects}$US%{content_type}$US%{redirect_url}" \
    "$@" "$url" 2>"$TMP/curl.err")
  F_RC=$?
  IFS=$US read -r F_CODE F_URL secs F_REDIRS F_TYPE F_LOC <<<"$out"
  F_CODE=${F_CODE:-000}; F_REDIRS=${F_REDIRS:-0}; F_TYPE=${F_TYPE,,}
  secs=${secs:-0}; [[ $secs == *.* ]] || secs+=.0
  frac=${secs#*.}000
  F_MS=$(( 10#${secs%%.*} * 1000 + 10#${frac:0:3} ))
}
cerr() { printf 'request failed: %s' "$(head -c 200 "$TMP/curl.err" | tr -d '\r\n')"; }

I_WHERE=() I_CHECK=() I_DETAIL=() NOTES=()
issue() { I_WHERE+=("$1"); I_CHECK+=("$2"); I_DETAIL+=("$3"); }

NOW=$(date +%s)
STAMP=$(date -u '+%Y-%m-%d %H:%M UTC')
SINCE=$(date -d "$PERIOD_DAYS days ago" +%F)

# ---------------------------------------------------------------- site-wide checks

expect_redirect() { # URL, where it must 301 to
  fetch "$1"
  if [ "$F_RC" -ne 0 ]; then issue "$1" "redirect" "$(cerr)"
  elif [ "$F_CODE" != 301 ] || [ "$F_LOC" != "$2" ]; then
    issue "$1" "redirect" "expected a 301 to $2, got HTTP $F_CODE${F_LOC:+ to $F_LOC}"
  fi
}

expect_text() { # URL of a plain-text file that must be served and non-empty
  local p; p=$(pth "$1")
  fetch "$1"
  if [ "$F_RC" -ne 0 ]; then issue "$p" "status" "$(cerr)"; return 1; fi
  if [ "$F_CODE" != 200 ]; then issue "$p" "status" "HTTP $F_CODE"; return 1; fi
  [[ $F_TYPE == text/plain* ]] || issue "$p" "content type" "served as ${F_TYPE:-no content type}, expected text/plain"
  [ -s "$TMP/body" ] || { issue "$p" "empty" "the file is empty"; return 1; }
}

if expect_text "$SITE/robots.txt"; then
  tr -d '\r' < "$TMP/body" | grep -i '^[[:space:]]*sitemap:' | grep -qF "$SITE/sitemap.xml" \
    || issue "/robots.txt" "sitemap line" "no \"Sitemap: $SITE/sitemap.xml\" line"
  tr -d '\r' < "$TMP/body" | grep -qiE '^[[:space:]]*disallow:[[:space:]]*/[[:space:]]*$' \
    && issue "/robots.txt" "blocks all" "has a bare \"Disallow: /\" line; check which crawlers it shuts out"
fi
expect_text "$SITE/llms.txt"
expect_text "$SITE/llms-full.txt"

expect_redirect "https://www.$HOST/" "$SITE/"
expect_redirect "http://$HOST/" "https://$HOST/"
expect_redirect "http://www.$HOST/pricing" "https://$HOST/pricing"   # one hop, path kept
expect_redirect "$SITE/pricing/" "$SITE/pricing"
expect_redirect "$SITE/pricing.html" "$SITE/pricing"

PROBE="$SITE/seo-report-probe-$RANDOM$RANDOM"
fetch "$PROBE"
[ "$F_CODE" = 404 ] || issue "$(pth "$PROBE")" "404" "an unknown URL returned HTTP $F_CODE, expected 404 (soft 404s get indexed)"

# ---------------------------------------------------------------- sitemap pages

LOCS=()
read_sitemap() { # URL, depth (a sitemap index is followed one level)
  local locs l
  fetch "$1"
  if [ "$F_RC" -ne 0 ]; then issue "$(pth "$1")" "sitemap" "$(cerr)"; return; fi
  if [ "$F_CODE" != 200 ]; then issue "$(pth "$1")" "sitemap" "HTTP $F_CODE"; return; fi
  [[ $F_TYPE == *xml* ]] || issue "$(pth "$1")" "sitemap" "served as ${F_TYPE:-no content type}, expected XML"
  locs=$(tr -d '\r\n' < "$TMP/body" | grep -o '<loc>[^<]*</loc>' | sed 's#</\{0,1\}loc>##g')
  if grep -q '<sitemapindex' "$TMP/body" && [ "$2" -lt 1 ]; then
    while IFS= read -r l; do l=$(trim "$l"); [ -n "$l" ] && read_sitemap "$(unent "$l")" 1; done <<<"$locs"
  else
    while IFS= read -r l; do l=$(trim "$l"); [ -n "$l" ] && LOCS+=("$(unent "$l")"); done <<<"$locs"
  fi
}
read_sitemap "$SITE/sitemap.xml" 0
[ "${#LOCS[@]}" -gt 0 ] || issue "/sitemap.xml" "sitemap" "no <loc> entries found"

# Where a page's freshness date is edited, for the stale message.
date_source() {
  case $1 in
    /pricing) echo "COMPETITOR_PRICES_CHECKED in frontend/src/data/competitors.js" ;;
    *) echo "meta.updated in frontend/src/content/pages${1}.js" ;;
  esac
}

# Checks on a page that answered 200; reads url and p, sets title, robots,
# canonical and cdate for the CSV.
check_page() {
  local tags n label re ts age
  tr '\r\n\t' '   ' < "$TMP/body" > "$TMP/flat"
  sed 's#</head>.*##I' "$TMP/flat" > "$TMP/head.html"

  tags=$(grep -oiE '<title[^>]*>[^<]*</title>' "$TMP/head.html")
  n=$(count_lines "$tags")
  title=$(trim "$(unent "$(printf '%s\n' "$tags" | head -1 | sed 's/<[^>]*>//g')")")
  if [ -z "$title" ]; then
    issue "$p" "title" "missing"
  else
    [ "$n" -gt 1 ] && issue "$p" "title" "$n <title> tags in <head>"
    [ "${#title}" -gt "$MAX_TITLE" ] && issue "$p" "title" "${#title} characters (keep to $MAX_TITLE): $title"
    if [ -n "${TITLE_AT[$title]:-}" ]; then
      issue "$p" "title" "same title as ${TITLE_AT[$title]}: $title"
    else
      TITLE_AT[$title]=$p
    fi
  fi

  robots=$(grep -oiE "<meta[^>]*name=[\"'](robots|googlebot)[\"'][^>]*>" "$TMP/head.html" | attr content | paste -sd';' -)
  local xrobots
  xrobots=$(grep -i '^x-robots-tag:' "$TMP/headers" | cut -d: -f2- | tr -d '\r' | paste -sd';' -)
  if [[ ",${robots,,};${xrobots,,}," =~ $NOINDEX_RE ]]; then
    issue "$p" "noindex" "noindex page listed in the sitemap (${robots:+robots: $robots}${robots:+${xrobots:+; }}${xrobots:+X-Robots-Tag:$xrobots}); publish it or drop it from the sitemap"
  fi

  tags=$(grep -oiE "<link[^>]*rel=[\"']canonical[\"'][^>]*>" "$TMP/head.html")
  n=$(count_lines "$tags")
  canonical=$(unent "$(printf '%s\n' "$tags" | head -1 | attr href)")
  if [ -z "$canonical" ]; then
    issue "$p" "canonical" "missing"
  else
    [ "$n" -gt 1 ] && issue "$p" "canonical" "$n canonical tags"
    [ "$canonical" != "$url" ] && issue "$p" "canonical" "points to $canonical, not the page itself"
  fi

  label="" re=""
  case $p in
    /alternatives/*|/compare/*) label="Last updated" re="Last updated" ;;
    /pricing) label="Competitor prices checked" re="Checked" ;;
  esac
  [ -n "$label" ] || return 0
  cdate=$(grep -oE "$re([^<]|<!-- -->)*<time[^>]*>" "$TMP/flat" | head -1 | attr datetime)
  if [ -z "$cdate" ] && [ "$re" = "Last updated" ]; then
    cdate=$(grep -oiE '<time[^>]*>' "$TMP/flat" | attr datetime | head -1)
  fi
  if [ -z "$cdate" ]; then
    issue "$p" "freshness" "no visible \"$label\" date found"
    return 0
  fi
  ts=$(date -d "${cdate:0:10}" +%s 2>/dev/null)
  if [ -z "$ts" ]; then
    issue "$p" "freshness" "unreadable \"$label\" date: $cdate"
    return 0
  fi
  age=$(( (NOW - ts) / 86400 ))
  if [ "$age" -gt "$STALE_DAYS" ]; then
    issue "$p" "stale" "$label $cdate, $age days ago: re-check the competitor prices and figures, then bump $(date_source "$p")"
  elif [ "$age" -gt $(( STALE_DAYS - DUE_SOON_DAYS )) ]; then
    NOTES+=("$p: $label $cdate, due for a re-check in $(( STALE_DAYS - age )) days")
  fi
}

declare -A SEEN_LOC=() TITLE_AT=()
PAGES=0 TOTAL_MS=0
: > "$TMP/times"
CSV_NAME="$HOST-seo-pages-$(date +%F).csv"
csv url status final_url response_ms title title_chars robots canonical content_date > "$TMP/pages.csv"

PAGE_DEADLINE=$((SECONDS + PAGE_BUDGET))
for url in "${LOCS[@]}"; do
  if [ "$SECONDS" -ge "$PAGE_DEADLINE" ]; then
    issue "/sitemap.xml" "not checked" "stopped after $PAGES of ${#LOCS[@]} pages when the ${PAGE_BUDGET}s time budget ran out; the site may be slow (see the response times)"
    break
  fi
  p=$(pth "$url")
  if [ -n "${SEEN_LOC[$url]:-}" ]; then issue "$p" "sitemap" "listed more than once"; continue; fi
  SEEN_LOC[$url]=1
  [[ $url == "$SITE"/* ]] || issue "$p" "sitemap" "not a $SITE URL"

  title="" robots="" canonical="" cdate=""
  fetch "$url" -L --max-redirs 5
  PAGES=$((PAGES + 1)); TOTAL_MS=$((TOTAL_MS + F_MS))

  if [ "$F_RC" -ne 0 ]; then
    issue "$p" "unreachable" "$(cerr)"
  elif [ "$F_REDIRS" -gt 0 ]; then
    issue "$p" "redirect" "redirects to $F_URL (HTTP $F_CODE); list the final URL in the sitemap"
  elif [ "$F_CODE" != 200 ]; then
    issue "$p" "status" "HTTP $F_CODE"
  else
    check_page
  fi
  printf '%s\t%s\t%s\t%s\n' "$F_MS" "$F_CODE" "$p" "$title" >> "$TMP/times"
  csv "$url" "$F_CODE" "$F_URL" "$F_MS" "$title" "${#title}" "$robots" "$canonical" "$cdate" >> "$TMP/pages.csv"
done

# ---------------------------------------------------------------- crawlers

if [ -n "$CRAWLERS" ]; then
  CRAWL_OUT=$(SINCE=$SINCE timeout 300 bash "$CRAWLERS" 2>&1); CRAWL_RC=$?
else
  CRAWL_OUT="ai-crawlers.sh not found (set CRAWLERS=/path/to/ai-crawlers.sh)"; CRAWL_RC=127
fi
if [ "$CRAWL_RC" -eq 0 ]; then
  # A crawler getting 403, 429 or 5xx on a public page is being turned away.
  while read -r bot code path count; do
    case $path in /api|/api/*|/metrics*) continue ;; esac
    case $code in 403|429|5??) issue "$path" "crawler blocked" "$bot got HTTP $code, ${count}x since $SINCE" ;; esac
  done < <(printf '%s\n' "$CRAWL_OUT" | sed -n '/^Turned away/,$p' | tail -n +2)
else
  CRAWL_OUT="Crawler summary unavailable (ai-crawlers.sh exited $CRAWL_RC):
$CRAWL_OUT"
fi
# Every 403/429/5xx above is already an issue; the email only needs the top of the list.
CRAWL_LINES=$(printf '%s\n' "$CRAWL_OUT" | wc -l)
if [ "$CRAWL_LINES" -gt "$MAX_CRAWL_LINES" ]; then
  CRAWL_OUT="$(printf '%s\n' "$CRAWL_OUT" | head -n "$MAX_CRAWL_LINES")
…and $((CRAWL_LINES - MAX_CRAWL_LINES)) more lines: run SINCE=$SINCE bash $CRAWLERS on the server for all of them."
fi

# ---------------------------------------------------------------- report

N=${#I_WHERE[@]}
if [ "$N" -eq 0 ]; then SUBJECT="$HOST SEO weekly: all clear"
elif [ "$N" -eq 1 ]; then SUBJECT="$HOST SEO weekly: 1 issue"
else SUBJECT="$HOST SEO weekly: $N issues"; fi

AVG_MS=0; [ "$PAGES" -gt 0 ] && AVG_MS=$((TOTAL_MS / PAGES))
SLOWEST=$(sort -t$'\t' -k1,1nr "$TMP/times" | head -5)
IFS=$'\t' read -r TOP_MS _ TOP_PATH _ <<<"$SLOWEST"

SUMMARY1="Checked $PAGES sitemap page$([ "$PAGES" -eq 1 ] || echo s) on $SITE at $STAMP from $(hostname)."
SUMMARY2="Average response ${AVG_MS} ms, slowest ${TOP_MS:-0} ms (${TOP_PATH:-none})."
SUMMARY3="Also checked: robots.txt, llms.txt, llms-full.txt, the www and http redirects, the 404 page, and competitor dates older than $STALE_DAYS days."
if [ "$N" -eq 0 ]; then SUMMARY0="All clear: nothing needs attention this week."
else SUMMARY0="$N issue$([ "$N" -eq 1 ] || echo s) need$([ "$N" -eq 1 ] && echo s) attention."; fi

# --- text (the email's plain-text part, and what --test prints)
TEXT="$SUBJECT

$SUMMARY0
$SUMMARY1
$SUMMARY2
$SUMMARY3
"
if [ "$N" -gt 0 ]; then
  TEXT+=$'\n'"ISSUES"$'\n'
  for i in "${!I_WHERE[@]}"; do
    TEXT+=$(printf '  %-34s %-16s %s' "${I_WHERE[$i]}" "${I_CHECK[$i]}" "${I_DETAIL[$i]}")$'\n'
  done
fi
if [ "${#NOTES[@]}" -gt 0 ]; then
  TEXT+=$'\n'"DUE SOON"$'\n'
  for note in "${NOTES[@]}"; do TEXT+="  $note"$'\n'; done
fi
TEXT+=$'\n'"SLOWEST PAGES"$'\n'
while IFS=$'\t' read -r ms code path _; do
  [ -n "$ms" ] && TEXT+=$(printf '  %6s ms  %s  %s' "$ms" "$code" "$path")$'\n'
done <<<"$SLOWEST"
TEXT+=$'\n'"SEARCH AND AI CRAWLERS SINCE $SINCE"$'\n'"$CRAWL_OUT"$'\n'

PAGE_TABLE=$'\n'"ALL PAGES (status, ms, title length, path, title)"$'\n'
while IFS=$'\t' read -r ms code path title; do
  PAGE_TABLE+=$(printf '  %s %5s  %3s  %-40s %s' "$code" "$ms" "${#title}" "$path" "$title")$'\n'
done < "$TMP/times"

# --- HTML
TD='style="padding:6px 8px;border-top:1px solid #e5e7eb;vertical-align:top"'
HTML="<div style=\"font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#111827;max-width:780px\">"
HTML+="<h2 style=\"font-size:18px;margin:0 0 12px\">$(h "$SUBJECT")</h2>"
HTML+="<p style=\"margin:0 0 12px\"><strong>$(h "$SUMMARY0")</strong><br>$(h "$SUMMARY1")<br>$(h "$SUMMARY2")<br><span style=\"color:#6b7280\">$(h "$SUMMARY3")</span></p>"
if [ "$N" -gt 0 ]; then
  HTML+="<h3 style=\"font-size:15px;margin:20px 0 6px\">Issues</h3>"
  HTML+="<table cellspacing=\"0\" style=\"border-collapse:collapse;width:100%;font-size:13px\">"
  HTML+="<tr style=\"background:#f3f4f6;text-align:left\"><th $TD>Page</th><th $TD>Check</th><th $TD>Detail</th></tr>"
  for i in "${!I_WHERE[@]}"; do
    [ "$i" -ge "$MAX_ROWS" ] && break
    where=${I_WHERE[$i]}
    case $where in
      /*) cell="<a href=\"$(h "$SITE$where")\" style=\"color:#1d4ed8\">$(h "$where")</a>" ;;
      *) cell=$(h "$where") ;;
    esac
    HTML+="<tr><td $TD>$cell</td><td $TD>$(h "${I_CHECK[$i]}")</td><td $TD>$(h "${I_DETAIL[$i]}")</td></tr>"
  done
  HTML+="</table>"
  [ "$N" -gt "$MAX_ROWS" ] && HTML+="<p>…and $((N - MAX_ROWS)) more; the attached CSV has every page.</p>"
fi
if [ "${#NOTES[@]}" -gt 0 ]; then
  HTML+="<h3 style=\"font-size:15px;margin:20px 0 6px\">Due for a re-check soon</h3><ul style=\"margin:0;padding-left:20px\">"
  for note in "${NOTES[@]}"; do HTML+="<li>$(h "$note")</li>"; done
  HTML+="</ul>"
fi
HTML+="<h3 style=\"font-size:15px;margin:20px 0 6px\">Slowest pages</h3><table cellspacing=\"0\" style=\"border-collapse:collapse;font-size:13px\">"
while IFS=$'\t' read -r ms code path _; do
  [ -n "$ms" ] && HTML+="<tr><td $TD>$(h "$path")</td><td $TD align=\"right\">$ms ms</td><td $TD>$code</td></tr>"
done <<<"$SLOWEST"
HTML+="</table>"
HTML+="<h3 style=\"font-size:15px;margin:20px 0 6px\">Search and AI crawlers since $(h "$SINCE")</h3>"
HTML+="<pre style=\"font-family:Menlo,Consolas,monospace;font-size:12px;background:#f6f8fa;padding:10px;margin:0;white-space:pre-wrap\">$(h "$CRAWL_OUT")</pre>"
HTML+="<p style=\"color:#6b7280;font-size:12px;margin-top:20px\">Sent by datapit-seo-report.timer on $(h "$(hostname)") (Mondays 07:00 server time). Every sitemap page's status, response time, title, robots and canonical are in the attached CSV. Runbook: RUNBOOK.md, \"Weekly SEO report\".</p></div>"

if [ "$MODE" = print ]; then
  if [ "$FORMAT" = html ]; then printf '%s\n' "$HTML"; else printf '%s%s' "$TEXT" "$PAGE_TABLE"; fi
  exit 0
fi

# ---------------------------------------------------------------- mail

env_get() { # KEY from backend/.env, without surrounding quotes or a trailing CR
  local v
  v=$(grep -m1 -E "^[[:space:]]*(export[[:space:]]+)?$1=" "$ENV_FILE" 2>/dev/null | cut -d= -f2-)
  v=$(trim "${v%$'\r'}")
  case $v in \"*\"|\'*\') v=${v:1:${#v}-2} ;; esac
  printf '%s' "$v"
}
RESEND_API_KEY=$(env_get RESEND_API_KEY)
RESEND_FROM=$(env_get RESEND_FROM_EMAIL)

echo "$SUBJECT"
for i in "${!I_WHERE[@]}"; do printf '  %s  %s  %s\n' "${I_WHERE[$i]}" "${I_CHECK[$i]}" "${I_DETAIL[$i]}"; done

if [ -z "$RESEND_API_KEY" ]; then
  echo "ERROR: no RESEND_API_KEY in $ENV_FILE, report not mailed (try --test)" >&2
  exit 1
fi

TO=""
IFS=, read -ra ADDRS <<<"$ALERT_TO"
for a in "${ADDRS[@]}"; do a=$(trim "$a"); [ -n "$a" ] && TO+="$(json_str "$a"),"; done

printf 'Authorization: Bearer %s\n' "$RESEND_API_KEY" > "$TMP/auth.h"
{
  printf '{"from":%s,"to":[%s],"subject":%s,"html":%s,"text":%s,' \
    "$(json_str "${RESEND_FROM:-no-reply@datapit.io}")" "${TO%,}" "$(json_str "$SUBJECT")" \
    "$(json_str "$HTML")" "$(json_str "$TEXT")"
  printf '"attachments":[{"filename":%s,"content":"%s"}]}' "$(json_str "$CSV_NAME")" "$(base64 -w0 < "$TMP/pages.csv")"
} > "$TMP/mail.json"

CODE=$(curl -sS -m 30 https://api.resend.com/emails -H @"$TMP/auth.h" -H 'Content-Type: application/json' \
  --data-binary @"$TMP/mail.json" -o "$TMP/resend.out" -w '%{http_code}' 2>"$TMP/curl.err")
if [[ $CODE == 2?? ]]; then
  echo "report mailed to $ALERT_TO"
else
  echo "ERROR: Resend returned HTTP $CODE: $(head -c 300 "$TMP/resend.out") $(head -c 200 "$TMP/curl.err")" >&2
  exit 1
fi
