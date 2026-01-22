#!/bin/bash
# PearPass Desktop - Linux Build Script
# Builds AppImage packages for x64 and/or arm64 architectures
#
# Usage:
#   ./scripts/build-linux.sh [--arch x64|arm64|all] [--dev]
#
# Options:
#   --arch    Target architecture (default: auto-detect current)
#   --dev     Use development configuration (app.dev.cjs)
#
# Prerequisites:
#   - Node.js 22.0.0 or later
#   - bare-build installed globally (npm install -g bare-build)
#   - Required system packages: libgtk-4-dev, pkg-config, fuse, file

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
APPLING_DIR="${PROJECT_ROOT}/appling"

# Default values
ARCH=""
DEV_MODE=false
BUILD_DIR="${PROJECT_ROOT}/build"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Detect current architecture
detect_arch() {
    local machine=$(uname -m)
    case "$machine" in
        x86_64) echo "x64" ;;
        aarch64|arm64) echo "arm64" ;;
        *) log_error "Unsupported architecture: $machine"; exit 1 ;;
    esac
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --arch)
                ARCH="$2"
                shift 2
                ;;
            --dev)
                DEV_MODE=true
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    # Default to current architecture if not specified
    if [[ -z "$ARCH" ]]; then
        ARCH=$(detect_arch)
    fi
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check Node.js version
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js 22.0.0 or later."
        exit 1
    fi

    local node_version=$(node --version | sed 's/v//' | cut -d. -f1)
    if [[ "$node_version" -lt 22 ]]; then
        log_error "Node.js version must be 22.0.0 or later. Current: $(node --version)"
        exit 1
    fi

    # Check bare-build
    if ! command -v bare-build &> /dev/null; then
        log_warn "bare-build not found. Installing..."
        npm install --global bare-build
    fi

    # Check required packages
    local missing_packages=()
    if ! pkg-config --exists gtk4 2>/dev/null; then
        missing_packages+=("libgtk-4-dev")
    fi
    if ! command -v fusermount &> /dev/null; then
        missing_packages+=("fuse")
    fi

    if [[ ${#missing_packages[@]} -gt 0 ]]; then
        log_error "Missing system packages: ${missing_packages[*]}"
        log_info "Install with: sudo apt-get install -y ${missing_packages[*]}"
        exit 1
    fi

    log_info "All prerequisites satisfied."
}

# Build for a specific architecture
build_arch() {
    local target_arch="$1"
    log_info "Building for linux-${target_arch}..."

    cd "${APPLING_DIR}"

    # Install dependencies if needed
    if [[ ! -d "node_modules" ]]; then
        log_info "Installing appling dependencies..."
        npm install
    fi

    # Determine which app file to use
    local app_file="app.cjs"
    if [[ "$DEV_MODE" == true ]]; then
        app_file="app.dev.cjs"
    fi

    # Build the AppImage
    log_info "Running bare-build..."
    bare-build \
        --host="linux-${target_arch}" \
        --package \
        --icon lib/icons/linux/icon.png \
        "${app_file}"

    # Find and move the AppImage
    local appimage=$(find "${APPLING_DIR}" -maxdepth 1 -name "*.AppImage" -type f | head -n 1)
    if [[ -n "$appimage" ]]; then
        mkdir -p "${BUILD_DIR}"
        local version=$(jq -r '.version' "${PROJECT_ROOT}/package.json")
        local new_name="PearPass-Desktop-Linux-${target_arch}-v${version}.AppImage"
        mv "$appimage" "${BUILD_DIR}/${new_name}"
        log_info "Created: ${BUILD_DIR}/${new_name}"
    else
        log_error "AppImage not found after build"
        exit 1
    fi
}

# Main
main() {
    parse_args "$@"
    check_prerequisites

    mkdir -p "${BUILD_DIR}"

    if [[ "$ARCH" == "all" ]]; then
        log_info "Building for all architectures..."
        build_arch "x64"
        build_arch "arm64"
    else
        build_arch "$ARCH"
    fi

    log_info "Build complete! Output in: ${BUILD_DIR}"
}

main "$@"

