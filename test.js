var S = require('./cubesvr');

var cube = new S();
cube.probe(['http://zcube.nym.se:1081'], function () {
    cube.getData('/1.0/metric?expression=sum(reading(impulses))&step=864e5&count=365', function (data) {
        data = data.map(function (x) { return [new Date(x[0]), x[1] ];});
        console.log(data);
        /*
        data = cube.analyze(data, function (t) {
            var d = new Date(t);
            var m = d.getMonth() + 1;
            if (m < 10) {
                m = '0' + m;
            }
            return (new Date('' + d.getFullYear() + '-' + m + '-01')).getTime();
        });
        data = data.aggr.map(function (x) { return [x[0], x[1].sum]; });
        data = cube.analyze(data);
        console.log(data);*/
    });
});
