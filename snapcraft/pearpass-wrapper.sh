#!/bin/bash
# Wrapper script for PearPass
# Change to the directory containing app.bundle before running the binary
cd "$SNAP/assets/usr/share/pear-pass"
exec "$SNAP/assets/usr/bin/pearpass" "$@"

