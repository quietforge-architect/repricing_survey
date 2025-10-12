FROM node:20-bullseye AS build

WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
    python3 \
    build-essential \
    pkg-config \
    libsqlite3-dev \
 && rm -rf /var/lib/apt/lists/* \
 && ln -sf /usr/bin/python3 /usr/bin/python

COPY package*.json ./

RUN npm ci

COPY . .

ARG SURVEY_URL=https://example.com/survey
ENV SURVEY_URL=${SURVEY_URL}

RUN npm run build:offline
RUN npm run test:smoke

FROM nginx:1.27-alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
