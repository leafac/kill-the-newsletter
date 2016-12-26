.PHONY: build deploy build/clean documentation documentation/deploy documentation/clean clean

build: kill-the-newsletter

kill-the-newsletter: kill-the-newsletter.go
	env GOOS=linux GOARCH=amd64 go build kill-the-newsletter.go

deploy: build
	ssh leafac.com 'cd leafac.com && docker-compose stop killthenewsletter'
	scp kill-the-newsletter leafac.com:leafac.com/websites/www.kill-the-newsletter.com/kill-the-newsletter
	ssh leafac.com 'cd leafac.com && docker-compose start killthenewsletter'

build/clean:
	rm -f kill-the-newsletter

documentation: compiled-documentation/index.html

compiled-documentation/index.html: documentation/kill-the-newsletter.scrbl
	raco scribble --dest compiled-documentation/ --dest-name index -- documentation/kill-the-newsletter.scrbl

documentation/deploy: documentation
	rsync compiled-documentation/ leafac.com:leafac.com/websites/software/kill-the-newsletter/

documentation/clean:
	rm -rf compiled-documentation

clean: build/clean documentation/clean
