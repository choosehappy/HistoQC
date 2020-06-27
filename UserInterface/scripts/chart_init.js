function update_chart_width () {
	$("#dimension-reduction-view").outerWidth($("#dimension-reduction-view").outerHeight());
	$("#original-feature-view").outerWidth($("#chart-view").width() - $("#dimension-reduction-view").outerWidth() - 10);
}


function initialize_chart_view (dataset, vis_type="bar_chart") {

	show_view("chart");
	update_chart_width();

	$CHART.empty();
	$PARAC.empty();
	$DRPLT.empty();

	// init global SVG and MARGIN
	CHART_MARGIN = {top: 10, right: 60, bottom: 40, left: 10};
	if (dataset.length > 50) {
		CHART_MARGIN.bottom = 10;
	}
	PARAC_MARGIN = {top: 80, right: 40, bottom: 10, left: 10};
	DRPLT_MARGIN = {top: 10, right: 10, bottom: 30, left: 30};

	CHART_SVG = d3.select("#chart-svg-container").append("svg")
		.attr("id", "chart-svg")
		.attr("width", $CHART.width())
		.attr("height", $CHART.height())
		.append("g")
		.attr("transform", "translate(" + CHART_MARGIN.left + "," + CHART_MARGIN.top + ")");
	PARAC_SVG = d3.select("#parac-svg-container").append("svg")
		.attr("id", "parac-svg")
		.attr("width", $PARAC.width())
		.attr("height", $PARAC.height())
		.append("g")
		.attr("transform", "translate(" + PARAC_MARGIN.left + "," + PARAC_MARGIN.top + ")");
	DRPLT_SVG = d3.select("#drplt-svg-container").append("svg")
		.attr("id", "drplt-svg")
		.attr("width", $DRPLT.width())
		.attr("height", $DRPLT.height())
		.append("g")
		.attr("transform", "translate(" + DRPLT_MARGIN.left + "," + DRPLT_MARGIN.top + ")");

	CURRENT_CHART_ATTRIBUTE = DEFAULT_CHART_ATTRIBUTE;

	init_bar_chart(dataset);
	init_parallel_coordinate(dataset);
	init_scatter_plot(dataset);
	init_chart_selector(vis_type);

	show_chosen_vis(vis_type);
}


function update_chart_view (vis_type, dataset) {

	update_chart_width();

	// can be optimized by differentiate update type (just switch from chart to parallel coordiate?)
	show_chosen_vis(vis_type);

	if (vis_type == "bar_chart") {
		update_bar_chart(dataset);
	} else if (vis_type == "parallel_coordinate") {
		update_parallel_coordinate(dataset);
	} else if (vis_type == "scatter_plot") {
		update_scatter_plot(dataset);
	} else if (vis_type == "both") {
		update_bar_chart(dataset);
		update_parallel_coordinate(dataset);
		update_scatter_plot(dataset);
	}
}


function enter_select_chart_view (case_name) {
	exit_select_chart_view();

	DRPLT_SVG.select("g.foreground-dot-group")
		.selectAll("circle")
		.filter(function (d) {return d.case_name==case_name;})
		.classed({"selected-dot": true, "foreground-dot": false});

	CHART_SVG.select("g.foreground-bar-group")
		.selectAll("rect")
		.filter(function (d) {return d.case_name==case_name;})
		.classed({"selected-bar": true, "bar": false});

	PARAC_SVG.select("g.foreground")
		.selectAll("path")
		.filter(function (d) {return d.case_name==case_name;})
		.classed({"selected-foreground-path": true, "foreground-path": false});
}


function exit_select_chart_view () {
	CHART_SVG.select("g.foreground-bar-group")
		.selectAll(".selected-bar")
		.classed({"selected-bar": false, "bar": true});

	PARAC_SVG.select("g.foreground")
		.selectAll(".selected-foreground-path")
		.classed({"selected-foreground-path": false, "foreground-path": true});

	DRPLT_SVG.select("g.foreground-dot-group")
		.selectAll(".selected-dot")
		.classed({"selected-dot": false, "foreground-dot": true});
}


function update_multi_selected_chart_view (selected_cases) {
	CHART_SVG.select("g.foreground-bar-group")
		.selectAll("rect")
		.transition()
		.duration(500)
		.style("display", function (d) {
			if (selected_cases.length == 0 || selected_cases.indexOf(d.case_name) != -1) {
				return null;
			} else {
				return "none";
			}
		});

	DRPLT_SVG.select("g.foreground-dot-group")
		.selectAll("circle")
		.style("display", function (d) {
			if (selected_cases.length == 0 || selected_cases.indexOf(d.case_name) != -1) {
				return null;
			} else {
				return "none";
			}
		});

	PARAC_SVG.select("g.foreground")
		.selectAll("path")
		.style("display", function (d) {
			if (selected_cases.length == 0 || selected_cases.indexOf(d.case_name) != -1) {
				return null;
			} else {
				return "none";
			}
		});

}


function init_chart_selector (vis_type) {

	// TODO: clean up useless code
	$chart_selector = $("#chart-select");
	$chart_selector.empty();

	var sample_case = ORIGINAL_DATASET[0];

	for (var index in Object.keys(sample_case)) {
		var key = Object.keys(sample_case)[index];
		if (typeof(sample_case[key]) == "number") {
			if (key == CURRENT_CHART_ATTRIBUTE) {
				$chart_selector.append(generate_option_html(key, key, true));
			} else {
				$chart_selector.append(generate_option_html(key, key));
			}
		}
	}
	$('.selectpicker').selectpicker('render');
	$('.selectpicker').selectpicker('refresh');

	$chart_selector.change(function () {
		CURRENT_CHART_ATTRIBUTE = $(this).val();
		update_chart_view("bar_chart", CURRENT_MULTI_SELECTED);
	});

	$("#vis-switch-btn").click(function () {
		if ($PARAC.css("display") == "none") {
			show_chosen_vis("parallel_coordinate");
		} else {
			show_chosen_vis("bar_chart");
		} 
	})

	$("#chart-sort-btn").click(function () {
		var sort_attribute = CURRENT_CHART_ATTRIBUTE;
		var sort_attribute_index = ORIGINAL_FEATURE_LIST.indexOf(sort_attribute);
		TABLE.order([sort_attribute_index, 'desc']).draw();
		data_sorting(sort_attribute, true);
		update_views();
	})

	function generate_option_html (key, value, selected = false) {
		if (selected) {
			return "<option value='" + value + "' selected>" + key + "</option>";
		} else {
			return "<option value='" + value + "'>" + key + "</option>";
		}
	}
}

function show_chosen_vis (vis_type) {
	if (vis_type == "bar_chart") {
		CURRENT_VIS_TYPE = "bar_chart";
		$PARAC.css("display", "none");
		$CHART.css("display", "block");
		$("#chart-select-group").css("display", "flex");
		$("#vis-switch-btn").text("Parallel Coordinate");
	} else if (vis_type == "parallel_coordinate") {
		CURRENT_VIS_TYPE = "parallel_coordinate";
		$CHART.css("display", "none");
		$("#chart-select-group").css("display", "none");
		$PARAC.css("display", "block");
		$("#vis-switch-btn").text("Bar Chart");
	} 
}

