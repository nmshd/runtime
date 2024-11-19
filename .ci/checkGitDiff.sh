#!/usr/bin/env bash

set -e

diff="$(git diff --name-only)"
if [[ "$diff" ]]; then
    echo 'These files changed when running the command:'
    echo "$diff" | sed 's/^/* /'

    exit 1
fi
