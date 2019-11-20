FROM ubuntu

RUN apt-get update && \
    apt-get install -y git python3-pip python3.6 && \
    apt-get install -y openslide-tools

RUN cd /opt \
    git clone https://github.com/choosehappy/HistoQC.git \
    pip3 install -r /opt/HistoQC/requirements.txt
