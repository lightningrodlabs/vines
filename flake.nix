{
  description = "Flake for Holochain app development";

  inputs = {
    holonix.url = "github:holochain/holonix/main-0.7";

    # Replaces darksoil-studio/tauri-plugin-holochain (p2p-shipyard), which has no 0.7
    # line. This repo ships an FFI-free `tauri-plugin-holochain` that covers both desktop
    # and Android from one dev shell, so the separate holochainTauriDev /
    # holochainTauriAndroidDev shells are no longer needed.
    android-service-runtime.url = "github:holochain/android-service-runtime/main-0.7";

    nixpkgs.follows = "holonix/nixpkgs";
    android-service-runtime.inputs.holonix.follows = "holonix";
  };

  outputs = inputs @ { ... }:
    inputs.holonix.inputs.flake-parts.lib.mkFlake { inherit inputs; }
    {
      systems = builtins.attrNames inputs.holonix.devShells;

      perSystem =
        { inputs', pkgs, system, ... }: {
          # Desktop and Android both come from the android-service-runtime shell, which
          # already provides the Rust toolchain, Android SDK/NDK and the Tauri desktop libs.
          devShells.default = pkgs.mkShell {
            inputsFrom = [
              inputs'.android-service-runtime.devShells.default
              inputs'.holonix.devShells.default
            ];

            packages = with pkgs; [
              nodejs_22
              yarn
              binaryen
              typescript
            ];

            shellHook = ''
              export PS1='\[\033[1;34m\][holonix:\w]\$\[\033[0m\] '
            '';
          };

          # Kept as a separate name for existing scripts/muscle memory; the default shell
          # already carries the Android SDK/NDK.
          devShells.androidDev = pkgs.mkShell {
            inputsFrom = [
              inputs'.android-service-runtime.devShells.default
              inputs'.holonix.devShells.default
            ];

            packages = with pkgs; [
              nodejs_22
              yarn
              binaryen
              typescript
            ];
          };
        };
    };
}
