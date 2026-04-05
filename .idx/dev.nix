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

  # Sets environment variables in the workspace
  env = {
    # Supabase connection details
    SUPABASE_URL = "https://fjdngofojmsdixxduxuk.supabase.co";
    SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqZG5nb2Zvam1zZGl4eGR1eHVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNDA1MDAsImV4cCI6MjA4NDYxNjUwMH0.SYkcUmgsLq7UnBGrLupV93g3mabJJB0QYFVrCGMDiYg";

    # Supabase MCP Server authentication token
    # Required for @supabase/mcp-server-supabase to authenticate with Supabase Management API
    SUPABASE_ACCESS_TOKEN = "sbp_7ff2ce82750c0b6da6e26877a0d77eccc4e1e7fc";

    # Example placeholder for other AI services if needed
    # GEMINI_API_KEY = "AIzaSyDA6yJzAaRA5NXqh48ut0sb2sVh88swe0Q";
  };

  idx = {
    # Search for the extensions you want on https://open-vsx.org/ and use "publisher.id"
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
