var Path = require('./R.path');

var Trasform = require('./R.transform');
var Svg = require('./R.svg');
var Style = require('./R.style');

var GroupDefine = {
    extends: cc.Component,

    properties: {
        selected: {
            default: false,
            notify: function () {
                var children = this.children;
                var selected = this.selected;

                for (var i = 0, ii = children.length; i < ii; i++) {
                    children[i].selected = selected;
                }
            }
        },

        _dirty: {
            default: true,
            serializable: false
        }
    },

    // use this for initialization
    onLoad: function () {
        this.init();

        if (!this.ctx) {
            this.ctx = new _ccsg.GraphicsNode();
            this.node._sgNode.addChild(this.ctx);
        }
    },

    init: function (parent) {
        this.children = [];

        if (parent) {
            this.parent = parent;
            this.ctx = parent.ctx;
        }
    },

    addPath: function () {
        var path = new Path();
        path.init(this);

        this.children.push(path);
        this._dirty = true;

        return path;
    },

    addGroup: function () {
        var group = new Group();
        group.init(this);

        this.children.push(group);
        this._dirty = true;

        return group;
    },

    // called every frame, uncomment this function to activate update callback
    update: function (dt) {
        this.updateTransform();

        if (!this._dirty) return;

        if (!this.parent) {
            this.ctx.clear();
        }

        var children = this.children;
        for (var i = 0, ii = children.length; i < ii; i++) {
            var child = children[i];
            child._dirty = true;
            child.update(dt);
        }

        this._dirty = false;
    },
};

var Group = cc.Class(R.utils.defineClass(GroupDefine, Trasform, Svg, Style));
