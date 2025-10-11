# code-insiders $__fish_config_dir/config.fish
string match -q "$TERM_PROGRAM" "vscode"
and . (code --locate-shell-integration-path fish)