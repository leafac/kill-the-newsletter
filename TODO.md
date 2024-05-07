# TODO

- Deploy.
  - 600gymaalx1o1grx@kill-the-newsletter.com
  - https://kill-the-newsletter.com/feeds/600gymaalx1o1grx.xml
- Setup future deploys with GitHub Actions.
- Answer:
  - blogtrottr
  - straynic
- Documentation.

```console
until ./kill-the-newsletter/_/node_modules/.bin/node ./kill-the-newsletter/_/build/migrate--v1.0.1--v2.0.0.mjs /mnt/data__old/kill-the-newsletter.db ./data/kill-the-newsletter.db >> ./migration.txt 2>&1
do
  echo "Rerunning..."
done
```

- Builds for macOS and Windows.
- Backup.
- Why is the migration script using a lot of memory?
