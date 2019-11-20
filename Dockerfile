FROM ubuntu

RUN apt-get update
RUN apt-get install -y git python3-pip python3.6 
RUN apt-get install -y openslide-tools

RUN cd /opt
RUN git clone https://github.com/choosehappy/HistoQC.git
RUN pip3 install -r /opt/HistoQC/requirements.txt

