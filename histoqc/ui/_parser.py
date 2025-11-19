import argparse

def get_argument_parser():
    parser = argparse.ArgumentParser(prog="histoqc.ui",description="launch server for result viewing in user interface")
    parser.add_argument('--port', '-p', type=int, default=5000, help='Specify the port [default:5000]')
    parser.add_argument('resultsfilepath', type=str, help='Specify the full path to the results file. The user must specify this path.')

    return parser

