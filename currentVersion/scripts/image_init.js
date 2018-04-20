/* Image View model.
 * initialize/update the image view, enter/exit selected stage & detailed stage for image view.
 * last modified: 03/17/2018 14:24:00
 * update log: Add id to image blocks. Add multi-select. Re-define the generate_img_block function.
 */ 


function initialize_image_view (case_list) {

	show_view("image");
	update_image_view_height();

	var $div = $("#overview-gallery");
	$div.empty();

	CURRENT_CASE_LIST = ORIGINAL_CASE_LIST;

	for (var i = 0; i < case_list.length; i++) {
		$div.append(generate_img_block("overview-image-block", case_list[i], CURRENT_IMAGE_TYPE, CURRENT_COMPARE_TYPE, case_list[i]));
	}
 
	$div.children("div").children("img").click(function(){
		src_list = this.src.split('/');
		enter_select_mode(src_list[src_list.length-2]);
	});

	init_image_selector();
}


function update_image_view (case_list) {
	// TODO: rewrite update function.

	update_image_view_height();

	var $div = $("#overview-gallery");
	$div.empty();

	for (var i = 0; i < ORIGINAL_CASE_LIST.length; i++) {
		$div.append(generate_img_block("overview-image-block", ORIGINAL_CASE_LIST[i], CURRENT_IMAGE_TYPE, CURRENT_COMPARE_TYPE, ORIGINAL_CASE_LIST[i]));
	}
 
	$div.children("div").children("img").click(function(){
		src_list = this.src.split('/');
		enter_select_mode(src_list[src_list.length-2]);
	});

	update_multi_selected_image_view(case_list);
}


function update_image_view_height () {
	$("#image-view").outerHeight(
			$(window).height() - 
			$("header").outerHeight(includeMargin=true) - 
			$("#table-view").outerHeight(includeMargin=true) - 
			$("#chart-view").outerHeight(includeMargin=true)
		);
}


function enter_select_image_view (dir) {
	$("#overview-gallery").css("display", "none");
	$("#img-select-button").css("display", "none");
	$("#exit-image-select-view-btn").css("display", "block");

	$("#select-candidate-container > *").remove();
	$("#select-image-container > *").remove();
	$("#select-image-view").css("display", "flex");

	var $div = $("#select-image-container");
	$div.append("<img id='exibit-img' src=" + generate_img_src(dir, CURRENT_IMAGE_TYPE) + " />");
	$div.append("<div><span>" + dir + "</span></div>");

	$div = $("#select-candidate-container");
	for (i = 0; i < DEFAULT_IMAGE_EXTENSIONS.length; i++) {
		if (SKIP_IMAGE_EXTENSIONS.indexOf(i) >= 0) {
			continue;
		}
		$div.append(generate_img_block("candidate-image-block", dir, i, -1, DEFAULT_IMAGE_EXTENSIONS[i]));
	}

	$("#select-candidate-container > div > img").dblclick(function(){
		enter_detail_image_view(this.src);
	});

	$("#select-candidate-container > div > img").click(function(){
		$("#exibit-img").attr("src", this.src);
	});

	$("#exibit-img").click(function(){
		enter_detail_image_view(this.src);
	});
}


function exit_select_image_view () {
	$("#select-candidate-container > *").remove();
	$("#select-image-container > *").remove();
	$("#select-image-view").css("display", "none");
	$("#exit-image-select-view-btn").css("display", "none");

	$("#overview-gallery").css("display", "flex");
	$("#img-select-button").css("display", "block");
}


function update_multi_selected_image_view (file_names) {
	ORIGINAL_CASE_LIST.forEach(function (d) {
		if (file_names.indexOf(d) == -1) {
			$("#" + ORIGINAL_CASE_DICT[d]["dom_id"]).css("display", "none");
		} else {
			$("#" + ORIGINAL_CASE_DICT[d]["dom_id"]).css("display", "flex");
		}
	});
}


function calculate_height ($div) {
	var num_thumbs = DEFAULT_IMAGE_EXTENSIONS.length;
	var max_width = Math.floor($div.width() / Math.ceil(num_thumbs / 2)) - 5;
	var cor_height = Math.floor(max_width / $("#exibit-img").width() * $("#exibit-img").height());
	var max_height = Math.floor($div.height() / 2) - 20;

	return Math.min(max_height, cor_height);
}


function generate_img_block (blk_class, file_name, img_type, compare_type, img_label) {
	var img_block = "<div id='" + ORIGINAL_CASE_DICT[file_name]["dom_id"] + "' class='" + blk_class + "'>" +
					"<img src=" + generate_img_src(file_name, img_type) + " onerror=\"this.style.display='none'\"/>";
	if (compare_type != -1) {
		img_block += "<img src=" + generate_img_src(file_name, compare_type) + " onerror=\"this.style.display='none'\"/>";
	}
	img_block += "<div><span>" + img_label + "</span></div></div>";
	return img_block;
}


function generate_img_src (file_name, img_type_index) {
	var outdir = ORIGINAL_CASE_DICT[file_name]["outdir"];
	return "'" + DATA_PATH + outdir + "/" + file_name + DEFAULT_IMAGE_EXTENSIONS[img_type_index] + "'"
}


function enter_detail_image_view (src) {
	src_list = src.split('/');
	$("#detail-image-name > span").text(src_list[src_list.length-2]);
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


function init_image_selector () {

	$img_selector = $("#img-select");
	$cmp_selector = $("#comparison-select");

	for (var index = 0; index < DEFAULT_IMAGE_EXTENSIONS.length; index ++) {


		if (SKIP_IMAGE_EXTENSIONS.indexOf(index) >= 0) {
			continue;
		}
		var key = DEFAULT_IMAGE_EXTENSIONS[index];

		if (key == DEFAULT_IMAGE_EXTENSION) {
			$img_selector.append(generate_option_html(index, key, true));
		} else {
			$img_selector.append(generate_option_html(index, key));
		}
		$cmp_selector.append(generate_option_html(index, key));
	}
	$cmp_selector.append(generate_option_html("-1", "compare ...", true));

	$img_selector.change(function () {
		CURRENT_IMAGE_TYPE = $(this).val();
		update_image_view(CURRENT_CASE_LIST);
	});

	$cmp_selector.change(function () {
		CURRENT_COMPARE_TYPE = $(this).val();
		if (CURRENT_COMPARE_TYPE != -1) {
			$("#comparison-select > option").last().text("none");
		} else {
			$("#comparison-select > option").last().text("compare ...");
		}
		update_image_view(CURRENT_CASE_LIST);
	});

	$("#exit-image-select-view-btn > button").click(function () {
		exit_select_mode();
	});

	$("#overlay-image > figure > img").click(function () {
		$("#overlay-container").css("pointer-events", "none")
							   .css("opacity", 0);
	});

	
	function generate_option_html (value, key, selected = false) {
		if (selected) {
			return "<option value='" + value + "' selected>" + key + "</option>";
		} else {
			return "<option value='" + value + "'>" + key + "</option>";
		}
	}
}
