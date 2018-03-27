function initialize_data_table (dataset, table_config = {}) {

	$("#table-view").css("display", "block");
	var $table = $("#result-table");

	// TODO: is it necessary to check the length of the dataset?

	generate_table(dataset, $table);

	TABLE = $table.DataTable(table_config);

	$(".table-control > div.dt-buttons").removeClass("btn-group").addClass("btn-group-vertical");
	$(".table-control > div.dt-buttons > button").removeClass("btn-secondary").addClass("btn-outline-secondary");
	$(".buttons-colvis > span").text("Cols");

	TABLE.MakeCellsEditable({
		"confirmationButton": { //https://github.com/ejbeaty/CellEdit
			"confirmCss": 'my-confirm-class', //can use columns to limit to particular columns
			"cancelCss": 'my-cancel-class'
		},
		"inputCss": 'my-input-class',
		"columns": [2]
	});

	$("#result-table > tbody > tr > td").on("click", function (e) {

		console.log(e.currentTarget.cellIndex);
		console.log($(TABLE.column(e.currentTarget.cellIndex).header()).text().trim());
		console.log("!")

		if ($(TABLE.column(e.currentTarget.cellIndex).header()).text().trim() != "comments") {
			var case_name = $(this).parent().find("td:first-child").text();

			if (case_name != CURRENT_SELECTED) {
				enter_select_mode(case_name, true);
			} else {
				exit_select_mode();
			}
		} else {
			TABLE.$("tr.selected").removeClass("selected");			
		}
	});

	$(".dataTables_scrollHeadInner > table > thead > tr > th").on("click", function () {
		data_sorting($(this).text(), (TABLE.order()[0][1] == 'desc'));
		update_views();
	});

	$table.removeClass("display")
		.addClass("table table-striped table-bordered");
}


function generate_table (dataset, table) {
	
	table_header = Object.keys(dataset[0]);

	thead_content = "<tr>";
	table_header.forEach(function (d) {
		if (DEFAULT_HIDDEN_COLUMNS.indexOf(d) != -1) {
			thead_content += ("<th class='init_hidden'>" + d + "</th>");
		} else {
			thead_content += ("<th>" + d + "</th>");
		}
	});
	thead_content += "</tr>";

	tbody_content = "";
	for (var i = 0; i < dataset.length; i++) {
		tbody_content += "<tr>";
		for (var j = 0; j < table_header.length; j++) {
			tbody_content += ("<td>" + dataset[i][table_header[j]] + "</td>");
		}
		tbody_content += "</tr>";
	}

	table.children("thead").empty().html(thead_content);
	table.children("tbody").empty().html(tbody_content);
}


function select_row_in_table (case_name, from_table) {
	if (from_table) return;

	var offset = 0;

	TABLE.$("tr.selected").removeClass("selected");
	var target_index = TABLE.row(function(idx, data, node) {
		if (data[0] == case_name) {
			return true;
		} else {
			return false;
		}
	}).select().index();

	TABLE.row(target_index + offset).scrollTo();
}


function update_multi_selected_table_view (case_names) {
	var offset = 0;

	TABLE.$("tr.selected").removeClass("selected");

	var target_indices = [];
	TABLE.row(function(idx, data, node) {
		if (case_names.indexOf(data[0]) != -1) {
			target_indices.push(idx);
			return false;
		} else {
			return true;
		}
	}).child.hide();

	TABLE.rows(target_indices).select();
	TABLE.row(target_indices[0] + offset).scrollTo();


	// TABLE.clear()
	// 	.draw();

	// TABLE.rows.add(CURRENT_MULTI_SELECTED).draw();

	// console.log("!")

	// $.fn.dataTable.ext.search.push(
	// 	function( settings, data, dataIndex ) {
	// 		console.log(data[0]);
	 	
	//  		file_name = data[0];
	// 		if (CURRENT_CASE_LIST.indexOf(file_name) != -1) {
	// 			return true;
	// 		}
	// 		return false;
	// 	}
	// );
	// console.log("!!")
}

