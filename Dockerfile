FROM node:alpine

WORKDIR /app

COPY ./package.json ./
COPY ./yarn.lock ./

RUN yarn

COPY ./src ./src

CMD ["yarn", "start"]