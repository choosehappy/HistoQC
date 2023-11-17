/* Image View model.
 * initialize/update the image view, enter/exit selected stage & detailed stage for image view.
 * last modified: 03/17/2018 14:24:00
 * update log: Add id to image blocks. Add multi-select. Re-define the generate_img_block function.
 */ 

function initializeImageView(dataView) {
	
	var $parent = $("#image-view");
	$parent.css("display", "flex");
	var $div = $("#overview-gallery");
	$div.empty();

	CURRENT_IMAGE_TYPE = DEFAULT_IMAGE_EXTENSIONS.indexOf(DEFAULT_IMAGE_EXTENSION);

	const case_ids = getCaseidsFromDataView(dataView);
	case_ids.forEach(function (case_id) {
		$div.append(
			generateImgBlock(case_id,
				"overview-image-block", ORIGINAL_CASE_LIST[case_id], 
				CURRENT_IMAGE_TYPE, CURRENT_COMPARE_TYPE, ORIGINAL_CASE_LIST[case_id]
			)
		);
	});


	// const page_start = page_num * page_size;
	// for (var i = page_start; i < page_start+page_size; i++) {//i < case_list.length; i++) {
	// 	$div.append(
	// 		generate_img_block(ORIGINAL_DATASET[i]["id"],
	// 			"overview-image-block", ORIGINAL_CASE_LIST[i], 
	// 			CURRENT_IMAGE_TYPE, CURRENT_COMPARE_TYPE, ORIGINAL_CASE_LIST[i]
	// 		)
	// 	);
	// }
	
	// IMAGE SELECT MODE FUNCTIONALITY

	// $div.children("div").children("img").click(function(){
	// 	src_list = this.src.split('/');
	// 	enter_select_mode(src_list[src_list.length-2].replace("%20", " "));
	// });
	setPageSize(dataView, 25);
	initImageSelector(dataView);

}


function updateImageView (dataView) {
	// TODO: rewrite update function.

	updateImageViewHeight();

	var $div = $("#overview-gallery");
	$div.empty();

	const case_ids = getCaseidsFromDataView(dataView);
	case_ids.forEach(function (case_id) {
		$div.append(
			generateImgBlock(ORIGINAL_DATASET[case_id]["id"],
				"overview-image-block", ORIGINAL_CASE_LIST[case_id], 
				CURRENT_IMAGE_TYPE, CURRENT_COMPARE_TYPE, ORIGINAL_CASE_LIST[case_id]
			)
		);
	});

	// const page_start = page_num * page_size;
	// for (var i = page_start; i < page_start+page_size; i++) {//ORIGINAL_CASE_LIST.length; i++) {
	// 	$div.append(
	// 		generate_img_block(data, // data was not defined and will raise an error.
	// 			"overview-image-block", ORIGINAL_CASE_LIST[i], 
	// 			CURRENT_IMAGE_TYPE, CURRENT_COMPARE_TYPE, ORIGINAL_CASE_LIST[i]
	// 		)
	// 	);
	// }
 
	// $div.children("div").children("img").click(function(){
	// 	src_list = this.src.split('/');
	// 	enter_select_mode(src_list[src_list.length-2].replace("%20", " "));
	// });

	// update_multi_selected_image_view(case_list);
}


function updateImageViewHeight () {
	$("#image-view").outerHeight(
			$(window).height() - 
			$("header").outerHeight(includeMargin=true) - 
			$("#table-view").outerHeight(includeMargin=true) - 
			$("#chart-view").outerHeight(includeMargin=true)
		);
}


function enterSelectImageView (dir) {
	$("#overview-gallery").css("display", "none");
	$("#img-select-button").css("display", "none");
	$("#exit-image-select-view-btn").css("display", "block");

	$("#select-candidate-container > *").remove();
	$("#select-image-container > *").remove();
	$("#select-image-view").css("display", "flex");

	var $div = $("#select-image-container");
	$div.append(
		"<img id='exibit-img' src='" + 
		generateImgSrc(dir, CURRENT_IMAGE_TYPE, false) + 
		"' file_name='" + dir + 
		"' img_type='" + CURRENT_IMAGE_TYPE + "'/>"
	);
	$div.append("<div><span>" + dir + "</span></div>");

	$div = $("#select-candidate-container");
	for (i = 0; i < DEFAULT_IMAGE_EXTENSIONS.length; i++) {
		if (SKIP_IMAGE_EXTENSIONS.indexOf(i) >= 0) {
			continue;
		}
		$div.append(
			generateImgBlock(
				"candidate-image-block", dir, 
				i, -1, DEFAULT_IMAGE_EXTENSIONS[i]
			)
		);
	}

	$("#select-candidate-container > div > img").dblclick(function(){
		enterDetailImageView($(this).attr("file_name"), $(this).attr("img_type"), this.src);
	});

	$("#select-candidate-container > div > img").click(function(){
		$("#exibit-img").attr("src", this.src)
						.attr("img_type", $(this).attr("img_type"));
	});

	$("#exibit-img").click(function(){
		enterDetailImageView($(this).attr("file_name"), $(this).attr("img_type"), this.src);
	});
}


function exitSelectImageView () {
	$("#select-candidate-container > *").remove();
	$("#select-image-container > *").remove();
	$("#select-image-view").css("display", "none");
	$("#exit-image-select-view-btn").css("display", "none");

	$("#overview-gallery").css("display", "flex");
	$("#img-select-button").css("display", "");
}


function updateMultiSelectedImageView (file_names) {
	ORIGINAL_CASE_LIST.forEach(function (d) {
		if (file_names.indexOf(d) == -1) {
			$("#" + ORIGINAL_CASE_DICT[d]["dom_id"]).css("display", "none");
		} else {
			$("#" + ORIGINAL_CASE_DICT[d]["dom_id"]).css("display", "flex");
		}
	});
}


function calculateHeight ($div) {
	var num_thumbs = DEFAULT_IMAGE_EXTENSIONS.length;
	var max_width = Math.floor($div.width() / Math.ceil(num_thumbs / 2)) - 5;
	var cor_height = Math.floor(max_width / $("#exibit-img").width() * $("#exibit-img").height());
	var max_height = Math.floor($div.height() / 2) - 20;

	return Math.min(max_height, cor_height);
}


function generateImgBlock (id, blk_class, file_name, img_type, compare_type, img_label) {
	var img_block = "<div id='" + id + 
		"' class='" + blk_class + "'>" +
		"<img src='" + generateImgSrc(
			file_name, img_type, blk_class == "overview-image-block"
		) + "' file_name='" + file_name + 
		"' img_type='" + img_type + 
		"' onerror=\"this.style.display='none'\"/>";
	if (compare_type != -1) {	// add on second image if we are in compare mode
		img_block += "<img src='" + generateImgSrc(
				file_name, compare_type, blk_class == "overview-image-block"
			) + "' file_name='" + file_name + 
			"' img_type='" + compare_type + 
			"' onerror=\"this.style.display='none'\"/>";
	}
	img_block += "<div><span>" + img_label + "</span></div></div>";
	return img_block;
}


function generateImgSrc (file_name, img_type_index, use_small=false) {
	var image_extension = DEFAULT_IMAGE_EXTENSIONS[img_type_index];
	// if (use_small && SMALL_IMAGE_EXTENSIONS.indexOf(image_extension) >= 0) {
	// 	image_extension = image_extension.split(".")[0] + "_small.png";
	// }

	// path calls the image endpoint.
	return window.location.origin + "/image/" + file_name + '/' + image_extension;
}


function enterDetailImageView (file_name, img_type, src) {
	$("#detail-image-name > span").text(file_name);
	$("#overlay-image > figure").css("width", "auto")
		.css("background-image", "url(" + src + ")");
	$("#overlay-image > figure > img").attr("src", src);
	$("#overlay-container").css("pointer-events", "all")
		.css("opacity", 1);
	var figure_height = $("#overlay-image > figure").height(),
		figure_width = $("#overlay-image > figure").width(),
		img_height = $("#overlay-image > figure > img").height(),
		img_width = $("#overlay-image > figure > img").width();
	if (figure_height < img_height) {
		$("#overlay-image > figure").width(img_width * (figure_height / img_height));
	}
}


function initImageSelector (dataView) {

	$img_selector = $("#img-select");
	$cmp_selector = $("#comparison-select");

	for (var index = 0; index < DEFAULT_IMAGE_EXTENSIONS.length; index ++) {
		if (SKIP_IMAGE_EXTENSIONS.indexOf(index) >= 0) {
			continue;
		}
		var key = DEFAULT_IMAGE_EXTENSIONS[index];

		if (key == DEFAULT_IMAGE_EXTENSION) {
			$img_selector.append(generateOptionHtml(index, key, true));
		} else {
			$img_selector.append(generateOptionHtml(index, key));
		}
		$cmp_selector.append(generateOptionHtml(index, key));
	}
	$cmp_selector.append(generateOptionHtml("-1", "compare ...", true));

	// $img_selector.selectpicker('refresh');
	// $img_selector.selectpicker('render');

	// $cmp_selector.selectpicker('refresh');
	// $cmp_selector.selectpicker('render');

	$img_selector.change(function () {
		CURRENT_IMAGE_TYPE = $(this).val();
		updateImageView(dataView);
	});

	$cmp_selector.change(function () {
		CURRENT_COMPARE_TYPE = $(this).val();
		if (CURRENT_COMPARE_TYPE != -1) {
			$("#comparison-select > option").last().text("none");
		} else {
			$("#comparison-select > option").last().text("compare ...");
		}
		updateImageView(dataView);
	});

	$("#exit-image-select-view-btn").click(function () {
		exit_select_mode();
	});

	$("#overlay-image > figure > img").click(function () {
		$("#overlay-container").css("pointer-events", "none")
							   .css("opacity", 0);
	});

	
	function generateOptionHtml (value, key, selected = false) {
		if (selected) {
			return "<option value='" + value + "' selected>" + key + "</option>";
		} else {
			return "<option value='" + value + "'>" + key + "</option>";
		}
	}
}

function getCaseidsFromDataView(dataView) {
	const paging_info = dataView.getPagingInfo();
	const page_end = Math.min(dataView.getLength(), paging_info.pageSize);

	var caseids = [];
	for (var i = 0; i < page_end; i++) {
		caseids.push(dataView.getItem(i)["id"]);
	}

	return caseids;
}

function setPageSize(dataView, n) {
	dataView.setRefreshHints({
	  isFilterUnchanged: true
	});
	dataView.setPagingOptions({pageSize: n});
  }