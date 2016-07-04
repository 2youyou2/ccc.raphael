
module.exports = {
    defineClass: function () {
        var defines = {
            properties: {},
            statics: {}
        };

        for (var i = 0, ii = arguments.length; i < ii; i++) {
            var d = arguments[i];

            cc.js.mixin(defines.properties, d.properties);
            cc.js.mixin(defines.statics, d.statics);
            cc.js.addon(defines, d);
        }

        return defines;
    }
};
