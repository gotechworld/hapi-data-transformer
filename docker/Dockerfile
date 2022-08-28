FROM node:8
RUN mkdir -p /var/www/app
RUN npm install -g nodemon
EXPOSE 6800
ADD entrypoint.sh /entrypoint.sh
RUN chmod 755 /entrypoint.sh
CMD ["/bin/bash", "/entrypoint.sh"]