#!/bin/sh
# Native messaging host entry point. Invoked via
#   flatpak run --command=pearpass-native-host com.pears.pass
# by the host-side wrapper that Chrome's Native Messaging API launches.
#
# Runs the bridge bundle through the Electron binary in Node mode.
APP_ROOT="/app/lib/pearpass"
export LD_LIBRARY_PATH="$APP_ROOT${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
export ELECTRON_RUN_AS_NODE=1
exec "$APP_ROOT/pearpass-app-desktop" \
  "$APP_ROOT/resources/app/dist/native-messaging-bridge.bundle.cjs" \
  "$@"
