#!/bin/bash
# PearPass Desktop - Snapcraft Build Script
# Builds Snap packages for amd64 and/or arm64 architectures
#
# Usage:
#   ./scripts/build-snap.sh [--arch amd64|arm64|all] [--install] [--destructive]
#
# Options:
#   --arch         Target architecture (default: auto-detect current)
#   --install      Install the built Snap for testing
#   --destructive  Use destructive mode (no LXD container)
#
# Prerequisites:
#   - snapcraft installed (sudo snap install snapcraft --classic)
#   - LXD configured for containerized builds (or use --destructive)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SNAPCRAFT_DIR="${PROJECT_ROOT}/snapcraft"
BUILD_DIR="${PROJECT_ROOT}/build/snap"

# Default values
ARCH=""
INSTALL=false
DESTRUCTIVE=false

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
        x86_64) echo "amd64" ;;
        aarch64|arm64) echo "arm64" ;;
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
            --destructive)
                DESTRUCTIVE=true
                shift
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

    if ! command -v snapcraft &> /dev/null; then
        log_error "snapcraft not found. Install with: sudo snap install snapcraft --classic"
        exit 1
    fi

    if [[ "$DESTRUCTIVE" == false ]]; then
        if ! command -v lxd &> /dev/null && ! command -v lxc &> /dev/null; then
            log_warn "LXD not found. Use --destructive for local builds or install LXD."
            log_info "Install LXD with: sudo snap install lxd && sudo lxd init --auto"
        fi
    fi

    log_info "Prerequisites satisfied."
}

build_snap() {
    local target_arch="$1"
    log_info "Building Snap for ${target_arch}..."

    cd "${SNAPCRAFT_DIR}"
    mkdir -p "${BUILD_DIR}"

    local build_args=()
    
    if [[ "$DESTRUCTIVE" == true ]]; then
        build_args+=("--destructive-mode")
    fi
    
    # Set build-for architecture
    build_args+=("--build-for=${target_arch}")

    log_info "Running snapcraft..."
    snapcraft "${build_args[@]}"

    # Move the built snap to build directory
    local snap_file=$(find "${SNAPCRAFT_DIR}" -maxdepth 1 -name "*.snap" -type f | head -n 1)
    if [[ -n "$snap_file" ]]; then
        local version=$(grep "^version:" snapcraft.yaml | sed 's/version: *"\?\([^"]*\)"\?/\1/')
        local new_name="pearpass_${version}_${target_arch}.snap"
        mv "$snap_file" "${BUILD_DIR}/${new_name}"
        log_info "Created: ${BUILD_DIR}/${new_name}"
    else
        log_error "Snap file not found after build"
        exit 1
    fi
}

install_snap() {
    local snap_file=$(find "${BUILD_DIR}" -name "*.snap" -type f | head -n 1)
    if [[ -n "$snap_file" ]]; then
        log_info "Installing Snap for testing..."
        sudo snap install --dangerous "$snap_file"
        log_info "Installed! Run with: pearpass"
        
        # Remind about connecting plugs
        log_warn "You may need to connect additional plugs:"
        echo "  sudo snap connect pearpass:dot-config-pear"
        echo "  sudo snap connect pearpass:chrome-native-messaging"
        echo "  sudo snap connect pearpass:chromium-native-messaging"
        echo "  sudo snap connect pearpass:edge-native-messaging"
    else
        log_error "No snap file found to install"
        exit 1
    fi
}

clean_build() {
    log_info "Cleaning previous build artifacts..."
    cd "${SNAPCRAFT_DIR}"
    snapcraft clean 2>/dev/null || true
}

main() {
    parse_args "$@"
    check_prerequisites

    if [[ "$ARCH" == "all" ]]; then
        build_snap "amd64"
        clean_build
        build_snap "arm64"
    else
        build_snap "$ARCH"
    fi

    if [[ "$INSTALL" == true ]]; then
        install_snap
    fi

    log_info "Snap build complete!"
}

main "$@"

