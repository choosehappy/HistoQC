var initialize_data_table = function (dataset, table_config = {}) {

	var $table = $("#result-table");

	// TODO: is it necessary to check the length of the dataset?

	if (DEFAULT_TABLE_COLUMNS.length == 0) {
		DEFAULT_TABLE_COLUMNS = Object.keys(dataset[0]);
	}

	generate_table(dataset, $table);

	TABLE = $table.DataTable(table_config);

	$(".table-control > div.dt-buttons").removeClass("btn-group").addClass("btn-group-vertical");
	$(".table-control > div.dt-buttons > button").removeClass("btn-secondary").addClass("btn-outline-secondary");

	$("#result-table > tbody > tr").on("click", function () {
		var case_name = $(this).find("td:first-child").text();
		enter_select_mode(case_name, true);
	});

	$table.removeClass("display")
		.addClass("table table-striped table-bordered");
}


var generate_table = function (dataset, table) {
	
	table_header = Object.keys(dataset[0]);

	thead_content = "<tr>";
	table_header.forEach(function (d) {thead_content += ("<th>" + d + "</th>");});
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


var select_row_in_table = function (case_name, table) {
    if (table) return;

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

