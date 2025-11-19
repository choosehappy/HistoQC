from flask import Flask
import argparse
import os

from histoqc.ui.HQC_html import html
from histoqc.ui._parser import get_argument_parser

app = Flask(__name__)
app.register_blueprint(html)
app.logger_name = 'flask'

def main():
    parser = get_argument_parser()
    args = parser.parse_args()

    # split the path so that the histoqc data and filename can be accessed separately. 
    # If resultsfilepath is an empty string (default), data_directory and results_filename will be empty strings.
    app.config['data_directory'] = os.path.dirname(args.resultsfilepath)
    app.config['results_filename'] = os.path.basename(args.resultsfilepath)

    app.logger.info('Starting Flask app')
    app.run(host='0.0.0.0', port=args.port, debug=True, threaded=True)

if __name__ == '__main__':
    main()


