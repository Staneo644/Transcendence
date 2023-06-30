FROM node:latest
EXPOSE 3000
RUN apt-get update && apt-get upgrade -y &&  \
    apt-get -y install npm install;\
    apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

COPY ./app /home/app

WORKDIR /home/app

RUN npm install

CMD ["npm", "run", "start"]
