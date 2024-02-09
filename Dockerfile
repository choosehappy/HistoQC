# Dockerfile for HistoQC.
#
# This Dockerfile uses two stages. In the first, the project's python dependencies are
# installed. This requires a C compiler. In the second stage, the HistoQC directory and
# the python environment are copied over. We do not require a C compiler in the second
# stage, and so we can use a slimmer base image.

FROM python:3.8 AS builder
ARG DEBIAN_FRONTEND=noninteractive
WORKDIR /opt/HistoQC
COPY . .
# Create virtual environment for this project. This makes it easier to copy the Python
# installation into the second stage of the build.
ENV PATH="/opt/HistoQC/venv/bin:$PATH"
RUN python -m venv venv \
    && python -m pip install --no-cache-dir setuptools wheel \
    && python -m pip install --no-cache-dir -r requirements.txt \
    && python -m pip install --no-cache-dir . \
    # We force this so there is no error even if the dll does not exist.
    && rm -f libopenslide-0.dll

FROM rayproject/ray-ml:latest-gpu
ARG DEBIAN_FRONTEND=noninteractive
RUN sudo apt-get update \
    && sudo apt-get install -y --no-install-recommends \
        libopenslide0 \
        libtk8.6 \
        procps \
    && sudo rm -rf /var/lib/apt/lists/*
WORKDIR /opt/HistoQC
COPY --from=builder /opt/HistoQC/ .
ENV PATH="/opt/HistoQC/venv/bin:$PATH"

WORKDIR /data
