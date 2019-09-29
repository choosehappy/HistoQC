FROM ubuntu
RUN apt-get update
RUN apt-get install -y git python3-pip python3.6
RUN apt-get install -y openslide-tools
WORKDIR /opt
RUN git clone https://github.com/choosehappy/HistoQC.git
WORKDIR /opt/HistoQC
RUN pip3 install -r requirements.txt
FROM ubuntu
RUN apt-get update
RUN apt-get install -y git python3-pip python3.6
RUN apt-get install -y openslide-tools
WORKDIR /opt
RUN git clone https://github.com/sharmalab/HistoQC.git
WORKDIR /opt/HistoQC
RUN pip3 install -r requirements.txt
