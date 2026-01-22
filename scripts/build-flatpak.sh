#!/bin/bash
# PearPass Desktop - Flatpak Build Script
# Builds Flatpak packages for x64 and/or arm64 architectures
#
# Usage:
#   ./scripts/build-flatpak.sh [--arch x86_64|aarch64|all] [--install] [--repo PATH]
#
# Options:
#   --arch     Target architecture (default: auto-detect current)
#   --install  Install the built Flatpak for testing
#   --repo     Custom repository path (default: ./flatpak-repo)
#
# Prerequisites:
#   - flatpak-builder installed
#   - org.freedesktop.Platform//24.08 and org.freedesktop.Sdk//24.08 runtimes
#   - ImageMagick (for icon generation)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
FLATPAK_DIR="${PROJECT_ROOT}/flatpak"
BUILD_DIR="${PROJECT_ROOT}/build/flatpak"

# Default values
ARCH=""
INSTALL=false
REPO="${BUILD_DIR}/repo"

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

    # Check for required runtimes
    if ! flatpak info org.freedesktop.Platform//24.08 &> /dev/null; then
        log_warn "Installing org.freedesktop.Platform//24.08..."
        flatpak install -y flathub org.freedesktop.Platform//24.08
    fi

    if ! flatpak info org.freedesktop.Sdk//24.08 &> /dev/null; then
        log_warn "Installing org.freedesktop.Sdk//24.08..."
        flatpak install -y flathub org.freedesktop.Sdk//24.08
    fi

    log_info "Prerequisites satisfied."
}

generate_icons() {
    log_info "Generating icons..."
    
    local icon_dir="${FLATPAK_DIR}/icons"
    local source_icon="${PROJECT_ROOT}/assets/linux/icon.png"
    
    mkdir -p "$icon_dir"
    
    if command -v convert &> /dev/null; then
        convert "$source_icon" -resize 256x256 "${icon_dir}/icon-256.png"
        convert "$source_icon" -resize 128x128 "${icon_dir}/icon-128.png"
        convert "$source_icon" -resize 64x64 "${icon_dir}/icon-64.png"
        convert "$source_icon" -resize 48x48 "${icon_dir}/icon-48.png"
    else
        log_warn "ImageMagick not found. Copying source icon as-is."
        for size in 256 128 64 48; do
            cp "$source_icon" "${icon_dir}/icon-${size}.png"
        done
    fi
}

build_flatpak() {
    local target_arch="$1"
    log_info "Building Flatpak for ${target_arch}..."

    mkdir -p "${BUILD_DIR}"
    
    cd "${FLATPAK_DIR}"
    
    # Build the Flatpak
    flatpak-builder \
        --arch="${target_arch}" \
        --force-clean \
        --repo="${REPO}" \
        "${BUILD_DIR}/build-${target_arch}" \
        com.pear.pass.yaml

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
    generate_icons

    if [[ "$ARCH" == "all" ]]; then
        build_flatpak "x86_64"
        build_flatpak "aarch64"
    else
        build_flatpak "$ARCH"
    fi

    if [[ "$INSTALL" == true ]]; then
        install_flatpak
    fi

    log_info "Flatpak build complete!"
}

main "$@"

