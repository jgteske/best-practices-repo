#!/usr/bin/env bash
#
# Verifies the server examples under examples/servers:
#   * terraform/: fmt, init (no backend) and validate, with tofu or terraform
#   * ansible/:   ansible-playbook --syntax-check, then ansible-lint
#   * docker/:    docker compose config, then docker build
#
# Each tool is optional locally (like shellcheck). CI sets REQUIRE_ALL_TOOLS=1,
# so a missing tool fails there instead of silently skipping a check.
#
# None of this applies anything to a real server or cloud account.
#
set -euo pipefail

cd "$(dirname -- "$0")/.."

readonly ROOT=examples/servers

failed=0

missing() {
  if [[ "${REQUIRE_ALL_TOOLS:-}" == 1 ]]; then
    echo "  MISSING    $1" >&2
    failed=1
  else
    echo "  skipped    $1 not installed"
  fi
}

step() {
  local name=$1
  shift
  if output=$("$@" 2>&1); then
    echo "  ok         ${name}"
  else
    echo "  FAILED     ${name}" >&2
    printf '%s\n' "$output" | sed 's/^/    | /' >&2
    failed=1
  fi
}

echo "checking the Terraform example..."
tf=$(command -v tofu || command -v terraform || true)
if [[ -n "$tf" ]]; then
  init_flags=(-input=false -backend=false)
  [[ -f "$ROOT/terraform/.terraform.lock.hcl" ]] && init_flags+=(-lockfile=readonly)
  step "fmt"      "$tf" -chdir="$ROOT/terraform" fmt -check -recursive -diff
  step "init"     "$tf" -chdir="$ROOT/terraform" init "${init_flags[@]}"
  step "validate" "$tf" -chdir="$ROOT/terraform" validate
else
  missing "tofu or terraform"
fi

echo
echo "checking the Ansible example..."
if command -v ansible-playbook >/dev/null 2>&1; then
  (cd "$ROOT/ansible" && step "syntax-check" ansible-playbook site.yml --syntax-check; exit "$failed") || failed=1
else
  missing "ansible-playbook"
fi
if command -v ansible-lint >/dev/null 2>&1; then
  (cd "$ROOT/ansible" && step "ansible-lint" ansible-lint --offline; exit "$failed") || failed=1
else
  missing "ansible-lint"
fi

echo
echo "checking the Docker example..."
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  step "compose config" env APP_TAG=test POSTGRES_PASSWORD=test \
    docker compose -f "$ROOT/docker/compose.yaml" config --quiet
  step "build" docker build --quiet --tag best-practices-server-example "$ROOT/docker"
  step "paperclip compose config" env POSTGRES_PASSWORD=test PAPERCLIP_PUBLIC_URL=http://localhost:3100 \
    BETTER_AUTH_SECRET=test PAPERCLIP_AGENT_JWT_SECRET=test \
    PAPERCLIP_TOOL_ACTION_SIGNING_SECRET=test PAPERCLIP_SECRETS_MASTER_KEY=test \
    docker compose -f "$ROOT/paperclip/compose.yaml" config --quiet
else
  missing "a running docker daemon"
fi

if (( failed )); then
  echo >&2
  echo "server example checks FAILED" >&2
  exit 1
fi

echo
echo "all server example checks passed"
