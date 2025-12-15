FROM node:22-alpine

# Set the working directory
WORKDIR /app

# Install dependencies
COPY package.json /app/
COPY package-lock.json /app/
RUN npm install --force

# Copy the project code into the container
COPY . /app/

CMD npm run dev
