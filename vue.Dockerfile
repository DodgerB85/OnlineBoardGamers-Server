FROM node:26.12.1-alpine

WORKDIR /app

# Build context is one game's vue<CODE> folder; keep host node_modules out via
# that folder's .dockerignore.
COPY package.json package-lock.json /app/
RUN npm install --force --include=optional

COPY . /app/

CMD npm run dev
