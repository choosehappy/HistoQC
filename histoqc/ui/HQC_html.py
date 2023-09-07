from flask import render_template, Blueprint, request, current_app, send_file
import os

html = Blueprint('html', __name__, template_folder='templates')

@html.route('/')
def index():
    return render_template('index.html')

@html.route('/slickgrid/<fn>')
def slickgrid(fn):
    return "Blank Page"
    #return render_template('index.html', fn=fn)

@html.route('/image/<path:fn>', methods=['GET'])
def image(fn):
    # read image from file system and send over http
    fn_base = fn.split('_')[0]  # remove image type suffix
    img_path = os.path.join(current_app.config['data_directory'], fn_base, fn)
    # return send_from_directory(current_app.config['assets_path'], fn)
    return send_file(img_path)

@html.route('/datadir', methods=['GET'])
def datadir():
    current_app.logger.info('data directory: %s', current_app.config['data_directory'])
    return current_app.config['data_directory']