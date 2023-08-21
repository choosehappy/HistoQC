function init_bar_canvas () {
	$CHART.empty();
	CHART_MARGIN = {top: 10, right: 60, bottom: 10, left: 10};
	CHART_SVG = d3.select("#chart-svg-container").append("svg")
		.attr("id", "chart-svg")
		.attr("width", $CHART.width())
		.attr("height", $CHART.height())
		.append("g")
		.attr(
			"transform", 
			"translate(" + CHART_MARGIN.left + "," + CHART_MARGIN.top + ")"
		);
}


function init_bar_chart (dataset) {
	var svg = CHART_SVG;
	var chart_width = $CHART.width() - CHART_MARGIN.left - CHART_MARGIN.right;
	var chart_height = $CHART.height() - CHART_MARGIN.top - CHART_MARGIN.bottom;

	var data = ORIGINAL_DATASET.map(function (d) {
		return {
			case_name: d["filename"],
			groupid: d["groupid"],
			attr_value: d[CURRENT_CHART_ATTRIBUTE]
		};
	});
	var selected_cases = dataset.map(function (d) {return d["filename"];});

	var xScale = d3.scale.ordinal()
		.rangeRoundBands([0, chart_width], .1)
		.domain(data.map(function (d) { return d.case_name; }));

	var yScale = d3.scale.linear()
		.range([chart_height, 0])
		.domain([0, d3.max(data, function (d) { return d.attr_value; })]);

	var xAxis = d3.svg.axis()
		.scale(xScale)
		.orient("bottom");

	var yAxis = d3.svg.axis()
		.scale(yScale)
		.ticks(4)
		.orient("right")
		.innerTickSize(-chart_width)
		.outerTickSize(0)
		.tickPadding(10);
	
	TIP = d3.tip()
		.attr('class', 'd3-tip')
		.offset([-10, 0])
		.html(function (d) {
			return "<span style='color:#f94; font-size:10px'>" + 
				d.case_name + "</span>" +
				"</br>" +
				"<span style='font-weight:100; font-size:10px'>" + 
				d.attr_value.toFixed(5) + "</span>";
		});

	svg.call(TIP);

	if (data.length < 50) {
		svg.append("g")
			.attr("class", "x axis")
			.attr("transform", "translate(0," + chart_height + ")")
			.call(xAxis)
			.selectAll("text")
			.attr("y", 12)
			.attr("x", 3)
			.attr("dy", ".35em")
			.attr("transform", "rotate(20)")
			.style("text-anchor", "start");
	} else {
		svg.append("g")
			.attr("class", "x axis")
			.attr("transform", "translate(0," + chart_height + ")")
			.call(xAxis)
			.selectAll("text")
			.remove();
	}

	svg.append("g")
		.attr("class", "y axis")
		.attr("transform", "translate(" + chart_width + ", 0)")
		.call(yAxis);

	// Add grey background bar for context.
	background = svg.append("g")
		.attr("class", "background-bar-group")
		.selectAll("rect")
		.data(data)
		.enter().append("rect")
		.attr("class", "background-bar")
		.attr("x", function (d) {
			return xScale(d.case_name);
		})
		.attr("width", Math.max(xScale.rangeBand() - 1, 1))
		.attr("y", function (d) {
			return yScale(d.attr_value);
		})
		.attr("height", function (d) {
			return chart_height - yScale(d.attr_value);
		});

	// Add blue foreground bar for focus.
	foreground = svg.append("g")
		.attr("class", "foreground-bar-group")
		.selectAll("rect")
		.data(data)
		.enter().append("rect")
		.attr("class", function (d) {
			if (d.case_name === CURRENT_SELECTED) {
				return "selected-bar";
			} else {
				return "bar";
			}
		})
		.style("display", function (d) {
			if (selected_cases.indexOf(d.case_name) != -1) {
				return null;
			} else {
				return "none";
			}
		})
		.attr("x", function (d) {
			return xScale(d.case_name);
		})
		.attr("width", Math.max(xScale.rangeBand() - 1, 1))
		.attr("y", function (d) {
			return yScale(d.attr_value);
		})
		.attr("height", function (d) {
			return chart_height - yScale(d.attr_value);
		})
		.on('mouseover', TIP.show)
		.on('mouseout', TIP.hide)
		.on('click', function (d) {
			if (CURRENT_SELECTED == d.case_name) {
				exit_select_mode();
			} else {
				enter_select_mode(d.case_name);
			}
		});
}


function update_bar_chart (dataset) {

	$CHART.css("display", "block");

	d3.select("#chart-svg")
		.attr("width", $CHART.width())
		.attr("height", $CHART.height());

	var svg = CHART_SVG;
	var chart_width = $CHART.width() - CHART_MARGIN.left - CHART_MARGIN.right;
	var chart_height = $CHART.height() - CHART_MARGIN.top - CHART_MARGIN.bottom;

	if (CURRENT_VIS_TYPE != "bar_chart") {
		$CHART.css("display", "none");
	}

	var data = ORIGINAL_DATASET.map(function (d) {
		return {
			case_name: d["filename"],
			groupid: d["groupid"],
			attr_value: d[CURRENT_CHART_ATTRIBUTE]
		};
	});
	var selected_cases = dataset.map(function (d) {return d["filename"];});

	var xScale = d3.scale.ordinal()
		.rangeRoundBands([0, chart_width], .1)
		.domain(data.map(function (d) { return d.case_name; }));

	var yScale = d3.scale.linear()
		.range([chart_height, 0])
		.domain([0, d3.max(data, function (d) { return d.attr_value; })]);

	// update axis
	var xAxis = d3.svg.axis()
		.scale(xScale)
		.orient("bottom");

	var yAxis = d3.svg.axis()
		.scale(yScale)
		.ticks(4)
		.orient("right")
		.innerTickSize(-chart_width)
		.outerTickSize(0)
		.tickPadding(10);
	
	if (data.length < 50) {
		CHART_SVG.selectAll("g.x.axis")
			.transition()
			.duration(500)
			.attr("transform", "translate(0," + chart_height + ")")
			.call(xAxis)
			.selectAll("text")
			.attr("y", 12)
			.attr("x", 3)
			.attr("dy", ".35em")
			.attr("transform", "rotate(20)")
			.style("text-anchor", "start");
		} else {
		CHART_SVG.selectAll("g.x.axis")
			.transition()
			.duration(500)
			.attr("transform", "translate(0," + chart_height + ")")
			.call(xAxis)
			.selectAll("text")
			.remove();
		}

	CHART_SVG.selectAll("g.y.axis")
		.transition()
		.duration(500)
		.attr("transform", "translate(" + chart_width + ", 0)")
		.call(yAxis);

	// update bars
	var background_bars = CHART_SVG.select("g.background-bar-group")
		.selectAll("rect").data(data);
	background_bars.exit().remove();
	background_bars.enter().append("rect");
	background_bars.transition()
		.duration(500)
		.attr("class", "background-bar")
		.attr("x", function (d) {
			return xScale(d.case_name);
		})
		.attr("width", Math.max(xScale.rangeBand() - 1, 1))
		.attr("y", function (d) {
			return yScale(d.attr_value);
		})
		.attr("height", function (d) {
			return chart_height - yScale(d.attr_value);
		});

	var foreground_bars = CHART_SVG.select("g.foreground-bar-group").
		selectAll("rect").data(data);
	foreground_bars.exit().remove();
	foreground_bars.enter().append("rect")
		.on('mouseover', TIP.show)
		.on('mouseout', TIP.hide)
		.on('click', function (d) {
			if (CURRENT_SELECTED == d.case_name) {
				exit_select_mode();
			} else {
				enter_select_mode(d.case_name);
			}
		});     
	foreground_bars.transition()
		.duration(500)
		.attr("class", function (d) {
			if (CURRENT_SELECTED == d.case_name) {
				return "selected-bar";
			} else {
				return "bar";
			}
		})
		.style("display", function (d) {
			if (selected_cases.indexOf(d.case_name) != -1) {
				return null;
			} else {
				return "none";
			}
		})
		.style("fill", function (d) {
			if (CURRENT_SELECTED === d.case_name) {
				return "orangered";
			} else {
				if (d["groupid"] === -1) {
					return FOREGROUND_COLOR;
				} else {
					return COLOR_PLATE[d["groupid"]];
				}
			}
		})
		.attr("x", function (d) {
			return xScale(d.case_name);
		})
		.attr("width", Math.max(xScale.rangeBand() - 1, 1))
		.attr("y", function (d) {
			return yScale(d.attr_value);
		})
		.attr("height", function (d) {
			return chart_height - yScale(d.attr_value);
		});
}


function init_bar_vars_selector () {
	var $bar_selector = $("#bar-select");
	$bar_selector.empty();

	var sample_case = ORIGINAL_DATASET[0];

	for (var index in Object.keys(sample_case)) {
		var key = Object.keys(sample_case)[index];
		if (typeof(sample_case[key]) == "number") {
			if (key == CURRENT_CHART_ATTRIBUTE) {
				$bar_selector.append(generate_option_html(key, key, true));
			} else {
				$bar_selector.append(generate_option_html(key, key));
			}
		}
	}
	$bar_selector.selectpicker('refresh');
	$bar_selector.selectpicker('render');

	$bar_selector.change(function () {
		CURRENT_CHART_ATTRIBUTE = $(this).val();
		update_chart_view("bar_chart", CURRENT_MULTI_SELECTED);
	});

	function generate_option_html (key, value, selected = false) {
		if (selected) {
			return "<option value='" + value + "' selected>" + key + "</option>";
		} else {
			return "<option value='" + value + "'>" + key + "</option>";
		}
	}
}