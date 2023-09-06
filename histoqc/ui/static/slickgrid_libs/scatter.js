const margin = { top: 20, right: 20, bottom: 40, left: 40 };
const height = 400 - margin.top - margin.bottom;
const width = 960 - margin.left - margin.right;
let colorToData = {};
let timer, startTime;

function showTimeSince(startTime) {
    const currentTime = new Date().getTime();
    const runtime = currentTime - startTime;
    document.getElementById('timeRendering').innerHTML = runtime + 'ms';
}

function showFavoriteNumber(datum) {
    if (datum) {
        document.getElementById('favoriteNumber').innerHTML = datum.favoriteNumber;
    }
}

function startTimer() {
    stopTimer();

    startTime = new Date().getTime();

    timer = setInterval(() => {
        showTimeSince(startTime);
    }, 10);

    showTimeSince(startTime);
}

function stopTimer() {
    if (timer) {
        clearInterval(timer);
    }

    showTimeSince(startTime);
}

function generateData(numPoints) {
    const data = [];
    for (let i = 0; i < numPoints; i++) {
        data.push({
            x: Math.random(),
            y: Math.random(),
            favoriteNumber: Math.round(Math.random() * 10)
        });
    }
    return data;
}

function getColor(index) {
    return d3.rgb(
        Math.floor(index / 256 / 256) % 256,
        Math.floor(index / 256) % 256,
        index % 256)
        .toString();
}

function paintPoint(context, virtualContext, d, i, x, y, r) {
    const color = getColor(i);
    colorToData[color] = d;
    virtualContext.fillStyle = color;

    // start a new path for drawing
    context.beginPath();
    virtualContext.beginPath();

    // paint an arc based on information from the DOM node
    context.arc(x(d.x), y(d.y), r, 0, 2 * Math.PI);
    virtualContext.arc(x(d.x), y(d.y), r, 0, 2 * Math.PI);

    // fill the point
    context.fill();
    virtualContext.fill();
}

function paintCanvas(canvas, virtualCanvas, data, x, y) {
    startTimer();
    // get the canvas drawing context
    const context = canvas.getContext("2d");
    const virtualContext = virtualCanvas.getContext("2d");

    // clear the canvas from previous drawing
    context.clearRect(0, 0, canvas.width, canvas.height);
    virtualContext.clearRect(0, 0, virtualCanvas.width, virtualCanvas.height);

    // clear data
    colorToData = {};

    // draw a circle for each
    data.forEach((d, i) => {
        paintPoint(context, virtualContext, d, i, x, y, 2);
    });
    stopTimer();
}

function renderChart(data) {
    // Make a container div for our graph elements to position themselves against
    const graphDiv = d3.selectAll('div').data([0]);
    graphDiv.enter().append('div')
        .style('position', 'relative');

    // Make a canvas for the points
    const canvas = graphDiv.selectAll('canvas').data([0]);
    canvas.enter().append('canvas')
        .attr('height', height)
        .attr('width', width)
        .style('position', 'absolute')
        .style('top', margin.top + 'px')
        .style('left', margin.left + 'px');

    const virtualCanvas = d3.select(document.createElement('canvas'))
        .attr('height', height)
        .attr('width', width);

    // Make an SVG for axes
    const svg = graphDiv.selectAll('svg').data([0]);
    svg.enter().append('svg')
        .style('position', 'absolute')
        .attr('height', height + margin.top + margin.bottom)
        .attr('width', width + margin.left + margin.right);

    // Create groups for axes
    const xAxisG = svg.selectAll('g.x').data([0]);
    xAxisG.enter().append('g')
        .attr('class', 'x')
        .attr('transform', 'translate(' + margin.left + ', ' + (margin.top + height) + ')');

    const yAxisG = svg.selectAll('g.y').data([0]);
    yAxisG.enter().append('g')
        .attr('class', 'y')
        .attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')');

    // Create scales
    const x = d3.scaleLinear()
        .domain([0, 1])
        .range([0, width]);
    const y = d3.scaleLinear()
        .domain([0, 1])
        .range([height, 0]);

    // Create axes
    const xAxis = d3.axisBottom()
        .scale(x)
        .orient('bottom');
    const yAxis = d3.axisRight()
        .scale(y)
        .orient('left');
    xAxisG.call(xAxis);
    yAxisG.call(yAxis);

    // Make a highlight circle
    const highlightGroup = svg.selectAll('g.highlight').data([0]);
    highlightGroup.enter()
        .append('g')
        .attr('class', 'highlight')
        .attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')')

        .append('circle');

    const highlight = highlightGroup.selectAll('circle')
        .attr('r', 4)
        .attr('stroke-width', 4)
        .attr('stroke', d3.rgb(0, 190, 25))
        .attr('visibility', 'hidden');

    paintCanvas(canvas.node(), virtualCanvas.node(), data, x, y);

    function mouseOutsideRange(possibleDatum, mouseX, mouseY) {
        if (!possibleDatum) {
            return true;
        }

        const xDifference = Math.abs(x(possibleDatum.x) - mouseX);
        const yDifference = Math.abs(y(possibleDatum.y) - mouseY);
        return xDifference > 2 || yDifference > 2;
    }

    canvas.on('mousemove', function() {
        const mouse = d3.mouse(this);
        const mouseX = mouse[0];
        const mouseY = mouse[1];

        const imageData = virtualCanvas.node().getContext('2d').getImageData(mouseX, mouseY, 1, 1);
        const color = d3.rgb.apply(null, imageData.data).toString();
        const possibleDatum = colorToData[color];

        if (mouseOutsideRange(possibleDatum, mouseX, mouseY)) {
            highlight.attr('visibility', 'hidden');
            return;
        }

        highlight
            .attr('cx', x(possibleDatum.x))
            .attr('cy', y(possibleDatum.y))
            .attr('visibility', 'visible');

        showFavoriteNumber(possibleDatum);
    });

    canvas.on('mouseout', () => {
        highlight.attr('visibility', 'hidden');
    });
}