from flask import Flask
import argparse
import os

from histoqc.ui.HQC_html import html

app = Flask(__name__)
app.register_blueprint(html)
app.logger_name = 'flask'

def main():
    parser = argparse.ArgumentParser(prog="histoqc.ui",description="launch server for result viewing in user interface")
    parser.add_argument('--port', '-p', type=int, default=5000, help='Specify the port [default:5000]')
    parser.add_argument('resultsfilepath', type=str, help='Specify the full path to the results file. The user must specify this path.')
    args = parser.parse_args()

    # split the path so that the histoqc data and filename can be accessed separately. 
    # If resultsfilepath is an empty string (default), data_directory and results_filename will be empty strings.
    app.config['data_directory'] = os.path.dirname(args.resultsfilepath)
    app.config['results_filename'] = os.path.basename(args.resultsfilepath)

    app.logger.info('Starting Flask app')
    app.run(host='0.0.0.0', port=args.port, debug=True, threaded=True)

if __name__ == '__main__':
    main()


