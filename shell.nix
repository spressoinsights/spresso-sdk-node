{ pkgs ? import <nixpkgs> { config.allowUnfree = true;} , ... }:

let
in
  pkgs.mkShell {
    buildInputs = with pkgs; [
      nodejs-16_x
      yarn
    ];
    shellHook = ''
    '';
  }
