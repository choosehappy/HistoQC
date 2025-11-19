# Viewing Results
## Basic Usage
After completion of slide processing, view results in your web browser by running the following command:

```bash
histoqc.ui <results-file-path>
```

You may then navigate to `http://<hostname>:5000` in your web browser to view the results.

## Command Line Interface
```{argparse}
:module: histoqc.ui._parser
:func: get_argument_parser
:prog: histoqc.ui
```