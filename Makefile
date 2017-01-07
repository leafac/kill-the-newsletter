.PHONY: container build deploy build/clean documentation documentation/deploy documentation/clean clean

container: build
	docker build --tag kill-the-newsletter:latest .

build: kill-the-newsletter

kill-the-newsletter: kill-the-newsletter.go
	env GOOS=linux GOARCH=amd64 go build kill-the-newsletter.go

deploy: build
	ssh leafac.com 'cd leafac.com && docker-compose stop kill-the-newsletter && docker-compose rm --force kill-the-newsletter'
	rsync -av kill-the-newsletter leafac.com:leafac.com/kill-the-newsletter/kill-the-newsletter
	ssh leafac.com 'cd leafac.com && docker-compose build kill-the-newsletter && docker-compose up -d kill-the-newsletter'

build/clean:
	rm -f kill-the-newsletter

documentation: compiled-documentation/index.html

compiled-documentation/index.html: documentation/kill-the-newsletter.scrbl
	cd documentation && raco scribble --dest ../compiled-documentation/ --dest-name index -- kill-the-newsletter.scrbl

documentation/deploy: documentation
	rsync -av --delete compiled-documentation/ leafac.com:leafac.com/websites/software/kill-the-newsletter/

documentation/clean:
	rm -rf compiled-documentation

clean: build/clean documentation/clean
