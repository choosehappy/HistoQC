function renderLines() {
	///////////////////////////// PARCOORDS SETUP /////////////////////////////
	const margin = visualViewport.height * 0.05;
	const parcoords_card_height = visualViewport.height * 0.3 - margin;
	// $("#parcoords-parent").height(parcoords_card_height)
	PARCOORDS = ParCoords()("#example")
		.alpha(0.4)
		.mode("queue") // progressive rendering
		.height(parcoords_card_height)

	// slickgrid needs each data element to have an id
	ORIGINAL_DATASET.forEach(function (d, i) { d.id = d.id || i; });
	PARCOORDS
		.data(ORIGINAL_DATASET)
		.hideAxis(["case_name", "gid"])
		.render()
		.reorderable()
		.brushMode("1D-axes");
	


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
		
		// TODO image gallary update
	});
	
	return DATA_VIEW;
}

function gridUpdate(data) {
	DATA_VIEW.beginUpdate();
	DATA_VIEW.setItems(data);
	DATA_VIEW.endUpdate();
};

function updateParcoords(data) {
	// PARCOORDS.brushReset();
	// PARCOORDS.brushed(false)
	PARCOORDS
		.data(data)
		.render();
}