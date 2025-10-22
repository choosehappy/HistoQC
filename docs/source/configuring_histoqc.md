# Configuring HistoQC
## Basic Usage
Alternatively, one can specify their own modified config file using an absolute or relative filename:

```bash
histoqc.config --show light > mylight.ini
histoqc -c ./mylight.ini -n 3 "*.svs"
```

## Command Line Interface
```{argparse}
:module: histoqc.config._parser
:func: get_argument_parser
:prog: histoqc.config
```
