from flask import Flask
import argparse
import os

from HQC_html import html

app = Flask(__name__)
app.register_blueprint(html)
app.logger_name = 'flask'
app.config['data_directory'] = "/home/jjaco34/data/histoqc_results/tsv_run_no_exceptions" #args.data_directory

if __name__ == '__main__':
    parser = argparse.ArgumentParser(prog="histoqc.ui",description="launch server for result viewing in user interface")
    # parser.add_argument('data_directory', nargs='?', default=os.getcwd(), help='Specify the data directory [default:current directory]')
    parser.add_argument('--port', '-p', type=int, default=5000, help='Specify the port [default:5000]')
    args = parser.parse_args()

    # set config in flask app
    

    app.logger.info('Starting Flask app')
    app.run(host='0.0.0.0', port=args.port, debug=False, threaded=True)

    
