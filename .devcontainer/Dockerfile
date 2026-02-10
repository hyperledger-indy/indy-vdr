# =============================================================================
# Indy VDR Development Container
# =============================================================================
# Provides a complete build environment for:
#   - Native Rust builds (linux x86_64 / aarch64)
#   - Android cross-compilation via cargo + Android NDK (direct, no Docker)
#   - Linux cross-compilation via `cross` (Docker-in-Docker)
#   - Python, JavaScript/TypeScript, and Go wrapper development
#   - Integration testing with Indy node pool (Docker-in-Docker)
#
# Version sources:
#   - Rust           → versions.env  (RUST_VERSION) + rust-toolchain.toml
#   - cross          → versions.env  (CROSS_VERSION)
#   - Android linkers→ versions.env  (CARGO_TARGET_*_LINKER)
#   - Node/Python/Go → mise.toml     ([tools] section)
#
# Android note:
#   Android builds use cargo directly with the NDK installed in the container.
#   This works on both x86_64 and aarch64 (Apple Silicon) hosts.
#   `cross` is pre-installed for Docker-based cross-compilation.
#   The NDK bin/ dir is appended (not prepended) to PATH so the system
#   linker is always preferred — avoids Rosetta errors on aarch64 hosts.
#
# iOS note:
#   iOS builds require macOS + Xcode and cannot run inside this container.
#   Use `build-xcframework.sh` on a macOS host or in CI (macos-14 runner).
# =============================================================================

FROM mcr.microsoft.com/devcontainers/base:ubuntu-22.04

LABEL description="Indy VDR dev container — Rust, Android NDK, cross-compilation, wrapper toolchains"

# ---------------------------------------------------------------------------
# System dependencies
# ---------------------------------------------------------------------------
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    pkg-config \
    cmake \
    libssl-dev \
    libsodium-dev \
    libzmq3-dev \
    curl \
    wget \
    unzip \
    jq \
    ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------------------------
# Android NDK  (for direct cargo cross-compilation to Android targets)
# ---------------------------------------------------------------------------
# The NDK provides clang-based linkers for each Android ABI.
# The linker binary names (e.g. aarch64-linux-android21-clang) match the
# CARGO_TARGET_*_LINKER values in versions.env — just add the NDK bin/ to PATH.
ARG ANDROID_NDK_VERSION=r27c
RUN ARCH=$(uname -m) \
    && echo "Downloading Android NDK ${ANDROID_NDK_VERSION} for ${ARCH}..." \
    && wget -q "https://dl.google.com/android/repository/android-ndk-${ANDROID_NDK_VERSION}-linux.zip" \
       -O /tmp/ndk.zip \
    && unzip -q /tmp/ndk.zip -d /opt \
    && rm /tmp/ndk.zip \
    && ln -s /opt/android-ndk-${ANDROID_NDK_VERSION} /opt/android-ndk

ENV ANDROID_NDK_HOME=/opt/android-ndk
ENV ANDROID_NDK_ROOT=/opt/android-ndk

# Add NDK toolchain to PATH (contains the clang cross-compilers).
# IMPORTANT: The NDK bin/ dir is *appended* (not prepended) to PATH so that
# the system linker (/usr/bin/ld) is found first.  The NDK ships an x86_64
# `ld` (lld) even in recent versions — if it shadows /usr/bin/ld on aarch64
# hosts, native Rust compilation fails with a Rosetta/missing-interpreter error.
# The NDK clang cross-compilers are invoked by full name (e.g.
# aarch64-linux-android21-clang) so they don't need to be first on PATH.
RUN NDK_BIN=$(ls -d ${ANDROID_NDK_HOME}/toolchains/llvm/prebuilt/linux-*/bin | head -1) \
    && echo "NDK bin dir: ${NDK_BIN}" \
    && echo "export PATH=\$PATH:${NDK_BIN}" > /etc/profile.d/android-ndk.sh \
    && chmod +x /etc/profile.d/android-ndk.sh
# Also persist for non-login shells via /etc/environment.
# We write it as a self-contained line so the order is always: system first, NDK last.
RUN NDK_BIN=$(ls -d ${ANDROID_NDK_HOME}/toolchains/llvm/prebuilt/linux-*/bin | head -1) \
    && sed -i "s|^PATH=|PATH=|" /etc/environment 2>/dev/null || true \
    && echo "NDK_BIN=${NDK_BIN}" >> /etc/environment
# Docker ENV — detect architecture at build time and append (not prepend)
RUN NDK_BIN=$(ls -d ${ANDROID_NDK_HOME}/toolchains/llvm/prebuilt/linux-*/bin | head -1) \
    && echo "ENV_NDK_BIN=${NDK_BIN}" > /tmp/ndk-path.env
# We must use a static ENV, so cover both possible paths at the *end* of PATH.
# Only one of them will actually exist on disk; the other is harmlessly absent.
ENV PATH="${PATH}:/opt/android-ndk/toolchains/llvm/prebuilt/linux-x86_64/bin:/opt/android-ndk/toolchains/llvm/prebuilt/linux-aarch64/bin"

# ---------------------------------------------------------------------------
# Rust toolchain  (global install — accessible by all users)
# ---------------------------------------------------------------------------
ENV CARGO_HOME=/usr/local/cargo
ENV RUSTUP_HOME=/usr/local/rustup
ENV PATH="${CARGO_HOME}/bin:${PATH}"

# Copy version-pinning files (used only during image build)
COPY rust-toolchain.toml /tmp/build-cfg/rust-toolchain.toml
COPY versions.env        /tmp/build-cfg/versions.env
COPY mise.toml           /tmp/build-cfg/mise.toml

# Install rustup (no default toolchain — we install explicitly below)
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y \
    --default-toolchain none --profile minimal

# Install Rust toolchain from versions.env
WORKDIR /tmp/build-cfg
RUN . ./versions.env \
    && echo "Installing Rust: ${RUST_VERSION}" \
    && rustup toolchain install "${RUST_VERSION}" \
    && rustup default "${RUST_VERSION}" \
    && rustup component add clippy rustfmt

# Add cross-compilation targets
RUN rustup target add \
      x86_64-unknown-linux-gnu \
      aarch64-unknown-linux-gnu \
      aarch64-linux-android \
      armv7-linux-androideabi \
      i686-linux-android \
      x86_64-linux-android

# Install `cross` — Docker-based cross-compilation tool.
# This is done *before* the NDK PATH entries are active, so the system linker
# is used.  Sourcing versions.env gives us the pinned CROSS_VERSION.
RUN . /tmp/build-cfg/versions.env \
    && echo "Installing cross v${CROSS_VERSION}" \
    && cargo install cross \
         --git https://github.com/cross-rs/cross \
         --locked \
         --tag "v${CROSS_VERSION}"

# Grant vscode user ownership of Rust directories
RUN chown -R vscode:vscode ${CARGO_HOME} ${RUSTUP_HOME}

# ---------------------------------------------------------------------------
# mise — manages Node.js, Python, Go  (installed as vscode user)
# ---------------------------------------------------------------------------
USER vscode

RUN curl https://mise.jdx.dev/install.sh | sh
ENV PATH="/home/vscode/.local/share/mise/shims:/home/vscode/.local/bin:${PATH}"

# Pre-install tools from mise.toml
COPY --chown=vscode:vscode mise.toml     /tmp/build-cfg/mise.toml
COPY --chown=vscode:vscode versions.env  /tmp/build-cfg/versions.env
RUN cd /tmp/build-cfg && mise trust && mise install && mise reshim

# Activate mise in interactive shells
RUN echo 'eval "$(mise activate bash)"' >> ~/.bashrc \
    && ( echo 'eval "$(mise activate zsh)"' >> ~/.zshrc 2>/dev/null || true )

# ---------------------------------------------------------------------------
# Wrapper development tools
# ---------------------------------------------------------------------------

# Python wrapper: build/publish tooling
RUN pip install --no-cache-dir --user setuptools wheel twine auditwheel

# JavaScript wrapper: enable Corepack for Yarn 4.x
RUN corepack enable

# ---------------------------------------------------------------------------
# Cleanup
# ---------------------------------------------------------------------------
USER root
RUN rm -rf /tmp/build-cfg
USER vscode

WORKDIR /workspace
