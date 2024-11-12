#!/usr/bin/env bash

set -e

if [[ "$(git diff --name-only)" ]]; then
    echo 'These files changed when running the command:'
    git diff --name-only | sed 's/^/* /'

    exit 1
fi
