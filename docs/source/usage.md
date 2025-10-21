# Basic Usage

## histoqc CLI

Running the pipeline is now done via a Python module:

```bash
python -m histoqc --help
```

Installed or simply git-cloned, a typical command line for running the tool looks like:

```bash
python -m histoqc -c v2.1 -n 3 "*.svs"
```

This will use 3 processes to operate on all `.svs` files using the named configuration file `config_v2.1.ini` from the config directory.

In case of errors, HistoQC can be run with the same output directory and will begin where it left off, identifying completed images by the presence of an existing directory.

## histoqc.config CLI

Supplied configuration files can be viewed and modified like so:

```bash
python -m histoqc.config --help
```

Alternatively, one can specify their own modified config file using an absolute or relative filename:

```bash
python -m histoqc.config --show light > mylight.ini
python -m histoqc -c ./mylight.ini -n 3 "*.svs"
```

## histoqc.ui CLI

HistoQC now has an HTTP server which allows for improved result viewing. It can be accessed like so:

```bash
python -m histoqc.ui --help
```

After completion of slide processing, view results in your web browser by running the following command:

```bash
python -m histoqc.ui <results-file-path>
```

You may then navigate to `http://<hostname>:5000` in your web browser to view the results.