function initializeCF() {
    $('#modal-toggle').on('click', handleCohortFinderClick);
    $('#cf-params-modal form').on('submit', handleCohortFinderSubmit);
}

function handleCohortFinderClick(event) {
    const formElement = d3.select('#features-select')
    formElement.html('')
    const keys = d3.keys(ORIGINAL_DATASET[0])
    keys.forEach(key => {
        if (key == 'case_name' || key == 'id' || key == 'gid') {
            return
        }
        formElement.append('option').attr('value', key).text(key)
    })
    $('#cf-params-modal').modal('toggle');
}

function handleCohortFinderSubmit(event) {
    event.preventDefault();

    // get the form data
    var formData = new FormData(event.target);

    // create a JSON strong from entries, if needed
    // JSON.stringify(Object.fromEntries(formData));

    // get relevant form data
    var params = {
        'numClusters': formData.get('numClusters'),
        'testSetPercent': formData.get('testSetPercent'),
        'featuresSelected': formData.getAll('featuresSelected').join(','),
    };

    // call the run_cohort_finder endpoint with the form data
    $.ajax({
        url: "/run_cohort_finder",
        type: "GET",
        async: true,
        data: params,
        beforeSend: function () {
            $('#cf-params-modal').modal('toggle');
            console.log("Running cohort finder with parameters:")
            console.log(params)
        },
        success: handleCohortFinderResponse
    }
    );

}

function handleCohortFinderResponse(data) {
    COHORT_FINDER_RESULTS = data
    console.log("received cohort finder results:")
    console.log(COHORT_FINDER_RESULTS)
    renderScatterPlot(COHORT_FINDER_RESULTS);
}

function handleCohortFinderSubmitTEST(event) {
    event.preventDefault();
    const data = {
        'embed_x': [1, 2, 3, 4, 5],
        'embed_y': [1, 2, 3, 4, 5],
        'groupid': [1, 1, 2, 3, 3],
        'testind': [0, 0, 0, 0, 1]
    };

    handleCohortFinderResponse(data);
}

