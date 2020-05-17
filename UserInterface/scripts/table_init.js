function initialize_data_table (dataset) {

	show_view("table");
	var $table = $("#result-table");

	generate_table(dataset, $table);
	generate_config(dataset);

	TABLE = $table.DataTable(DATA_TABLE_CONFIG);

	init_visibility();
	init_editability();
	init_button_style();

	CURRENT_SORT_ATTRIBUTE = ORIGINAL_FEATURE_LIST[TABLE.order()[0][0]];

	$table.find("tbody").on("click", 'td', function () {

		if ($(TABLE.column($(this).index() + ":visIdx").header()).text().trim() != "comments") {
			var case_name = $(this).parent().find("td:first-child").text();

			if (case_name != CURRENT_SELECTED) {
				enter_select_mode(case_name, true);
			} else {
				exit_select_mode();
			}
		} else {
			$("tr.selected").removeClass("selected");
		}
	});

	$(".dataTables_scrollHeadInner > table > thead > tr > th").on("click", function () {
		data_sorting($(this).text(), (TABLE.order()[0][1] == 'desc'));
		update_views();
	});
}


function generate_table (dataset, table) {
	
	var thead_content = "<tr>";

	ORIGINAL_FEATURE_LIST.forEach(function (d, i) {
		thead_content += ("<th>" + d + "</th>");
	});
	thead_content += "</tr>";

	tbody_content = "";
	for (var i = 0; i < dataset.length; i++) {
		tbody_content += "<tr>";
		for (var j = 0; j < ORIGINAL_FEATURE_LIST.length; j++) {
			tbody_content += ("<td>" + dataset[i][ORIGINAL_FEATURE_LIST[j]] + "</td>");
		}
		tbody_content += "</tr>";
	}

	table.children("thead").empty().html(thead_content);
	table.children("tbody").empty().html(tbody_content);
}


function generate_config (dataset) {

	// 1. named column
	// 2. customized colvis

	var colvis_action = function (e, dt, node, config) {
		var column_name = node[0].text;
		if (this.active()) {
			// update the table column
			this.active(false);
			TABLE.column(column_name + ":name").visible(false);
			
			CURRENT_HIDDEN_COLUMNS.push(column_name);
			
			update_chart_view("parallel_coordinate", CURRENT_MULTI_SELECTED);

		} else {
			// update the table column
			this.active(true);
			TABLE.column(column_name + ":name").visible(true);
			
			var index = CURRENT_HIDDEN_COLUMNS.indexOf(column_name);
			if (index > -1) {
				CURRENT_HIDDEN_COLUMNS.splice(index, 1);
			} else {
				console.log("[DEBUG] " + column_name + " is not in CURRENT_HIDDEN_COLUMNS.")
			}

			update_chart_view("parallel_coordinate", CURRENT_MULTI_SELECTED);

		}
	};

	DATA_TABLE_CONFIG["columns"] = [];
	var colvis_buttons_config = []; // customized colvis buttons list (every header) 

	ORIGINAL_FEATURE_LIST.forEach(function (header) {
		DATA_TABLE_CONFIG["columns"].push({
			name: header
		});
		colvis_buttons_config.push({
			text: header,
			className: DEFAULT_HIDDEN_COLUMNS.indexOf(header) == -1 ? 'active' : null,
			action: colvis_action
		});
	});

	var colvis_config = {
		extend: 'collection',
		text: 'Cols',
		buttons: colvis_buttons_config,
		fade: 500
	};

	DATA_TABLE_CONFIG["buttons"].push(colvis_config);
}


function init_visibility () {
	DEFAULT_HIDDEN_COLUMNS.forEach(function (hidden_header) {
		TABLE.column(hidden_header + ":name").visible(false);
	});
}


function init_editability () {

	var comments_index = 1;
	if (ORIGINAL_FEATURE_LIST[1] != "comments") {
		comments_index = ORIGINAL_FEATURE_LIST.indexOf("comments");
		if (comments_index == -1) {
			console.log("[ERROR] cannot find 'comments' attribute in the dataset.");
			return;
		} else {
			console.log("[LOG] 'comments' is at " + comments_index + ".");
		}
	}

	TABLE.MakeCellsEditable({
		"confirmationButton": { //https://github.com/ejbeaty/CellEdit
			"confirmCss": 'my-confirm-class', //can use columns to limit to particular columns
			"cancelCss": 'my-cancel-class'
		},
		"inputCss": 'my-input-class',
		"columns": [comments_index]
	});
}


function init_button_style () {
	$(".table-control > div.dt-buttons").removeClass("btn-group").addClass("btn-group-vertical");
	$(".table-control > div.dt-buttons > button").removeClass("btn-secondary").addClass("btn-outline-secondary");
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
	TABLE.clear();
	TABLE.rows.add(CURRENT_MULTI_SELECTED.map(function(d) {return Object.values(d);})).draw();
}
