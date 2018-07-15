FROM node:8-alpine

WORKDIR /app

ADD . .

EXPOSE 3000

CMD DEBUG=* npm start