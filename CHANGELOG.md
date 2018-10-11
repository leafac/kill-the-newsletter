# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.4] - 2018-10-11
### Changed
- Change infrastructure from service-oriented Ruby back to standalone Go. It turns out that even Backblaze B2—which is cheap—doesn’t beat the $5/month of a DigitalOcean machine.

## [0.0.3] - 2018-05-12
### Changed
- Change infrastructure from standalone Go to service-oriented Ruby.

## [0.0.2] - 2017-02-15
### Added
- Truncate large feeds. Thanks Abdulvahid Işık for the bug report.

## 0.0.1 - 2017-02-09
### Added
- Basic functionality.

[Unreleased]: https://github.com/leafac/kill-the-newsletter/compare/0.0.4...HEAD
[0.0.4]: https://github.com/leafac/kill-the-newsletter/compare/0.0.3...0.0.4
[0.0.3]: https://github.com/leafac/kill-the-newsletter/compare/0.0.2...0.0.3
[0.0.2]: https://github.com/leafac/kill-the-newsletter/compare/0.0.1...0.0.2
