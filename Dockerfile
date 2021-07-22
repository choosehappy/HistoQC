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
    && python -m pip install --no-cache-dir -r requirements.txt \
    && python -m pip install --no-cache-dir . \
    # We force this so there is no error even if the dll does not exist.
    && rm -f libopenslide-0.dll

FROM python:3.8-slim
ARG DEBIAN_FRONTEND=noninteractive
WORKDIR /opt/HistoQC
COPY --from=builder /opt/HistoQC/ .
ENV PATH="/opt/HistoQC/venv/bin:$PATH"
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libopenslide0 \
    && rm -rf /var/lib/apt/lists/*

# uncomment:
    # 1 - this additional RUN only if you are facing issues with UTF8 when running your container
    # 2 - all ENV variables in comment

    #RUN apt-get update -y \
    #    && apt-get install --reinstall -y locales \
    #    # uncomment chosen locale to enable it's generation
    #    && sed -i 's/# pl_PL.UTF-8 UTF-8/pl_PL.UTF-8 UTF-8/' /etc/locale.gen \
    #    # generate chosen locale
    #    && locale-gen pl_PL.UTF-8

    ## set system-wide locale settings
    #ENV LANG pl_PL.UTF-8
    #ENV LANGUAGE pl_PL
    #ENV LC_ALL pl_PL.UTF-8
