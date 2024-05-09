# Changelog

## Unreleased

- Changed the `email` configuration option into `systemAdministratorEmail`.

## 2.0.1 · 2024-05-07

Adapted Kill the Newsletter! to use [Radically Straightforward](https://github.com/radically-straightforward/radically-straightforward).

This is a breaking change, and to migrate you must do the following:

1. Stop your current installation of Kill the Newsletter! and move it into a temporary directory.

2. Install Kill the Newsletter! as if it was a fresh install.

3. Run a migration from the old database into the new one. Open a terminal multiplexer, for example, tmux or GNU Screen, so that the migration continues to run even if your SSH connection disconnects. Run the following command:

   ```console
   $ ./kill-the-newsletter/kill-the-newsletter ./configuration.mjs --migrate ../kill-the-newsletter--old/data/kill-the-newsletter.db >> ./migration.txt 2>&1
   ```
