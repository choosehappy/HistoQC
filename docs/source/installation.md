# Installation

## Using Docker
Docker is now the recommended method for installing and running HistoQC. Containerized runtimes like Docker are more portable and avoid issues with Python environment management, and ensure reproducible application behavior. Docker is available for Windows, MacOS, and Linux.

> **Note**: These instructions assume you have Docker engine installed on your system. If you do not have Docker installed, please see the [Docker installation instructions](https://docs.docker.com/engine/install/).

1. Begin by pulling the [official HistoQC Docker image](https://hub.docker.com/r/histotools/histoqc/tags) from Docker Hub. This repository contains the latest stable version of HistoQC and is guaranteed up-to-date.

2. Next, run the Docker image with a few options to mount your data directory and expose the web interface on your host machine.

3. A terminal session will open inside the Docker container. You can now run HistoQC as you would on a local machine.

4. If you exit the shell, the container will stop running but no data/configuration will be lost. You can restart the container and resume your work with the following command.

## Using pip
You can install HistoQC into your system by using:

```bash
git clone https://github.com/choosehappy/HistoQC.git
cd HistoQC
python -m pip install --upgrade pip  # (optional) upgrade pip to newest version
pip install -r requirements.txt      # (required) install pinned versions of packages
pip install .                        # (recommended) install HistoQC as a package
```

Note that `pip install .` will install HistoQC as a Python package in your environment. If you do not want to install HistoQC as a package, you will only be able to run HistoQC from the `HistoQC` directory.