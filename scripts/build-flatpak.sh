#!/bin/bash
# PearPass Desktop - Flatpak Build Script
# Builds Flatpak packages for x64 and/or arm64 architectures
#
# Usage:
#   ./scripts/build-flatpak.sh [--arch x86_64|aarch64|all] [--install] [--repo PATH] [--local <path>]
#
# Options:
#   --arch     Target architecture (default: auto-detect current)
#   --install  Install the built Flatpak for testing
#   --repo     Custom repository path (default: ./build/flatpak/repo)
#   --local    Path to local AppImage for staging builds
#
# Prerequisites:
#   - flatpak-builder installed
#   - org.gnome.Platform//49 and org.gnome.Sdk//49 runtimes

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
FLATPAK_DIR="${PROJECT_ROOT}/flatpak"
BUILD_DIR="${PROJECT_ROOT}/build/flatpak"

# Default values
ARCH=""
INSTALL=false
REPO="${BUILD_DIR}/repo"
LOCAL_APPIMAGE=""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

detect_arch() {
    local machine=$(uname -m)
    case "$machine" in
        x86_64) echo "x86_64" ;;
        aarch64|arm64) echo "aarch64" ;;
        *) log_error "Unsupported architecture: $machine"; exit 1 ;;
    esac
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --arch)
                ARCH="$2"
                shift 2
                ;;
            --install)
                INSTALL=true
                shift
                ;;
            --repo)
                REPO="$2"
                shift 2
                ;;
            --local)
                LOCAL_APPIMAGE="$2"
                shift 2
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    if [[ -z "$ARCH" ]]; then
        ARCH=$(detect_arch)
    fi
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! command -v flatpak-builder &> /dev/null; then
        log_error "flatpak-builder not found. Install with: sudo apt install flatpak-builder"
        exit 1
    fi

    # Check for required runtimes (org.gnome.Platform/Sdk version 49 as per manifest)
    if ! flatpak info org.gnome.Platform//49 &> /dev/null; then
        log_warn "Installing org.gnome.Platform//49..."
        flatpak install -y flathub org.gnome.Platform//49
    fi

    if ! flatpak info org.gnome.Sdk//49 &> /dev/null; then
        log_warn "Installing org.gnome.Sdk//49..."
        flatpak install -y flathub org.gnome.Sdk//49
    fi

    log_info "Prerequisites satisfied."
}

setup_local_appimage() {
    local appimage_dir="${FLATPAK_DIR}/appimage"
    local target="${appimage_dir}/PearPass.local"
    local local_manifest="${FLATPAK_DIR}/com.pear.pass.local.yaml"

    # Clean up any existing staging files
    rm -f "$target"
    rm -f "$local_manifest"

    if [[ -n "$LOCAL_APPIMAGE" ]]; then
        if [[ ! -f "$LOCAL_APPIMAGE" ]]; then
            log_error "Local AppImage not found: $LOCAL_APPIMAGE"
            exit 1
        fi
        log_info "Copying local AppImage for staging build..."
        mkdir -p "$appimage_dir"
        cp "$LOCAL_APPIMAGE" "$target"
        log_info "Using local AppImage: $LOCAL_APPIMAGE"

        # Generate a temporary manifest that uses the local file instead of remote URLs
        log_info "Generating local manifest..."
        local abs_target
        abs_target="$(cd "$(dirname "$target")" && pwd)/$(basename "$target")"

        # Take everything above "    sources:" from the main manifest, then append local sources
        sed -n '1,/^    sources:$/p' "${FLATPAK_DIR}/com.pear.pass.yaml" > "$local_manifest"
        cat >> "$local_manifest" <<YAML
      # Local AppImage (staging build)
      - type: file
        path: ${abs_target}
        dest-filename: PearPass.AppImage
      # Desktop file
      - type: file
        path: com.pear.pass.desktop
      # Metainfo file
      - type: file
        path: com.pear.pass.metainfo.xml
      # Application icon
      - type: file
        path: icon-512.png
        dest-filename: icon.png
YAML
        log_info "Local manifest generated: $local_manifest"
    fi
}

clean_local_appimage() {
    local target="${FLATPAK_DIR}/appimage/PearPass.local"
    local local_manifest="${FLATPAK_DIR}/com.pear.pass.local.yaml"

    if [[ -f "$target" ]]; then
        log_info "Cleaning up staging AppImage..."
        rm -f "$target"
    fi
    if [[ -f "$local_manifest" ]]; then
        log_info "Cleaning up local manifest..."
        rm -f "$local_manifest"
    fi
}

get_manifest() {
    local local_manifest="${FLATPAK_DIR}/com.pear.pass.local.yaml"
    if [[ -f "$local_manifest" ]]; then
        echo "com.pear.pass.local.yaml"
    else
        echo "com.pear.pass.yaml"
    fi
}

build_flatpak() {
    local target_arch="$1"
    log_info "Building Flatpak for ${target_arch}..."

    mkdir -p "${BUILD_DIR}"

    cd "${FLATPAK_DIR}"

    local manifest
    manifest=$(get_manifest)
    log_info "Using manifest: ${manifest}"

    # Build the Flatpak
    flatpak-builder \
        --arch="${target_arch}" \
        --force-clean \
        --repo="${REPO}" \
        "${BUILD_DIR}/build-${target_arch}" \
        "$manifest"

    # Create a bundle file for distribution
    local version=$(jq -r '.version' "${PROJECT_ROOT}/package.json")
    local bundle_name="PearPass-Desktop-${target_arch}-v${version}.flatpak"

    flatpak build-bundle \
        --arch="${target_arch}" \
        "${REPO}" \
        "${BUILD_DIR}/${bundle_name}" \
        com.pear.pass

    log_info "Created: ${BUILD_DIR}/${bundle_name}"
}

install_flatpak() {
    log_info "Installing Flatpak for testing..."
    flatpak --user remote-add --if-not-exists --no-gpg-verify pearpass-local "${REPO}"
    flatpak --user install -y pearpass-local com.pear.pass
    log_info "Installed! Run with: flatpak run com.pear.pass"
}

main() {
    parse_args "$@"
    check_prerequisites
    setup_local_appimage

    if [[ "$ARCH" == "all" ]]; then
        build_flatpak "x86_64"
        build_flatpak "aarch64"
    else
        build_flatpak "$ARCH"
    fi

    clean_local_appimage

    if [[ "$INSTALL" == true ]]; then
        install_flatpak
    fi

    log_info "Flatpak build complete!"
}

main "$@"
