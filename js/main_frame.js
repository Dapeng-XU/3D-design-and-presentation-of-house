/**
 * Created by Dapegn on 2016/8/15.
 */

/* ===========================
 *   代码阅读提示
 * ===========================
 *
 *     此脚本文件中定义的函数非常多，为了方便大家阅读，在这里写一些阅读技巧。如有疑问，及时与我讨论！
 *
 *     关键性注释——解释操作不当会导致一些难以理解的错误的注释，用“重要提醒”在代码中标出。
 *
 *     [ 操作提示 ]
 *     A.  前提是使用WebStorm打开这个脚本文件。
 *     B.  开启结构窗口。方法是：
 *             1. 在菜单栏中 'View' -> 'Tool Windows' -> 'Structure'，这样就有了结构窗口，可以定位属性和方法。（Alt+7）
 *             2. 在Structure窗口的上方工具栏中，点击'Collapse All'。所有代码折叠以后，可以清楚地看到文档的结构。
 *     C.  Ctrl+L可以方便定位到某一行代码。Ctrl+F进行搜索。
 *     D.  选择一个属性或者函数的名称以后，在右键菜单中有'Find Usages'（查找属性和方法被调用的位置），以及'Go to'菜单中的
 *     'Implementation(s)'（跳转到实现的位置）和'Declaration'（跳转到声明的位置）。用好IDE，事半功倍。
 *     E.  使用TO-DO标签（待修改的标记）。在窗口下方有'6: TO-DO'（Alt+6），可以查看当前文件中已有的TO-DO标签。定义TO-DO标签的
 *     方法也很简单，在注释中直接写就行了。
 *
 *     [ 代码风格 ]
 *     1. 为调用方便，WebGL绘制的基本组件（场景、相机、渲染器等）声明为全局变量，这些变量有且只能有一个。
 *     2. 常量统一使用大写字母声明（JS是弱类型的语言，没有限制变量不能修改的关键字）。
 *     3. 在第一次调用第三方库的地方会有说明。
 *     4. 将渲染图像的各部分独立成为函数，便于接下来编写更复杂的功能。主要模块及他们的调用关系如下：
 *          loadFloor() -> loadTeapot() -> loadWallAndWindow() -> setLight() -> render() -> initCamera()
 *                |                                                               |             |
 *          loadBasicShape() <- loadApartment() <- initGraphics()                 +---<<---pickObject()
 *                                                       |
 *                            BEGIN -> redraw() -> canvasResize()
 *        loadBasicShape()和loadTeapot()属于调试、示例，后续将删除。loadApartment()、loadWallAndWindow()、setLight()是将要
 *        写的。loadFloor()和loadWallAndWindow()应该是可以合并的，其实户型文件的加载可以看成三步走：
*          从某个URL下载文件 -> 读取并解析这个数据文件 -> 按照解析出来的数据，绘制图形（可以是OBJ模型）
*        这些步骤看似复杂，但是能够进一步简化。
*     5. 尽量减少匿名函数的使用。
*     6. 如果重绘整个场景，运算量将十分得大。应避免对整个场景的重绘。取而代之，我们可以采用仅重绘所需部件的方法。以下几乎所有
*     的重绘都将使用这一方式：按照名称来找到那个已经定义了的对象，然后从场景变量中删除这个对象，最后把新的对象添加进去。
*/

// 减去的长和宽的像素数，如果在浏览器中显示出来的结果没有问题，就不需要做修改
var DEDUCT_HEIGHT = 0;
var DEDUCT_WIDTH = 0;

// 从画户型页面接收到的比例尺
var DRAW_WALL_SCALE;
// 多少个画户型页面中的像素单位相当于1m？
var SCALE = 35;
// 现实世界中的1m应该用多少个坐标单位来表示？
var METER_TO_COORD_UNIT_SCALE = 10;
// 将画户型页面中的坐标转换成WebGL中的坐标
function convertDrawWallCoordToWebGLCoord(x) {
    "use strict";
    if (typeof DRAW_WALL_SCALE !== 'number') {
        errout('导入JSON数据失败！', true);
        return ;
    }
    if (typeof x !== 'number') {
        errout('画户型JSON数据的数据项未定义！', true);
        return ;
    }
    return (DRAW_WALL_SCALE * x / SCALE * METER_TO_COORD_UNIT_SCALE);
}

// 调试输出中最多显示记录的条数
var DEBUG_TEXT_MAX_NUMBER = 14;

// 是否开启调试模式，true开启，false关闭
// var DEBUG_ON_OFF = true;
var DEBUG_ON_OFF = false;

// 定义移动中的观察者与墙壁的最近距离，尚未使用
// var MIN_DISTANCE_BETWEEN_OBSERVER_AND_WALL = 0.5;

// 更规范的方式，定义全局变量，然后通过全局变量访问其他库中定义的函数和变量
var THREE = window.THREE;
var dat = window.dat;

// 用于调试输出，控制div标签的id="debug_text"
var debug_text_number = 0;
var debug_text_content = [];
// 参数text是调试输出的文本，在控制台日志和屏幕右下角的调试输出中会输出相同的内容
// printTrace指定是否打印调用栈
// stopRunning指定是否在打印输出结束之后终止函数的运行（抛出异常）
function errout(text, printTrace, stopRunning) {
    "use strict";
    if (!DEBUG_ON_OFF) {
        return;
    }
    window.console.log(text);
    debug_text_number++;
    // 数组方法push()和shift()分别是队列的enqueue()与dequeue()方法
    debug_text_content.push(text);
    if (debug_text_number > DEBUG_TEXT_MAX_NUMBER) {
        debug_text_content.shift();
    }
    var debug_text = document.getElementById('debug_text');
    debug_text.height = canvHeight;
    // join也是一种数组方法，用于合成为一个字符串，并插入指定的分隔符
    debug_text.innerHTML = debug_text_content.join('<br/>');
    // 打印调用栈
    if (printTrace === true) {
        try {
            if (stopRunning === true) {
                throw new Error();
            } else {
                throw new Error('一般错误：' + text);
            }
        }
        catch (e) {
            if (stopRunning === true) {
                throw new Error('严重错误：' + text + '\n' + e.stack);
            } else {
                window.console.error(e.stack);
            }
        }
    }
}

// 弧度转角度
function radians2degrees(radians) {
    "use strict";
    return (radians / Math.PI * 180);
}
// 角度转弧度
function degrees2radians(degrees) {
    "use strict";
    return (degrees / 180 * Math.PI);
}
// 一角度对应的弧度
var ONE_DEGREE_IN_RADIANS = degrees2radians(1);

// 画布的宽和高，涉及到绘制区域的大小，统一使用这两个变量。
// 这两个变量在文档加载，窗口大小改变，显示左侧面板等改变画布大小的区域等情况下，都会更新。
var canvHeight;
var canvWidth;

// 渲染使用的表面材质类型
var MATERIAL_TYPE = {
    PHONG: 0,
    LAMBERT: 1
};

// 定义房间的长、宽、高，以厘米为单位。
// 这里使用的大括号是JSON的规范。
var room = {
    N_S_length: 20,
    E_W_length: 20,
    height: 30,              // 房间的高度
    windowTop: 25,           // 窗户的底边高度
    windowBottom: 9,        // 窗户的顶边高度
    doorTop: 22,             // 门的高度
    initialX: 1,            // 初始的X坐标，用于“游览”模式的观察，（X,Z）就是观察者初始的平面坐标
    initialZ: 1             // 初始的Z坐标，用于“游览”模式的观察
};

// 菜单相关的设置项
// 默认的菜单宽度百分比
var DEFAULT_MENU_WIDTH_PERCENT = 25;
var menu = {
    ON_OFF: 0,
    widthPercent: 0            // 菜单宽度占据浏览器窗口的比例，百分数的数字部分，值域为[0, 90]
};

// 切换菜单的收敛和展开状态
function menuToggle() {
    "use strict";
    if (menu.ON_OFF) {
        menu.widthPercent = 0;
    } else {
        menu.widthPercent = DEFAULT_MENU_WIDTH_PERCENT;
    }
    canvasResize();
    menu.ON_OFF = 1 - menu.ON_OFF;
}

// 展开侧边面板
function menuON() {
    "use strict";
    if (!menu.ON_OFF) {
        menu.widthPercent = DEFAULT_MENU_WIDTH_PERCENT;
        menu.ON_OFF = 1;
        canvasResize();
    }
}

// 收敛侧边面板
function menuOFF() {
    "use strict";
    if (menu.ON_OFF) {
        menu.widthPercent = 0;
        menu.ON_OFF = 0;
        canvasResize();
    }
}

// 按下键盘上的某个键时，
document.body.onkeydown = keyDown;
function keyDown(event) {
    "use strict";
    var keycode = parseInt(event.keyCode);
    if (keycode >= 'A'.charCodeAt(0) && keycode <= 'Z'.charCodeAt(0)) {
        switch (keycode) {
            case 'C'.charCodeAt(0):
                // C：循环切换相机视角
                changeView();
                break;
            case 'M'.charCodeAt(0):
                // M：切换菜单是否显示
                menuToggle();
                break;
            case 'P'.charCodeAt(0):
                // P：控制动画播放
                playAnimation = !playAnimation;
                break;
            case 'H'.charCodeAt(0):
                // H：显示详细的帮助页
                toggleOverlayLayer('docs');
                break;
            case 'Z'.charCodeAt(0):
                // Z：缩小选定的对象
                zoomOut();
                break;
            case 'X'.charCodeAt(0):
                // X：放大选定的对象
                zoomIn();
                break;
        }
    } else {
        // 在游览模式下按方向键，效果是改变视角的位置
        // if (viewPort === VIEWPORT.TOUR) {
        switch (viewPort) {
            case VIEWPORT.SPIN:
            case VIEWPORT.TOUR:
                var showup = "";
                switch (keycode) {
                    case 37:
                        showup = '左';
                        cameraParameter.tour.rho -= cameraParameter.tour.rotationStep;
                        break;
                    case 38:
                        showup = '上';
                        viewPos.x += viewPos.step * Math.cos(cameraParameter.tour.rho);
                        viewPos.z += viewPos.step * Math.sin(cameraParameter.tour.rho);
                        break;
                    case 39:
                        showup = '右';
                        cameraParameter.tour.rho += cameraParameter.tour.rotationStep;
                        break;
                    case 40:
                        showup = '下';
                        viewPos.x -= viewPos.step * Math.cos(cameraParameter.tour.rho);
                        viewPos.z -= viewPos.step * Math.sin(cameraParameter.tour.rho);
                        break;
                }
                break;
            case VIEWPORT.TOP:
                switch (keycode) {
                    case 37:
                        showup = '左';
                        viewPos.x -= viewPos.step;
                        break;
                    case 38:
                        showup = '上';
                        viewPos.z -= viewPos.step;
                        break;
                    case 39:
                        showup = '右';
                        viewPos.x += viewPos.step;
                        break;
                    case 40:
                        showup = '下';
                        viewPos.z += viewPos.step;
                        break;
                }
                break;
        }
        if (keycode === 46) {
            // Delete: 删除选定的对象
            deleteObjectFromScene();
        } else if (keycode === 27) {
            // Escape: 是否开启鼠标选定
            toggleSelectByMouse();
        }
    }
}

// 切换相机视角
function changeView() {
    "use strict";
    var i;
    // 设置状态量
    viewPort += 1;
    viewPort %= 3;
    switch (viewPort) {
        case VIEWPORT.SPIN:
            showPopup('当前是固定旋转视角');
            break;
        case VIEWPORT.TOP:
            showPopup('当前是俯视视角');
            break;
        case VIEWPORT.TOUR:
            showPopup('当前是游览视角');
            break;
    }
    // 在菜单中显示相机设置
    loadSidePanel(menulist[2].url[viewPort]);
    // 更改侧边面板上方的被选中的项目，通过设置value属性来实现
    selector.value = 2;
    // 控制俯视图的情况下不显示天花板，更好的实现方式可能是使用遍历函数traverse()对scene的所有孩子进行遍历
    if (viewPort === VIEWPORT.TOP) {
        for (i = 0; i < scene.children.length; i++) {
            if (scene.children[i].typename === 'ceiling') {
                scene.children[i].visible = false;
            }
        }
    } else {
        for (i = 0; i < scene.children.length; i++) {
            if (scene.children[i].typename === 'ceiling') {
                scene.children[i].visible = true;
            }
        }
    }
    //menuON();
}

// 禁止缩放的对象列表
var BANNED_ZOOMING = [
    'floor',
    'ceiling',
    'wall',
    'lightsphere',
    'lighthelper',
    'background',
    'door',
    'window',
    'surfaceplane'
];
// 判断是否可以缩放
function canZoom(object3d) {
    "use strict";
    var i;
    var ret = true;
    for (i = 0; i < BANNED_ZOOMING.length; i++) {
        if (object3d.typename === BANNED_ZOOMING[i]) {
            ret = false;
        }
    }
    return ret;
}
// 放大系数
var ZOOM_IN_FACTOR = 1.0400;
// 放大选定的对象
function zoomIn() {
    "use strict";
    if (INTERSECTED && canZoom(INTERSECTED)) {
        // 如果缩放因子没有定义，需要先定义
        if (!INTERSECTED.scaleFactor) {
            INTERSECTED.scaleFactor = 1;
        }
        // 在乘以新的缩放因子以前，先清除旧的缩放因子的影响。
        INTERSECTED.scale.multiplyScalar(1 / INTERSECTED.scaleFactor);
        INTERSECTED.scaleFactor *= ZOOM_IN_FACTOR;
        INTERSECTED.scale.multiplyScalar(INTERSECTED.scaleFactor);
    }
}

// 缩小系数
var ZOOM_OUT_FACTOR = 1 / ZOOM_IN_FACTOR;
// 缩小选定的对象
function zoomOut() {
    "use strict";
    if (INTERSECTED && canZoom(INTERSECTED)) {
        // 如果缩放因子没有定义，需要先定义
        if (!INTERSECTED.scaleFactor) {
            INTERSECTED.scaleFactor = 1;
        }
        // 在乘以新的缩放因子以前，先清除旧的缩放因子的影响。
        INTERSECTED.scale.multiplyScalar(1 / INTERSECTED.scaleFactor);
        INTERSECTED.scaleFactor *= ZOOM_OUT_FACTOR;
        INTERSECTED.scale.multiplyScalar(INTERSECTED.scaleFactor);
    }
}

// 支持鼠标滚轮事件。不同浏览器对于鼠标滚轮事件的支持程度是不同的。
// http://stackoverflow.com/questions/32711895/how-to-generate-mousewheel-event-in-jquery-javascript
var canvasJQSelector = $('#canvas');
// Firefox
canvasJQSelector.bind('DOMMouseScroll', function (event) {
    "use strict";
    if (event.originalEvent.detail > 0) {
        // 向下滚动
        wheelScrollDown();
    } else {
        // 向上滚动
        wheelScrollUp();
    }
    // 阻止页面滚动
    return false;
});
// IE, Opera, Safari
canvasJQSelector.bind('mousewheel', function (event) {
    "use strict";
    if (event.originalEvent.wheelDelta < 0) {
        // 向下滚动
        wheelScrollDown();
    } else {
        // 向上滚动
        wheelScrollUp();
    }
    // 阻止页面滚动
    return false;
});

// 向上滚动
function wheelScrollUp() {
    "use strict";
    zoomIn();
}

// 向下滚动
function wheelScrollDown() {
    "use strict";
    zoomOut();
}

// getRandColor() 从给定列表中随机选取一种颜色
var colors = [
    0xFF62B0,
    0x9A03FE,
    0x62D0FF,
    0x48FB0D,
    0xDFA800,
    0xC27E3A,
    0x990099,
    0x9669FE,
    0x23819C,
    0x01F33E,
    0xB6BA18,
    0xFF800D,
    0xB96F6F,
    0x4A9586
];
function getRandColor() {
    "use strict";
    return colors[Math.floor(Math.random() * colors.length)];
}

// 视口，有'TOP'（俯视图，正投影）、'SPIN'（绕Y轴旋转，透视）和'TOUR'（游览，透视）两种模式
var VIEWPORT = {
    'TOP': 0,
    'SPIN': 1,
    'TOUR': 2
};
// 当前的视角
var viewPort = VIEWPORT.SPIN;

// 相机参数，这里嵌套使用了JSON结构。
// 所有的相机参数的初始化放在这里，不再在phics中再次指定。
// 仅在页面加载时进行一次初始化。以后，无论画布的大小发生怎样的变化，下列相机参数应当保持不变。
var cameraParameter = {
    spin: {                 // 旋转视图
        x: 8,               // 转轴的x位置
        z: 8,               // 转轴的z位置
        radius: 28,      // 旋转半径
        rho: 0,             // 旋转经过的角度数（角度偏移量），不应该修改它
        height: 23,          // 高度
        speed: 0.0084,      // 相机旋转的速度
        lookAtHeight: 12    // 画面中心点高度
    },
    top: {                  // 俯视图
        width: 200,
        step: 0.5
    },
    tour: {                 // 游览视图
        positionX: 1,       // 观察者在X轴的位置，不应该修改它
        positionZ: 1,       // 观察者在Z轴的位置，不应该修改它
        rho: 0,             // 观察者在平行于地面的水平面中朝向的角度数（角度偏移量），不应该修改它
        // 重要提醒：如果观察者视线的高度太低，在游览视图中，点选地面上的物体将不能进行拖动。
        height: 20,          // 观察者视线的高度
        step: 0.5,         // 观察者前进的步长
        rotationStep: ONE_DEGREE_IN_RADIANS * 2         // 观察者旋转的步长
    }
};
// 观察点的中心位置
var viewPos = {
    x: 0,
    z: 0,
    step: 1,                // 观察者前进的步长
}

// 显示帧速率
var lastFrameCount = 0;
var frameCount = 0;
function FPS() {
    "use strict";
    if (!DEBUG_ON_OFF) {
        return;
    }
    errout(Date.now() + ": " + (frameCount - lastFrameCount) + 'FPS');
    lastFrameCount = frameCount;
    window.setTimeout(FPS, 1000);
}

// 避免多个requestAnimationFrame()循环同时绘制图像。
/* 对整个场景进行重绘（重新建立一个绘制，scene也重新创建）时，如果不停止已有的动画循环，即不使用下面这段代码，会造成帧速率升高
 * 的问题。这是由JavaScript的内部机制决定的。
 */
var requestId;
function stop() {
    "use strict";
    if (requestId) {
        window.cancelAnimationFrame(requestId);
        requestId = undefined;
    }
}

// 当鼠标移动时，更新mouse的值，以便计算选中的对象。该二维向量的含义见onmousemove函数内部的说明。
var mouse = new THREE.Vector2();
document.getElementById('left_panel').onmousemove = function (event) {
    "use strict";
    event.preventDefault();
    /* JavaScript中，clientX、offsetX和screenX的区别：
     * clientX：光标相对于浏览器窗口可视区域的X坐标（也称为窗口坐标）
     * offsetX：光标相对于事件源元素的X坐标
     * screenX：光标相对于显示器屏幕的X坐标
     */
    /* 设置的mouse坐标被Camera.setFromCamera()调用。
     * .setFromCamera ( coords, camera )
     * coords — 2D coordinates of the mouse, in normalized device coordinates (NDC)---X and Y components should be
     *          between -1 and 1.
     * camera — camera from which the ray should originate
     * Updates the ray with a new origin and direction.
     * mouse.x和mouse.y使用的是标准化设备坐标(NDC)，需要将x轴和y轴标准化到区间[-1, 1]。其中，y轴的坐标除了标准化以外，还需要
     * 将坐标轴的方向反转。
     */
    MOUSE_ON_RIGHT_PANEL = false;
    mouse.x = ( event.offsetX / (window.innerWidth * (100 - menu.widthPercent) * 0.01) ) * 2 - 1;
    mouse.y = -( event.offsetY / window.innerHeight ) * 2 + 1;
    /* 处理相交对象的代码可以放在mousemove事件中，也可以放在pickObject()函数中以便被render()函数调用。
     * 放在render()函数中，调用的频率会更高，相应地会更加影响系统的性能。
     */
};

// 检测是否出现了鼠标的过度拖动
var objectCoordsMouseDown = new THREE.Vector3();
// 重要提醒：在已经定义了onmousedown、onmouseup事件的情况下，应避免再定义事件onclick，否则会出现难以理解的事情！
// 用于检测鼠标单击事件click
var isClickTimeOut = false;
var mouseCoordsMouseDown = {};
var mouseCoordsMouseUp = {};
var CLICK_TIME_OUT = 500;
// 理解为鼠标单击事件的最大拖动半径范围
var MAX_MOVE_RADUIS = 9;
var SQUARE_OF_MAX_MOVE_RADUIS = MAX_MOVE_RADUIS * MAX_MOVE_RADUIS;
// 禁止移动的对象列表
var BANNED_MOVING = [
    'floor',
    'ceiling',
    'wall',
    'lighthelper',
    'background',
    'door',
    'window'
];
// 判断鼠标下方的对象是否可以移动
function canMove(object3d) {
    "use strict";
    var i;
    var ret = true;
    for (i = 0; i < BANNED_MOVING.length; i++) {
        if (object3d.typename === BANNED_MOVING[i]) {
            ret = false;
        }
    }
    return ret;
}
// 鼠标按下的事件处理
document.getElementById('left_panel').onmousedown = function () {
    "use strict";
    event.preventDefault();
    var i;
    // 用于移动对象
    // 由于相交的对象已经从render()->pickObject()中选择出来，我们只需要直接利用INTERSECTED。
    // 如果有鼠标可以选择的对象
    if (INTERSECTED && canMove(INTERSECTED)) {
        // 用于选定导入的OBJ模型对象的整体，或者光源的整体
        if (INTERSECTED.parent instanceof THREE.Group) {
            SELECTED = INTERSECTED.parent;
        } else {
            SELECTED = INTERSECTED;
        }
        // 记录对象的原始位置，用于检测过度拖动
        objectCoordsMouseDown.copy(SELECTED.position);
        // 找出射线与平面的相交位置，这里的平面是所选对象的支撑面
        // 初始化supportingPlane，赋值为new THREE.Plane()是必须的
        var supportingPlane = new THREE.Plane();
        if (isSupportingFace(SELECTED)) {
            // 企图移动支撑面
            errout('企图移动支撑面', true);
            return;
            // generateMathPlane(SELECTED, supportingPlane);
        } else {
            // 企图移动对象，因此根据对象的支撑面去找到这个数学意义上的平面
            generateMathPlane(SELECTED.supportingFace, supportingPlane);
        }
        /* ray方法：
         * intersectPlane ( plane, optionalTarget = null ) Vector3
         * plane -- Plane    The Plane to intersect with.
         * optionalTarget -- Vector3    The Vector3 to store the result in, or null to create a new Vector3.
         * Intersect this Ray with a Plane, returning the intersection point or null if there is no intersection.
         */
        if (raycaster.ray.intersectPlane(supportingPlane, intersection)) {
            // errout('鼠标按下选定平面y=' + intersection.y);
            // errout('SELECTED.POSITION.Y=' + SELECTED.position.y);
            offset.copy(intersection).sub(SELECTED.position);
        }
        canv.style.cursor = 'move';
    }

    // 用于检测鼠标单击事件click
    isClickTimeOut = false;
    setTimeout(function () {
        isClickTimeOut = true;
    }, CLICK_TIME_OUT);
    mouseCoordsMouseDown.x = event.clientX;
    mouseCoordsMouseDown.y = event.clientY;
};

// 鼠标弹起的事件处理
document.getElementById('left_panel').onmouseup = function () {
    "use strict";
    event.preventDefault();
    if (SELECTED) {
        // 计算拖动前后的距离之差，防止过度拖动
        if (objectCoordsMouseDown.sub(SELECTED.position).length() > 20 * room.height) {
            scene.remove(SELECTED);
            SELECTED = null;
            showPopup('对象被过度拖动，为方便操作，系统将自动删除这个对象。');
            return;
        }
        // 拖动完成，将SELECTED置空。
        SELECTED = null;
    }
    canv.style.cursor = 'auto';
    // 用于检测鼠标单击事件click
    var isClick = false;
    mouseCoordsMouseUp.x = event.clientX;
    mouseCoordsMouseUp.y = event.clientY;
    if (!isClickTimeOut) {
        var DistanceX = mouseCoordsMouseUp.x - mouseCoordsMouseDown.x;
        var DistanceY = mouseCoordsMouseUp.y - mouseCoordsMouseDown.y;
        var squareOfDistance = DistanceX * DistanceX + DistanceY * DistanceY;
        if (squareOfDistance < SQUARE_OF_MAX_MOVE_RADUIS) {
            isClick = true;
        }
    }
    isClickTimeOut = false;
    if (isClick) {
        mouseclick();
    }
};

// 指定要更改设置的对象，对象的修改代码位于各个JSON文件中
var SELECTED_FOR_SETTING;
// 鼠标单击事件click在这里处理
function mouseclick() {
    "use strict";
    var i;
    var location;
    if (INTERSECTED) {
        if (isSupportingFace(INTERSECTED)) {
            // 可选中的对象是一个支撑面，对于支撑面，可以向支撑面上添加对象或者修改支撑面的属性
            if (SELECT_IN_MENU) {
                // 如果已经在菜单中选择了一种对象，就向支撑面上添加对象
                // INTERSECTED是支撑面，则可以向这个支撑面上添加一个已经选定的对象
                addObjectInMenu(INTERSECTED);
            } else {
                // var curPlane = new THREE.Plane();
                // generateMathPlane(INTERSECTED, curPlane);
                // var intersectionPoint = new THREE.Vector3();
                // if (raycaster.ray.intersectPlane(curPlane, intersectionPoint)) {
                //     createSurfacePlane(INTERSECTED, intersectionPoint);
                // }
                // 设置属性的过程中，实际上用到了侧边面板，因此需要先隐藏光源
                if (INTERSECTED.typename !== 'lightgroup') {
                    hideAllLightHelper();
                }
                // 如果没有从菜单中选择对象，则切换到选择项的设置页面
                SELECTED_FOR_SETTING = INTERSECTED;
                switch (INTERSECTED.typename) {
                    case 'floor':
                        loadModifyPlane('floor');
                        break;
                    case 'ceiling':
                        loadModifyPlane('ceiling');
                        break;
                    case 'wall':
                        loadModifyPlane('wall');
                        break;
                }
            }
        } else {
            // 设置属性的过程中，实际上用到了侧边面板，因此需要先隐藏光源
            if (INTERSECTED.typename !== 'lightgroup') {
                hideAllLightHelper();
            }
            // 可选中的对象不是支撑面，即INTERSECTED不是支撑面，则可以设置这个支撑面的相关属性
            SELECTED_FOR_SETTING = INTERSECTED;
            switch (INTERSECTED.typename) {
                case 'bed':
                case 'sofa':
                case 'refrigerator':
                case 'bookcase':
                case 'desk':
                    location = 'json/pagedata/obj-modify.json';
                    $.get(location, function (data, status) {
                        if (status === 'success') {
                            showPopup('选中了家具');
                        } else {
                            errout('获取JSON文件(' + location + ')失败', true);
                        }
                        parseSidePanelPageData(data);
                    });
                    selector.value = -1;
                    break;
                case 'basic':
                    location = 'json/pagedata/basicshape-modify.json';
                    $.get(location, function (data, status) {
                        if (status === 'success') {
                            showPopup('成功获取JSON文件：' + location);
                        } else {
                            errout('获取JSON文件(' + location + ')失败', true);
                        }
                        parseSidePanelPageData(data);
                    });
                    selector.value = -1;
                    break;
                case 'lightgroup':
                    // 选择的对象是光源
                    SELECTED_FOR_SETTING = INTERSECTED.children[0];
                    if (SELECTED_FOR_SETTING instanceof THREE.SpotLight) {
                        // 选定的光源类型是聚光灯
                        location = 'json/pagedata/spotlight-modify.json';
                        $.get(location, function (data, status) {
                            if (status === 'success') {
                                showPopup('选中了聚光灯');
                            } else {
                                errout('获取JSON文件(' + location + ')失败', true);
                            }
                            parseSidePanelPageData(data);
                        });
                    }
                    selector.value = -1;
                    break;
                case 'window':
                    location = 'json/pagedata/window-modify.json';
                    $.get(location, function (data, status) {
                        if (status === 'success') {
                            showPopup('选中了窗户');
                        } else {
                            errout('获取JSON文件(' + location + ')失败', true);
                        }
                        parseSidePanelPageData(data);
                    });
                    selector.value = -1;
                    break;
                case 'door':
                    location = 'json/pagedata/door-modify.json';
                    $.get(location, function (data, status) {
                        if (status === 'success') {
                            showPopup('选中了门');
                        } else {
                            errout('获取JSON文件(' + location + ')失败', true);
                        }
                        parseSidePanelPageData(data);
                    });
                    selector.value = -1;
                    break;
                case 'surfaceplane':
                    location = 'json/pagedata/surfaceplane-modify.json';
                    $.get(location, function (data, status) {
                        if (status === 'success') {
                            showPopup('选中了挂饰');
                        } else {
                            errout('获取JSON文件(' + location + ')失败', true);
                        }
                        parseSidePanelPageData(data);
                    });
                    selector.value = -1;
                    break;
                default:
                    selector.value = -1;
                    break;
            }
        }
    }
}

// 向场景中添加基本图形，仅用于测试。
// cube定义为全局变量，因为它需要自己旋转，render()需要实时修改它的朝向。
// var cube;
function loadBasicShape(floor_for_basic_shape) {
    "use strict";
    var i, j;
    // Three.js的图形绘制模式：首先创建一个几何网格，然后指定表面材料，最后使用Mesh构造出几何体，放到场景中。
    // 原点处不断自己旋转的正方体，旋转代码在后面
    // var geometry = new THREE.BoxGeometry(1, 1, 1);
    // var material = new THREE.MeshLambertMaterial({color: 0x00ff00, wireframe: true});
    // cube = new THREE.Mesh(geometry, material);
    // cube.typename = 'basic';
    // cube.supportingFace = floor_for_basic_shape;
    // scene.add(cube);

    // 沿着Z轴排列的一系列圆柱
    // CylinderGeometry(radiusTop, radiusBottom, height, radiusSegments, heightSegments, openEnded, thetaStart, thetaLength)
    var geo_cylinder = new THREE.CylinderGeometry(0.2, 0.4, 0.5, 12, 15);
    for (i = 0; i < 20; i++) {
        var mat_cylinder;
        var mat_cylinder_para = {
            color: getRandColor(),
            transparent: true,
            opacity: 0.9
        };
        if (i % 2 === 0) {
            mat_cylinder = new THREE.MeshLambertMaterial(mat_cylinder_para);
        } else {
            mat_cylinder = new THREE.MeshPhongMaterial(mat_cylinder_para);
        }
        var cylinder = new THREE.Mesh(geo_cylinder, mat_cylinder);
        cylinder.position.set(0, 0, i);
        cylinder.typename = 'basic';
        cylinder.supportingFace = floor_for_basic_shape;
        cylinder.castShadow = true;
        cylinder.receiveShadow = true;
        scene.add(cylinder);
    }
}

var AMBIENTLIGHT;
// 环境光的颜色
var ambientLightParameter = {
    gray: 0x80,
    intensity: 0.52
};
// 创建环境光
function createAmbientLight() {
    "use strict";
    var i;
    var hexColor = 256 * 256 * ambientLightParameter.gray + 256 * ambientLightParameter.gray + ambientLightParameter.gray;
    // AmbientLight( color, intensity )
    var ambientLight = new THREE.AmbientLight(hexColor, ambientLightParameter.intensity);
    scene.add(ambientLight);
    AMBIENTLIGHT = ambientLight;
}
// 设置环境光
function updateAmbientLight() {
    "use strict";
    AMBIENTLIGHT.color.r = ambientLightParameter.gray/255;
    AMBIENTLIGHT.color.g = ambientLightParameter.gray/255;
    AMBIENTLIGHT.color.b = ambientLightParameter.gray/255;
    AMBIENTLIGHT.intensity = ambientLightParameter.intensity;
}

// TODO: 增加阴影特效

var DIRECTIONALLIGHT = [];
var directionalLightParameter = {
    gray: 0x80,
    intensity: 0.8,
    height_factor: 2.1,
    DISTANCE: 100
};
// 创建方向光，方向光可以增强画面的真实感
function createDirectionalLight() {
    "use strict";
    /* 三个方向光的方向彼此成120°角，三个光源发射点构成了一个正三角形，它们的坐标分别是(0, a), (sqrt(3)/2*a, -1/2*a),
     * (-sqrt(3)/2*a, -1/2*a)。这个正三角形的几何中心是(0, 0)。
     */
    var a = directionalLightParameter.DISTANCE;
    var i;
    var light = [];
    var lightTarget = new THREE.Object3D();
    var targetPos = new THREE.Vector3(0, 0, 0);
    var lightheight = room.height * directionalLightParameter.height_factor;
    lightTarget.position.copy(targetPos);
    for (i=0;i<3;i++) {
        var hexColor = 256 * 256 * ambientLightParameter.gray + 256 * ambientLightParameter.gray + ambientLightParameter.gray;
        // DirectionalLight( hex, intensity ) —— 方向光
        light[i] = new THREE.DirectionalLight(hexColor, directionalLightParameter.intensity);
        light[i].target = lightTarget;
        switch (i) {
            case 0:
                light[i].position.set(0, lightheight, a);
                break;
            case 1:
                light[i].position.set(Math.sqrt(3)/2*a, lightheight, -1/2*a);
                break;
            case 2:
                light[i].position.set(-Math.sqrt(3)/2*a, lightheight, -1/2*a);
                break;
        }
        scene.add(light[i]);
        DIRECTIONALLIGHT[i] = light[i];
    }
}
// 更新方向光
function updataDirectionalLight() {
    "use strict";
    var a = directionalLightParameter.DISTANCE;
    var i;
    var lightheight = room.height * directionalLightParameter.height_factor;
    for (i=0;i<DIRECTIONALLIGHT.length;i++) {
        DIRECTIONALLIGHT[i].color.r = directionalLightParameter.gray/255;
        DIRECTIONALLIGHT[i].color.g = directionalLightParameter.gray/255;
        DIRECTIONALLIGHT[i].color.b = directionalLightParameter.gray/255;
        DIRECTIONALLIGHT[i].intensity = directionalLightParameter.intensity;
        switch (i) {
            case 0:
                DIRECTIONALLIGHT[i].position.set(0, lightheight, a);
                break;
            case 1:
                DIRECTIONALLIGHT[i].position.set(Math.sqrt(3)/2*a, lightheight, -1/2*a);
                break;
            case 2:
                DIRECTIONALLIGHT[i].position.set(-Math.sqrt(3)/2*a, lightheight, -1/2*a);
                break;
        }
    }
}

// 为了实现真实感渲染，本系统不提供点光源的支持，因为点光源不能够显示阴影。
var DEFAULT_SPOTLIGHT = {
    posX: 5,
    posY: 6,
    posZ: 5,
    targetPosX: 0,
    targetPosY: -1.01,
    targetPosZ: 0,
    red: 0x88,
    green: 0x88,
    blue: 0x88,
    intensity: 0.5,
    distance: 0,
    angle: Math.PI/3
};
// 创建聚光灯
function createSpotLight(position, supportingFace, directionY) {
    "use strict";
    var i;
    if (!(position instanceof THREE.Vector3) || !(supportingFace instanceof THREE.Object3D)) {
        errout('参数错误！', true);
        return;
    }
    // 聚光灯的方向，默认是向下的
    var targetPosY = DEFAULT_SPOTLIGHT.targetPosY;
    switch (typeof directionY) {
        case 'number':
            targetPosY = (directionY > 0) ? 1.01 : -1.01;
            break;
        case 'boolean':
            targetPosY = (directionY === true) ? 1.01 : -1.01;
            break;
    }
    var spotLight = new THREE.SpotLight(0, DEFAULT_SPOTLIGHT.intensity, DEFAULT_SPOTLIGHT.distance, DEFAULT_SPOTLIGHT.angle);
    spotLight.castShadow = true;
    spotLight.color.setHex(256 * 256 * DEFAULT_SPOTLIGHT.red + 256 * DEFAULT_SPOTLIGHT.green + DEFAULT_SPOTLIGHT.blue);
    var lightTarget = new THREE.Object3D();
    var targetPos = new THREE.Vector3(DEFAULT_SPOTLIGHT.targetPosX, targetPosY, DEFAULT_SPOTLIGHT.targetPosZ);
    lightTarget.position.copy(targetPos);
    spotLight.target = lightTarget;
    spotLight.targetPosition = new THREE.Vector3();
    spotLight.targetPosition.copy(targetPos);
    // var spotLightHelper = new THREE.SpotLightHelper(spotLight);
    var spotLightHelper = null;
    var lightGroup = createLightGroup(spotLight, spotLightHelper, lightTarget, supportingFace);
    scene.add(lightGroup);
    // 移动光源组的位置
    var lightPos = new THREE.Vector3(position.x, position.y, position.z);
    moveLightGroup(lightGroup, lightPos);
}
// 更新聚光灯的相关设置
function updateSpotLight() {
    "use strict";
    if (SELECTED_FOR_SETTING instanceof THREE.SpotLight && SELECTED_FOR_SETTING.parent instanceof THREE.Group) {
        SELECTED_FOR_SETTING.target.position.copy(SELECTED_FOR_SETTING.targetPosition);
    }
}

var RADIUS_OF_LIGHT_SPHERE = 0.75;
var WIDTHSEGMENTS_OF_LIGHT_SPHERE = 64;
var HEIGHTSEGMENTS_OF_LIGHT_SPHERE = 64;
var COLOR_OF_LIGHT_SPHERE = 0xFF980A;
// 创建光源组，包含光源本身、光源的辅助操作球、光源的辅助操作控件（如果有）、光照目标（如果有），附加参数是支撑平面
function createLightGroup(lightObject, lightObjectHelper, lightTarget, supportingFace) {
    "use strict";
    if (lightObject === undefined) {
        errout('参数错误！', true);
        return;
    }
    var lightGroup = new THREE.Group();
    lightGroup.typename = 'lightgroup';
    lightGroup.helperVisible = false;
    lightGroup.supportingFace = supportingFace;
    // 添加光源本身
    // lightGroup.children[0] = lightObject;
    lightGroup.add(lightObject);
    // 添加用于辅助操作的光源球体
    var sphereGeo = new THREE.SphereGeometry(RADIUS_OF_LIGHT_SPHERE, WIDTHSEGMENTS_OF_LIGHT_SPHERE, HEIGHTSEGMENTS_OF_LIGHT_SPHERE);
    var sphereMat = new THREE.MeshStandardMaterial({color: COLOR_OF_LIGHT_SPHERE});
    var sphere = new THREE.Mesh(sphereGeo, sphereMat);
    // sphere.position.copy(lightObject.position);
    sphere.castShadow = false;
    sphere.receiveShadow = false;
    sphere.visible = true;
    sphere.typename = 'lightsphere';
    sphere.supportingFace = supportingFace;
    // lightGroup.children[1] = sphere;
    lightGroup.add(sphere);
    // 添加光源辅助操作控件
    if (lightObjectHelper) {
        lightObjectHelper.typename = 'lighthelper';
    } else {
        lightObjectHelper = new THREE.Object3D();
    }
    // lightGroup.children[2] = lightObjectHelper;
    lightGroup.add(lightObjectHelper);
    // 添加光源目标
    if (lightTarget) {
        lightTarget.typename = 'lighttarget';
        // lightGroup.children[3] = lightTarget;
        lightGroup.add(lightTarget);
        lightGroup.children[0].target = lightGroup.children[3];
    } else {
        lightTarget = new THREE.Object3D();
        // lightGroup.children[3] = lightTarget;
        lightGroup.add(lightTarget);
    }
    return lightGroup;
}

// 移动光源组
// newPosition - THREE的Vector3类型
function moveLightGroup(lightGroup, newPosition, newTargetPosition) {
    "use strict";
    // errout('最终y=' + newPosition.y);
    var i;
    if (lightGroup === undefined || !(newPosition instanceof THREE.Vector3)) {
        errout('参数错误！', true);
        return;
    }
    lightGroup.position.copy(newPosition);
    if (newTargetPosition) {
        if (!(newTargetPosition instanceof THREE.Vector3)) {
            errout('参数错误！', true);
            return;
        }
        lightGroup.children[3].position.copy(newTargetPosition);
    }
    lightGroup.updateMatrixWorld();
}

// 切换光源辅助控件的显示状态
function toggleLightHelper(lightGroup, setMode) {
    "use strict";
    if (lightGroup.typename === 'lightgroup') {
        if (typeof setMode !== 'boolean') {
            setMode = !lightGroup.helperVisible;
        }
        if (lightGroup.children[1] !== undefined) {
            lightGroup.children[1].visible = setMode;
        }
        if (lightGroup.children[2] !== undefined) {
            lightGroup.children[2].visible = setMode;
        }
    }
}

// 显示全部的光源辅助控件
function showAllLightHelper() {
    "use strict";
    var i;
    for (i=0;i<scene.children.length;i++) {
        if (scene.children[i].typename === 'lightgroup') {
            toggleLightHelper(scene.children[i], true);
        }
    }
}

// 隐藏全部的光源辅助控件
function hideAllLightHelper() {
    "use strict";
    var i;
    for (i=0;i<scene.children.length;i++) {
        if (scene.children[i].typename === 'lightgroup') {
            toggleLightHelper(scene.children[i], false);
        }
    }
}

// 存储户型的墙体数据，是THREE.Vector2的数组
var apartmentWall = [];
// 户型文件的数据apartmentData
var apartmentData;
// 加载户型文件，通过使用HTML5原生支持的本地存储（localStorage）或会话存储（sessionStrorage）
function loadApartment() {
    "use strict";
    var i;
    // 从户型的数据文件中解析数据，并绘制
    apartmentData = JSON.parse(sessionStorage.walldesign);
    // 获取比例尺
    DRAW_WALL_SCALE = parseFloat(apartmentData.scale);
    // 初始化房间设置数据
    room.height = convertDrawWallCoordToWebGLCoord(apartmentData.room_h);
    room.doorTop = convertDrawWallCoordToWebGLCoord(apartmentData.door_h);
    room.windowBottom = convertDrawWallCoordToWebGLCoord(apartmentData.window_l);
    room.windowTop = convertDrawWallCoordToWebGLCoord(apartmentData.window_h);
    // 房间名字
    room.name = apartmentData.name;

    var p1 = [0, 0];
    var p2 = [0, 0];
    var v1 = new THREE.Vector2();
    var v2 = new THREE.Vector2();
    // 绘制墙壁
    for (i=0;i<apartmentData.data.length;i+=2) {
        p1 = apartmentData.data[i];
        p1.x = convertDrawWallCoordToWebGLCoord(parseFloat(p1.x));
        p1.y = convertDrawWallCoordToWebGLCoord(parseFloat(p1.y));
        apartmentWall[i] = new THREE.Vector2();
        apartmentWall[i].x = p1[0];
        apartmentWall[i].y = p1[1];
        p2 = apartmentData.data[i+1];
        p2.x = convertDrawWallCoordToWebGLCoord(parseFloat(p2.x));
        p2.y = convertDrawWallCoordToWebGLCoord(parseFloat(p2.y));
        apartmentWall[i+1] = new THREE.Vector2();
        apartmentWall[i+1].x = p2[0];
        apartmentWall[i+1].y = p2[1];
        drawSingleWall(p1, p2);
    }
    var middle = new THREE.Vector2();
    var temp = new THREE.Vector2();
    var centerPos = new THREE.Vector3();
    var index = 0;
    var doorLength = 0;
    // 绘制门
    for (i=0;i<apartmentData.door.length;i+=2) {
        p1 = apartmentData.door[i];
        p1.x = convertDrawWallCoordToWebGLCoord(parseFloat(p1.x));
        p1.y = convertDrawWallCoordToWebGLCoord(parseFloat(p1.y));
        v1.x = p1[0];
        v1.y = p1[1];
        p2 = apartmentData.door[i+1];
        p2.x = convertDrawWallCoordToWebGLCoord(parseFloat(p2.x));
        p2.y = convertDrawWallCoordToWebGLCoord(parseFloat(p2.y));
        v2.x = p2[0];
        v2.y = p2[1];
        middle.copy(v1).add(v2).multiplyScalar(0.5);
        index = findWall(middle);
        if (index === -1) {
            continue;
        }
        temp.copy(v2).sub(v1);
        doorLength = temp.length();
        centerPos.x = middle.x;
        centerPos.y = room.doorTop / 2;
        centerPos.z = middle.y;
        createSurfacePlane(scene.children[index], centerPos, true, doorLength, room.doorTop, 'door');
    }
    var windowLength = 0;
    // 绘制窗户
    for (i=0;i<apartmentData.wind.length;i+=2) {
        p1 = apartmentData.wind[i];
        p1.x = convertDrawWallCoordToWebGLCoord(parseFloat(p1.x));
        p1.y = convertDrawWallCoordToWebGLCoord(parseFloat(p1.y));
        v1.x = p1[0];
        v1.y = p1[1];
        p2 = apartmentData.wind[i+1];
        p2.x = convertDrawWallCoordToWebGLCoord(parseFloat(p2.x));
        p2.y = convertDrawWallCoordToWebGLCoord(parseFloat(p2.y));
        v2.x = p2[0];
        v2.y = p2[1];
        middle.copy(v1).add(v2).multiplyScalar(0.5);
        index = findWall(middle);
        if (index === -1) {
            continue;
        }
        temp.copy(v2).sub(v1);
        windowLength = temp.length();
        centerPos.x = middle.x;
        centerPos.y = (room.windowBottom + room.windowTop) / 2;
        centerPos.z = middle.y;
        createSurfacePlane(scene.children[index], centerPos, true, windowLength, (room.windowTop - room.windowBottom), 'window');
    }
    var initPos = new THREE.Vector2();
    // 设置相机的初始位置
    for (i=0;i<apartmentWall.length;i++) {
        initPos.add(apartmentWall[i]);
    }
    initPos.multiplyScalar(1/apartmentWall.length);
    viewPos.x = initPos.x;
    viewPos.z = initPos.y;
}
// 点和墙壁距离的最大容忍数值
var MAX_TOLERANT_DISTANCE= 0.1;
// 通过一个点来寻找这个点所在的墙壁
// 返回值：墙壁在scene.children中的索引位置，如果没有找到就返回-1。
function findWall(point) {
    "use strict";
    var i;
    if (!(point instanceof THREE.Vector2)) {
        errout('参数错误！', true);
        return ;
    }
    for (i=0;i<scene.children.length;i++) {
        if (scene.children[i].typename === 'wall') {
            var left = scene.children[i].leftPoint;
            var right = scene.children[i].rightPoint;
            if (left.x === right.x) {
                if (Math.abs(point.x - left.x)<MAX_TOLERANT_DISTANCE) {
                    // 点到墙壁的距离足够近，可以认定这个点属于这一面墙壁
                    return i;
                }
            }
            if (left.y === right.y) {
                if (Math.abs(point.y - left.y)<MAX_TOLERANT_DISTANCE) {
                    // 点到墙壁的距离足够近，可以认定这个点属于这一面墙壁
                    return i;
                }
            }
            // left.x !== right.x 且 left.y !== right.y
            var k = (right.y - left.y) / (right.x - left.x);
            var b = left.y - k * left.x;
            var dist = Math.abs(k * point.x + b - point.y) / Math.sqrt(k * k + 1); // 点到直线的距离
            if (dist < MAX_TOLERANT_DISTANCE) {
                return i;
            }
        }
    }
    // 如果遍历完成，则说明没有找到合适的点
    return -1;
}

// 地板和天花板的边界顶点组
var FLOOR_VERTICES = [
    [-500, 800],
    [800, 800],
    [800, -500],
    [-500, -500]
];

// 初始化的图形绘制
var scene = new THREE.Scene();
var camera, renderer, raycaster;
var canv = document.getElementById('canvas');
// 默认背景色
var DEFAULT_BACKGROUND_COLOR = 0x000000;
function initGraphics() {
    "use strict";
    var i;

    // toggleOverlayLayer('drawwall');
    hideOverlayLayer();
    // toggleOverlayLayer(true);
    // Three.js的三要素：场景、相机、渲染器。
    // 相机的初始化代码提到后面了
    // 初始化渲染器为使用WebGL的绑定到ID为“canvas”的元素，参数使用JSON表示。
    renderer = new THREE.WebGLRenderer({
        canvas: canv
    });

    // 重设渲染器的大小为窗口大小；否则，默认的渲染大小很小，在屏幕上显示出大的块状。
    // setSize()同时会改变画布大小
    renderer.setSize(canvWidth, canvHeight);
    // 设置画布默认的背景色
    renderer.setClearColor(DEFAULT_BACKGROUND_COLOR);
    if (window.devidevicePixelRatio) {
        renderer.setPixelRatio(window.devicePixelRatio);
    }
    renderer.sortObjects = false;

    // 此处，交换顶点次序能够得到相同的结果
    // var vertexList = [[-7, -7], [-5, 20], [16, 16], [19, 1]];
    // var vertexList = [[-8, -8], [-8, 8], [8, 8], [8, -8]];
    // var vertexList = [[-20, -20], [30, -30], [40, 30], [50, 20], [-20, 40]];
    // loadFloorAndCeiling([0, 0], vertexList, {floorFill: 'images/materials/white.jpg'});
    // loadFloorAndCeiling([0, 0], vertexList);

    // var vertexListLength = vertexList.length;
    // for (i = 0; i < vertexListLength - 1; i++) {
    //     drawSingleWall(vertexList[i], vertexList[i + 1]);
    // }
    // drawSingleWall(vertexList[vertexListLength - 1], vertexList[0]);

    // 绘制很大的天花板和地板
    loadFloorAndCeiling([0, 0], FLOOR_VERTICES, {floorFill: 'images/materials/gray50.jpg'});

    // var floor_for_basic_shape;
    // // 从已添加的对象中寻找地板元素，以便于移动用于调试的基本图形
    // for (i = 0; i < scene.children.length; i++) {
    //     if (scene.children[i].typename === 'floor') {
    //         floor_for_basic_shape = scene.children[i];
    //         break;
    //     }
    // }
    // if (!floor_for_basic_shape) {
    //     errout('error', true);
    // }

    // 加载户型数据，并进行解析和绘制
    loadApartment();

    // 添加星空背景
    starsBackground();

    // var ceiling_for_temp;
    // // 从已添加的对象中寻找地板元素，以便于移动光源（仅调试）
    // for (i = 0; i < scene.children.length; i++) {
    //     if (scene.children[i].typename === 'ceiling') {
    //         ceiling_for_temp = scene.children[i];
    //         break;
    //     }
    // }
    // var spotlight_pos = new THREE.Vector3(5, 6, 5);
    // createSpotLight(spotlight_pos, ceiling_for_temp);

    // 创建方向光和环境光
    createDirectionalLight();
    createAmbientLight();
    // 不显示所有的灯光助手
    hideAllLightHelper();

    // 显示一个坐标轴，红色X，绿色Y，蓝色Z
    var axisHelper = new THREE.AxisHelper(1000);
    scene.add(axisHelper);

    // 显示网格
    // var gridHelper = new THREE.GridHelper(10, 20);
    // var gridHelper2 = new THREE.GridHelper(10, 20);
    // gridHelper2.position.y = room.height;
    // scene.add(gridHelper);
    // scene.add(gridHelper2);
    // var gridHelper3 = new THREE.GridHelper(10, 20);
    // gridHelper3.rotateX(Math.PI / 2);
    // gridHelper3.position.z = 8;
    // scene.add(gridHelper3);
    // var gridHelper4 = new THREE.GridHelper(10, 20);
    // gridHelper4.rotateX(Math.PI / 2);
    // gridHelper4.position.z = -8;
    // scene.add(gridHelper4);
    // var gridHelper5 = new THREE.GridHelper(10, 20);
    // gridHelper5.rotateZ(Math.PI / 2);
    // gridHelper5.position.x = 8;
    // scene.add(gridHelper5);
    // var gridHelper6 = new THREE.GridHelper(10, 20);
    // gridHelper6.rotateZ(Math.PI / 2);
    // gridHelper6.position.x = -8;
    // scene.add(gridHelper6);

    // 射线，用于拾取(pick)对象
    raycaster = new THREE.Raycaster();

    render();
}

// 初始化相机
// 指定是否播放动画，默认播放
var playAnimation = true;
function updateCamera() {
    "use strict";
    switch (viewPort) {
        case VIEWPORT.TOP:
            // 俯视图相机
            // OrthographicCamera( left, right, top, bottom, near, far )
            // 上北下南左西右东
            // 为了保持照相机的横竖比例，需要保证(right - left)与(top - bottom)的比例与Canvas宽度与高度的比例一致。
            // var left = -cameraParameter.top.width * cameraParameter.top.ewEdgePercent;
            // var right = cameraParameter.top.width * (1 + cameraParameter.top.ewEdgePercent);
            // var top = cameraParameter.top.height * (1 + cameraParameter.top.nsEdgePercent);
            // var bottom = -cameraParameter.top.height * cameraParameter.top.nsEdgePercent;
            // var left = -cameraParameter.top.width * cameraParameter.top.ewEdgePercent;
            // var right = cameraParameter.top.width * (1 + cameraParameter.top.ewEdgePercent);
            // var top = cameraParameter.top.height * (1 + cameraParameter.top.nsEdgePercent);
            // var bottom = -cameraParameter.top.height * cameraParameter.top.nsEdgePercent;
            // if ((top - bottom) / (right - left) > (canv.height / canv.width)) {
            //     // 高度太大了，宽度太小了，宽度可增大
            //     var rl_distance = (top - bottom) * canv.width / canv.height;
            //     left = -(rl_distance - cameraParameter.top.width) / 2;
            //     right = cameraParameter.top.width + (rl_distance - cameraParameter.top.width) / 2;
            // } else {
            //     // 高度太小了，宽度太大了，高度可增大
            //     // 即便相等，也满足这种情况
            //     var tb_distance = (right - left) * canv.height / canv.width;
            //     bottom = -(tb_distance - cameraParameter.top.height) / 2;
            //     top = cameraParameter.top.height + (tb_distance - cameraParameter.top.height) / 2;
            // }
            var height = cameraParameter.top.width * canvHeight / canvWidth;
            var width = cameraParameter.top.width;
            var left = - width / 2;
            var right = width / 2;
            var top = height / 2;
            var bottom = - height / 2;
            camera = new THREE.OrthographicCamera(left, right, top, bottom, 0.1, 100);
            // camera.position.set(cameraParameter.top.height / 2, room.height + 0.1, cameraParameter.top.width);
            // camera.lookAt(new THREE.Vector3(cameraParameter.top.height / 2, 0, cameraParameter.top.width));
            camera.position.set(viewPos.x, room.height + 0.1, viewPos.z);
            camera.lookAt(new THREE.Vector3(viewPos.x, 0, viewPos.z));
            camera.up.set(-1, 0, 0);
            break;
        case VIEWPORT.SPIN:
            // 绕轴旋转的相机
            // PerspectiveCamera( fov, aspect, near, far )
            camera = new THREE.PerspectiveCamera(75, canvWidth / canvHeight, 0.1, 10000);
            camera.position.set(viewPos.x + cameraParameter.spin.radius * Math.cos(
                    cameraParameter.spin.rho), cameraParameter.spin.height, viewPos.z +
                cameraParameter.spin.radius * Math.sin(cameraParameter.spin.rho));
            // 根据是否播放动画来决定是否旋转相机
            if (playAnimation) {
                cameraParameter.spin.rho += cameraParameter.spin.speed;
            }
            camera.lookAt(new THREE.Vector3(viewPos.x, cameraParameter.spin.lookAtHeight, viewPos.z));
            break;
        case VIEWPORT.TOUR:
            // 游览视角的相机
            camera = new THREE.PerspectiveCamera(75, canvWidth / canvHeight, 0.1, 10000);
            camera.position.set(viewPos.x, cameraParameter.tour.height, viewPos.z);
            camera.lookAt(new THREE.Vector3(viewPos.x + Math.cos(cameraParameter.tour.rho),
                cameraParameter.tour.height, viewPos.z + Math.sin(cameraParameter.tour.rho)));
            break;
    }
    camera.aspect = canvWidth / canvHeight;
    camera.updateMatrixWorld();
}

// 表示当前鼠标拖动选定的对象。不应该初始化这个变量。
var SELECTED;
// 用于物体的拖动，这些变量必须初始化为相应的类型，不然赋值的过程中会出错。
var plane = new THREE.Plane();
var intersection = new THREE.Vector3();
var offset = new THREE.Vector3();
// INTERSECTED表示当前鼠标下方可以选定的、最靠前的对象。在pickObject()中被赋值。不应该初始化这个变量。
var INTERSECTED;
// INTERSECTED_COLOR表示INTERSECTED对象的自发光颜色。
var INTERSECTED_COLOR = 0x0000ff;   // 蓝色
// 用于拾取(pick)对象，并将结果存放到INTERSECTED。
function pickObject() {
    "use strict";
    // 用于拾取(pick)对象，拾取对象之后，给对象加一个纯蓝色的表面遮罩
    /* 可以拾取画面中的任意对象，但是，对于采用MeshBasicMaterial作为表面材质的对
     * 象，由于其material中没有emissive属性，会出现setHex()与getHex()未定义的异
     * 常。有效的解决方案是，在定义3D对象时，避免使用MeshBasicMaterial作为材质填
     * 充。emissive的含义是发射的、放射的。修改这个属性为某个颜色值，可以使这个对
     * 象自发光出那种颜色。
     */
    var i;
    var child;
    // 如果选定功能已经被toggleSelectByMouse()禁用
    if (selectByMouse === false) {
        return;
    }
    // 如果鼠标不位于左侧面板
    if (MOUSE_ON_RIGHT_PANEL) {
        return;
    }
    // 从光标坐标出发，从相机视角（图像渲染的最后阶段）建立一条射线。
    raycaster.setFromCamera(mouse, camera);
    // 用于移动物体
    // 如果已经处于拖动物件的状态，只需改变物体的位置position
    if (SELECTED) {
        // 找出射线与平面的相交位置，这里的平面是所选对象的支撑面
        // 初始化supportingPlane，赋值为new THREE.Plane()是必须的
        var supportingPlane = new THREE.Plane();
        if (isSupportingFace(SELECTED)) {
            // 企图移动支撑面
            errout('企图移动支撑面', true);
            return;
            // generateMathPlane(SELECTED, supportingPlane);
        } else {
            // 企图移动对象，因此根据对象的支撑面去找到这个数学意义上的平面
            generateMathPlane(SELECTED.supportingFace, supportingPlane);
        }
        // 已经得到了一个数学意义上的支撑平面supportingPlane，求交点intersection
        if (raycaster.ray.intersectPlane(supportingPlane, intersection)) {
            // errout('交点y=' + intersection.y);
            // 判断移动的物体是不是光源的辅助操作球
            if (SELECTED.typename === 'lightgroup') {
                errout('尝试移动操作');
                moveLightGroup(SELECTED, intersection.sub(offset));
            } else {
                SELECTED.position.copy(intersection.sub(offset));
            }
        }
        return;
    }
    // 从场景中选择相交的对象，中间省略了很多步骤，Three.js为我们做了封装。
    /* 导入的模型不能直接拾取的原因是，模型导入之后，在THREE.Mesh的外面加了一层壳THREE.Group，这在浏览器的调试窗口中下断点
     * 可以看到。如果此处使用intersectObjects(scene.children)，则不能处理这种壳。但是使用
     * intersectObjects(scene.children, true)就可以解决这个问题。其中的true是布尔变量，表示是否对scene（本质上是一个
     * THREE.Object3D类型的变量）进行深度优先遍历。
     * 普通模型直接add到scene：    scene -> Three.Mesh
     * 导入obj模型，再add到scene： scene -> Three.Group -> Three.Mesh
     * 注意，Three.Scene，Three.Group和Three.Mesh都继承自Three.Object3D。
     */
    // http://stackoverflow.com/questions/25667394/three-js-mouse-picking-object
    var intersects = raycaster.intersectObjects(scene.children, true);
    // 如果选取到的相交对象的数组不空，用firstPickedObject存放实际选取到的
    var firstPickedObject;
    if (intersects.length > 0) {
        // 如果有GridHelper等我们不需要的对象挡在前面，相当于没有这些对象，应该略过
        for (i = 0; i < intersects.length; i++) {
            /* 排除的对象的种类：
             *  (1) 坐标类：网格助手、坐标助手
             *  (2) 灯光类：灯光、灯光范围助手
             */
            if (intersects[i].object instanceof THREE.GridHelper) {
                continue;
            } else if (intersects[i].object instanceof THREE.AxisHelper) {
                continue;
            } else if (intersects[i].object instanceof THREE.DirectionalLightHelper) {
                continue;
            } else if (intersects[i].object instanceof THREE.HemisphereLightHelper) {
                continue;
            } else if (intersects[i].object instanceof THREE.PointLightHelper) {
                continue;
            } else if (intersects[i].object instanceof THREE.SpotLightHelper) {
                continue;
            } else if (intersects[i].object instanceof THREE.SpotLight) {
                continue;
            } else if (intersects[i].object instanceof THREE.LineSegments) {
                continue;
            } else if (intersects[i].object.typename === 'background'){
                continue;
            } else {
                firstPickedObject = intersects[i].object;
                break;
            }
        }
        // if (firstPickedObject === undefined) {
        //     errout('firstPickedObject未定义');
        // }
        if (firstPickedObject) {
            /* 用INTERSECTED存储了绘制上一帧时，最靠近相机的鼠标可选择的对象。如果旧的可选择的对象和这个对象相同（鼠标的移动很
             * 微小），那么不用做任何改变；否则，要更新已经选择的对象，让它发出纯蓝色的光，并将以前已经选择的对象和新的已经选择
             * 的对象更新。
             */
            if (INTERSECTED !== firstPickedObject || INTERSECTED !== firstPickedObject.parent) {
                // 如果有已经更换外表发光颜色的对象，即INTERSECTED已经不是空的，需要恢复这个对象的外表发光状态
                // 用于选定导入的OBJ模型对象或者光源对象的整体
                if (INTERSECTED instanceof THREE.Group) {
                    // 使用THREE.Group的情况目前有两种：要么是导入的OBJ模型，要么是光源
                    if (INTERSECTED.typename === 'lightgroup') {
                        child = INTERSECTED.children[1];
                        if (child.material.emissive) {
                            child.material.emissive.setHex(INTERSECTED.currentHex);
                            child.currentHex = undefined;
                        }
                    } else {
                        // 由于THREE.Group类型没有定义emissive，所以必须对它的所有孩子设置emissive
                        for (i = 0; i < INTERSECTED.children.length; i++) {
                            child = INTERSECTED.children[i];
                            if (child.material.emissive) {
                                child.material.emissive.setHex(INTERSECTED.currentHex);
                                child.currentHex = undefined;
                            }
                        }
                    }
                } else if (INTERSECTED) {
                    INTERSECTED.material.emissive.setHex(INTERSECTED.currentHex);
                    INTERSECTED.currentHex = undefined;
                }
                INTERSECTED = firstPickedObject;
                // 对于新的需要发光外表的对象，设置它的外表发光
                // 用于选定导入的OBJ模型对象的整体或者光源对象的整体
                if (INTERSECTED.parent instanceof THREE.Group) {
                    INTERSECTED = INTERSECTED.parent;
                    // 使用THREE.Group的情况目前有两种：要么是导入的OBJ模型，要么是光源
                    if (INTERSECTED.typename === 'lightgroup') {
                        child = INTERSECTED.children[1];
                        if (child.material.emissive) {
                            child.currentHex = child.material.emissive.getHex();
                            child.material.emissive.setHex(INTERSECTED_COLOR);
                        }
                    } else {
                        // 由于THREE.Group类型没有定义emissive，所以必须对它的所有孩子设置emissive
                        for (i = 0; i < INTERSECTED.children.length; i++) {
                            child = INTERSECTED.children[i];
                            if (child.material.emissive) {
                                child.currentHex = child.material.emissive.getHex();
                                child.material.emissive.setHex(INTERSECTED_COLOR);
                            }
                        }
                    }
                } else {
                    INTERSECTED.currentHex = INTERSECTED.material.emissive.getHex();
                    INTERSECTED.material.emissive.setHex(INTERSECTED_COLOR);
                }
                // if (INTERSECTED.typename) {
                //     errout('可选择的对象名字是' + INTERSECTED.typename);
                //     errout(INTERSECTED.uuid);
                // }
                /* plane的赋值和初始化。该平面以相机的
                 * camera方法：
                 * getWorldDirection(vector)        （参数vector可选）
                 * It returns a vector representing the direction in which the camera is looking, in world space.
                 * plane方法：
                 * setFromNormalAndCoplanarPoint(normal, point)
                 * 设置平面。该平面的方向向量为normal，经过点point。
                 */
                plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(plane.normal), INTERSECTED.position);
            }
            canv.style.cursor = 'pointer';
        }
    }
    if (!firstPickedObject) {
        /* 不然，选取的对象数组是空的。在这一帧内，应该没有元素处于被选中的状态。那么，之前有选中的元素，应该恢复它原来的发光色
         * 。最后，对于下一帧来说，没有被选中的元素。
         */
        deleteSelecting();
        canv.style.cursor = 'auto';
    }
}

var MOUSE_ON_RIGHT_PANEL = false;
// 如果鼠标移动到了右侧面板，取消当前已有的任何选择
document.getElementById('right_panel').onmousemove = function (event){
    "use strict";
    // mouse.x = null;
    // mouse.y = undefined;
    MOUSE_ON_RIGHT_PANEL = true;
    deleteSelecting();
};

// 删除选定
function deleteSelecting() {
    "use strict";
    if (INTERSECTED) {
        // 用于选定导入的OBJ模型对象的整体
        if (INTERSECTED instanceof THREE.Group) {
            // 由于THREE.Group类型没有定义emissive，所以必须对它的所有孩子设置emissive
            for (var i2 = 0; i2 < INTERSECTED.children.length; i2++) {
                var child2 = INTERSECTED.children[i2];
                if (child2.material.emissive) {
                    child2.material.emissive.setHex(INTERSECTED.currentHex);
                    child2.currentHex = undefined;
                }
            }
        } else {
            INTERSECTED.material.emissive.setHex(INTERSECTED.currentHex);
            INTERSECTED.currentHex = undefined;
        }
    }

    INTERSECTED = null;
}

var selectByMouse = true;
// 切换开启/关闭鼠标选定的状态
function toggleSelectByMouse(setMode) {
    "use strict";
    if (typeof setMode === 'boolean') {
        selectByMouse = !setMode;
    }
    if (selectByMouse) {
        // 现在关闭鼠标选定
        selectByMouse = false;
        deleteSelecting();
    } else {
        // 现在开启鼠标选定
        selectByMouse = true;
    }
}

function render() {
    "use strict";
    requestId = requestAnimationFrame(render);

    // 播放动画的代码应该放在下面的if语句块中，便于统一控制是否播放动画
    // if (playAnimation) {
    // }

    updateCamera();

    // 用于统计帧速率
    frameCount++;

    pickObject();

    renderer.render(scene, camera);
}

// 加载JSON文件，这个函数不应该被调用，仅作参考
var jsondata;

function loadJSON(location) {
    "use strict";
    // 重要提醒：千万不要在JSON中使用双斜线添加注释，会导致jQuery无法加载对象，并且不调用回调函数的错误！！！
    $.get(location, function (data, status) {
        if (status === 'success') {
            // showPopup('成功获取JSON文件：' + location);
        } else {
            errout('获取JSON文件(' + location + ')失败', true);
        }
        jsondata = data;
    });
}

// 菜单列表
var menulist = [
    {
        id: 'addobj',
        chsname: '添加家具',
        url: ['json/pagedata/obj-add.json']
    },
    {
        id: 'addlight',
        chsname: '添加光源',
        url: [
            'json/pagedata/light-add.json'
        ]
    },
    {
        id: 'camera',
        chsname: '相机视角',
        url: [
            'json/pagedata/camera-top.json',
            'json/pagedata/camera-spin.json',
            'json/pagedata/camera-tour.json'
        ]
    },
    {
        id: 'addsp',
        chsname: '添加挂饰',
        url: [
            'json/pagedata/surfaceplane-add.json'
        ]
    },
    {
        id: 'light',
        chsname: '设置光源',
        url: [
            'json/pagedata/light-configure.json'
        ]
    }
];
var cselect = document.getElementById('cselect');
var selector = document.createElement('select');
// 初始化侧边面板
function initSidePanel() {
    "use strict";
    // 按照menulist中定义的数据，初始化侧边面板上方的下拉选择菜单
    var i;
    var option;
    for (i = 0; i < menulist.length; i++) {
        option = document.createElement('option');
        option.setAttribute('value', i + '');
        option.setAttribute('id', menulist[i].id);
        option.innerHTML = menulist[i].chsname;
        selector.appendChild(option);
    }
    selector.onchange = function () {
        hideAllLightHelper();
        switch (menulist[this.selectedIndex].id) {
            case 'addobj':
                loadSidePanel(menulist[0].url[0]);
                break;
            case 'addlight':
                showAllLightHelper();
                loadSidePanel(menulist[1].url[0]);
                break;
            case 'camera':
                loadSidePanel(menulist[2].url[viewPort]);
                break;
            case 'addsp':
                loadSidePanel(menulist[3].url[0]);
                break;
            case 'light':
                showAllLightHelper();
                loadSidePanel(menulist[4].url[0]);
                break;
        }
    };
    cselect.appendChild(selector);
    // 向侧边面板中加载默认的数据
    loadSidePanel(menulist[0].url[0]);
    selector.value = 0;
}

// 当前加载的侧边面板的数据文件
var curSidePanelURL;
// 生成侧边面板
function loadSidePanel(location) {
    "use strict";
    // 如果当前选择的侧边面板数据已经加载了，直接退出以提升效率
    if (location === curSidePanelURL) {
        return;
    } else {
        curSidePanelURL = location;
    }
    // 重要提醒：千万不要在JSON中使用双斜线添加注释，会导致jQuery无法加载对象，并且不调用回调函数的错误！！！
    $.get(location, function (data, status) {
        if (status === 'success') {
            // showPopup('成功获取JSON文件：' + location);
        } else {
            errout('获取JSON文件(' + location + ')失败', true);
        }
        parseSidePanelPageData(data);
    });
}

// 当HTML的<body>标签完全加载之后，执行
document.body.onload = function () {
    "use strict";
    initSidePanel();
    // openLogin();
    // 第一次启动，重绘一次以初始化
    redraw();
    // 启用帧速率显示
    FPS();
};

// 阻止从选择面板中拖拽，优化UI体验
document.getElementById('right_panel').ondragstart = function () {
    "use strict";
    return false;
};

var popupText = $('#popup_text');

function canvasResize() {
    "use strict";
    /* 获取画布的宽和高
     * 用jQuery.width()、jQuery.outerWidth()、document.getElementById(div_id).width获取宽高都会出问题。
     * 但是用window.innerWidth可以取得很好的效果。
     */
    canvHeight = window.innerHeight - DEDUCT_HEIGHT;
    canvWidth = window.innerWidth * (100 - menu.widthPercent) * 0.01 - DEDUCT_WIDTH;
    $('#left_panel').width((100 - menu.widthPercent) + '%');
    $('#right_panel').width((menu.widthPercent) + '%');
    resizeOverlayLayer();
    popupText.css('margin-top', (0.70 * window.innerHeight) + 'px');
    popupText.css('left', (0.25 * window.innerWidth) + 'px');
    if (camera) {
        camera.aspect = canvWidth / canvHeight;
        camera.updateProjectionMatrix();
    }
    if (renderer) {
        renderer.setSize(canvWidth, canvHeight);
    }
}

// 每次窗口的大小发生改变时，也改变画布的大小
window.onresize = canvasResize;

// 重绘整个画布。除非必要，应避免对整个场景的重绘（调用这个函数）。
function redraw() {
    "use strict";
    canvasResize();
    var i;
    for (i=0;i<scene.children.length;i++) {
        scene.remove(scene.children[i]);
    }
    // 可能涉及到更复杂的问题
    // 避免多个requestAnimationFrame()循环同时绘制图像，造成帧速率太高（远高于60FPS）
    // 停止已有的绘制刷新循环
    stop();
    // 初始化新的图形绘制，绘制整个场景
    initGraphics();
}

// 禁止用户选择文本，优化UI体验
// 浏览器限制：仅在IE和Chrome中有效，在Firefox中无效。
document.body.onselectstart = function () {
    "use strict";
    return false;
};

// TODO: 按照角度制旋转OBJ对象
// 在菜单栏中选定的，要导入的对象
var SELECT_IN_MENU;
// 解析描述侧边面板的JSON结构数据
function parseSidePanelPageData(pagedata) {
    "use strict";
    var i;
    if ((typeof (pagedata)) !== 'object') {
        errout('json数据错误', true);
        return;
    }
    if (pagedata.filetype !== 'pagedata' || pagedata.content === undefined) {
        errout('json类型定义错误', true);
        return;
    }
    $('#ctitle').text(pagedata.content.title);
    // 检查instruction字段是否有定义
    var inst = pagedata.content.instruction;
    var cinst = $('#cinst');
    if (inst !== undefined && inst !== '') {
        cinst.text(inst);
        cinst.css('display', 'block');
    } else {
        cinst.css('display', 'none');
    }
    // 有可能在list中存在已有的数据，需要先赋值空字符串以清空列表。
    var clist = document.getElementById('clist');
    clist.innerHTML = '';
    // 构建侧边面板的清单
    var p;
    var img;
    for (i = 0; i < pagedata.content.items.length; i++) {
        var li = document.createElement('li');
        var item = pagedata.content.items[i];
        switch (item.typename) {
            case 'configuration':
                p = document.createElement('p');
                p.innerHTML = item.chsname;
                li.appendChild(p);
                if (typeof item.varible !== 'string') {
                    errout('没有指定变量名！！', true);
                    break;
                }
                var min = item.min ? item.min : 0;
                var max = item.max ? item.max : 100;
                var step = item.step ? item.step : 1;
                var precision = item.precision ? item.precision : 0;
                var numctrl;
                if (typeof item.callback === 'string') {
                    numctrl = new NumberBind(item.varible, min, max, step, precision, item.callback);
                } else {
                    numctrl = new NumberBind(item.varible, min, max, step, precision);
                }
                li.appendChild(numctrl.domElement);
                break;
            case 'button':
                p = document.createElement('p');
                p.innerHTML = item.chsname;
                p.setAttribute('onclick', item.callback);
                li.appendChild(p);
                break;
            case 'texture':
                p = document.createElement('p');
                p.innerHTML = item.chsname;
                img = document.createElement('img');
                // 给li设置的各个属性，在后面click中可以用“this.”访问到
                li.imageURL = pagedata.content.directory + item.filename;
                img.setAttribute('src', li.imageURL);
                li.appendChild(img);
                li.appendChild(p);
                break;
            case 'spotlight-upward':
            case 'spotlight-downward':
                p = document.createElement('p');
                p.innerHTML = item.chsname;
                // 给li设置的各个属性，在后面click中可以用“this.”访问到
                switch (pagedata.operation) {
                    case 'obj-add':
                        li.imageURL = pagedata.content.imgdir + item.filename + '.png';
                        break;
                    case 'surfaceplane-add':
                        li.imageURL = item.path + item.filename;
                        break;
                    default:
                        break;
                }
                li.appendChild(p);
                li.uuid = THREE.Math.generateUUID();
                li.typename = item.typename;
                li.path = item.path;
                li.filename = item.filename;
                if (item.supportingface) {
                    li.supportingface = item.supportingface;
                }
                break;
            default:
                p = document.createElement('p');
                p.innerHTML = item.chsname;
                img = document.createElement('img');
                // 给li设置的各个属性，在后面click中可以用“this.”访问到
                switch (pagedata.operation) {
                    case 'obj-add':
                        li.imageURL = pagedata.content.imgdir + item.filename + '.png';
                        break;
                    case 'surfaceplane-add':
                        li.imageURL = item.path + item.filename;
                        break;
                    default:
                        break;
                }
                img.setAttribute('src', li.imageURL);
                li.appendChild(img);
                li.appendChild(p);
                li.uuid = THREE.Math.generateUUID();
                li.typename = item.typename;
                li.path = item.path;
                li.filename = item.filename;
                if (item.supportingface) {
                    li.supportingface = item.supportingface;
                }
                break;
        }
        clist.appendChild(li);
    }
    switch (pagedata.operation) {
        case 'obj-add':
            // 对于清单中的每一项，触发点击事件click
            $('#clist').children().click(function () {
                errout(this.uuid);
                errout(this.path + ' ' + this.filename + ' ' + this.typename);
                // 首先清除SELECT_IN_MENU的已有对象
                SELECT_IN_MENU = {};
                // 向SELECT_IN_MENU中写入新的对象信息
                SELECT_IN_MENU.uuid = this.uuid;
                SELECT_IN_MENU.typename = this.typename;
                SELECT_IN_MENU.path = this.path;
                SELECT_IN_MENU.filename = this.filename;
                if (this.supportingface) {
                    SELECT_IN_MENU.supportingface = this.supportingface;
                }
                // 此时，等待用户点选下一个位置，如果点选的下一个位置是支撑面的位置，则放置家具。
            });
            break;
        case 'surfaceplane-add':
            // 对于清单中的每一项，触发点击事件click
            $('#clist').children().click(function () {
                errout(this.uuid);
                errout(this.path + ' ' + this.filename + ' ' + this.typename);
                // 首先清除SELECT_IN_MENU的已有对象
                SELECT_IN_MENU = {};
                // 向SELECT_IN_MENU中写入新的对象信息
                SELECT_IN_MENU.imageURL = this.imageURL;
                SELECT_IN_MENU.typename = this.typename;
                if (this.supportingface) {
                    SELECT_IN_MENU.supportingface = this.supportingface;
                }
                // 此时，等待用户点选下一个位置，如果点选的下一个位置是支撑面的位置，则放置家具。
            });
            break;
        case 'light-add':
            // 对于清单中的每一项，触发点击事件click
            $('#clist').children().click(function () {
                // 首先清除SELECT_IN_MENU的已有对象
                SELECT_IN_MENU = {};
                // 向SELECT_IN_MENU中写入新的对象信息
                SELECT_IN_MENU.uuid = this.uuid;
                SELECT_IN_MENU.typename = this.typename;
                SELECT_IN_MENU.supportingface = this.supportingface;
                // 此时，等待用户点选下一个位置，如果点选的下一个位置是支撑面的位置，则放置家具。
            });
            break;
        case 'window-texture':
        case 'door-texture':
            $('#clist').children().click(function () {
                SELECTED_FOR_SETTING.imageURL = this.imageURL;
                errout(SELECTED_FOR_SETTING.imageURL);
                updateSurfacePlaneByTexture();
            });
            break;
        case 'floor-texture':
        case 'wall-texture':
            $('#clist').children().click(function () {
                SELECTED_FOR_SETTING.imageURL = this.imageURL;
                errout(SELECTED_FOR_SETTING.imageURL);
                updatePlaneByTexture();
            });
            break;
    }
}

/* 根据添加的对象，把对象放到场景中
 * path: OBJ模型所在的URL路径
 * filename: OBJ模型的文件名称
 * typename: 加载模型的类型
 * 重要提醒：OBJ文件的名称必须与MTL文件的名称相同（扩展名除外）。
 */
function loadObject(path, filename, typename, location, supportingFace) {
    "use strict";
    // 从URL加载OBJ模型
    // 不能拾取加载OBJ模型的问题，在render()函数中解决。
    // 如果url和typename这两个参数中，任意一个为空
    if ((typeof path) !== 'string' || (typeof filename) !== 'string' || (typeof typename) !== 'string') {
        errout('addObjectToScene()：参数错误', true);
        return;
    }
    // 使用LoadingManager，处理载入带来的问题
    // 定义在three.js中
    var manager = new THREE.LoadingManager();
    // 载入过程中发生错误
    manager.onError = function (xhr) {
        errout('manager.onError：模型载入错误', true);
    };
    // 实时反馈载入过程
    manager.onProgress = function (xhr) {
        if (xhr.lengthComputable) {
            var percentComplete = Math.round(xhr.loaded / xhr.total * 100, 2);
            errout('模型载入中，已完成' + percentComplete + '%');
        }
    };
    // 当所有的模型载入完成时
    manager.onLoad = function (xhr) {
    };
    // 新建OBJ模型装载器
    var mtlloader = new THREE.MTLLoader(manager);
    // 智能修正路径格式
    var lastChar = path.charAt(path.length - 1);
    if (lastChar !== '/') {
        path += '/';
    }
    if (filename.charAt(0) === '/') {
        filename = filename.slice(1, filename.length);
    }
    var extension = filename.slice(filename.length - 4, filename.length);
    if (extension === '.obj' || extension === '.mtl') {
        filename = filename.slice(0, filename.length - 4);
    }
    mtlloader.setPath(path);
    mtlloader.load(filename + '.mtl', function (materials) {
        // 纹理贴图预加载
        materials.preload();
        // MTL装载器和OBJ装载器都使用同一个装载管理器manager
        var objLoader = new THREE.OBJLoader(manager);
        objLoader.setMaterials(materials);
        objLoader.setPath(path);
        objLoader.load(filename + '.obj', function (loadedMesh) {
            // 旧的OBJ装载器使用的代码
            // var chair_material = new THREE.MeshLambertMaterial({color: 0x5c3a21});
            // loadedMesh.children.forEach(function (child) {
            //     child.material = chair_material;
            //     child.geometry.computeFaceNormals();
            //     child.geometry.computeVertexNormals();
            // });
            var scale = 0.01;
            loadedMesh.scale.set(scale, scale, scale);
            if (location === undefined) {
                // 注意，这里切不可使用“var location”进行重复声明
                location = new THREE.Vector3(0, 0, 0);
            }
            loadedMesh.position.copy(location);
            loadedMesh.typename = typename;
            loadedMesh.path = path;
            loadedMesh.filename = filename;
            loadedMesh.supportingFace = supportingFace;
            loadedMesh.castShadow = true;
            scene.add(loadedMesh);
        });

    });
    // 如果已经有一个从菜单栏中选取出来的对象，需要释放
    if (SELECT_IN_MENU) {
        SELECT_IN_MENU = null;
    }
}

// 不应该被删除的对象列表
var BANNED_DELETING = [
    'floor',
    'wall',
    'ceiling',
    'lighthelper',
    'background',
    'door',
    'window'
];
// 判断鼠标下方的对象是否可以删除
function canDelete(object3d) {
    "use strict";
    var i;
    var ret = true;
    for (i = 0; i < BANNED_DELETING.length; i++) {
        if (object3d.typename === BANNED_DELETING[i]) {
            ret = false;
            break;
        }
    }
    return ret;
}
// 从场景中删除对象
function deleteObjectFromScene() {
    "use strict";
    var i;
    if (INTERSECTED) {
        if (canDelete(INTERSECTED)) {
            if (INTERSECTED.typename==='lightsphere') {
                INTERSECTED = INTERSECTED.parent;
            }
            scene.remove(INTERSECTED);
        }
    }
}

var DEFAULT_SURFACEPLANE_SIZE = {
    width: 5,
    height: 5
}
// 从菜单中添加对象
// 这个函数应该由家具列表的列表项的鼠标单击事件触发
// 必备参数：对象的类型，对象的URL位置（如果是OBJ模型）
function addObjectInMenu(supportingFace) {
    "use strict";
    var i;
    // 如果不是支撑面，不能添加
    if (!isSupportingFace(supportingFace)) {
        showPopup('您必须将家具添加到支撑平面上。');
        return;
    }
    // 如果定义了添加对象到哪一种平面，则执行判断
    if (SELECT_IN_MENU.supportingface) {
        if (supportingFace.typename !== SELECT_IN_MENU.supportingface) {
            showPopup('您不能将家具放到这种平面上。');
            return ;
        }
    }
    /* Plane( normal, constant )
     * normal -- (Vector3) normal vector defining the plane pointing towards the origin
     * constant -- (Float) the negative distance from the origin to the plane along the normal vector
     */
    var curPlane = new THREE.Plane();
    generateMathPlane(supportingFace, curPlane);
    if (raycaster && raycaster.ray) {
        var intersectionPoint = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(curPlane, intersectionPoint)) {
            // var planeNormal = new THREE.Vector3();
            // planeNormal.copy(curPlane.normal);
            // planeNormal.x = Math.floor(planeNormal.x * 10) / 10;
            // planeNormal.y = Math.floor(planeNormal.y * 10) / 10;
            // planeNormal.z = Math.floor(planeNormal.z * 10) / 10;
            // errout('选择的支撑面：（法向量' + planeNormal.x + ', ' + planeNormal.y + ', ' + planeNormal.z + '），距离：' + curPlane.constant);
            // var addpos = new THREE.Vector3();
            // addpos.copy(intersectionPoint);
            // addpos.x = Math.floor(addpos.x * 10) / 10;
            // addpos.y = Math.floor(addpos.y * 10) / 10;
            // addpos.z = Math.floor(addpos.z * 10) / 10;
            // errout('添加对象的位置：' + addpos.x + ', ' + addpos.y + ', ' + addpos.z, true);
            // var sphere_geo = new THREE.SphereGeometry(0.5, 64, 64);
            // var sphere_mat = new THREE.MeshPhongMaterial({color: 0x808020});
            // var sphere_mesh = new THREE.Mesh(sphere_geo, sphere_mat);
            // sphere_mesh.position.set(intersectionPoint.x, intersectionPoint.y, intersectionPoint.z);
            // sphere_mesh.supportingFace = supportingFace;
            // scene.add(sphere_mesh);

            // 开始添加对象
            switch (SELECT_IN_MENU.typename) {
                case 'spotlight-upward':
                    createSpotLight(intersectionPoint, supportingFace, 1);
                    break;
                case 'spotlight-downward':
                    createSpotLight(intersectionPoint, supportingFace, -1);
                    break;
                case 'surfaceplane':
                    createSurfacePlane(supportingFace, intersectionPoint, false, DEFAULT_SURFACEPLANE_SIZE.width, DEFAULT_SURFACEPLANE_SIZE.height, 'surfaceplane', SELECT_IN_MENU.imageURL);
                    break;
                default:
                    loadObject(SELECT_IN_MENU.path, SELECT_IN_MENU.filename, SELECT_IN_MENU.typename, intersectionPoint, supportingFace);
                    break;
            }

            // 对象添加完成！释放已经选择的要添加的对象SELECT_IN_MENU
            SELECT_IN_MENU = null;
        } else {
            errout('错误！找不到相交的点！', true);
        }
    } else {
        errout('错误！参数raycaster.ray未定义。', true);
    }
}

// 判断用户点选的是不是一个支撑面
function isSupportingFace(object3d) {
    "use strict";
    var ret = false;
    // 判断是不是Object3D对象，也判断是否有定义
    if (object3d instanceof THREE.Object3D) {
        // 判断是不是Mesh对象
        if (object3d instanceof THREE.Mesh) {
            // 判断是否是支撑面的合法类型，有地面、墙面和天花板三种
            if (object3d.typename === 'floor' || object3d.typename === 'wall' || object3d.typename === 'ceiling') {
                ret = true;
            }
        }
    }
    return ret;
}

// 地板的法向量
// var FLOOR_NORMAL = new THREE.Vector3(0, 1, 0);
// 考虑到平面在三维空间中旋转的方向有两种，上述描述旋转的法向量是错误的，必须采用下面的法向量
var FLOOR_NORMAL = new THREE.Vector3(0, -1, 0);
// 天花板的法向量
var CEILING_NORMAL = new THREE.Vector3(0, -1, 0);
// 地板的默认颜色
var DEFAULT_FLOOR_COLOR = 0xA2A2A2;
// 默认的地板砖重复次数
var DEFAULT_FLOOR_REPEAT = 0.0625;
// 天花板的默认颜色
var DEFAULT_CEILING_COLOR = 0xE8E8E8;
// 加载地板和天花板（外部加载纹理贴图）：成对地创建地板和天花板
/* 参数说明：
 * centerPos: 二维数组，表示中心位置
 * verticesList: 多边形的每一个顶点，顶点用二维数组表示
 * 其他选项在options中给出：
 * floorMaterial: 地板材质，使用MATERIAL_TYPE定义
 * ceilingMaterial: 天花板材质，使用MATERIAL_TYPE定义
 * floorFill: 地板填充，颜色用十六进制数值表示，填充纹理图片用string表示
 * ceilingFill：天花板填充，颜色用十六进制数值表示，填充纹理图片用string表示
 */
function loadFloorAndCeiling(centerPos, verticesList, options, drawCeiling) {
    "use strict";
    var i;
    if (!Array.isArray(verticesList)) {
        errout('pointsList不是数组', true);
        return;
    }
    if (!Array.isArray(centerPos)) {
        errout('centerPos不是数组', true);
        return;
    }
    if (typeof drawCeiling === 'undefined') {
        drawCeiling = true;
    }
    if (typeof drawCeiling !== 'boolean') {
        errout('drawCeiling不是布尔变量', true);
        return;
    }
    // 建立一个Vector2类型的路径数组
    var path = [];
    for (i = 0; i < verticesList.length; i++) {
        path.push(new THREE.Vector2(verticesList[i][0], verticesList[i][1]));
    }
    var lastVertex = verticesList[verticesList.length - 1];
    var firstVertex = verticesList[0];
    // 如果收尾不能相接，需要将首尾连接起来
    if (firstVertex[0] !== lastVertex[0] || firstVertex[1] !== lastVertex[1]) {
        path.push(new THREE.Vector2(firstVertex[0], firstVertex[1]));
    }
    // 利用路径数组创建一个新的形状，然后利用形状来创建一个新的ShapeGeometry对象。
    var shape = new THREE.Shape(path);
    var geometry = new THREE.ShapeGeometry(shape);
    // 处理可选项：表面材质和纹理填充
    var floorOptions = {
        side: THREE.DoubleSide,
        color: DEFAULT_FLOOR_COLOR
    };
    var ceilingOptions = {
        side: THREE.DoubleSide,
        color: DEFAULT_CEILING_COLOR
    };
    var floorMaterial;
    var ceilingMaterial;
    // 任何对象的材质都不要选择MeshBasicMaterial类型，不然在选取对象的过程中会遇到错误。
    if (options) {
        /* floorMaterial: 地板材质，使用MATERIAL_TYPE定义
         * ceilingMaterial: 天花板材质，使用MATERIAL_TYPE定义
         * floorFill: 地板填充纹理图片
         * ceilingFill：天花板填充纹理图片
         */
        if (typeof options.floorFill !== 'string') {
            options.floorFill = 'images/materials/white.jpg';
        }
        var texture_floor = new THREE.TextureLoader().load( options.floorFill );
        texture_floor.wrapS = THREE.RepeatWrapping;
        texture_floor.wrapT = THREE.RepeatWrapping;
        texture_floor.repeat.set( DEFAULT_FLOOR_REPEAT, DEFAULT_FLOOR_REPEAT );
        floorOptions.map = texture_floor;
        
        switch (options.floorMaterial) {
            case MATERIAL_TYPE.LAMBERT:
                floorMaterial = new THREE.MeshLambertMaterial(floorOptions);
                break;
            default:
                floorMaterial = new THREE.MeshPhongMaterial(floorOptions);
                break;
        }

        if (typeof options.ceilingFill !== 'string') {
            options.ceilingFill = 'images/materials/white.jpg';
        }
        var texture_ceiling = new THREE.TextureLoader().load( options.ceilingFill );
        texture_ceiling.wrapS = THREE.RepeatWrapping;
        texture_ceiling.wrapT = THREE.RepeatWrapping;
        texture_ceiling.repeat.set( DEFAULT_FLOOR_REPEAT, DEFAULT_FLOOR_REPEAT );
        ceilingOptions.map = texture_ceiling;
        
        switch (options.ceilingMaterial) {
            case MATERIAL_TYPE.LAMBERT:
                ceilingMaterial = new THREE.MeshLambertMaterial(ceilingOptions);
                break;
            default:
                ceilingMaterial = new THREE.MeshPhongMaterial(ceilingOptions);
                break;
        }
    } else {
        floorMaterial = new THREE.MeshPhongMaterial(floorOptions);
        ceilingMaterial = new THREE.MeshPhongMaterial(ceilingOptions);
    }
    // 构建Mesh，并标记
    var floorMesh = new THREE.Mesh(geometry, floorMaterial);
    var ceilingMesh = new THREE.Mesh(geometry, ceilingMaterial);
    floorMesh.typename = 'floor';
    ceilingMesh.typename = 'ceiling';
    // 设置地板的位置和方向
    var pos = new THREE.Vector3(centerPos[0], 0, centerPos[1]);
    floorMesh.position.copy(pos);
    // 构造地板的法向量
    var normal = new THREE.Vector3();
    normal.copy(pos).add(FLOOR_NORMAL);
    // 使用Object3D类的lookAt(v)方法指定平面的一个从position到v的一个法向量
    floorMesh.lookAt(normal);
    // 设置天花板的位置和方向
    pos.y = room.height;
    ceilingMesh.position.copy(pos);
    // 构造天花板的法向量
    normal.copy(pos).add(CEILING_NORMAL);
    ceilingMesh.lookAt(normal);
    // 接受阴影，并且添加到场景
    floorMesh.receiveShadow = true;
    ceilingMesh.receiveShadow = true;
    // 为了动态调整纹理
    floorMesh.imageURL = options.floorFill;
    floorMesh.imageRepeatX = DEFAULT_FLOOR_REPEAT;
    floorMesh.imageRepeatY = DEFAULT_FLOOR_REPEAT;
    ceilingMesh.imageURL = options.ceilingFill;
    ceilingMesh.imageRepeatX = DEFAULT_FLOOR_REPEAT;
    ceilingMesh.imageRepeatY = DEFAULT_FLOOR_REPEAT;
    floorMesh.hexColor = {};
    floorMesh.hexColor.r = Math.floor(floorMesh.material.color.r * 255);
    floorMesh.hexColor.g = Math.floor(floorMesh.material.color.g * 255);
    floorMesh.hexColor.b = Math.floor(floorMesh.material.color.b * 255);
    ceilingMesh.hexColor = {};
    ceilingMesh.hexColor.r = Math.floor(ceilingMesh.material.color.r * 255);
    ceilingMesh.hexColor.g = Math.floor(ceilingMesh.material.color.g * 255);
    ceilingMesh.hexColor.b = Math.floor(ceilingMesh.material.color.b * 255);
    scene.add(floorMesh);
    if (drawCeiling) {
        scene.add(ceilingMesh);
    }
}

// 加载设置地板颜色的面板，函数由json文件中的点击调用，在mouseclick中加载了这个json文件。
// 调用这个函数的时候，地板对象已经存放在SELECTED_FOR_SETTING中。
function loadUpdateFloorByColor() {
    "use strict";
    var location = 'json/pagedata/floor-color.json';
    $.get(location, function (data, status) {
        if (status === 'success') {
            // showPopup('成功获取JSON文件：' + location);
        } else {
            errout('获取JSON文件(' + location + ')失败', true);
        }
        parseSidePanelPageData(data);
    });
    selector.value = -1;
    updatePlaneByColor();
}
function updatePlaneByColor() {
    "use strict";
    SELECTED_FOR_SETTING.material.color.r = SELECTED_FOR_SETTING.hexColor.r / 255;
    SELECTED_FOR_SETTING.material.color.g = SELECTED_FOR_SETTING.hexColor.g / 255;
    SELECTED_FOR_SETTING.material.color.b = SELECTED_FOR_SETTING.hexColor.b / 255;
}

// 加载设置地板纹理图片的面板
function loadUpdatePlaneByTexture(typename) {
    "use strict";
    var location = 'json/pagedata/' + typename + '-texture.json';
    $.get(location, function (data, status) {
        if (status === 'success') {
            showPopup('成功更换板材');
        } else {
            errout('获取JSON文件(' + location + ')失败', true);
        }
        parseSidePanelPageData(data);
    });
    selector.value = -1;
}
function updatePlaneByTexture() {
    "use strict";
    var texture = new THREE.TextureLoader().load( SELECTED_FOR_SETTING.imageURL );
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set( SELECTED_FOR_SETTING.imageRepeatX, SELECTED_FOR_SETTING.imageRepeatY );
    SELECTED_FOR_SETTING.material.map = texture;
    // SELECTED_FOR_SETTING.material = new THREE.MeshPhongMaterial({color: DEFAULT_FLOOR_COLOR, map: texture});
    errout('刷新纹理');
    SELECTED_FOR_SETTING.updateMorphTargets();
    SELECTED_FOR_SETTING.updateMatrixWorld();
}
function loadModifyPlane(typename) {
    "use strict";
    var location = 'json/pagedata/' + typename + '-modify.json';
    $.get(location, function (data, status) {
        if (status === 'success') {
            switch(typename) {
                case 'floor':
                    showPopup('选中了地板');
                    break;
                case 'ceiling':
                    showPopup('选中了天花板');
                    break;
                case 'wall':
                    showPopup('选中了墙壁');
                    break;
            }
        } else {
            errout('获取JSON文件(' + location + ')失败', true);
        }
        parseSidePanelPageData(data);
    });
    selector.value = -1;
}

// 默认墙纸路径
var DEFAULT_WALL_IMAGE = 'images/materials/white.jpg';
// 墙壁的默认颜色
var DEFAULT_WALL_COLOR = 0xD5D5D5;
// 绘制一个单一墙壁
// 如果leftDistance等于rightDistance，或者isDoor不是布尔型变量，则不绘制孔洞
function drawSingleWall(leftWallVertex, rightWallVertex, leftDistance, rightDistance, isDoor) {
    "use strict";
    var i;
    // （1）以中点位置为原点，(-x, 0, 0)和(x, 0, 0)为两个端点绘制一个平面。
    var orientation = new THREE.Vector2();
    var leftPoint = new THREE.Vector2(leftWallVertex[0], leftWallVertex[1]);
    var rightPoint = new THREE.Vector2(rightWallVertex[0], rightWallVertex[1]);
    orientation.copy(rightPoint).sub(leftPoint);
    var length = orientation.length();
    var angle_radian = -Math.atan(orientation.y / orientation.x);
    var middlePoint = new THREE.Vector2();
    middlePoint.copy(leftPoint).add(rightPoint).multiplyScalar(0.5);
    // 有一种情况会导致孔洞无法被绘制：当形状轮廓和孔洞轮廓都是顺时针绘制的时候
    // 墙壁THREE.Shape的四个点，顺时针绘制
    // 原因不明，如果不使用moveTo和lineTo语法创建形状Shape和路径Path，会造成无法绘制孔洞hole的错误
    var shape_wall = new THREE.Shape();
    shape_wall.moveTo(-length / 2, 0);
    shape_wall.lineTo(-length / 2, room.height);
    shape_wall.lineTo(length / 2, room.height);
    shape_wall.lineTo(length / 2, 0);
    if (leftDistance !== rightDistance && (typeof isDoor === 'boolean')) {
        // 绘制孔洞，然后将这个THREE.Path孔洞放入THREE.Shape墙壁形状的属性holes数组中
        // 可能是由于算法自身的漏洞，绘制的两个孔洞如果有相连或者重叠的部分，会出现错误
        var hole = new THREE.Path();
        // 孔洞的四个点，逆时针绘制
        if (isDoor) {
            // 孔洞是门
            hole.moveTo((-length / 2 + rightDistance), 0);
            hole.lineTo((-length / 2 + rightDistance), room.doorTop);
            hole.lineTo((-length / 2 + leftDistance), room.doorTop);
            hole.lineTo((-length / 2 + leftDistance), 0);
        } else {
            // 孔洞是窗户
            hole.moveTo((-length / 2 + rightDistance), room.windowBottom);
            hole.lineTo((-length / 2 + rightDistance), room.windowTop);
            hole.lineTo((-length / 2 + leftDistance), room.windowTop);
            hole.lineTo((-length / 2 + leftDistance), room.windowBottom);
        }
        shape_wall.holes.push(hole);
    }
    // （2）设置相关属性。
    var texture_wall = new THREE.TextureLoader().load( DEFAULT_WALL_IMAGE );
    texture_wall.wrapS = THREE.RepeatWrapping;
    texture_wall.wrapT = THREE.RepeatWrapping;
    texture_wall.repeat.set( DEFAULT_FLOOR_REPEAT, DEFAULT_FLOOR_REPEAT );
    var mat_wall = new THREE.MeshPhongMaterial({color: DEFAULT_WALL_COLOR, map: texture_wall, side: THREE.DoubleSide});
    var shapeGeo_wall = new THREE.ShapeGeometry(shape_wall);
    var wall = new THREE.Mesh(shapeGeo_wall, mat_wall);
    wall.typename = 'wall';
    wall.receiveShadow = true;
    wall.leftPoint = leftPoint;
    wall.rightPoint = rightPoint;
    // 设置墙壁的一个法向量
    var alpha = Math.atan(-orientation.x / orientation.y);
    wall.normalvector = new THREE.Vector3(Math.cos(alpha), 0, Math.sin(alpha));
    // 查找一个地板来作为支撑面
    for (i = 0; i < scene.children.length; i++) {
        if (scene.children[i].typename === 'floor') {
            wall.supportingFace = scene.children[i];
            break;
        }
    }
    // 重要提醒：正确顺序是，先平移，再旋转
    // （3）平移。
    wall.translateX(middlePoint.x);
    wall.translateZ(middlePoint.y);
    // （4）按照角度旋转平面。
    wall.rotateY(angle_radian);
    // 为了动态调整纹理
    wall.imageURL = DEFAULT_WALL_IMAGE;
    wall.imageRepeatX = DEFAULT_FLOOR_REPEAT;
    wall.imageRepeatY = DEFAULT_FLOOR_REPEAT;
    wall.hexColor = {};
    wall.hexColor.r = Math.floor(wall.material.color.r * 255);
    wall.hexColor.g = Math.floor(wall.material.color.g * 255);
    wall.hexColor.b = Math.floor(wall.material.color.b * 255);
    scene.add(wall);
}

var DEFAULT_SURFACE_IMAGE = 'images/materials/green.jpg';
var DEFAULT_WINDOW_IMAGE = 'images/window/窗1.JPG';
var DEFAULT_DOOR_IMAGE = 'images/door/门2.JPG';
var DEFAULT_SURFACE_PLANE = {
    width: 3,
    height: 3,
    depth: 0.05,
    color: 0xdddddd
    // color: 0x00dd00
};
// 创建在表面上的平面
/* 参数：
 * supportingFace - 支撑面
 * intersectedPoint - 射线与支撑面的交点
 * isHole - 是否作为填充孔洞的表面平面。对于门和窗户，这个参数应该设为true；对于一般的挂饰，这个参数应该设为false
 */
function createSurfacePlane(supportingFace, intersectedPoint, isHole, width, height, typename, image) {
    "use strict";
    if (!(supportingFace instanceof THREE.Object3D) || !(intersectedPoint instanceof THREE.Vector3)) {
        errout('参数错误！', true);
        return;
    }
    if (typeof isHole !== 'boolean') {
        isHole = false;
    }
    if (typeof width !== 'number') {
        width = DEFAULT_SURFACE_PLANE.width;
    }
    if (typeof height !== 'number') {
        height = DEFAULT_SURFACE_PLANE.height;
    }
    var imgloc;
    // 如果已经定义了一个贴图文件
    if (image) {
        imgloc = image;
    } else {
        switch (typename) {
            case 'door':
                imgloc = DEFAULT_DOOR_IMAGE;
                break;
            case 'window':
                imgloc = DEFAULT_WINDOW_IMAGE;
                break;
            default:
                imgloc = DEFAULT_SURFACE_IMAGE;
                break;
        }
    }
    var texture_sp = new THREE.TextureLoader().load( imgloc );
    /* BoxGeometry(width, height, depth, widthSegments, heightSegments, depthSegments)
     * width, height, depth 分别是X轴、Y轴、Z轴方向上的长度
     */
    var geo_sp = new THREE.BoxGeometry( width, height, DEFAULT_SURFACE_PLANE.depth );
    var mat_sp = new THREE.MeshPhongMaterial( {color: DEFAULT_SURFACE_PLANE.color, map: texture_sp} );
    var sp = new THREE.Mesh( geo_sp, mat_sp );
    if (typename === null || typename === undefined) {
        sp.typename = 'surfaceplane';
    } else {
        sp.typename = typename;
    }
    sp.spwidth = width;
    sp.spheight = height;
    sp.supportingFace = supportingFace;
    var normalvector = new THREE.Vector3();
    // 支撑面的类型可能有地面、墙壁和天花板三种
    switch (supportingFace.typename) {
        case 'floor':
            sp.rotateX(Math.PI / 2);
            break;
        case 'wall':
            normalvector = supportingFace.normalvector;
            var alpha_radian = Math.atan(normalvector.x / normalvector.z);
            sp.rotateY(alpha_radian);
            break;
        case 'ceiling':
            sp.rotateX(Math.PI / 2);
            break;
    }
    if (isHole) {
        // 如果是用来作为填充孔洞的对象，即门或者窗户，直接平移到交点就可以了
        sp.position.copy(intersectedPoint);
    } else {
        // 如果不是用来作为填充孔洞的对象，那么必须精确控制移动的位置，否则会在两边都能看到这个图像
        // 处理的公式是 WO = WI + IO = WI + |IO|/|IC|*IC，O是表面平面的几何中心，I是射线ray与支撑面交点，C是相机位置，W是世
        // 界坐标的中心。
        var O = new THREE.Vector3();
        var I = new THREE.Vector3();
        var C = new THREE.Vector3();
        C.copy(camera.position);
        I.copy(intersectedPoint);
        // C在选定支撑面的投影是H，sin(alpha)=|CH|/|CI|=|OH'|/|OI|
        var curPlane = new THREE.Plane();
        generateMathPlane(supportingFace, curPlane);
        var CH_length = curPlane.distanceToPoint(C);
        var IC = new THREE.Vector3();
        IC.copy(C).sub(I);
        var CI_length = IC.length();
        var small_number = 0.01;
        var IO_length = CI_length * (DEFAULT_SURFACE_PLANE.depth / 2 + small_number) / CH_length;
        IC.multiplyScalar(Math.abs(IO_length/CI_length));
        O.copy(I).add(IC);
        sp.position.copy(O);
    }

    // 为了动态调整纹理
    sp.imageURL = imgloc;
    sp.hexColor = {};
    sp.hexColor.r = Math.floor(sp.material.color.r * 255);
    sp.hexColor.g = Math.floor(sp.material.color.g * 255);
    sp.hexColor.b = Math.floor(sp.material.color.b * 255);
    
    scene.add( sp );

    return (sp);
}
function updateSurfacePlaneByTexture() {
    "use strict";
    var texture = new THREE.TextureLoader().load( SELECTED_FOR_SETTING.imageURL );
    SELECTED_FOR_SETTING.material.map = texture;
    SELECTED_FOR_SETTING.updateMorphTargets();
    SELECTED_FOR_SETTING.updateMatrixWorld();
}
// 按照新的参数，重新创建一个表面平面
function resetSurfacePlane() {
    "use strict";
    if (SELECTED_FOR_SETTING.typename !== 'surfaceplane' && SELECTED_FOR_SETTING.typename !== 'window' && SELECTED_FOR_SETTING.typename !== 'door') {
        errout('参数错误！', true);
        errout(SELECTED_FOR_SETTING.typename);
        return;
    }
    var pos = new THREE.Vector3();
    pos.copy(SELECTED_FOR_SETTING.position);
    var width = SELECTED_FOR_SETTING.spwidth;
    var height = SELECTED_FOR_SETTING.spheight;
    var tn = SELECTED_FOR_SETTING.typename;
    var imageloc = SELECTED_FOR_SETTING.imageURL;
    var newSp = createSurfacePlane(SELECTED_FOR_SETTING.supportingFace, pos, true, width, height, tn, imageloc);
    scene.remove(SELECTED_FOR_SETTING);
    SELECTED_FOR_SETTING = newSp;
}

var STARS = {
    width: 3000,
    segments: 256
};
// 生成暗夜的星空背景
function starsBackground() {
    "use strict";
    var texture_stars = new THREE.TextureLoader().load( 'images/materials/stars.jpg' );
    var geo_stars = new THREE.BoxGeometry( STARS.width, STARS.width, STARS.width );
    // var geo_stars = new THREE.CylinderGeometry( STARS.width, STARS.width, STARS.width, STARS.segments );
    // var geo_stars = new THREE.SphereGeometry( STARS.width, STARS.segments, STARS.segments );
    var mat_stars = new THREE.MeshPhongMaterial( {color: 0xffffff, map: texture_stars, side: THREE.DoubleSide} );
    var stars = new THREE.Mesh( geo_stars, mat_stars );
    stars.typename = 'background';
    scene.add(stars);
}

// 地板的法向量
var FLOOR_NORMAL_2 = new THREE.Vector3(0, 1, 0);
// 天花板的法向量
var CEILING_NORMAL_2 = new THREE.Vector3(0, -1, 0);
// 从选定的几何平面planeGeometry（在WebGL中渲染呈现的）产生结构平面mathPlane（一种THREE.Plane的数据结构）
function generateMathPlane(planeGeometry, mathPlane) {
    "use strict";
    // 如果不是支撑面，不能产生结构平面
    if (!isSupportingFace(planeGeometry)) {
        errout('不是支撑面', true, true);
    }
    if (!(mathPlane instanceof THREE.Plane)) {
        errout('mathPlane类型错误！');
    }
    switch (planeGeometry.typename) {
        case 'floor':
            mathPlane.setFromNormalAndCoplanarPoint(FLOOR_NORMAL_2, planeGeometry.position);
            break;
        case 'wall':
            if (planeGeometry.normalvector) {
                // var planeNormal = new THREE.Vector3();
                // planeNormal.copy(planeGeometry.normalvector);
                // planeNormal.x = Math.floor(planeNormal.x * 10) / 10;
                // planeNormal.y = Math.floor(planeNormal.y * 10) / 10;
                // planeNormal.z = Math.floor(planeNormal.z * 10) / 10;
                // errout('图形平面：（法向量：' + planeNormal.x + ', ' + planeNormal.y + ', ' + planeNormal.z + '）');
                // var addpos = new THREE.Vector3();
                // addpos.copy(planeGeometry.position);
                // addpos.x = Math.floor(addpos.x * 10) / 10;
                // addpos.y = Math.floor(addpos.y * 10) / 10;
                // addpos.z = Math.floor(addpos.z * 10) / 10;
                // errout('图形平面：（位置：' + addpos.x + ', ' + addpos.y + ', ' + addpos.z);
                mathPlane.setFromNormalAndCoplanarPoint(planeGeometry.normalvector, planeGeometry.position);
            } else {
                errout('墙壁的平面法向量没有定义', true);
                return;
            }
            break;
        case 'ceiling':
            mathPlane.setFromNormalAndCoplanarPoint(CEILING_NORMAL_2, planeGeometry.position);
            // errout('y=' + planeGeometry.position.y);
            break;
    }
    // errout('supportingFace: ' + planeGeometry.typename, true);
    if (!mathPlane) {
        errout('mathPlane仍未定义', true, true);
    }
}

// 四舍五入到指定小数位数precision
function roundTo(value, precision) {
    "use strict";
    var i;
    if (typeof value !== 'number') {
        value = parseFloat(value);
    }
    for (i = 0; i < precision; i++) {
        value *= 10;
    }
    value = Math.round(value);
    for (i = 0; i < precision; i++) {
        value /= 10;
    }
    return value;
}

// 用于实现数据绑定
function NumberBind(varToBind, min, max, step, precision, callback) {
    "use strict";
    // 处理callback参数
    if (typeof callback !== 'function') {
        if (typeof callback === 'string') {
            this._callback = function (value) {
                eval(callback);
            };
        } else {
            if (typeof varToBind !== 'string') {
                errout('没有正确指定要绑定的对象名', true);
                return;
            }
            this._callback = function (value) {
            };
        }
    } else {
        this._callback = callback;
    }
    this._value = eval(varToBind);
    this._min = min || 0;
    this._max = max || 100;
    this._step = step || 0.1;
    this._precision = precision || 1;
    this.domElement = document.createElement('input');
    this.domElement.setAttribute('type', 'number');
    this.domElement.setAttribute('min', this._min);
    this.domElement.setAttribute('max', this._max);
    this.domElement.setAttribute('step', this._step);
    this.domElement.setAttribute('value', this._value);
    this.domElement.parent = this;
    this.domElement.onchange = function () {
        this.parent._value = roundTo(this.value, this.parent._precision);
        eval(varToBind + ' = this.parent._value;');
        this.parent._callback(this.parent._value);
    };
    this.domElement.onmousewheel = function () {
        this.parent._value = roundTo(this.value, this.parent._precision);
        eval(varToBind + ' = this.parent._value;');
        this.parent._callback(this.parent._value);
    };
    this.getValue = function () {
        return this._value;
    };
    this.setValue = function (newValue) {
        var retVal = roundTo(newValue, this._precision);
        this._value = retVal;
        this.domElement.value = retVal;
        this._callback(this._value);
    };
}

// 是否显示页面弹出提示
var popup;
// 在弹出提示中显示指定的文本
function showPopup(text) {
    "use strict";
    if (popup) {
        clearTimeout(popup);
    }
    popupText.html(text);
    popupText.fadeIn(200);
    popup = setTimeout(hidePopup, 2000);
}

// 隐藏弹出提示
function hidePopup() {
    "use strict";
    popupText.fadeOut(200);
    popup = null;
}

// 覆盖层类型
var OVERLAY_LAYER_TYPE = [
    {
        name: 'docs',
        width: 0.7
    },
    {
        name: 'login',
        width: 0.4
    },
    {
        name: 'drawwall',
        width: 0.8
    }
];
// 当前显示的覆盖层的名字
var curOverlayLayerType = null;

// 显示覆盖层
/* 参数说明：
 * id - DOM对象的ID，字符串
 * width - DOM对象应该占据的屏幕宽度，数值型
 */
function showOverlayLayer(id) {
    "use strict";
    if (typeof id !== 'string') {
        errout('参数错误！', true);
        return;
    }
    curOverlayLayerType = id;
    $('#' + id).css('visibility', 'visible');
    $('#background-overlay-layer').css('visibility', 'visible');
    resizeOverlayLayer();
}

var overlayLayerText = $('.overlay-layer-text');
// 调整覆盖层文本的宽度
function resizeOverlayLayer() {
    "use strict";
    var width = 0;
    var i;
    // 首先查找当前显示的覆盖层的类型
    for (i=0;i<OVERLAY_LAYER_TYPE.length;i++) {
        if (OVERLAY_LAYER_TYPE[i].name === curOverlayLayerType) {
            width = OVERLAY_LAYER_TYPE[i].width;
            break;
        }
    }
    if (width === 0) {
        return;
    }
    var oneSidePercent = (0.9 - width) / 2;
    overlayLayerText.css('left', (oneSidePercent * window.innerWidth) + 'px');
    overlayLayerText.css('padding-top', (0.025 * window.innerHeight) + 'px');
    overlayLayerText.css('padding-bottom', (0.025 * window.innerHeight) + 'px');
    overlayLayerText.css('padding-left', (0.05 * window.innerWidth) + 'px');
    overlayLayerText.css('padding-right', (0.05 * window.innerWidth) + 'px');
    overlayLayerText.css('width', (width * window.innerWidth) + 'px');
    var height = window.innerHeight * 0.95 - 120;
    overlayLayerText.css('height', (height) + 'px');
}

// 隐藏任何已经显示的覆盖层
function hideOverlayLayer() {
    "use strict";
    if (curOverlayLayerType === 'login') {
        return;
    }
    $('.overlay-layer').css('visibility', 'hidden');
    $('#background-overlay-layer').css('visibility', 'hidden');
    curOverlayLayerType = null;
}

// 切换是否显示....
// 参数 id - 要切换显示的DOM对象的ID
function toggleOverlayLayer(id) {
    "use strict";
    if (curOverlayLayerType === id) {
        hideOverlayLayer();
    } else if (curOverlayLayerType === null) {
        showOverlayLayer(id);
    }
}

$('#background-overlay-layer').click(function () {
    errout('点击了覆盖层');
});
