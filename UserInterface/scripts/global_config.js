/**********************************************
 ********* PRE-DEFINED CONFIGURATIONS *********
 **********************************************/

/***************** SYSTEM CONFIG **************/
var DATA_PATH = "./Data/";
var OPEN_WITH_TABLE = true,
	OPEN_WITH_CHART = true,
	OPEN_WITH_IMAGE = true;

/****************** TABLE VIEW ****************/
var DEFAULT_HIDDEN_COLUMNS = [
	"outdir",
	"comment",
	"type"
];

/****************** CHART VIEW ****************/
// Initialize the bar chart on this attribute.
var DEFAULT_CHART_ATTRIBUTE = "height";
// Temporarily deprecated. 
var DEFAULT_PARAC_ATTRIBUTES = [];
// "bar_chart" | "parallel_coordinate"
var DEFAULT_VIS_TYPE = "bar_chart";

/****************** IMAGE VIEW ****************/
// full set of image format identifiers. 
var DEFAULT_IMAGE_EXTENSIONS = [
	"_thumb.png",
	"_bubble.png",
	"_areathresh.png",
	"_blurry.png",
	"_edge.png",
	"_nonwhite.png",
	"_pen_markings.png",
	"_small_fill.png",
	"_small_remove.png",
	"_spur.png",
	"_dark.png",
	"_hist.png",
	"_fuse.png",
	"_mask_use.png",
	"_deconv_c2.png",
	"_deconv_c1.png",
	"_deconv_c0.png"
];
var DEFAULT_IMAGE_EXTENSION = "_thumb.png";
