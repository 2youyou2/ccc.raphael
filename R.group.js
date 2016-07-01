var Path = require('./R.path');

var makeTrasform = require('./R.transform');

var Group = cc.Class(makeTrasform({
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
        }
    },

    // use this for initialization
    onLoad: function () {
        this.children = [];

        if (!this.ctx) {
            this.ctx = new _ccsg.GraphicsNode();
            this.node._sgNode.addChild(this.ctx);
        }
    },

    init: function (parent) {
        if (parent) {
            this.parent = parent;
            this.ctx = parent.ctx;
        }
    },

    addPath: function () {
        var path = new Path();
        path.init(this);

        this.children.push(path);

        return path;
    },

    addGroup: function () {
        var group = new Group();
        group.init(this);

        this.children.push(group);

        return group;
    },

    // called every frame, uncomment this function to activate update callback
    update: function (dt) {
        this.updateTransform();

        if (!this._dirty) return;

        this.ctx.clear();

        var children = this.children;
        for (var i = 0, ii = children.length; i < ii; i++) {
            var child = children[i];
            child.update(dt);
        }

        this._dirty = false;
    },
}));
