function renderLines() {
	///////////////////////////// PARCOORDS SETUP /////////////////////////////
	const margin = visualViewport.height * 0.05;
	const parcoordsCardHeight = visualViewport.height * 0.5 - margin;
	// $("#parcoords-parent").height(parcoordsCardHeight)
	PARCOORDS = ParCoords()("#example")
		.alpha(0.1)
		.mode("queue") // progressive rendering
		.height(parcoordsCardHeight)

	// slickgrid needs each data element to have an id
	ORIGINAL_DATASET.forEach(function (d, i) { d.id = d.id || i; });
	PARCOORDS
		.data(ORIGINAL_DATASET)
		.hideAxis(["case_name", "gid"])
		.render()
		.reorderable()
		.brushMode("1D-axes");


	///////////////////////////// TOOLTIP SETUP /////////////////////////////
	const parcoordsDimKeys = Object.keys(PARCOORDS.dimensions())
	const toolTipDiv = d3.select("#parcoords-parent").append("div").attr("id", "tooltip").attr("class", "tooltip");
	toolTipDiv.append("div").attr("class", "tooltip-contents");

	d3.select("#example").selectAll(".dimension")
		.attr("id", function (d, i) {
			return parcoordsDimKeys[i]; // This will set IDs like "dimension-0", "dimension-1", etc.
		})
		.call(tooltip, toolTipDiv); // will call the tooltip function

	///////////////////////////// SLICK GRID SETUP /////////////////////////////
	var column_keys = d3.keys(ORIGINAL_DATASET[0]);
	var columns = column_keys.map(function (key, i) {
		return {
			id: key,
			name: key,
			field: key,
			sortable: true
		}
	});

	var options = {
		enableCellNavigation: true,
		enableColumnReorder: false,
		multiColumnSort: false,
	};

	DATA_VIEW = new Slick.Data.DataView();
	var grid = new Slick.Grid("#grid", DATA_VIEW, columns, options);
	var pager = new Slick.Controls.Pager(DATA_VIEW, grid, $("#pager"));

	// DATA_VIEW subscriptions drive the grid
	DATA_VIEW.onRowCountChanged.subscribe(function (e, args) {
		grid.updateRowCount();
		grid.render();

		// update the image pane when the paging changes
		updateImageView(DATA_VIEW);

	});

	DATA_VIEW.onRowsChanged.subscribe(function (e, args) {
		grid.invalidateRows(args.rows);
		grid.render();

		updateImageView(DATA_VIEW);
	});


	// column sorting
	var sortcol = column_keys[0];
	var sortdir = 1;

	function comparer(a, b) {
		var x = a[sortcol], y = b[sortcol];
		return (x == y ? 0 : (x > y ? 1 : -1));
	}

	// click header to sort grid column
	grid.onSort.subscribe(function (e, args) {
		sortdir = args.sortAsc ? 1 : -1;
		sortcol = args.sortCol.field;

		if ($.browser.msie && $.browser.version <= 8) {
			DATA_VIEW.fastSort(sortcol, args.sortAsc);
		} else {
			DATA_VIEW.sort(comparer, args.sortAsc);
		}
	});

	// highlight row in chart
	grid.onMouseEnter.subscribe(function (e, args) {
		// Get row number from grid
		var grid_row = grid.getCellFromEvent(e).row;

		// Get the id of the item referenced in grid_row
		var item_id = grid.getDataItem(grid_row).id;
		var d = PARCOORDS.brushed() || ORIGINAL_DATASET;

		// Get the element position of the id in the data object
		elementPos = d.map(function (x) { return x.id; }).indexOf(item_id);

		// Highlight that element in the parallel coordinates graph
		PARCOORDS.highlight([d[elementPos]]);
	});

	grid.onMouseLeave.subscribe(function (e, args) {
		PARCOORDS.unhighlight();
	});


	// fill grid with data
	gridUpdate(ORIGINAL_DATASET);

	// update grid on brush
	PARCOORDS.on("brush", function (d) {
		gridUpdate(d);

	});

	return DATA_VIEW;
}

function gridUpdate(data) {
	DATA_VIEW.beginUpdate();
	DATA_VIEW.setItems(data);
	DATA_VIEW.endUpdate();
};

function updateParcoords(data) {
	PARCOORDS.brushReset(); // need this not to update grid. 
	PARCOORDS.brushed(false)
	PARCOORDS
		.data(data)
		.render();
}

const tooltip = (selectionGroup, tooltipDiv) => {
	const mousePosOffset = 10;
	const margin = ({ top: 10, right: 10, bottom: 10, left: 10 })
	const height = 400
	const width = 400

	selectionGroup.each(function () {
	  d3.select(this)
		.on("mouseover.tooltip", handleMouseover)
		.on("mousemove.tooltip", handleMousemove)
		.on("mouseleave.tooltip", handleMouseleave);
	});
  
	function handleMouseover() {
	  // show/reveal the tooltip, set its contents,
	  // style the element being hovered on
	  showTooltip();
	  setContents(d3.select(this).datum(), tooltipDiv);
	  setStyle(d3.select(this));
	}
  
	function handleMousemove(event) {
	  // update the tooltip's position
	  const [mouseX, mouseY] = d3.mouse(this) // d3.pointer(event, this); // for d3 v6
	  // add the left & top margin values to account for the SVG g element transform
	  setPosition(mouseX + margin.left, mouseY + margin.top);
	}
  
	function handleMouseleave() {
	  // do things like hide the tooltip
	  // reset the style of the element being hovered on
	  hideTooltip();
	  resetStyle(d3.select(this));
	}
  
	function showTooltip() {
	  tooltipDiv.style("display", "block");
	}
  
	function hideTooltip() {
	  tooltipDiv.style("display", "none");
	}
  
	function setPosition(mouseX, mouseY) {
	  tooltipDiv
		.style(
		  "top",
		  mouseY < height / 2 ? `${mouseY + mousePosOffset}px` : "initial"
		)
		.style(
		  "right",
		  mouseX > width / 2
			? `${width - mouseX + mousePosOffset}px`
			: "initial"
		)
		.style(
		  "bottom",
		  mouseY > height / 2
			? `${height - mouseY + mousePosOffset}px`
			: "initial"
		)
		.style(
		  "left",
		  mouseX < width / 2 ? `${mouseX + mousePosOffset}px` : "initial"
		);
	}

	function setContents(datum, tooltipDiv) {
		tooltipDiv.selectAll("p").html("<p>Placeholder text</p>");
	}

	function setStyle(selection) {
		selection.attr("fill", "magenta");
	}

	function resetStyle(selection) {
	selection.attr("fill", "#333");
	}
  }