# Dockerfile for HistoQC.
FROM rayproject/ray-ml:latest-gpu
ARG DEBIAN_FRONTEND=noninteractive
USER root
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libopenslide0 \
        libtk8.6 \
        procps \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/HistoQC
COPY . .
# install
RUN pip install --no-cache-dir setuptools wheel \
    && pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir . \
    && rm -f libopenslide-0.dll

WORKDIR /data

CMD ["bash"]

