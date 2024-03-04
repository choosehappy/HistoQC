FROM rayproject/ray-ml:latest-gpu

ARG DEBIAN_FRONTEND=noninteractive

USER root

RUN sudo apt-get update \
    && sudo apt-get install -y --no-install-recommends \
        libopenslide0 \
        libtk8.6 \
        procps \
    && sudo rm -rf /var/lib/apt/lists/*

USER ray

COPY ./requirements.txt /opt/HistoQC/requirements.txt

WORKDIR /opt/HistoQC

RUN pip install -r requirements.txt

ADD . /opt/HistoQC/

CMD [ "python", "-m", "histoqc", "--help" ]
