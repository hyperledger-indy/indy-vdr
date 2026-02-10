#!/bin/bash
# Wrapper to ensure host compilation uses system cc, not Android NDK
exec /usr/bin/cc "$@"
