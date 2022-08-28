## Installation steps

1. Install [nvm](https://github.com/nvm-sh/nvm). This will help you manage several installations of `node`, locally
2. `nvm install 12.20.0`
3. `git clone git@gitlab.altex.ro:ams/hapi-data-transformer.git`
4. `cd hapi-data-transformer`
5. `npm install`
6. `cp src/config/manifest.json.dist src/config/manifest.json`
7. `npm start` to start server
8. Install [postman](https://www.postman.com)
9. Get postman collection and environments from docs

It's time now to be hapi!

### Potential issues

* I get a bunch of errors when running `npm install`

Don't worry about it and carry on with the installation steps. Contact a colleague if you have issues with starting the dev server because of these.

* Sometimes my route won't change while in dev-mode

Try to hard refresh the browser, there are some known issues with the router.

## Docker
Added a docker compose recipe for "quick-starters". Start it with `docker-compose up`.

## FTP stage ftp-1
Host: 82.79.61.131
Local Folder : Location : /ftp/datatransformer
User : datatransformer
Pass: ask_at_itops_for_pass

## Swagger - API Documentation

https://data-transformer-s1.altex.ro/documentation
