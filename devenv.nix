{ pkgs, lib, ... }:

{
  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_24;
    pnpm = {
      enable = true;
      install.enable = false;
    };
  };

  packages = [ pkgs.git ];

  enterShell = ''
    echo "failsafe devenv: node $(node --version), pnpm $(pnpm --version)"
  '';
}
