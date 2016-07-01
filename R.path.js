'use strict';

var getCubicBezierCurvePath = require('./R.smooth');
var path2curve = require('./R.curve').path2curve;

var drawDashPath = require('./R.dash').drawDashPath;
var analysisPath = require('./R.analysis').analysisPath;

var makeTrasform = require('./R.transform');

var drawer = {
    M: 'moveTo',
    L: 'lineTo',
    C: 'bezierCurveTo',
    Z: 'close',
};

var selectedColor = cc.color(0,157,236);

var GraphicsNode = _ccsg.GraphicsNode;
var LineCap      = cc.Graphics.LineCap;
var LineJoin     = cc.Graphics.LineJoin;

var Path = cc.Class(makeTrasform({
    extends: cc.Component,

    properties: {
        _lineWidth: 1,
        _strokeColor: cc.Color.BLACK,
        _fillColor: cc.Color.WHITE,
        _lineJoin: LineJoin.BEVEL,
        _lineCap: LineCap.BUTT,
        _miterLimit: 2,

        _dashOffset: 0,
        _dashArray: {
            default: [],
            type: Number
        },

        lineWidth: {
            get: function () {
                return this._lineWidth;
            },
            set: function (value) {
                this._lineWidth = value;
                if (this.ctx) {
                    this.ctx.lineWidth = value;
                }
            }
        },

        lineJoin: {
            get: function () {
                return this._lineJoin;
            },
            set: function (value) {
                this._lineJoin = value;
                if (this.ctx) {
                    this.ctx.lineJoin = value;
                }
            },
            type: LineJoin
        },

        lineCap: {
            get: function () {
                return this._lineCap;
            },
            set: function (value) {
                this._lineCap = value;
                if (this.ctx) {
                    this.ctx.lineCap = value;
                }
            },
            type: LineCap
        },

        strokeColor: {
            get: function () {
                return this._strokeColor;
            },
            set: function (value) {
                this._strokeColor = value;
                if (value && this.ctx) {
                    this.ctx.strokeColor = value;
                }
            }
        },

        fillColor: {
            get: function () {
                return this._fillColor;
            },
            set: function (value) {
                this._fillColor = value;
                if (value && this.ctx) {
                    this.ctx.fillColor = value;
                }
            }
        },

        miterLimit: {
            get: function () {
                return this._miterLimit;
            },
            set: function (value) {
                this._miterLimit = value;
                if (this.ctx) {
                    this.ctx.miterLimit = value;
                }
            }
        },

        dashOffset: {
            get: function () {
                return this._dashOffset;
            },
            set: function (value) {
                if (this._dashOffset === value) {
                    return;
                }
                this._dashOffset = value;
                this._dirty = true;
            }
        },
        dashArray: {
            get: function () {
                return this._dashArray;
            },
            set: function (value) {
                if (!Array.isArray(value)) {
                    return;
                }
                this._dashArray = value;
                this._dirty = true;
            }
        },

        _dirty: {
            default: true,
            serializable: false,
            notify: function () {
                if (this.parent && this._dirty) {
                    this.parent._dirty = true;
                }

                if (this._commands) {
                    this._commands.points = undefined;
                }
            }
        }
    },

    applyStyle: function () {
        var ctx = this.ctx;
        ctx.lineWidth = this._lineWidth;
        ctx.lineJoin = this._lineJoin;
        ctx.lineCap = this._lineCap;

        if (this._strokeColor)
            ctx.strokeColor = this._strokeColor;
        if (this._fillColor)
            ctx.fillColor = this._fillColor;
    },

    init: function (parent) {
        if (parent) {
            this.parent = parent;
            this.ctx = parent.ctx;
        }

        this._commands = [];
        this._dirty = true;

        this.selected = false;
    },

    onLoad: function () {
        this.init();

        if (!this.ctx) {
            this.ctx = new GraphicsNode();
            this.node._sgNode.addChild(this.ctx);

            this.applyStyle();
        }
    },

    ////////////////////////////////////////////
    ellipse: function (cx, cy, rx, ry) {
        if (!ry) {
            ry = rx;
        }
        
        let cmds = this._commands;
        cmds.push(['M', cx, cy]);
        cmds.push(['m', 0, -ry]);
        cmds.push(['a', rx, ry, 0, 1, 1, 0, 2 * ry]);
        cmds.push(['a', rx, ry, 0, 1, 1, 0, -2 * ry]);
        // cmds.push(['z']);
    },

    circle: function (cx, cy, r) {
        this.ellipse(cx, cy, r);
    },

    rect: function (x, y, w, h, r) {
        let cmds = this._commands;

        if (r) {
            cmds.push(['M', x + r, y]);
            cmds.push(['l', w - r * 2, 0]);
            cmds.push(['a', r, r, 0, 0, 1, r, r]);
            cmds.push(['l', 0, h - r * 2]);
            cmds.push(['a', r, r, 0, 0, 1, -r, r]);
            cmds.push(['l', r * 2 - w, 0]);
            cmds.push(['a', r, r, 0, 0, 1, -r, -r]);
            cmds.push(['l', 0, r * 2 - h]);
            cmds.push(['a', r, r, 0, 0, 1, r, -r]);
        }
        else {
            cmds.push(['M', x, y]);
            cmds.push(['l', w, 0]);
            cmds.push(['l', 0, h]);
            cmds.push(['l', -w, 0]);
        }

        cmds.push(['z']);
    },

    close: function () {
        this._commands.push(['Z']);
    },

    points: function (points, closed) {
        if (points.length <= 1) {
            return;
        }

        this.clear();

        var lastPoint = points[0];
        this.M(lastPoint.x, lastPoint.y);

        for (var i = 1, ii = points.length; i < ii; i++) {
            var point = points[i];
            this.C(lastPoint.x, lastPoint.y, point.x, point.y, point.x, point.y);
            lastPoint = point;
        }

        if (closed) {
            this.C(lastPoint.x, lastPoint.y, points[0].x, points[0].y, points[0].x, points[0].y);
        }

        this.makePath();
    },

    makePath: function () {
        this._commands = path2curve(this._commands);
        this._dirty = true;
    },

    path: function (path) {
        this._commands = path2curve(path);
        this._dirty = true;
    },

    clear: function () {
        this._commands.length = 0;
    },

    getPathString: function () {
        var commands = this._commands;
        var string = [];

        for (var i = 0, ii = commands.length; i < ii; i++) {
            string[i] = commands[i].join(' ');
        }
        string = string.join(' ');
        return string;
    },

    getTotalLength: function () {
        if (this._commands.totalLength === undefined) {
            analysisPath(this);
        }

        return this._commands.totalLength;
    },

    getBoundingBox: function () {
        if (this._commands.boundingBox === undefined) {
            analysisPath(this);
        }

        return this._commands.boundingBox;
    },

    ////////////////////////////////////////////////////////
    smooth: function () {
        var knots = [];
        this._commands.forEach( function (cmd) {
            var c = cmd[0];

            if (c === 'M') {
                knots.push( cc.p(cmd[1], cmd[2]) );
            }
            else if(c === 'C') {
                knots.push( cc.p(cmd[5], cmd[6]) );
            }
        });

        this._commands = getCubicBezierCurvePath( knots );
        this._dirty = true;
    },

    ///////////////////
    transformCommand: function (cmd) {
        
        var t = this._worldTransform;

        var c = cmd[0];
        cmd = cmd.slice(1, cmd.length);

        if (t.a === 1 && t.d === 1 &&
            t.b === 0 && t.c === 0 &&
            t.tx === 0 && t.ty === 0) {
            return cmd;
        }

        var tempPoint = cc.v2();

        if (c === 'M' || c === 'L' || c === 'C') {
            for (var i = 0, ii = cmd.length / 2; i < ii; i++) {
                var j = i*2;
                tempPoint.x = cmd[j];
                tempPoint.y = cmd[j + 1];

                tempPoint = cc.pointApplyAffineTransform(tempPoint, t);

                cmd[j] = tempPoint.x;
                cmd[j+1] = tempPoint.y;
            }
        }

        return cmd;
    },

    drawCommands: function () {
        var commands = this._commands;
        var ctx = this.ctx;

        for (var i = 0, ii = commands.length; i < ii; i++) {
            var cmd = commands[i];
            var c = cmd[0];
            cmd = this.transformCommand(cmd);

            var func = ctx[ drawer[c] ];

            if (func) func.apply(ctx, cmd);
        }
    },

    drawHandles: function () {
        var ctx = this.ctx;
        var commands = this._commands;

        var prev;
        var size = 5;
        var half = size / 2;

        var originLineWidth = ctx.lineWidth;
        var originStrokeColor = ctx.strokeColor;
        var originFillColor   = ctx.fillColor;

        ctx.lineWidth = 1;
        ctx.strokeColor = selectedColor;
        ctx.fillColor = selectedColor;

        function drawHandle(x1, y1, x2, y2) {
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            ctx.circle(x2, y2, half);
            ctx.fill();
        }

        for (var i = 0, ii = commands.length; i < ii; i++) {
            var cmd = commands[i];
            var c = cmd[0];
            cmd = this.transformCommand(cmd);

            if (c === 'M') {
                prev = cmd;
            }
            else if(c === 'C') {
                drawHandle(prev[0], prev[1], cmd[0], cmd[1]);
                drawHandle(cmd[4], cmd[5], cmd[2], cmd[3]);
                prev = [cmd[4], cmd[5]];
            }

            if (prev)
                ctx.fillRect(prev[0]-half, prev[1]-half, size, size);
        }

        ctx.lineWidth = originLineWidth;
        ctx.strokeColor = originStrokeColor;
        ctx.fillColor   = originFillColor;
    },


    ////////////////////////////////////////////////////
    animate: function (pathString, pathString2, duration, animating) {
        var pathes = path2curve(pathString, pathString2),
            fromPath = pathes[0],
            toPath = pathes[1];

        var diff = [];
        for (var i = 0, ii = fromPath.length; i < ii; i++) {
            diff[i] = [0];
            for (var j = 1, jj = fromPath[i].length; j < jj; j++) {
                diff[i][j] = (toPath[i][j] - fromPath[i][j]) / duration;
            }
        }

        this._time = 0;
        this._duration = duration;

        this._animateDiff = diff;
        this._animating = typeof animating === 'undefined' ? true : animating;

        this._fromPath = fromPath;
        this._toPath = toPath;

        return diff;
    },

    stepAnimate: function (time) {
        var diff = this._animateDiff;
        var duration = this._duration;
        var fromPath = this._fromPath;

        var pos = time / duration;

        if (pos > 1) pos = 1;

        var now = [];
        for (var i = 0, ii = fromPath.length; i < ii; i++) {
            now[i] = [fromPath[i][0]];
            for (var j = 1, jj = fromPath[i].length; j < jj; j++) {
                now[i][j] = +fromPath[i][j] + pos * duration * diff[i][j];
            }
        }

        this._dirty = true;
        this._commands = now;

        if (pos >= 1) {
            this._animating = false;
            this._fromPath = null;
            this._toPath = null;
        }
    },

    update: function (dt) {
        if (this._animating) {
            this._time += dt;
            this.stepAnimate(this._time);
        }

        if (!this.parent) {
            this.updateTransform();
        }
        
        if ( this._commands.length === 0 || !this._dirty || (this.parent && !this.parent._dirty)) {
            return;
        }

        this.applyStyle();

        if (!this.parent) {
            this.ctx.clear();
        }

        if (this.dashArray.length > 0) {
            if (this._fillColor) {
                this.drawCommands();
                this.ctx.fill();
            }

            if (this._strokeColor) {
                this.ctx.beginPath();
                drawDashPath(this, this.ctx, this.dashArray, this.dashOffset);    
                this.ctx.stroke();
            }
        }
        else {
            this.drawCommands();

            if (this._fillColor) this.ctx.fill();
            if (this._strokeColor) this.ctx.stroke();
        }

        // var boundingBox = this.getBoundingBox();
        // this.ctx.rect(boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height);
        // this.ctx.stroke();

        if ( this.selected ) this.drawHandles();

        this._dirty = false;
    },
}));

['M', 'm', 'L', 'l', 'H', 'h', 'V', 'v', 'C', 'c', 'S', 's', 'Q', 'q', 'T', 't', 'A', 'a', 'Z','z'].forEach(function (cmd) {
    Path.prototype[cmd] = function () {
        var cmds = [cmd];
        for (var i = 0, l = arguments.length; i < l; i++) {
            cmds[i+1] = arguments[i];
        }
        this._commands.push(cmds);
    };
});
