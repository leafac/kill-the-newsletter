# Changelog

## 2.0.1 · 2024-05-07

- Adapted Kill the Newsletter! to use [Radically Straightforward](https://github.com/radically-straightforward/radically-straightforward).

```console
until ./kill-the-newsletter/_/node_modules/.bin/node ./kill-the-newsletter/_/build/migrate--v1.0.1--v2.0.1.mjs /mnt/data__old/kill-the-newsletter.db ./data/kill-the-newsletter.db >> ./migration.txt 2>&1
do
  echo "Rerunning..."
done
```

tmux
