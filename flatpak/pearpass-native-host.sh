#!/bin/sh
# Native messaging host entry point. Invoked via
#   flatpak run --command=pearpass-native-host com.pears.pass
# by the host-side wrapper that Chrome's Native Messaging API launches.
#
# Call the Electron binary directly, bypassing the pearpass-app-desktop
# shell launcher which unconditionally injects --no-sandbox. Under
# ELECTRON_RUN_AS_NODE=1 the binary runs as Node and rejects that flag,
# causing Chrome to see "Native host has exited".
APP_ROOT="/app/lib/pearpass"
export LD_LIBRARY_PATH="$APP_ROOT${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
export ELECTRON_RUN_AS_NODE=1
exec "$APP_ROOT/pearpass-app-desktop.bin" \
  "$APP_ROOT/resources/app/dist/native-messaging-bridge.bundle.cjs" \
  "$@"
