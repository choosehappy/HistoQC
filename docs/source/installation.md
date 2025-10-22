# Installation

## Using Docker
Docker is now the recommended method for installing and running HistoQC. Containerized runtimes like Docker are more portable and avoid issues with Python environment management, and ensure reproducible application behavior. Docker is available for Windows, MacOS, and Linux.

> **Note**: These instructions assume you have Docker engine installed on your system. If you do not have Docker installed, please see the [Docker installation instructions](https://docs.docker.com/engine/install/).

1. Begin by pulling the [official HistoQC Docker image](https://hub.docker.com/r/histotools/histoqc/tags) from Docker Hub. This repository contains the latest stable version of HistoQC and is guaranteed up-to-date.

2. Next, run the Docker image with a few options to mount your data directory and expose the web interface on your host machine.

3. A terminal session will open inside the Docker container. You can now run HistoQC as you would on a local machine.

4. If you exit the shell, the container will stop running but no data/configuration will be lost. You can restart the container and resume your work with the following command.

## Using pip
While we recommend using Docker for most users, some may prefer installing HistoQC from source for development or customization purposes.

Follow these steps to install and set up HistoQC:

1. **Clone the Repository**

   Clone the HistoQC repository to your local machine:

   ```bash
   git clone https://github.com/choosehappy/HistoQC.git
   cd HistoQC
   ```

2. **(Optional) Set Up a Virtual Environment**

   It is recommended to use a virtual environment to manage dependencies:

   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install Dependencies**

   Install HistoQC

   ```bash
   pip install .
   ```

4. **Verify Installation**

   Run the following command to verify that HistoQC is installed correctly:

   ```bash
   histoqc --help
   ```

   This should display the CLI usage instructions.

