import argparse
import sys

from histoqc.config import list_config_templates
from histoqc.config import read_config_template


def main(argv=None):
    if argv is None:
        argv = sys.argv[1:]

    parser = argparse.ArgumentParser(prog="histoqc.config",description="Show example configuration files")
    parser.add_argument('--list',
                        action='store_true',
                        help='list available configs')
    parser.add_argument('--show',
                        metavar='NAME',
                        type=str,
                        default=None,
                        help='show named example config')
    args = parser.parse_args(argv)

    if args.list:
        print("# available example configurations:")
        for name, filename in list_config_templates().items():
            print(f"- {name}:".ljust(11), f"{filename}")
        return 0

    elif args.show:
        name = args.show
        try:
            config = read_config_template(name)
        except KeyError:
            print(f"unknown configuration '{name}'", file=sys.stderr)
            return -1

        print(f"# example configuration '{name}'")
        print(config)
        return 0

    else:
        parser.print_help()
        return -1


if __name__ == "__main__":
    sys.exit(main())
