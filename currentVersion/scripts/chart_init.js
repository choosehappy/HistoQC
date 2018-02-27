var initialize_chart_view = function (dataset, chart_type = "bar_chart", attributes = []) {


	$("#svg-container > *").remove();
	var $div = $("#svg-container");

	if (chart_type == "bar_chart") {

		var data = dataset.map(function (d) {
			return {
				case_name: d["filename"],
				attr_value: d[attributes[0]]
			};
		});

		var chart_margin = {top: 10, right: 60, bottom: 60, left: 0};
		if (data.length > 50) {
			chart_margin.bottom = 20;
		}

		var chart_width = $div.width() - chart_margin.left - chart_margin.right,
			chart_height = $div.height() - chart_margin.top - chart_margin.bottom;

		var x = d3.scale.ordinal()
			.rangeRoundBands([0, chart_width], .1);

		var y = d3.scale.linear()
			.range([chart_height, 0]);

		var xAxis = d3.svg.axis()
			.scale(x)
			.orient("bottom");

		var yAxis = d3.svg.axis()
			.scale(y)
			.ticks(4)
			.orient("right")
		    .innerTickSize(-chart_width)
		    .outerTickSize(0)
		    .tickPadding(10);
		
		var tip = d3.tip()
			.attr('class', 'd3-tip')
			.offset([-10, 0])
			.html(function(d) {
				return "<span style='color:#f94; font-size:10px'>" + d.case_name + "</span></br><span style='font-weight:100; font-size:10px'>" + d.attr_value.toFixed(5) + "</span> ";
			});

		var svg = d3.select("#svg-container").append("svg")
			.attr("width", chart_width + chart_margin.left + chart_margin.right)
			.attr("height", chart_height + chart_margin.top + chart_margin.bottom)
			.append("g")
			.attr("transform", "translate(" + chart_margin.left + "," + chart_margin.top + ")");

		svg.call(tip);

		x.domain(data.map(function(d) { return d.case_name; }));
		y.domain([0, d3.max(data, function(d) { return d.attr_value; })]);

		if (data.length < 50) {
			svg.append("g")
				.attr("class", "x axis")
				.attr("transform", "translate(0," + chart_height + ")")
				.call(xAxis)
				.selectAll("text")
			    .attr("y", 12)
			    .attr("x", 3)
			    .attr("dy", ".35em")
			    .attr("transform", "rotate(30)")
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

		svg.selectAll(".bar")
			.data(data)
			.enter().append("rect")
			.attr("class", function(d) {
				if (CURRENT_SELECTED == d.case_name) {
					return "selected-bar";
				} else {
					return "bar";
				}
			})
			.attr("x", function(d) { return x(d.case_name); })
			.attr("width", Math.max(x.rangeBand() - 1, 1))
			.attr("y", function(d) { return y(d.attr_value); })
			.attr("height", function(d) { return chart_height - y(d.attr_value); })
			.on('mouseover', tip.show)
			.on('mouseout', tip.hide)
			.on('click', function(d) {
				if (CURRENT_SELECTED == d.case_name) {
					exit_select_mode();
				} else {
					enter_select_mode(d.case_name);
				}
			});

		return;
	}
	if (chart_type == "parallel_coordinate") {

		return;
	}
}


var update_chart_view = function (dataset, chart_type, attributes) {
	initialize_chart_view(dataset, chart_type, attributes);
}


var enter_select_chart_view = function (case_name) {
	exit_select_chart_view();

	d3.selectAll(".bar")
		.classed("selected-bar", function(d) {
			if (d.case_name == case_name) {
				return true;
			} else {
				return false;
			}
		})
		.classed("bar", function(d) {
			if (d.case_name == case_name) {
				return false;
			} else {
				return true;
			}			
		})
}


var exit_select_chart_view = function () {
	d3.selectAll(".selected-bar")
		.classed("bar", true)
		.classed("selected-bar", false);
}