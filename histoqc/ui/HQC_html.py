from flask import render_template, Blueprint, request, current_app, send_file
import os
from argparse import Namespace
from cohortfinder_choosehappy.cohortfinder_colormod_original import runCohortFinder
import json
# constants 
cf_results_filename = 'results_cohortfinder.tsv'


html = Blueprint('html', __name__, template_folder='templates')

@html.route('/')
def index():
    return render_template('index.html')


@html.route('/image/<foldername>/<suffix>', methods=['GET'])
def image(foldername, suffix):
    # read image from file system and send over http
    img_name = foldername + suffix
    img_path = os.path.join(current_app.config['data_directory'], foldername, img_name)
    # return send_from_directory(current_app.config['assets_path'], fn)
    return send_file(img_path)


@html.route('/get_results_path', methods=['GET'])
def datadir():
    results_path = os.path.join(current_app.config['data_directory'], current_app.config['results_filename'])
    return results_path


@html.route('/get_hqc_results', methods=['GET'])
def get_hqc_results():
    """
    Returns the HQC results file as a Flask response object.
    """
    results_path = os.path.join(current_app.config['data_directory'], current_app.config['results_filename'])
    
    # if the user provided an incorrect path, raise an error here.
    if not os.path.isfile(results_path):
        raise FileNotFoundError('The results file path provided is not valid: {}'.format(results_path))

    current_app.logger.info('results file path: %s', results_path)

    return send_file(results_path)

@html.route('/run_cohort_finder', methods=['GET'])
def run_cohort_finder():
    # check if cohortFinder has already been run (with output saved)
    fp = os.path.join(current_app.config['data_directory'], '**', cf_results_filename)[0]
    if os.path.isfile(fp):
        pass


    current_app.logger.info('running cohort finder')
    cf_args = Namespace()

    # ---------------- default values ----------------

    cf_args.labelcolumn = None
    cf_args.sitecolumn = None
    cf_args.patientidcolumn = None
    cf_args.batcheffectsitetest = False
    cf_args.batcheffectlabeltest = False
    cf_args.randomseed = None
    cf_args.resultsfilepath = os.path.join(current_app.config['data_directory'], current_app.config['results_filename'])
    cf_args.disable_save = True
    
    
    # ---------------- user input ----------------
    
    cf_args.cols = request.args.get('featuresSelected')
    cf_args.nclusters = int(request.args.get('numClusters'))
    cf_args.testpercent = float(request.args.get('testSetPercent'))  
    # add line to check if cohortFinder has already been run (with output saved). If so, load the results.tsv file and return.
    output, preds = runCohortFinder(cf_args)

    out_dict = {
        'embed_x': output['embed_x'].tolist(),
        'embed_y': output['embed_y'].tolist(),
        'groupid': output['groupid'].tolist(),
        'testind': output['testind'].tolist()
    }
    return out_dict