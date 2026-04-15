#!/bin/sh
# Launcher for the PearPass Electron binary inside the Flatpak sandbox.
APP_ROOT="/app/lib/pearpass"
export LD_LIBRARY_PATH="$APP_ROOT${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
# Force X11 backend: Wayland auto-detection inside the flatpak sandbox
# is unreliable and was producing a black window on CI-built bundles.
# X11 works natively on X11 sessions and via XWayland on Wayland sessions.
export GDK_BACKEND=x11
cd "$APP_ROOT"
exec "$APP_ROOT/pearpass-app-desktop" \
  --no-sandbox \
  --disable-gpu \
  --disable-gpu-sandbox \
  --disable-dev-shm-usage \
  --enable-features=UseOzonePlatform \
  --ozone-platform=x11 \
  --use-gl=angle \
  --use-angle=swiftshader \
  "$@"
