var canvas = document.getElementById("gameCanvas");
var context = canvas.getContext("2d");

var startFrameMillis = Date.now();
var endFrameMillis = Date.now();



var keyboard = new Keyboard();

var LAYER_COUNT = 2;
var LAYER_BACKGOUND = 0;
var LAYER_PLATFORMS = 1;
var LAYER_OBJECT_TRIGGERS = 3;
var MAP = { tw: 60, th: 15 };
var TILE = 35;
var TILESET_TILE = TILE * 2;
var TILESET_PADDING = 2;
var TILESET_SPACING = 2;
var TILESET_COUNT_X = 14;
var TILESET_COUNT_Y = 14;
var score = 8;

var STATE_SPLASH = 0;
var STATE_GAME = 1;
var STATE_GAMEOVER = 2;
var STATE_WINGAME = 3;
var gameState = STATE_SPLASH;

var music = new Audio("background.ogg");


var splashTimer = 3;




//music.loop = true;
//music.play();



/*var music = new music = new Howl(
{
    urls: ["background.ogg"],
    loop: true,
    buffer: true,
    volume: 0.5
});
music.play();
*/

var sfxFire;

    




// abitrary choice for 1m
var METER = TILE;
// very exaggerated gravity (6x)
var GRAVITY = METER * 9.8 * 3;
// max horizontal speed (10 tiles per second)
var MAXDX = METER * 10;
// max vertical speed (15 tiles per second)
var MAXDY = METER * 15;
// horizontal acceleration - take 1/2 second to reach maxdx
var ACCEL = MAXDX * 2;
// horizontal friction - take 1/6 second to stop from maxdx
var FRICTION = MAXDX * 6;
// (a large) instantaneous jump impulse
var JUMP = METER * 1500;

var player = new Player();





var cells = []; // the array that holds our simplified collision data
function initialize() {
    for (var layerIdx = 0; layerIdx < LAYER_COUNT; layerIdx++) { // initialize the collision map
        cells[layerIdx] = [];
        var idx = 0;
        for (var y = 0; y < level1.layers[layerIdx].height; y++) {
            cells[layerIdx][y] = [];
            for (var x = 0; x < level1.layers[layerIdx].width; x++) {
                if (level1.layers[layerIdx].data[idx] != 0) {
                    // for each tile we find in the layer data, we need to create 4 collisions
                    // (because our collision squares are 35x35 but the tile in the level are 70x70)
                    cells[layerIdx][y][x] = 1;
                    cells[layerIdx][y - 1][x] = 1;
                    cells[layerIdx][y - 1][x + 1] = 1;
                    cells[layerIdx][y][x + 1] = 1;
                }
                else if (cells[layerIdx][y][x] != 1) {
                    cells[layerIdx][y][x] = 0; // if we haven't set this cell's value, then set it to 0 now
                }
                idx++;
            }
        }
        cells[LAYER_OBJECT_TRIGGERS] = [];
        idx = 0;
        for (var y = 0; y < level1.layers[LAYER_OBJECT_TRIGGERS].height; y++) {
            cells[LAYER_OBJECT_TRIGGERS][y] = [];
            for (var x = 0; x < level1.layers[LAYER_OBJECT_TRIGGERS].width; x++) {
                if (level1.layers[LAYER_OBJECT_TRIGGERS].data[idx] != 0) {
                    cells[LAYER_OBJECT_TRIGGERS][y][x] = 1;
                    cells[LAYER_OBJECT_TRIGGERS][y - 1][x] = 1;
                    cells[LAYER_OBJECT_TRIGGERS][y - 1][x + 1] = 1;
                    cells[LAYER_OBJECT_TRIGGERS][y][x + 1] = 1;
                }
                else if (cells[LAYER_OBJECT_TRIGGERS][y][x] != 1) {
                    // if we haven't set this cell's value, then set it to 0 now
                    cells[LAYER_OBJECT_TRIGGERS][y][x] = 0;
                }
                idx++;
            }
        }
    } musicBackground = new Howl(
    {
        urls: ["background.ogg"],
        loop: true,
        buffer: true,
        volume: 0.5
    });
    musicBackground.play();
    sfxFire = new Howl(
    {
        urls: ["fireEffect.ogg"],
        buffer: true,
        volume: 1,
        onend: function () {
            isSfxPlaying = false;
        }
    });
}




var tileset = document.createElement("img");
tileset.src = "tileset.png";

// This function will return the time in seconds since the function 
// was last called
// You should only call this function once per frame
function getDeltaTime() {
    endFrameMillis = startFrameMillis;
    startFrameMillis = Date.now();

    // Find the delta time (dt) - the change in time since the last drawFrame
    // We need to modify the delta time to something we can use.
    // We want 1 to represent 1 second, so if the delta is in milliseconds
    // we divide it by 1000 (or multiply by 0.001). This will make our 
    // animations appear at the right speed, though we may need to use
    // some large values to get objects movement and rotation correct
    var deltaTime = (startFrameMillis - endFrameMillis) * 0.001;

    // validate that the delta is within range
    if (deltaTime > 1)
        deltaTime = 1;

    return deltaTime;
}

//-------------------- Don't modify anything above here

var SCREEN_WIDTH = canvas.width;
var SCREEN_HEIGHT = canvas.height;


// some variables to calculate the Frames Per Second (FPS - this tells use
// how fast our game is running, and allows us to make the game run at a 
// constant speed)
var fps = 0;
var fpsCount = 0;
var fpsTime = 0;


function tileToPixel(tile) {
    return tile * TILE;
};

function pixelToTile(pixel) {
    return Math.floor(pixel / TILE);
};

function cellAtPixelCoord(layer, x, y) {
    if (x < 0 || x > SCREEN_WIDTH || y < 0)
        return 1;
    // let the player drop of the bottom of the screen (this means death)
    if (y > SCREEN_HEIGHT)
        return 0;
    return cellAtTileCoord(layer, pixelToTile(x), pixelToTile(y));
};

function cellAtTileCoord(layer, tx, ty) {
    if (tx < 0 || tx >= MAP.tw || ty < 0)
        return 1;
    // let the player drop of the bottom of the screen (this means death)
    if (ty >= MAP.th)
        return 0;
    return cells[layer][ty][tx];
};



function bound(value, min, max) {
    if (value < min)
        return min;
    if (value > max)
        return max;
    return value;
}




var worldOffsetX = 0;
//var worldOffsetY = 0;
// load an image to draw
function drawMap() {
    

    var startX = -1;
    var maxTiles = Math.floor(SCREEN_WIDTH / TILE) + 2;
    var tileX = pixelToTile(player.position.x);
    var offsetX = TILE + Math.floor(player.position.x % TILE);

    startX = tileX - Math.floor(maxTiles / 2);

    if (startX < -1) {
        startX = 0;
        offsetX = 0;
    }
    if (startX > MAP.tw - maxTiles) {
        startX = MAP.tw - maxTiles + 1;
        offsetX = TILE;
    }
    worldOffsetX = startX * TILE + offsetX;

    for (var layerIdx = 0; layerIdx < LAYER_COUNT; layerIdx++) {
        for (var y = 0; y < level1.layers[layerIdx].height; y++) {
            var idx = y * level1.layers[layerIdx].width + startX;
            for (var x = startX; x < startX + maxTiles; x++) {
                if (level1.layers[layerIdx].data[idx] != 0) {
                    // the tiles in the Tiled map are base 1 (meaning a value of 0 means no tile),
                    // so subtract one from the tileset id to get the correct tile
                    var tileIndex = level1.layers[layerIdx].data[idx] - 1;
                    var sx = TILESET_PADDING + (tileIndex % TILESET_COUNT_X) *
                   (TILESET_TILE + TILESET_SPACING);
                    var sy = TILESET_PADDING + (Math.floor(tileIndex / TILESET_COUNT_Y)) *
                   (TILESET_TILE + TILESET_SPACING);
                    context.drawImage(tileset, sx, sy, TILESET_TILE, TILESET_TILE,
                   (x - startX) * TILE - offsetX, (y - 1) * TILE, TILESET_TILE, TILESET_TILE);
                }
                idx++;
            }
        }
    }
}

 


function runSplash(deltaTime) {
    splashTimer -= deltaTime;
    if (splashTimer <= 0) {
        gameState = STATE_GAME;
        return;
    }
    context.fillStyle = "#003";
    context.font = "24px Arial";
    context.fillText("ARE YOU READY?", 200, 240);
}

function runGame(deltaTime) {
    context.fillStyle = "#ccc";
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = "red";
    context.font = "32px Arial";
    var scoreText = "Time: " + score;
    context.fillText(scoreText, SCREEN_WIDTH - 170, 35);
    //var deltaTime = getDeltaTime();
    score = score -= deltaTime;


    player.update(deltaTime);
    drawMap();
    player.draw();
    // update the frame counter
    fpsTime += deltaTime;
    fpsCount++;
    if (fpsTime >= 1) {
        fpsTime -= 1;
        fps = fpsCount;
        fpsCount = 0;
    }
   
    DrawLevelCollisionData = 1
    // draw the FPS
    context.fillStyle = "#f00";
    context.font = "14px Arial";
    context.fillText("FPS: " + fps, 5, 20, 100);
}

function runGameOver(deltaTime) {
    context.fillStyle = "#001";
    context.font = "24px Arial";
    context.fillText("You FAILED", 200, 240);
}


function runWinGame(deltaTime) {
    context.fillStyle = "#001";
    context.font = "24px Arial";
    context.fillText("You WIN", 200, 240);
}



function run() {
    context.fillStyle = "#ccc";
    context.fillRect(0, 0, canvas.width, canvas.height);
    var deltaTime = getDeltaTime();
    switch (gameState) {
        case STATE_SPLASH:
            runSplash(deltaTime);
            break;
        case STATE_GAME:
            runGame(deltaTime);
            break;
        case STATE_GAMEOVER:
            runGameOver(deltaTime);
            break;
        case STATE_WINGAME:
            runWinGame(deltaTime);
            break;
    }
}

initialize();

//-------------------- Don't modify anything below here


// This code will set up the framework so that the 'run' function is called 60 times per second.
// We have a some options to fall back on in case the browser doesn't support our preferred method.
(function () {
    var onEachFrame;
    if (window.requestAnimationFrame) {
        onEachFrame = function (cb) {
            var _cb = function () { cb(); window.requestAnimationFrame(_cb); }
            _cb();
        };
    } else if (window.mozRequestAnimationFrame) {
        onEachFrame = function (cb) {
            var _cb = function () { cb(); window.mozRequestAnimationFrame(_cb); }
            _cb();
        };
    } else {
        onEachFrame = function (cb) {
            setInterval(cb, 1000 / 60);
        }
    }

    window.onEachFrame = onEachFrame;
})();

window.onEachFrame(run);
