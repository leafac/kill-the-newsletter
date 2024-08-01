# Changelog

## 2.0.8 · 2024-08-01

- Changed the feed size limit from `2 ** 20` to `2 ** 19` to try and reduce server costs 💀

## 2.0.7 · 2024-06-21

- Added a “feed settings” page, which allows for adding a custom icon to a feed (https://github.com/leafac/kill-the-newsletter/issues/92)
- Added more background job workers to WebSub jobs (https://github.com/leafac/kill-the-newsletter/issues/68).
- Changed the route of feed creation via API from `/` to `/feeds`, for example:

  ```console
  $ curl --request POST --header "CSRF-Protection: true" --header "Accept: application/json" --data "title=Example of a feed" https://localhost/feeds
  ```

  Also, now that API endpoint responds with `Content-Type: application/json`.

## 2.0.6 · 2024-06-06

- Added support for `<icon>` (https://github.com/leafac/kill-the-newsletter/issues/92).
- Added author to entry (https://github.com/leafac/kill-the-newsletter/issues/102).

## 2.0.5 · 2024-06-06

- Added support for attachments (https://github.com/leafac/kill-the-newsletter/issues/66).

- Added support for API-like use of feed creation (https://github.com/leafac/kill-the-newsletter/issues/43), for example:

  ```console
  $ curl --request POST --header "CSRF-Protection: true" --header "Accept: application/json" --data "title=Example of a feed" https://localhost/
  {"feedId":"r4n7siivh4iiho0gtv59","email":"r4n7siivh4iiho0gtv59@localhost","feed":"https://localhost/feeds/r4n7siivh4iiho0gtv59.xml"}
  ```

## 2.0.4 · 2024-06-06

- Added support for WebSub (https://github.com/leafac/kill-the-newsletter/issues/68).

## 2.0.3 · 2024-06-05

- Fixed an issue in which email redirects weren’t coming through (because they often include the `=` character, which we disallowed previously).
- Added a feature to allow deleting a feed.
- Added rate limiting to try and control server costs.

## 2.0.2 · 2024-05-14

- **Breaking Change:** Changed the configuration option from `administratorEmail` to `systemAdministratorEmail`.
- Allowed hotlinked images in alternate HTML.

## 2.0.1 · 2024-05-07

Adapted Kill the Newsletter! to use [Radically Straightforward](https://github.com/radically-straightforward/radically-straightforward).

This is a breaking change, and to migrate you must do the following:

1. Stop your current installation of Kill the Newsletter! and move it into a temporary directory.

2. Install Kill the Newsletter! as if it was a fresh install.

3. Run a migration from the old database into the new one. Open a terminal multiplexer, for example, tmux or GNU Screen, so that the migration continues to run even if your SSH connection disconnects. Run the following command:

   ```console
   $ ./kill-the-newsletter/kill-the-newsletter ./configuration.mjs --migrate ../kill-the-newsletter--old/data/kill-the-newsletter.db >> ./migration.txt 2>&1
   ```

   > **Note:** The `--migrate` option is only available in version 2.0.1. You first have to migrate to it, then to the later versions above.
