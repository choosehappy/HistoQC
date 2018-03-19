/* Image View model.
 * initialize/update the image view, enter/exit selected stage & detailed stage for image view.
 * last modified: 03/17/2018 14:24:00
 * update log: init header and comments. Update the image selector initialization. Change behavior to skip unused image type.
 */ 


function initialize_image_view (case_list) {
	$("#image-view").css("display", "block")
		.outerHeight($(window).height() - $("header").outerHeight(includeMargin=true) - $("#table-view").outerHeight(includeMargin=true) - $("#chart-view").outerHeight(includeMargin=true));

	var $div = $("#overview-gallery");
	$div.empty();

	for (var dir = 0; dir < case_list.length; dir++) {
		$div.append(generate_img_block("overview-image-block", generate_img_src(case_list[dir], CURRENT_IMAGE_TYPE), case_list[dir], CURRENT_COMPARE_TYPE));
	}
 
	$div.children("div").children("img").click(function(){
		src_list = this.src.split('/');
		enter_select_mode(src_list[src_list.length-2]);
	});

	init_image_selector();
}


function update_image_view (case_list) {
	// TODO: rewrite update function.

	$("#image-view").css("display", "block")
		.outerHeight($(window).height() - $("header").outerHeight(includeMargin=true) - $("#table-view").outerHeight(includeMargin=true) - $("#chart-view").outerHeight(includeMargin=true));

	var $div = $("#overview-gallery");
	$div.empty();

	for (var dir = 0; dir < case_list.length; dir++) {
		$div.append(generate_img_block("overview-image-block", generate_img_src(case_list[dir], CURRENT_IMAGE_TYPE), case_list[dir], CURRENT_COMPARE_TYPE));
	}
 
	$div.children("div").children("img").click(function(){
		src_list = this.src.split('/');
		enter_select_mode(src_list[src_list.length-2]);
	});
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
		$div.append(generate_img_block("candidate-image-block", generate_img_src(dir, i), DEFAULT_IMAGE_EXTENSIONS[i], -1));
	}

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


function calculate_height ($div) {
	var num_thumbs = DEFAULT_IMAGE_EXTENSIONS.length;
	var max_width = Math.floor($div.width() / Math.ceil(num_thumbs / 2)) - 5;
	var cor_height = Math.floor(max_width / $("#exibit-img").width() * $("#exibit-img").height());
	var max_height = Math.floor($div.height() / 2) - 20;

	return Math.min(max_height, cor_height);
}


function generate_img_block (blk_class, file_path, file_name, compare_type) {
	if (compare_type == -1) {
		return  " \
				<div class='" + blk_class + "'> \
					<img src=" + file_path + " onerror=\"this.style.display='none'\"/> \
					<div><span>" + file_name + "</span></div> \
				</div> \
				";        
	} else {
		return  " \
				<div class='" + blk_class + "'> \
					<img src=" + file_path + "  onerror=\"this.style.display='none'\"/> \
					<img src=" + generate_img_src(file_name, compare_type) + "  onerror=\"this.style.display='none'\"/> \
					<div><span>" + file_name + "</span></div> \
				</div> \
				";                
	}
}


function generate_img_src (file_name, img_type_index) {
	var outdir = CURRENT_CASE_DICT[file_name]["outdir"];
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
