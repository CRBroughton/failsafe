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

  packages = [ pkgs.git pkgs.just ];

  enterShell = ''
    echo "failsafe devenv: node $(node --version), pnpm $(pnpm --version)"
    if [ ! -d node_modules ]; then
      echo "node_modules missing, running pnpm install..."
      pnpm install
      echo "building packages..."
      pnpm -r build
    fi
  '';
}
