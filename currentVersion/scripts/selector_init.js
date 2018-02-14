var initialize_selector = function (dataset) {
	$chart_selector = $("#chart-select");

	for (index in Object.keys(dataset[0])) {
		key = Object.keys(dataset[0])[index];
		if (typeof(dataset[0][key]) == "number") {
			if (key == CURRENT_ATTRIBUTE) {
				$chart_selector.append("<option value='" + key + "' selected>" + key + "</option>");	
			} else {
				$chart_selector.append("<option value='" + key + "'>" + key + "</option>");
			}
		}
	}

	$("#chart-select").change(function () {
		CURRENT_ATTRIBUTE = [$(this).val()];
		update_chart_view(CURRENT_DATASET, "bar_chart", CURRENT_ATTRIBUTE);
	});

    $("#img-select-button > select").change(function () {
    	CURRENT_IMAGE_TYPE = $(this).val();
        update_image_view(CURRENT_CASE_LIST);
    });
}