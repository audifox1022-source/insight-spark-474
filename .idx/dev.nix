# To learn more about how to use Nix to configure your environment
# see: https://developers.google.com/idx/guides/customize-idx-env
{ pkgs, ... }: {
  # Which nixpkgs channel to use.
  channel = "stable-23.11"; # or "unstable"

  # Use https://search.nixos.org/packages to find packages
  packages = [
    pkgs.nodejs_20
    pkgs.nodePackages.npm
    pkgs.nodePackages.pnpm
    pkgs.bun
  ];

  # Do not commit real secret values here. Configure them in IDX, Vercel,
  # Supabase, or a local .env file that is ignored by git.
  env = {
    SUPABASE_URL = "https://enbbfidgbylvhoivkvkj.supabase.co";
    SUPABASE_SERVICE_ROLE_KEY = "";
    SUPABASE_ACCESS_TOKEN = "";
    GEMINI_API_KEY = "";
  };

  idx = {
    # Search for the extensions you want on https://open-vsx.org/.
    extensions = [
      "dsznajder.es7-react-js-snippets"
      "dbaeumer.vscode-eslint"
      "esbenp.prettier-vscode"
      "bradlc.vscode-tailwindcss"
      "christian-kohler.path-intellisense"
    ];

    # Workspace lifecycle hooks
    workspace = {
      # Runs when a workspace is first created
      onCreate = {
        # npm-install = "npm install";
      };
      # Runs when the workspace is (re)started
      onStart = {
        # Example: start a dev server
        # dev-server = "npm run dev";
      };
    };

    # Preview configuration
    previews = {
      enable = true;
      previews = {
        web = {
          # Example: run npm run dev and listen on $PORT
          command = ["npm" "run" "dev" "--" "--port" "$PORT" "--host" "0.0.0.0"];
          manager = "web";
        };
      };
    };
  };
}
