var percentiles;
var donut, arcs, svg, label, percentileLabel, maxArc;
var p = 0.015;
var r, arc, arc2, arc3;
var pointerColor = d3.scale.linear().range(['green', 'yellow', 'red']);
var cubeServer = 'http://zenv.nym.se:1081';

function load() {
    d3.json(cubeServer + '/1.0/metric?expression=sum(reading(impulses))*3600%2f300&step=3e5&limit=288',
            function(data) {
                var vals = data.map(function (d) { return d.value; });
                vals = vals.filter(function (v) { return !!v; });
                vals.sort(function (a, b) { return a - b; });

                percentiles = {
                    p10: vals[~~(vals.length * 0.1)],
                    p50: vals[~~(vals.length * 0.5)],
                    p90: vals[~~(vals.length * 0.9)],
                    all: vals,
                };

                updateInstant();
            });
}

function instant(callback) {
    d3.json(cubeServer + '/1.0/metric?expression=sum(reading(impulses))&step=1e4&limit=18',
            function(data) {
                var vals = data.map(function (d) { return d.value; });
                var sum = vals.reduce(function (a, b) { return a + b; }, 0);
                sum = sum * 3600 / (vals.length * 10);
                var pct = '>100';

                if (percentiles) {
                    for (var i = 0; i < percentiles.all.length; i++) {
                        if (percentiles.all[i] >= sum) {
                            pct = Math.round(i / percentiles.all.length * 100);
                            break;
                        }
                    }
                }

                callback(sum, pct);
            });
}

function updateInstant() {
    instant(function (val, pct) {
        if (!percentiles) {
            return;
        }

        label = label.data([val]).text(function (v) { return Math.round(v) + 'W'; });
        percentileLabel = percentileLabel.data([pct]).text(function (v) { return v + '%'; });

        // Instant

        var pointer = p * 100;
        var cval = val / percentiles.p90 * 100;
        cval = Math.min(cval, 100 - pointer);
        var rem = 100 - cval - pointer;
        arcs = arcs.data(donut([ cval, pointer, rem ]));

        pointerColor = pointerColor.domain([percentiles.p10, percentiles.p50, percentiles.p90]);
        arcs.transition()
        .ease('bounce')
        .duration(500)
        .attrTween('d', tween)
        .attr('fill', function (d, i) { return ['#eee', pointerColor(val), '#eee'][i]; });

        // 50th and 95th percentile

        pointer = 2 * p * 100;
        var avg = percentiles.p50 / percentiles.p90 * 100;
        rem = 100 - avg - pointer;

        maxArc = maxArc
        .data(donut([avg, pointer, rem]))
        .attr('d', arc2);
    });
}

var prevVals = {
    0:{startAngle: -0.5 * Math.PI, endAngle: -0.5 * Math.PI},
    1:{startAngle: -0.5 * Math.PI, endAngle: (p - 0.5) * Math.PI},
    2:{startAngle: (p - 0.5) * Math.PI, endAngle: 0.5 * Math.PI},
};

function tween(d, i, a) {
    var ip = d3.interpolate({startAngle: 0, endAngle: 0}, d);
    if (prevVals[i]) {
        ip = d3.interpolate({startAngle: prevVals[i].startAngle, endAngle: prevVals[i].endAngle}, d);
    }
    prevVals[i] = d;
    return function(t) {
        return arc(ip(t));
    };
}

function lines(url, tag) {
    var w = $(tag).width();
    var h = $(tag).height();
    //var w = 640;
    //var h = 120;
    // Scales. Note the inverted domain for the y-scale: bigger is up!
    var x = d3.time.scale().range([0, w]),
    y = d3.scale.linear().range([h, 0]);

    // An area generator, for the light fill.
    var area = d3.svg.area()
    .interpolate("monotone")
    .x(function(d) { return x(d.time); })
    .y0(h)
    .y1(function(d) { return y(d.value); });

    var line = d3.svg.line()
    .interpolate("monotone")
    .x(function(d) { return x(d.time); })
    .y(function(d) { return y(d.value); });

    d3.json(url, function (data) {
        var maxVal = 0;
        for (var i = 0; i < data.length; i++) {
            data[i].value = data[i].value || 0;
            data[i].time = new Date(data[i].time).getTime();
            maxVal = Math.max(maxVal, data[i].value);
        }
        x.domain([data[0].time, data[data.length - 1].time]);
        y.domain([0, maxVal]).nice();

        var svg = d3.select(tag).append("svg:svg")
        .attr('width', w)
        .attr('height', h);

        svg
        .append("svg:path")
        .attr("class", "area")
        .attr('d', function (d) { return area(data); });

        svg
        .append("svg:path")
        .attr("class", "line")
        .attr('d', function (d) { return line(data); });
    });
}

function updateLines() {
    lines(cubeServer + '/1.0/metric?expression=sum(reading(impulses))*3600%2f300&step=3e5&limit=288', 'div#power');
    lines(cubeServer + '/1.0/metric?expression=median(reading(temperature))&step=3e5&limit=288', 'div#temp');
}

$(document).ready(function () {
    r = Math.round($('div#gauge').width() / 2);
    arc = d3.svg.arc().innerRadius(Math.round(r * 0.5)).outerRadius(Math.round(r * 0.95));
    arc2 = d3.svg.arc().innerRadius(Math.round(r * 0.45)).outerRadius(Math.round(r * 0.52));
    arc3 = d3.svg.arc().innerRadius(Math.round(r * 0.95)).outerRadius(Math.round(r * 1.00));

    load();
    setInterval(load, 600 * 1000);

    donut = d3.layout.pie().sort(null).startAngle(-Math.PI * 0.55).endAngle(Math.PI * 0.55);

    svg = d3.select('div#gauge').append('svg:svg')
    .attr('width', r * 2)
    .attr('height', r * 1.15)
    .append('svg:g')
    .attr('transform', 'translate(' + r + ',' + r + ')');

    arcs = svg.selectAll('path.meter')
    .data(donut([0, p, 1-p]))
    .enter().append('svg:path').attr('class', 'meter')
    .attr('fill', function (d, i) { return [ '#eee', '#000', '#eee', ][i]; })
    .attr('d', arc);

    label = svg.selectAll('text.centerLabel')
    .data(['0W'])
    .enter()
    .append('svg:text')
    .attr('class', 'centerLabel')
    .attr('font-size', Math.round(r * 0.2))
    .attr('dy', Math.round(r * -0.04))
    .text(String);

    percentileLabel = svg.selectAll('text.percentile')
    .data(['0%'])
    .enter()
    .append('svg:text')
    .attr('class', 'percentile')
    .attr('font-size', Math.round(r * 0.1))
    .attr('dy', Math.round(r * 0.1))
    .text(String);

    maxArc = svg.selectAll('path.max').data(donut([0, 0, 99]))
    .enter().append('svg:path').attr('class', 'max')
    .attr('fill', function (d, i) { return ['#ddd', '#333', '#ddd'][i]; })
    .attr('d', arc2);

    setInterval(updateInstant, 5000);

    updateLines();
    //setInterval(updateLines, 30000);
});
