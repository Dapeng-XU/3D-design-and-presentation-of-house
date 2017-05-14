/**
 * Created by 40637 on 2017/5/13.
 */

var QUnit = window.QUnit;
QUnit.config.noGlobals =  true;




// ------------------------------------------------------
//          测试IIFE的数据公有和私有的管理功能
// ------------------------------------------------------
var IIFE_public_private = function () {  // open IIFE
    "use strict";

    // public
    var publicSet = {
        val1: 1,
        val2: 2,
        // showVal1() 公有函数访问公有变量（必须加this）
        showVal1: function() {
            return this.val1;
        },
        // showVal2() 公有函数调用私有函数，私有函数访问公有变量
        showVal2: function() {
            return subShowVal2();
        },
        // showVal3() 公有函数调用私有函数，私有函数访问私有变量
        showVal3: function() {
            return subShowVal3();
        },
        // showVal4() 公有函数访问私有变量
        showVal4: function() {
            return val4;
        },
        // showVal5() 公有函数加this访问私有变量（错误情况，正确的方法在showVal4()中演示）
        showVal5: function() {
            return this.val5;
        },
        // showVal6() 公有函数访问私有变量，私有变量通过setVal6()初始化
        showVal6: function() {
            return val6;
        }
    };

    // private
    var val3 = 3;
    var val4 = 4;
    var val5 = 5;
    var val6;
    function subShowVal2() {
        return publicSet.val2;
    }
    function subShowVal3() {
        return val3;
    }
    (function setVal6(){
        val6 = 6;
    })();

    return publicSet;
}();    // close IIFE

QUnit.test('IIFE_public_private', function(assert) {
    "use strict";
    assert.equal(IIFE_public_private.showVal1() , 1, 'showVal1()');
    assert.equal(IIFE_public_private.showVal2() , 2, 'showVal2()');
    assert.equal(IIFE_public_private.showVal3() , 3, 'showVal3()');
    assert.equal(IIFE_public_private.subShowVal2 , undefined, 'subShowVal2()');
    assert.equal(IIFE_public_private.subShowVal3 , undefined, 'subShowVal3()');
    assert.equal(IIFE_public_private.val1 , 1, 'val1');
    assert.equal(IIFE_public_private.val2 , 2, 'val2');
    assert.equal(IIFE_public_private.val3 , undefined, 'val3');
    assert.equal(IIFE_public_private.showVal4() , 4, 'showVal4()');
    assert.equal(IIFE_public_private.showVal5() , undefined, 'showVal5()');
    assert.equal(IIFE_public_private.showVal6() , 6, 'showVal6()');
});






// ------------------------------------------------------
//               测试CPU的浮点乘法运算速度
// ------------------------------------------------------
var multiplySpeed = function () {
    "use strict";

    var LENGTH = 10000;
    var LEAST_FPS = 50;

    var list = [];

    var publicSet = {
        test: function () {
            var beginTimer = new Date();
            var t = 1;
            for (var i = 0; i < LENGTH; i++) {
                t *= list[i];
            }
            var endTimer = new Date();
            var intervalInMilliseconds = endTimer.getTime() - beginTimer.getTime();
            window.console.log(LENGTH + ' times multiplications cost ' + intervalInMilliseconds + 'ms.');
            return 1000 / LEAST_FPS > intervalInMilliseconds;
        }
    };

    (function initialize() {
        list = [];
        for (var i = 0; i < LENGTH; i++) {
            list.push( Math.pow(10, Math.random() * 2 - 1) );
        }
    }());

    return publicSet;
}();

QUnit.test('Collision detection speed test.', function(assert) {
    "use strict";
    assert.ok(multiplySpeed.test(), 'Passed. ');
});






