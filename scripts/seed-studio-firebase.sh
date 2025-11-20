#!/usr/bin/env bash
set -euo pipefail

# Seed a target directory with Firebase config from this repo.
# Usage: seed-studio-firebase.sh [--link|--copy] [--project <id>] [--dry-run] [--verbose] [--force] [DEST]
# Defaults: COPY mode, DEST="$HOME/studio"
# Notes: --dry-run prints actions without making changes.

MODE="copy"
PROJECT_ID=""
DEST=""
DRY_RUN=0
VERBOSE=0
FORCE=0

print() {
	if [[ $VERBOSE -eq 1 ]]; then
		printf "%s\n" "$*"
	fi
}

run_or_echo() {
	if [[ $DRY_RUN -eq 1 ]]; then
		printf "DRYRUN: %s\n" "$*"
	else
		if [[ $VERBOSE -eq 1 ]]; then
			printf "RUN: %s\n" "$*"
		fi
		eval "$@"
	fi
}

usage() {
	cat <<EOF
Usage: $(basename "$0") [--link|--copy] [--project <id>] [--dry-run] [--verbose] [--force] [DEST]

Defaults:
	MODE=copy
	DEST=\$HOME/studio
EOF
	exit 1
}

# Parse args
while [[ $# -gt 0 ]]; do
	case "$1" in
		--link)
			MODE="link"; shift ;;
		--copy)
			MODE="copy"; shift ;;
		--project)
			PROJECT_ID="${2:-}"; shift 2 ;;
		--dry-run)
			DRY_RUN=1; shift ;;
		--verbose)
			VERBOSE=1; shift ;;
		--force)
			FORCE=1; shift ;;
		-h|--help)
			usage ;;
		*)
			if [[ -z "$DEST" ]]; then
				DEST="$1"
			else
				echo "Unexpected argument: $1" >&2
				usage
			fi
			shift ;;
	esac
done

# Default DEST to $HOME/studio if empty
if [[ -z "${DEST:-}" ]]; then
	DEST="$HOME/studio"
fi

# Resolve DEST to an absolute path (POSIX-friendly)
if command -v realpath >/dev/null 2>&1; then
	# Probe which realpath form is supported to avoid noisy errors on macOS
	if realpath -m . >/dev/null 2>&1; then
		DEST="$(realpath -m "$DEST")"
	else
		# realpath exists but may not support -m or may require target to exist (macOS). Avoid calling realpath on a potentially
		# non-existent destination; compute a safe absolute path instead.
		case "$DEST" in
			/*) ;; # already absolute
			~/*) DEST="$HOME/${DEST#~/}" ;;
			~) DEST="$HOME" ;;
			*) DEST="$(pwd)/$DEST" ;;
		esac
	fi
else
	case "$DEST" in
		/*) ;; # already absolute
		~/*) DEST="$HOME/${DEST#~/}" ;;
		~) DEST="$HOME" ;;
		*) DEST="$(pwd)/$DEST" ;;
	esac
fi

# Determine root dir (repo root assumed to be one level up from script)
ROOT_DIR=""
if [[ -n "${BASH_SOURCE[0]:-}" ]]; then
	ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
else
	ROOT_DIR="$(pwd)"
fi

print "ROOT_DIR=$ROOT_DIR"
print "DEST=$DEST"
print "MODE=$MODE"
print "DRY_RUN=$DRY_RUN"
print "VERBOSE=$VERBOSE"
print "FORCE=$FORCE"

# Create DEST (or show in dry-run)
if [[ $DRY_RUN -eq 1 ]]; then
	echo "DRYRUN: mkdir -p \"$DEST\""
else
	if [[ -d "$DEST" && $FORCE -eq 0 ]]; then
		echo "Using existing directory: $DEST"
	else
		mkdir -p "$DEST"
	fi
fi

# Build a .firebaserc payload (use provided project or default present in repo)
FIREBASERC_SRC="$ROOT_DIR/.firebaserc"
TMP_FIREBASERC="$(mktemp --suffix=.firebaserc 2>/dev/null || mktemp /tmp/firebaserc.XXXXXX)"

cleanup() {
	rc=$?
	if [[ -n "${TMP_FIREBASERC:-}" && -f "$TMP_FIREBASERC" ]]; then
		rm -f "$TMP_FIREBASERC" || true
	fi
	exit $rc
}
trap cleanup EXIT

if [[ -n "$PROJECT_ID" ]]; then
	printf '{\n  "projects": {\n    "default": "%s"\n  }\n}\n' "$PROJECT_ID" > "$TMP_FIREBASERC"
else
	if [[ -f "$FIREBASERC_SRC" ]]; then
		cp "$FIREBASERC_SRC" "$TMP_FIREBASERC"
	else
		printf '{\n  "projects": {\n    "default": "your-project-id"\n  }\n}\n' > "$TMP_FIREBASERC"
	fi
fi

# Files to place
FILES=(
	"firebase.json"
	"firestore.rules"
	"firestore.indexes.json"
)

# If firebase.json missing, try EXAMPLE_ fallback
if [[ ! -f "$ROOT_DIR/firebase.json" && -f "$ROOT_DIR/EXAMPLE_firebase.json" ]]; then
	print "Found EXAMPLE_firebase.json, copying to firebase.json in repo root"
	run_or_echo cp "$ROOT_DIR/EXAMPLE_firebase.json" "$ROOT_DIR/firebase.json"
fi

# Write .firebaserc atomically to DEST
DEST_FIREBASERC="$DEST/.firebaserc"
if [[ -e "$DEST_FIREBASERC" && $FORCE -eq 0 && $DRY_RUN -eq 0 ]]; then
	echo "Warning: $DEST_FIREBASERC exists. Use --force to overwrite." >&2
else
	if [[ $DRY_RUN -eq 1 ]]; then
		echo "DRYRUN: copy $TMP_FIREBASERC -> $DEST_FIREBASERC"
	else
		# use atomic move
		cp "$TMP_FIREBASERC" "$DEST_FIREBASERC.tmp" && mv -f "$DEST_FIREBASERC.tmp" "$DEST_FIREBASERC"
		echo "Wrote $DEST_FIREBASERC"
	fi
fi

# Copy or link the rest
for f in "${FILES[@]}"; do
	src="$ROOT_DIR/$f"
	dest="$DEST/$f"

	if [[ ! -f "$src" ]]; then
		echo "Warning: missing $f in repo; skipping" >&2
		continue
	fi

	case "$MODE" in
		copy)
			if [[ $DRY_RUN -eq 1 ]]; then
				echo "DRYRUN: cp \"$src\" \"$dest\""
			else
				if [[ -e "$dest" && $FORCE -eq 0 ]]; then
					echo "Skipping existing $dest (use --force to overwrite)"
				else
					cp -p "$src" "$dest"
					echo "Seeded $dest"
				fi
			fi
			;;
		link)
			if [[ $DRY_RUN -eq 1 ]]; then
				echo "DRYRUN: ln -sf \"$src\" \"$dest\""
			else
				ln -sf "$src" "$dest"
				echo "Linked $dest -> $src"
			fi
			;;
		*)
			echo "Unknown mode: $MODE" >&2
			exit 2
			;;
	esac
done

echo "Done. Seeded Firebase config into $DEST"
