# Static musl build of the vendored LBR policy engine (LBR/ai-service).
# The runtime image is Alpine, so the binary is linked against musl and copied in.
FROM rust:1-alpine AS lbr-ai

RUN apk add --no-cache build-base
WORKDIR /build
COPY LBR/ai-service/Cargo.toml LBR/ai-service/Cargo.lock /build/
COPY LBR/ai-service/src /build/src
COPY LBR/ai-service/minimax /build/minimax
RUN cargo build --release --locked

FROM python:3.13-alpine

RUN apk add --no-cache mariadb-connector-c-dev
RUN apk add --no-cache --virtual build-deps gcc musl-dev pkgconf mariadb-dev
# node runs LBRrules.js headlessly for AI seats (see LBR/ai/README.md)
RUN apk add --no-cache nodejs

RUN apk add --no-cache mysql-client 

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set the working directory
WORKDIR /app

# Install dependencies
COPY requirements.txt /app/
RUN pip install -r requirements.txt
# Install development dependencies - remove this line for production builds
COPY requirements-dev.txt /app/
RUN pip install -r requirements-dev.txt

# Copy the project code into the container
COPY . /app/
# LBR_AI_BIN defaults to this path in settings.py.
COPY --from=lbr-ai /build/target/release/lbr-policy /app/LBR/ai-service/target/release/lbr-policy

CMD ./start.sh
