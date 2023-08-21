function update_multi_selected () {
	CURRENT_MULTI_SELECTED = ORIGINAL_DATASET.filter(function (d) {
		if (
			(PARA_COOR_SELECTED.length == 0 || PARA_COOR_SELECTED.indexOf(d["filename"]) != -1) && 
			(umap_selected.length == 0 || umap_selected.indexOf(d["filename"]) != -1)
		) {
			return true;
		}
		return false;
	})
	CURRENT_CASE_LIST = CURRENT_MULTI_SELECTED.map(function(d){return d["filename"];});

	update_multi_selected_views(CURRENT_CASE_LIST);
}


function update_multi_selected_views (file_names) {
	update_multi_selected_chart_view(file_names);
	update_multi_selected_image_view(file_names);
	update_multi_selected_table_view();
}


// function update_multi_selected (file_names) {
// 	// in parallel coordinate, user could brush to filter to a subset of cases.  Other views
// 	// should respond to only display the filtered cases.

// 	CURRENT_MULTI_SELECTED = ORIGINAL_DATASET.filter(function (d) {
// 		if (file_names.indexOf(d["filename"]) != -1) {
// 			return true;
// 		}
// 		return false;
// 	})
// 	CURRENT_CASE_LIST = CURRENT_MULTI_SELECTED.map(function(d){return d["filename"];});
// 	update_multi_selected_chart_view();
// 	update_multi_selected_image_view(file_names);
// 	update_multi_selected_table_view();
// }
