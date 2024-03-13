function initializeCF() {
    $('#modal-toggle').on('click', handleCohortFinderClick);
    $('#cf-params-modal form').on('submit', handleCohortFinderSubmit);
}

function handleCohortFinderClick(event) {
    // Populate the features select form element with checkboxes for each feature.
    const formElement = d3.select('#features-select')
    formElement.html('') // Clear existing content
    formElement.style('height', '150px').style('overflow-y', 'scroll')
    const keys = d3.keys(ORIGINAL_DATASET[0])
    keys.forEach(key => {
        if (key == 'case_name' || key == 'id' || key == 'gid') {
            return // Skip these keys
        }

        // Create a container for each checkbox (optional, for styling)
        const checkboxContainer = formElement.append('div').classed('checkbox-container', true);

        // Append the checkbox input
        const checkbox = checkboxContainer.append('input')
            .attr('type', 'checkbox')
            .attr('id', key) // Unique ID for the checkbox
            .attr('name', 'featuresSelected') // Same name for all checkboxes to group them
            .attr('value', key)
            .property('checked', true); // Default to checked

        // Append the label for the checkbox
        checkboxContainer.append('label')
            .attr('for', key) // Associate label with checkbox by ID
            .text(key); // Display text for the label

        // Optionally add a line break or additional spacing here, if needed
    });

    // Toggle modal after adding checkboxes
    $('#cf-params-modal').modal('toggle');
}



function handleCohortFinderSubmit(event) {
    event.preventDefault();

    // Initialize an empty object to hold the form data
    var params = {
        'numClusters': '',
        'testSetPercent': '',
        'featuresSelected': []
    };

    // Use FormData to gather input values
    var formData = new FormData(event.target);

    // Directly assign values for 'numClusters' and 'testSetPercent'
    params.numClusters = formData.get('numClusters');
    params.testSetPercent = formData.get('testSetPercent');

    // Iterate over FormData entries to populate 'featuresSelected'
    formData.getAll('featuresSelected').forEach(value => {
        params.featuresSelected.push(value);
    });

    // If you need to convert the array to a comma-separated string
    params.featuresSelected = params.featuresSelected.join(',');

    // call the run_cohort_finder endpoint with the form data
    $.ajax({
        url: "/run_cohort_finder",
        type: "GET",
        async: true,
        data: params,
        beforeSend: function () {
            $('#cf-params-modal').modal('toggle');
            initScatterPlotMessage("<h4>Running CohortFinder with the following parameters...</h4>")
            Object.keys(params).forEach((key) => {
                appendScatterPlotMessage(`<b>${key}</b>: ${params[key]}`)
            })
        },
        success: handleCohortFinderResponse
    }
    );

}

function handleCohortFinderResponse(data) {
    const colors = [
        "#FF5733",  // Reddish Orange
        "#3498DB",  // Soft Blue
        "#2ECC71",  // Green
        "#F1C40F",  // Yellow
        "#9B59B6",  // Purple
        "#34495E",  // Dark Blue
        "#E74C3C",  // Red
        "#16A085",  // Sea Green
        "#2980B9",  // Medium Blue
        "#8E44AD",  // Dark Purple
        "#2C3E50",  // Navy Blue
        "#F39C12",  // Orange
        "#D35400",  // Pumpkin
        "#C0392B",  // Dark Red
        "#7F8C8D"   // Grey
    ]

    COHORT_FINDER_RESULTS = d3.range(data.embed_x.length).map(function (i) {
        return {
            x: data.embed_x[i],
            y: data.embed_y[i],
            i: i, // save the index of the point as a property, this is useful
            color: colors[data.groupid[i]]
        };
    });

    console.log("received CohortFinder results:")
    console.log(COHORT_FINDER_RESULTS)
    renderScatterPlot(COHORT_FINDER_RESULTS);

    POPOVERS['be-scores-info'] = {
        'title': 'Batch Effect Scores',
        'dataContent':
            `CohortFinder calculated batch effect (BE) scores for each sample. 
            Higher BE scores indicate more pronounced batch effects in your dataset yielding distinct clusters in the low-dimensional embedding.<br><br>
            <b>silhouette score:</b> ${data.sil_score}<br> <b>davies-bouldin score:</b> ${data.db_score}<br> <b>calinski-harabasz score:</b> ${data.ch_score}<br>`,
        'options': {
            'trigger': 'click',
            'html': true,
            'placement': 'auto',
            'container': 'body',
        }
    };

    updateAllPopovers();

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

