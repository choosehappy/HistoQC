function renderScatterPlot(data) {
    renderToolSelection();
    // constants
    var subsetSize = 1000;
    var pointRadius = 2;
    var zoomEndDelay = 0;

    // timeout function
    var zoomEndTimeout;

    // define all size variables
    var fullWidth = 500;
    var fullHeight = 500;
    var margin = { top: 10, right: 10, bottom: 30, left: 30 };
    var width = fullWidth - margin.left - margin.right;
    var height = fullHeight - margin.top - margin.bottom;

    // produce array of N false values
    var numberPoints = data["embed_x"].length;

    var polygon = [];
    var scaled_polygon1 = [];

    var plotData = d3.range(numberPoints).map(function (i) {
        return {
            x: data.embed_x[i],
            y: data.embed_y[i],
            i: i, // save the index of the point as a property, this is useful
            color: "steelblue"
        };
    });

    // create a quadtree for fast hit detection
    var quadTree = d3.quadtree(plotData);

    // d3 only added randomInt in v6. However, we are using v5 https://stackoverflow.com/questions/61017839/d3-randomint-is-not-a-function
    d3.randomInt = d3.randomInt || (function sourceRandomInt(source) {
        function randomInt(min, max) {
            if (arguments.length < 2) max = min, min = 0;
            min = Math.floor(min);
            max = Math.floor(max) - min;
            return function () {
                return Math.floor(source() * max + min);
            };
        }

        randomInt.source = sourceRandomInt;

        return randomInt;
    })(Math.random);

    // selected subsetsize random numbers -- this is the subset of points
    // drawn during 'zoom' events
    var randomIndex = [];
    for (var i = 0; i < subsetSize; i++) {
        randomIndex.push(d3.randomInt(0, numberPoints)());
    }

    // the canvas is shifted by 1px to prevent any artefacts
    // when the svg axis and the canvas overlap
    var canvas = d3.select("#plot-canvas")
        .attr("width", width - 1)
        .attr("height", height - 1)
        .style("transform", "translate(" + (margin.left + 1) +
            "px" + "," + (margin.top + 1) + "px" + ")");

    var lassoCanvas = d3.select("#lasso-canvas")
        .attr("width", width - 1)
        .attr("height", height - 1)
        .style("transform", "translate(" + (margin.left + 1) +
            "px" + "," + (margin.top + 1) + "px" + ")");

    var svg = d3.select("#axis-svg")
        .attr("width", fullWidth)
        .attr("height", fullHeight)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," +
            margin.top + ")");

    // ranges, scales, axis, objects
    var xRange = d3.extent(plotData, function (d) { return d.x });
    var yRange = d3.extent(plotData, function (d) { return d.y });

    var xScale = d3.scaleLinear()
        .domain([xRange[0] - 5, xRange[1] + 5])
        .range([0, width]);

    var yScale = d3.scaleLinear()
        .domain([yRange[0] - 5, yRange[1] + 5])
        .range([height, 0]);

    var newX = d3.scaleLinear()
        .domain([xRange[0] - 5, xRange[1] + 5])
        .range([0, width]);

    var newY = d3.scaleLinear()
        .domain([yRange[0] - 5, yRange[1] + 5])
        .range([height, 0]);


    var xAxis = d3.axisBottom(xScale).scale(xScale)
    var yAxis = d3.axisLeft(yScale).scale(yScale)


    // create zoom behaviour
    var zoomBehaviour = d3.zoom()
        .scaleExtent([1, 1000])
        .on("zoom", onZoom)
        .on("end", onZoomEnd);

    // append x-axis, y-axis
    var xAxisSvg = svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis);

    var yAxisSvg = svg.append('g')
        .attr('class', 'y axis')
        .call(yAxis);

    // on onclick handler
    // canvas.on("click", onClick);



    // get the canvas drawing context
    var context = canvas.node().getContext('2d')
    var lassoContext = lassoCanvas.node().getContext('2d'), path = d3.geoPath().context(lassoContext);

    draw(null, xScale, yScale, []);


    function onZoom() {
        clearTimeout(zoomEndTimeout);
        console.log("polygon: " + polygon[0])
        scaled_polygon1 = polygon.map(p => [xScale.invert(p[0]), yScale.invert(p[1])]); // scale polygon to data space
        console.log("scaled_polygon1 before rescale: " + scaled_polygon1[0])
        newX = d3.event.transform.rescaleX(xScale);
        newY = d3.event.transform.rescaleY(yScale);
        scaled_polygon1 = scaled_polygon1.map(p => [newX(p[0]), newY(p[1])]);   // scale polygon to canvas space
        console.log("scaled_polygon1 after rescale: " + scaled_polygon1[0])

        xAxisSvg.call(xAxis.scale(newX));
        yAxisSvg.call(yAxis.scale(newY));
        draw(randomIndex, newX, newY, []);


    }

    function onZoomEnd() {
        // when zooming is stopped, create a delay before
        // redrawing the full plot
        newX = d3.event.transform.rescaleX(xScale);
        newY = d3.event.transform.rescaleY(yScale);

        zoomEndTimeout = setTimeout(function () {
            draw(null, newX, newY, []);
        }, zoomEndDelay);
    }

    lassoCanvas.call(lasso().on("start lasso end", drawLasso))
    canvas.call(zoomBehaviour);


    // the draw function draws the full dataset if no index
    // parameter supplied, otherwise it draws a subset according
    // to the indices in the index parameter
    function draw(index, xScale, yScale, polygon) {
        var scaled_polygon;
        var selected_indices = [];
        if (polygon.length > 0) {
            scaled_polygon = polygon.map(p => [xScale.invert(p[0]), yScale.invert(p[1])]);
        } else {
            scaled_polygon = polygon;
        }

        context.clearRect(0, 0, fullWidth, fullHeight);
        context.fillStyle = 'steelblue';
        context.lineWidth = 1;
        context.strokeStyle = 'white';

        // if an index parameter is supplied, we only want to draw points
        // with indices in that array
        if (index) {
            index.forEach(function (i) {
                var point = plotData[i];
                drawPoint(point, pointRadius, xScale, yScale);
            });
        }
        // draw the full dataset otherwise
        else {
            plotData.forEach(function (point) {
                if (scaled_polygon.length == 0 || d3.polygonContains(scaled_polygon, [point.x, point.y])) {
                    drawPoint(point, pointRadius, xScale, yScale);
                    selected_indices.push(point);
                }
            });
            //TODO update dataview with selected indices
            // Filter the dataView items by the selected indices

            // const items = DATA_VIEW.getItems()
            // const filteredItems = items.filter(item => selected_indices.includes(item))
        }
    }

    function drawPoint(point, r, xScale, yScale) {
        var cx = xScale(point.x);
        var cy = yScale(point.y);

        // NOTE; each point needs to be drawn as its own path
        // as every point needs its own stroke. you can get an insane
        // speed up if the path is closed after all the points have been drawn
        // and don't mind points not having a stroke
        context.beginPath();
        context.arc(cx, cy, r, 0, 2 * Math.PI);
        context.closePath();
        context.fill();
        context.stroke();
    }

    function trackMouse(e, { start, move, out, end }) {
        const tracker = {},
            target = e.target;
        tracker.point = d3.mouse(target); // Use d3.mouse with the target element

        // Listen for mouse events on the target
        d3.select(target)
            .on(`mouseup`, function () { // Use function() to access this
                tracker.sourceEvent = d3.event; // Use d3.event to access the event
                tracker.point = d3.mouse(this); // Use this to refer to the target element
                d3.select(this).on(`mousemove mouseout`, null); // Remove event listeners
                end && end(tracker);
            })
            .on(`mousemove`, function () { // Use function() to access this
                tracker.sourceEvent = d3.event; // Use d3.event to access the event
                tracker.prev = tracker.point;
                tracker.point = d3.mouse(this); // Use this to refer to the target element
                move && move(tracker);
            })
            .on(`mouseout`, function () { // Use function() to access this
                tracker.sourceEvent = d3.event; // Use d3.event to access the event
                tracker.point = null;
                out && out(tracker);
            });

        start && start(tracker);
    }


    function lasso() {
        const dispatch = d3.dispatch("start", "lasso", "end");
        const lasso = function (selection) {
            const node = selection.node();

            selection
                // .on("touchmove", e => e.preventDefault()) // prevent scrolling
                .on("mousedown", function () {

                    trackMouse(d3.event, {
                        start: p => {
                            polygon.length = 0;
                            dispatch.call("start", node, polygon);
                        },
                        move: p => {
                            polygon.push(p.point);
                            dispatch.call("lasso", node, polygon);
                        },
                        end: p => {
                            dispatch.call("end", node, polygon);
                            draw(null, newX, newY, polygon);
                        }
                    });
                });
        };
        lasso.on = function (type, _) {
            return _ ? (dispatch.on(...arguments), lasso) : dispatch.on(...arguments);
        };

        return lasso;
    }

    function drawLasso(polygon) {
        console.log("drawLasso")
        lassoContext.clearRect(0, 0, width, height);
        lassoContext.beginPath();
        path({
            type: "LineString",
            coordinates: polygon
        });
        lassoContext.fillStyle = "rgba(0,0,0,.1)";
        lassoContext.fill("evenodd");
        lassoContext.lineWidth = 1.5;
        lassoContext.stroke();

        lassoContext.canvas.value = { polygon, }; //selected };
        lassoContext.canvas.dispatchEvent(new CustomEvent('input'));
    }

    function renderToolSelection() {
        const $container = $("#scatter-card");
        const $lassoCanvas = $("#lasso-canvas");
    
        const $slickPager = $("<div class='slick-pager' />").prependTo($container);
        const $mode = $("<span class='slick-pager-mode' />").appendTo($slickPager);
        var $settings = $("<span class='slick-pager-settings' />").appendTo($slickPager);
    
        var icon_prefix = "<span class='ui-state-default ui-corner-all ui-icon-container'><span class='ui-icon ";
        var icon_suffix = "' /></span>";
    
        $(icon_prefix + "ui-icon-lightbulb" + icon_suffix)
            .click(function () {
                $lassoCanvas.toggle();
                drawLasso(scaled_polygon1);
                $mode.text($lassoCanvas.is(":visible") ? "Mode: Lasso" : "Mode: Zoom & Pan");
            })
            .appendTo($settings);
    }
    
}


