FROM python:3.13-alpine

RUN apk add --no-cache mariadb-connector-c-dev
RUN apk add --no-cache --virtual build-deps gcc musl-dev pkgconf mariadb-dev

RUN apk add --no-cache mysql-client 

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set the working directory
WORKDIR /app

# Install dependencies
COPY requirements.txt /app/
RUN pip install -r requirements.txt

# Copy the project code into the container
COPY . /app/

CMD ./start.sh
