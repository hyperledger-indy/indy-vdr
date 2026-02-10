#!/bin/bash

# Script to build Indy VDR for Android targets
# Supports multiple Android architectures: aarch64, armv7, i686, x86_64
# Works inside the dev container or on a machine with Android NDK installed

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT="indy-vdr"
LIB_NAME="indy_vdr"
FEATURES="${BUILD_FEATURES:-default}"
TARGET_DIR="${TARGET_DIR-./target}"
MANIFEST_PATH="${MANIFEST_PATH-libindy_vdr/Cargo.toml}"
BUILD_TYPE="${BUILD_TYPE:-release}"
OUTPUT_ARCHIVE="${OUTPUT_ARCHIVE:-android-libraries.tar.gz}"
NO_PACKAGE=0
CLEAN_BETWEEN=0

# Android targets
ANDROID_TARGETS=(
    "aarch64-linux-android"
    "armv7-linux-androideabi"
    "i686-linux-android"
    "x86_64-linux-android"
)

# Map Rust target triple → Android ABI directory name
# Matches the layout used in CI (create-android-library job in build.yml)
target_to_abi() {
    case "$1" in
        aarch64-linux-android)    echo "arm64-v8a" ;;
        armv7-linux-androideabi)  echo "armeabi-v7a" ;;
        i686-linux-android)       echo "x86" ;;
        x86_64-linux-android)     echo "x86_64" ;;
        *) echo "$1" ;;
    esac
}

# Function to print colored output
log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Function to check requirements
check_requirements() {
    log "Checking requirements..."

    if ! command -v cargo &> /dev/null; then
        error "cargo not found. Please install Rust."
    fi

    if ! command -v rustup &> /dev/null; then
        error "rustup not found. Please install rustup."
    fi

    # Check for cross or cargo (both work, cross is preferred for Android)
    if ! command -v cross &> /dev/null; then
        warn "cross not found. Install with: cargo install cross"
        warn "Falling back to cargo for compilation (may not work for all targets)"
    fi

    if [ -z "$ANDROID_NDK_HOME" ] && [ -z "$ANDROID_NDK_ROOT" ]; then
        warn "ANDROID_NDK_HOME not set. Using standard linkers from Android NDK."
    else
        log "ANDROID_NDK_HOME: ${ANDROID_NDK_HOME:-Not set}"
    fi
}

# Function to ensure Rust targets are installed
ensure_targets() {
    log "Ensuring Rust targets are installed..."

    for target in "${ANDROID_TARGETS[@]}"; do
        if ! rustup target list | grep -q "^${target} (installed)"; then
            log "Installing target: $target"
            rustup target add "$target"
        fi
    done
}

# Function to detect if Android NDK linkers are on PATH
ndk_available() {
    command -v aarch64-linux-android21-clang &> /dev/null
}

# Function to build for a specific target
build_target() {
    local target=$1
    local output_dir="${TARGET_DIR}/${target}/${BUILD_TYPE}"

    log "Building for $target..."

    # Prefer direct cargo + NDK (works on all host arches including Apple Silicon).
    # Fall back to cross (Docker-based, CI-style) if NDK is not on PATH.
    # Set USE_CROSS=1 or --use-cross to force using cross even when the NDK is available.
    if [ "${USE_CROSS:-0}" != "1" ] && ndk_available; then
        log "Using cargo with Android NDK"
        cargo build \
            --manifest-path "$MANIFEST_PATH" \
            --target "$target" \
            --package indy-vdr \
            --${BUILD_TYPE} \
            --verbose
    elif command -v cross &> /dev/null; then
        log "Using cross for compilation"
        cross build \
            --manifest-path "$MANIFEST_PATH" \
            --target "$target" \
            --${BUILD_TYPE} \
            --features "$FEATURES" \
            --verbose
    else
        error "Neither Android NDK nor cross found. Install the NDK or run: cargo install cross"
    fi

    log "Build completed for $target"
}

# Function to build all Android targets
build_all() {
    log "Starting build for all Android targets..."
    log "Features: $FEATURES"
    log "Build type: $BUILD_TYPE"
    log "Output directory: $TARGET_DIR"
    echo

    local success_count=0
    local failed_targets=()

    for target in "${ANDROID_TARGETS[@]}"; do
        if build_target "$target"; then
            success_count=$((success_count + 1))
            log "✓ Successfully built for $target"
        else
            failed_targets+=("$target")
            error "Failed to build for $target"
        fi

        # Optionally clean intermediate build artifacts between targets to save
        # disk space.  Useful when cross Docker images are large (~5 GB each).
        if [ "${CLEAN_BETWEEN}" = "1" ] && [ "${USE_CROSS:-0}" = "1" ]; then
            log "Cleaning intermediate Docker images to save space..."
            docker system prune -f --filter "until=1m" 2>/dev/null || true
        fi
        echo
    done

    log "=========================================="
    log "Build Summary"
    log "=========================================="
    log "Successful targets: $success_count/${#ANDROID_TARGETS[@]}"

    if [ ${#failed_targets[@]} -gt 0 ]; then
        warn "Failed targets: ${failed_targets[*]}"
        echo
        error "Some targets failed to build"
    else
        log "All targets built successfully! 🎉"
        echo
        log "Output files are in: $TARGET_DIR"
        echo
        log "Built libraries:"
        for target in "${ANDROID_TARGETS[@]}"; do
            lib_path="${TARGET_DIR}/${target}/${BUILD_TYPE}/lib${LIB_NAME}.so"
            if [ -f "$lib_path" ]; then
                size=$(ls -lh "$lib_path" | awk '{print $5}')
                echo "  - ${target}: $lib_path ($size)"
            fi
        done

        # Package artifacts
        if [ "${NO_PACKAGE}" != "1" ]; then
            echo
            package_artifacts
        fi
    fi
}

# ---------------------------------------------------------------------------
# Package built libraries into the standard Android libs layout and archive
# ---------------------------------------------------------------------------
#   libs/arm64-v8a/libindy_vdr.so
#   libs/armeabi-v7a/libindy_vdr.so
#   libs/x86/libindy_vdr.so
#   libs/x86_64/libindy_vdr.so
# ---------------------------------------------------------------------------
package_artifacts() {
    local staging_dir="${TARGET_DIR}/android-libs"
    rm -rf "${staging_dir}"
    mkdir -p "${staging_dir}/libs"

    log "Packaging Android libraries..."
    for target in "${ANDROID_TARGETS[@]}"; do
        local abi
        abi=$(target_to_abi "$target")
        local src="${TARGET_DIR}/${target}/${BUILD_TYPE}/lib${LIB_NAME}.so"
        local dst="${staging_dir}/libs/${abi}"
        if [ ! -f "$src" ]; then
            warn "Missing library for ${target} (${src}), skipping"
            continue
        fi
        mkdir -p "$dst"
        cp "$src" "$dst/"
        log "  ${abi}/lib${LIB_NAME}.so"
    done

    # Create compressed archive
    tar -czf "${OUTPUT_ARCHIVE}" -C "${staging_dir}" libs
    log "========================================="
    log "Android library archive: ${OUTPUT_ARCHIVE}"
    log "========================================="
    ls -lh "${OUTPUT_ARCHIVE}"
}

# Function to display usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Build Indy VDR for Android targets (aarch64, armv7, i686, x86_64)

OPTIONS:
  --target <target>      Build for specific target (e.g., aarch64-linux-android)
  --features <features>  Cargo features to enable (default: "default")
  --release              Build in release mode (default)
  --debug                Build in debug mode
  --use-cross            Force using cross instead of NDK (same as USE_CROSS=1)
  --clean-between        Prune Docker images between targets to save disk space
  --output-dir <dir>     Output directory for builds (default: ./target)
  --manifest <path>      Path to Cargo.toml (default: libindy_vdr/Cargo.toml)
  --archive <file>       Output archive filename (default: android-libraries.tar.gz)
  --no-package           Skip creating the archive (build only)
  --help                 Show this help message

EXAMPLES:
  # Build for all Android targets
  $0

  # Build for specific target
  $0 --target aarch64-linux-android

  # Build with specific features
  $0 --features "default,test"

  # Build in debug mode and use custom output dir
  $0 --debug --output-dir ./build

ENVIRONMENT VARIABLES:
  ANDROID_NDK_HOME      Path to Android NDK (optional, for custom NDK location)
  BUILD_FEATURES        Default features to build (default: "default")
  BUILD_TYPE            Build type: release or debug (default: release)
  TARGET_DIR            Output directory (default: ./target)
  MANIFEST_PATH         Path to Cargo.toml (default: libindy_vdr/Cargo.toml)
  OUTPUT_ARCHIVE        Archive filename (default: android-libraries.tar.gz)
  USE_CROSS             Set to 1 to force using cross instead of NDK

NOTES:
  - Requires Rust toolchain with Android targets installed
  - Recommended: Install 'cross' for more reliable cross-compilation
    cargo install cross
  - On dev container, Android NDK is pre-installed
EOF
    exit 0
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --target)
            ANDROID_TARGETS=("$2")
            shift 2
            ;;
        --features)
            FEATURES="$2"
            shift 2
            ;;
        --release)
            BUILD_TYPE="release"
            shift
            ;;
        --debug)
            BUILD_TYPE="debug"
            shift
            ;;
        --use-cross)
            USE_CROSS=1
            shift
            ;;
        --clean-between)
            CLEAN_BETWEEN=1
            shift
            ;;
        --output-dir)
            TARGET_DIR="$2"
            shift 2
            ;;
        --manifest)
            MANIFEST_PATH="$2"
            shift 2
            ;;
        --archive)
            OUTPUT_ARCHIVE="$2"
            shift 2
            ;;
        --no-package)
            NO_PACKAGE=1
            shift
            ;;
        --help)
            usage
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
done

# Main execution
check_requirements
ensure_targets
build_all
