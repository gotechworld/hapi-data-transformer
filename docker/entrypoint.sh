#!/bin/sh

###npm --prefix /var/www/app install /var/www/app
nodemon -L /var/www/app/server.js --watch "/var/www/app/plugins/" -e js,json