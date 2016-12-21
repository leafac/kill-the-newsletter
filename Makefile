.PHONY: build deploy

build: kill-the-newsletter

kill-the-newsletter: kill-the-newsletter.go
	env GOOS=linux GOARCH=amd64 go build

deploy: build
	scp kill-the-newsletter leafac.com:leafac.com/websites/www.kill-the-newsletter.com/kill-the-newsletter
