import os
import sys

from histoqc.ui import run_server


def main(argv=None):
    import argparse

    if argv is None:
        argv = sys.argv[1:]

    parser = argparse.ArgumentParser()
    parser.add_argument('--bind', '-b', metavar='ADDRESS',
                        help='Specify alternate bind address '
                             '[default: all interfaces]')
    parser.add_argument('data_directory',
                        default=os.getcwd(),
                        help='Specify the data directory '
                             '[default:current directory]')
    parser.add_argument('--port', type=int, default=8000,
                        help='Specify alternate port [default: 8000]')
    args = parser.parse_args(argv)

    # serve the histoqc ui
    run_server(args.data_directory, host=args.bind, port=args.port)


if __name__ == "__main__":
    main()
