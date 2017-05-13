/**
 * Created by 40637 on 2017/5/13.
 */

var QUnit = window.QUnit;





// ------------------------------------------------------
//          测试IIFE的数据公有和私有的管理功能
// ------------------------------------------------------
var IIFE_public_private = function () {  // open IIFE
    "use strict";

    // public
    var publicSet = {
        val1: 1,
        val2: 2,
        showVal1: function() {
            return this.val1;
        },
        showVal2: function() {
            return subShowVal2();
        },
        showVal3: function() {
            return subShowVal3();
        }
    };

    // private
    var val3 = 3;
    function subShowVal2() {
        return publicSet.val2;
    }
    function subShowVal3() {
        return val3;
    }

    return publicSet;
}();    // close IIFE

QUnit.test('IIFE_public_private()', function(assert) {
    "use strict";
    assert.ok(IIFE_public_private.showVal1() === 1, 'showVal1()');
    assert.ok(IIFE_public_private.showVal2() === 2, 'showVal2()');
    assert.ok(IIFE_public_private.showVal3() === 3, 'showVal3()');
    assert.ok(IIFE_public_private.subShowVal2 === undefined, 'subShowVal2()');
    assert.ok(IIFE_public_private.subShowVal3 === undefined, 'subShowVal3()');
    assert.ok(IIFE_public_private.val1 === 1, 'val1');
    assert.ok(IIFE_public_private.val2 === 2, 'val2');
    assert.ok(IIFE_public_private.val3 === undefined, 'val3');
});






