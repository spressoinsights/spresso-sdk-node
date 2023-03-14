{ pkgs ? import <nixpkgs> { config.allowUnfree = true;} , ... }:

let
  node16_17_1 = import
    (builtins.fetchTarball https://github.com/nixos/nixpkgs/tarball/59573f302edae493dd98d88cbe3504adb90243fc){};
in
  pkgs.mkShell {
    buildInputs = with pkgs; [
      node16_17_1.nodejs-16_x
      gnumake
      minikube
      kubectl
    ];
    shellHook = ''
      export CLIENTSECRET=Pv1om60PDE0RV7M8WmhsGPyeeLaXkwF_1bFXQSFZT12Hgnr0bb8vXp_Lm3tHViWY
    '';
  }
