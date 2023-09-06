from flask import Flask
from flask_restless import APIManager

from HQC_html import html

app = Flask(__name__)
app.register_blueprint(html)
app.logger_name = 'flask'

if __name__ == '__main__':
    app.logger.info('Starting Flask app')
    app.run(host='0.0.0.0', port=5555, debug=False)

    
