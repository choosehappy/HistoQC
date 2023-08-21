function update_chart_width () {
	$("#dimension-reduction-view").outerWidth(
		$("#dimension-reduction-view").outerHeight()
	);
	$("#original-feature-view").outerWidth(
		$("#chart-view").width() - 
		$("#dimension-reduction-view").outerWidth() - 10
	);
}


function initialize_chart_view (dataset, vis_type="bar_chart") {

	update_chart_width();

	init_bar_canvas();
	init_parallel_canvas();
	// init_scatter_canvas();

	CURRENT_CHART_ATTRIBUTE = DEFAULT_CHART_ATTRIBUTE;

	init_bar_chart(dataset);
	init_parallel_coordinate(dataset);
	init_scatter_plot(selected_cases=dataset, all_cases=dataset);

	init_chart_selector();

	show_chosen_vis(vis_type);
}


function update_chart_view (vis_type, dataset) {

	update_chart_width();

	// can be optimized by differentiate update type 
	// (just switch from chart to parallel coordiate?)
	show_chosen_vis(vis_type);

	if (vis_type === "bar_chart") {
		update_bar_chart(dataset);
	} else if (vis_type === "parallel_coordinate") {
		update_parallel_coordinate(dataset);
	} else if (vis_type === "scatter_plot") {
		update_scatter_plot(ORIGINAL_DATASET, dataset);
	} else {
		update_bar_chart(dataset);
		update_parallel_coordinate(dataset);
		update_scatter_plot(ORIGINAL_DATASET, dataset);
	}
}


function enter_select_chart_view (case_name) {
	exit_select_chart_view();

	CHART_SVG.select("g.foreground-bar-group")
		.selectAll("rect")
		.filter(function (d) {return d.case_name==case_name;})
		.classed({"selected-bar": true, "bar": false});

	PARAC_SVG.select("g.foreground")
		.selectAll("path")
		.filter(function (d) {return d.case_name==case_name;})
		.classed({"selected-foreground-path": true, "foreground-path": false});

	enter_select_scatter_plot(case_name);
}


function exit_select_chart_view () {
	CHART_SVG.select("g.foreground-bar-group")
		.selectAll(".selected-bar")
		.classed({"selected-bar": false, "bar": true});

	PARAC_SVG.select("g.foreground")
		.selectAll(".selected-foreground-path")
		.classed({"selected-foreground-path": false, "foreground-path": true});

	exit_select_scatter_plot();
}


function update_multi_selected_chart_view (selected_cases) {
	CHART_SVG.select("g.foreground-bar-group")
		.selectAll("rect")
		.transition()
		.duration(500)
		.style("display", function (d) {
			if (selected_cases.indexOf(d.case_name) != -1) {
				return null;
			} else {
				return "none";
			}
		});

	enter_multi_select_scatter_plot(selected_cases);

	PARAC_SVG.select("g.foreground")
		.selectAll("path")
		.style("display", function (d) {
			if (selected_cases.indexOf(d.case_name) != -1) {
				return null;
			} else {
				return "none";
			}
		});

}


function init_chart_selector () {

	init_bar_vars_selector();
	init_parallel_vars_selector();

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
		sort_data(sort_attribute, true);
		update_views();
	})
}


function show_chosen_vis (vis_type) {
	if (vis_type == "bar_chart") {
		CURRENT_VIS_TYPE = "bar_chart";

		$CHART.css("display", "");
		$("#bar-select-group").css("display", "");
		$("#chart-sort-btn").css("display", "");
		$PARAC.css("display", "none");
		$("#parallel-select-group").css("display", "none");

		$("#vis-switch-btn").text("Parallel Coordinate");
	} else if (vis_type == "parallel_coordinate") {
		CURRENT_VIS_TYPE = "parallel_coordinate";

		$CHART.css("display", "none");
		$("#bar-select-group").css("display", "none");
		$("#chart-sort-btn").css("display", "none");
		$PARAC.css("display", "");
		$("#parallel-select-group").css("display", "");

		$("#vis-switch-btn").text("Bar Chart");
	} 
}

