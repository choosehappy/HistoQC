function enter_select_mode (file_name, istable=false) {
    CURRENT_SELECTED = file_name;

    enter_select_image_view(CURRENT_SELECTED);
    enter_select_chart_view(CURRENT_SELECTED);
    select_row_in_table(CURRENT_SELECTED, istable);
}


function update_select_mode (file_name) {
}


function exit_select_mode () {

	CURRENT_SELECTED = "";

	exit_select_image_view();
	exit_select_chart_view();
	TABLE.rows('.selected').deselect();
}


function update_views () {
	update_chart_view(CURRENT_VIS_TYPE, CURRENT_MULTI_SELECTED);
	update_image_view(CURRENT_CASE_LIST);
}


function update_multi_selected (file_names) {

	CURRENT_MULTI_SELECTED = ORIGINAL_DATASET.filter(function (d) {
		if (file_names.indexOf(d["filename"]) != -1) {
			return true;
		}
		return false;
	})
	CURRENT_CASE_LIST = CURRENT_MULTI_SELECTED.map(function(d){return d["filename"];});
	update_multi_selected_chart_view();
	update_multi_selected_image_view(file_names);
	update_multi_selected_table_view();
}

