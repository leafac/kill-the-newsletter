.PHONY: build deploy

build: kill-the-newsletter

kill-the-newsletter: kill-the-newsletter.go
	env GOOS=linux GOARCH=amd64 go build

deploy: build
	ssh leafac.com 'cd leafac.com && docker-compose stop killthenewsletter'
	scp kill-the-newsletter leafac.com:leafac.com/websites/www.kill-the-newsletter.com/kill-the-newsletter
	ssh leafac.com 'cd leafac.com && docker-compose start killthenewsletter'
