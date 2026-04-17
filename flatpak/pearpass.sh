#!/bin/sh
# Launcher for the PearPass Electron binary inside the Flatpak sandbox.
# Uses zypak from Electron2.BaseApp for proper sandboxing.
APP_ROOT="/app/lib/pearpass"
export LD_LIBRARY_PATH="$APP_ROOT${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
cd "$APP_ROOT"
exec zypak-wrapper.sh "$APP_ROOT/pearpass-app-desktop" "$@"
