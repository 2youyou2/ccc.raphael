'use strict';

var Smooth = require('./R.smooth');
var Simplify = require('./R.simplify');
var Animate = require('./R.animate');

var path2curve = require('./R.curve').path2curve;
var drawDashPath = require('./R.dash').drawDashPath;
var analysisPath = require('./R.analysis').analysisPath;

var Trasform = require('./R.transform');
var Style = require('./R.style');

var drawer = {
    M: 'moveTo',
    L: 'lineTo',
    C: 'bezierCurveTo',
    Z: 'close',
};

var selectedColor = cc.color(0,157,236);

var PathDefine = {
    extends: cc.Component,

    properties: {
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

    init: function (parent) {
        if (parent) {
            this.parent = parent;
            this.ctx = parent.ctx;
        }

        this._commands = [];
        this._dirty = true;

        this.selected = false;
        this.showBoundingBox = false;
    },

    onLoad: function () {
        this.init();

        if (!this.ctx) {
            this.ctx = new _ccsg.GraphicsNode();
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

    ///////////////////
    _transformCommand: function (cmd) {
        
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

    _drawCommands: function () {
        var commands = this._commands;
        var ctx = this.ctx;

        for (var i = 0, ii = commands.length; i < ii; i++) {
            var cmd = commands[i];
            var c = cmd[0];
            cmd = this._transformCommand(cmd);

            var func = ctx[ drawer[c] ];

            if (func) func.apply(ctx, cmd);
        }
    },

    _drawHandles: function () {
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
            cmd = this._transformCommand(cmd);

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

    update: function (dt) {
        this._updateAnimate(dt);

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
            if (this._fillColor !== 'none') {
                this._drawCommands();
                this.ctx.fill();
            }

            if (this._strokeColor !== 'none') {
                this.ctx.beginPath();
                drawDashPath(this, this.ctx, this.dashArray, this.dashOffset);    
                this.ctx.stroke();
            }
        }
        else {
            this._drawCommands();

            if (this._fillColor !== 'none') this.ctx.fill();
            if (this._strokeColor !== 'none') this.ctx.stroke();
        }

        if (this.showBoundingBox) {
            var boundingBox = this.getBoundingBox();
            this.ctx.rect(boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height);
            this.ctx.stroke();
        }

        if ( this.selected ) this._drawHandles();

        this._dirty = false;
    }
};

var Path = cc.Class(R.utils.defineClass(PathDefine, Trasform, Style, Smooth, Simplify, Animate));

['M', 'm', 'L', 'l', 'H', 'h', 'V', 'v', 'C', 'c', 'S', 's', 'Q', 'q', 'T', 't', 'A', 'a', 'Z','z'].forEach(function (cmd) {
    Path.prototype[cmd] = function () {
        var cmds = [cmd];
        for (var i = 0, l = arguments.length; i < l; i++) {
            cmds[i+1] = arguments[i];
        }
        this._commands.push(cmds);
    };
});
