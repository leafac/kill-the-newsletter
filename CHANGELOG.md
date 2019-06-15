# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.7] - 2019-06-15
### Added
- Automated tests.

### Changed
- Migrate the application from Ruby on Rails to Sinatra, because it’s simpler.
- Use proper XML parsing, instead of regular expression hacks.
- Use Travis CI to run automated tests and deploy.

## [0.0.6] - 2019-02-05
### Fixed
- Encoding issues that prevented emails from being processed at all. Some emails were lost ☹️
- Multipart emails that were processed incorrectly.

## [0.0.5] - 2019-02-03
### Changed
- Migrate the application from Go to Ruby on Rails, receiving email via a Exim pipe. This is a bigger hammer, but it’s easier for me to maintain, because I know Ruby on Rails better than I know Go.

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

[Unreleased]: https://github.com/leafac/kill-the-newsletter/compare/0.0.7...HEAD
[0.0.7]: https://github.com/leafac/kill-the-newsletter/compare/0.0.6...0.0.7
[0.0.6]: https://github.com/leafac/kill-the-newsletter/compare/0.0.5...0.0.6
[0.0.5]: https://github.com/leafac/kill-the-newsletter/compare/0.0.4...0.0.5
[0.0.4]: https://github.com/leafac/kill-the-newsletter/compare/0.0.3...0.0.4
[0.0.3]: https://github.com/leafac/kill-the-newsletter/compare/0.0.2...0.0.3
[0.0.2]: https://github.com/leafac/kill-the-newsletter/compare/0.0.1...0.0.2
