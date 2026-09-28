#!/usr/bin/env bash
# Which search-engine and AI crawlers reached datapit.io, and what status they
# got back. Run on the VPS once a month (see RUNBOOK.md "Search"):
#
#   /var/www/datapit.io/app/deploy/ai-crawlers.sh
#
# Reads the site's access log plus its rotated copies (nginx keeps about two
# weeks). Anything other than 200/301/304 on a public page means a crawler is
# being turned away: check robots.txt, nginx and rate limits. User agents can
# be spoofed, so treat the counts as a health check, not an audit.
set -euo pipefail

LOG_DIR=${LOG_DIR:-/var/log/nginx}
BASE=datapit.io.access.log
BOTS='Googlebot|bingbot|GPTBot|OAI-SearchBot|ChatGPT-User|ClaudeBot|Claude-User|Claude-SearchBot|PerplexityBot|Perplexity-User|Applebot|DuckAssistBot|meta-externalagent|YandexBot'

shopt -s nullglob
logs=("$LOG_DIR"/"$BASE"*)
if [ ${#logs[@]} -eq 0 ]; then
  echo "No $BASE in $LOG_DIR yet." >&2
  exit 1
fi

# Combined log format split on double quotes: $2 = request line,
# $3 = " status bytes ", $6 = user agent.
zcat -f "${logs[@]}" | awk -F'"' -v bots="$BOTS" '
  BEGIN { n = split(bots, list, "|") }
  {
    ua = tolower($6)
    split($3, st, " ")
    split($2, rq, " ")
    for (i = 1; i <= n; i++) {
      if (index(ua, tolower(list[i]))) {
        hits[list[i] "\t" st[1]]++
        if (st[1] !~ /^(200|301|304)$/) bad[list[i] "\t" st[1] "\t" rq[2]]++
        break
      }
    }
  }
  END {
    printf "%-20s %-7s %s\n", "CRAWLER", "STATUS", "REQUESTS"
    for (k in hits) { split(k, p, "\t"); printf "%-20s %-7s %d\n", p[1], p[2], hits[k] | "sort" }
    close("sort")
    first = 1
    for (k in bad) {
      if (first) { print "\nTurned away (crawler, status, path, count):"; first = 0 }
      split(k, p, "\t"); printf "  %s %s %s %d\n", p[1], p[2], p[3], bad[k]
    }
  }'
