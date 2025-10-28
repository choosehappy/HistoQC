# Installation

## Using Docker
Docker is the recommended method for installing and running HistoQC. Containerized runtimes like Docker are more portable and avoid issues with Python environment management, and ensure reproducible application behavior. Docker is available for Windows, MacOS, and Linux.

```{note}
These instructions assume you have Docker installed on your system. [Docker installation instructions](https://docs.docker.com/engine/install/).
```

1. Run the official HistoQC Docker image from Docker Hub:

   ```bash
   docker run -v <local-path>:/data --name <container-name> -p <local-port>:5000 -it histotools/histoqc:master /bin/bash
   # Example:
   # docker run -v /local/datadir:/data --name my_container -p 5000:5000 -it histotools/histoqc:master /bin/bash
   ```

2. Your terminal will open a bash shell inside the Docker container. You can now proceed to run HistoQC commands. See [Running HistoQC](running_histoqc.md)

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

3. **Install HistoQC**

   ```bash
   pip install .
   ```

4. **Verify Installation**

   Run the following command to verify that HistoQC is installed correctly:

   ```bash
   histoqc --help
   ```

   This should display the CLI usage instructions.

