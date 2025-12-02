// 中央角色與下方多狀態精靈動畫範例
// 中央：使用 '角色/全部.png'（原有）
// 下方：顯示 idle/walk/run/attack 四種狀態，按鍵控制

let spriteImg; // 中央的舊精靈（如果有）
const SRC_W = 61; // 若有，保留原來的 source 設定
const SRC_H = 78;
let FRAMES = 0;
const DISPLAY_W = 56;
const DISPLAY_H = 78;
let frameIndex = 0;
let lastFrameTime = 0;
const FRAME_DURATION = 60;

// 下方多狀態精靈
let idleImg, walkImg, runImg, attackImg;
const anims = {
  idle: { img: null, frames: 2, srcW: 0, srcH: 0, dispW: 0, dispH: 0 },
  walk: { img: null, frames: 4, srcW: 0, srcH: 0, dispW: 0, dispH: 0 },
  run:  { img: null, frames: 4, srcW: 0, srcH: 0, dispW: 0, dispH: 0 },
  attack: { img: null, frames: 3, srcW: 0, srcH: 0, dispW: 0, dispH: 0 }
};

let currentAnimKey = 'idle';
let prevAnimKey = 'idle';
let isAttack = false;
let bottomFrameIndex = 0;
let bottomLastFrameTime = 0;
const BOTTOM_FRAME_DURATION = 100; // 可調整播放速度

// 下方角色位置與方向
let bottomX = 0; // 初始位置（會在 setup 中設定為 width / 2）
let bottomY = 0;
let direction = 1; // 1 = 右, -1 = 左
const MOVE_SPEED = 3; // 走路速度（像素/幀，可調整）
const RUN_SPEED = 6;  // 跑步速度（像素/幀，可調整）

// 問題1 精靈（單張圖片，固定尺寸）
let problem1Img = null;
const PROBLEM1_W = 40;
const PROBLEM1_H = 91;

// 問題1答對精靈（3張圖片，298x52）
let problem1CorrectImg = null;
const PROBLEM1_CORRECT_W = 298;
const PROBLEM1_CORRECT_H = 52;
let problem1CorrectFrameIndex = 0;
let problem1CorrectLastFrameTime = 0;
const PROBLEM1_CORRECT_FRAME_DURATION = 150;
let isProblem1Answered = false; // 記錄問題1是否已答對

// 題目系統
const QUESTIONS = [
  { text: "地錯貝爾的母親叫甚麼名字?", answer: "梅特利亞", hint: "梅00亞" },
  { text: "地錯貝爾的魔法叫做麼?", answer: "火焰閃電", hint: "火0閃0" }
];
let currentQuestion = null;
let userInput = "";
let questionActive = false;
let questionStartTime = 0;

// 碰撞檢測相關
let lastCollisionCheck = 0;
const COLLISION_CHECK_INTERVAL = 100; // 每100ms檢查一次
const COLLISION_DISTANCE = 80; // 碰撞偵測範圍

function preload() {
  // 中央精靈（如果你的專案需要保留）
  spriteImg = loadImage('角色/全部.png');

  // 下方四種狀態的精靈表
  idleImg = loadImage('角色/全部停止.png');      // 2 幀, 總尺寸 147 x 85
  walkImg = loadImage('角色/全部走路.png');      // 4 幀, 總尺寸 247 x 91
  runImg  = loadImage('角色/全部跑步.png');      // 4 幀, 總尺寸 391 x 81
  attackImg = loadImage('角色/全部攻擊.png');   // 3 幀, 總尺寸 400 x 77
  
  // 載入問題1單張精靈
  problem1Img = loadImage('角色/問題1不動.png');
  
  // 載入問題1答對動畫精靈（3張圖片）
  problem1CorrectImg = loadImage('角色/問題1答對.png');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  imageMode(CENTER);

  // 中央精靈的幀數（若沒有載入成功這行不會造成錯誤）
  if (spriteImg) {
    FRAMES = Math.max(1, Math.floor(spriteImg.width / SRC_W));
  }
  lastFrameTime = millis();

  // 設定下方各精靈屬性（依載入後的圖檔計算每格寬度）
  anims.idle.img = idleImg;
  anims.walk.img = walkImg;
  anims.run.img = runImg;
  anims.attack.img = attackImg;

  // 想要下方動畫顯示的高度（像素），可調整此值
  const bottomDisplayH = 78; // 例如 78px 高

  for (let k in anims) {
    const a = anims[k];
    if (a.img) {
      a.srcW = Math.max(1, a.img.width / a.frames);
      a.srcH = a.img.height;
      // 保持高度為 bottomDisplayH，計算寬度以保持比例
      const scale = bottomDisplayH / a.srcH;
      a.dispH = a.srcH * scale;
      a.dispW = a.srcW * scale;
    }
  }
  bottomLastFrameTime = millis();
  
  // 初始化下方角色位置
  bottomX = width / 2;
  bottomY = height - 40; // 離底部約 40px
  
  lastCollisionCheck = millis();
  
  // 設置中文輸入支持
  setupChineseInput();
}

// 設置中文輸入法支持
function setupChineseInput() {
  const hiddenInput = document.getElementById('hiddenInput');
  if (hiddenInput) {
    // 監聽輸入事件（適用於中文、英文、特殊字符等）
    hiddenInput.addEventListener('input', (e) => {
      if (questionActive) {
        userInput = e.target.value;
      }
    });
    
    // 監聽鍵盤按下事件
    hiddenInput.addEventListener('keydown', (e) => {
      if (questionActive) {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (currentQuestion) {
            checkAnswer();
          }
        } else if (e.key === 'Backspace') {
          e.preventDefault();
          userInput = userInput.slice(0, -1);
          hiddenInput.value = userInput;
        }
      }
    });
  }
}

function draw() {
  background('#9cfc97');

  // --- 中央原本的動畫（保持不變） ---
  if (spriteImg && FRAMES > 0) {
    if (millis() - lastFrameTime > FRAME_DURATION) {
      frameIndex = (frameIndex + 1) % FRAMES;
      lastFrameTime = millis();
    }
    const sx = frameIndex * SRC_W;
    const sy = 0;
    noTint();
    image(spriteImg, width / 2, height / 2, DISPLAY_W, DISPLAY_H, sx, sy, SRC_W, SRC_H);
  }

  // --- 下方狀態機與移動控制 ---
  if (!isAttack) {
    let currentSpeed = MOVE_SPEED; // 預設為走路速度
    
    // 按住 d 向右走；若同時按住 shift，改為跑步
    if (keyIsDown(68)) { // 'd'
      if (direction !== 1) {
        direction = 1; // 面向右
        bottomFrameIndex = 0;
      }
      if (keyIsDown(16)) { // shift
        if (currentAnimKey !== 'run') { currentAnimKey = 'run'; bottomFrameIndex = 0; }
        currentSpeed = RUN_SPEED; // 跑步速度
      } else {
        if (currentAnimKey !== 'walk') { currentAnimKey = 'walk'; bottomFrameIndex = 0; }
        currentSpeed = MOVE_SPEED; // 走路速度
      }
      // 向右移動
      bottomX += currentSpeed;
    } 
    // 按住 a 向左走；若同時按住 shift，改為跑步
    else if (keyIsDown(65)) { // 'a'
      if (direction !== -1) {
        direction = -1; // 面向左
        bottomFrameIndex = 0;
      }
      if (keyIsDown(16)) { // shift
        if (currentAnimKey !== 'run') { currentAnimKey = 'run'; bottomFrameIndex = 0; }
        currentSpeed = RUN_SPEED; // 跑步速度
      } else {
        if (currentAnimKey !== 'walk') { currentAnimKey = 'walk'; bottomFrameIndex = 0; }
        currentSpeed = MOVE_SPEED; // 走路速度
      }
      // 向左移動
      bottomX -= currentSpeed;
    } 
    else {
      if (currentAnimKey !== 'idle') { currentAnimKey = 'idle'; bottomFrameIndex = 0; }
    }
  }

  // 約束角色不超出畫面邊界（可選）
  bottomX = constrain(bottomX, 0, width);

  // --- 更新下方動畫幀 ---
  const curAnim = anims[currentAnimKey];
  if (curAnim && curAnim.img) {
    if (millis() - bottomLastFrameTime > BOTTOM_FRAME_DURATION) {
      bottomFrameIndex = (bottomFrameIndex + 1) % curAnim.frames;
      bottomLastFrameTime = millis();
    }

    // 如果正在攻擊且已播放到最後一幀，結束攻擊並回復先前狀態
    if (isAttack && bottomFrameIndex === curAnim.frames - 1) {
      // 結束攻擊狀態
      isAttack = false;
      currentAnimKey = prevAnimKey || 'idle';
      bottomFrameIndex = 0;
      bottomLastFrameTime = millis();
    }

    // 繪製下方動畫（使用 bottomX, bottomY 位置）
    const sx2 = bottomFrameIndex * curAnim.srcW;
    const sy2 = 0;
    
    noTint();
    // 保存變換矩陣
    push();
    translate(bottomX, bottomY);
    // 根據 direction 翻轉水平方向
    scale(direction, 1);
    image(curAnim.img, 0, 0, curAnim.dispW, curAnim.dispH, sx2, sy2, curAnim.srcW, curAnim.srcH);
    pop();
  }

  // 繪製問題1精靈（固定位置，不隨角色移動，但跟隨視角翻轉） ---
  // 碰撞檢測
  if (!isProblem1Answered && millis() - lastCollisionCheck > COLLISION_CHECK_INTERVAL) {
    lastCollisionCheck = millis();
    const distanceToP1 = Math.abs(bottomX - 100); // 100是問題1的固定X位置
    if (distanceToP1 < COLLISION_DISTANCE) {
      // 觸發問題
      if (!questionActive) {
        questionActive = true;
        questionStartTime = millis();
        currentQuestion = random(QUESTIONS);
        userInput = "";
        // 聚焦隱藏輸入欄以接收中文輸入
        const hiddenInput = document.getElementById('hiddenInput');
        if (hiddenInput) {
          hiddenInput.value = "";
          hiddenInput.focus();
        }
      }
    }
  }

  // 繪製問題1精靈
  if (!isProblem1Answered && problem1Img) {
    const fixedX = 100; // 固定在視窗 X = 100
    const fixedY = bottomY; // 與下方角色同一行

    push();
    translate(fixedX, fixedY);
    if (direction === 1) {
      image(problem1Img, 0, 0, PROBLEM1_W, PROBLEM1_H);
    } else {
      scale(-1, 1);
      image(problem1Img, 0, 0, PROBLEM1_W, PROBLEM1_H);
    }
    pop();
  }

  // 繪製問題1答對精靈（答對後）
  if (isProblem1Answered && problem1CorrectImg) {
    // 更新答對精靈動畫幀
    if (millis() - problem1CorrectLastFrameTime > PROBLEM1_CORRECT_FRAME_DURATION) {
      problem1CorrectFrameIndex = (problem1CorrectFrameIndex + 1) % 3;
      problem1CorrectLastFrameTime = millis();
    }

    const fixedX = 100;
    const fixedY = bottomY;
    const srcW = problem1CorrectImg.width / 3;
    const srcH = problem1CorrectImg.height;
    const sx = problem1CorrectFrameIndex * srcW;

    push();
    translate(fixedX, fixedY);
    if (direction === 1) {
      image(problem1CorrectImg, 0, 0, PROBLEM1_CORRECT_W, PROBLEM1_CORRECT_H, sx, 0, srcW, srcH);
    } else {
      scale(-1, 1);
      image(problem1CorrectImg, 0, 0, PROBLEM1_CORRECT_W, PROBLEM1_CORRECT_H, sx, 0, srcW, srcH);
    }
    pop();
  }

  // 繪製問題UI
  if (questionActive && currentQuestion) {
    drawQuestionUI();
    // 確保隱藏輸入欄在問題啟動時持續獲得焦點
    const hiddenInput = document.getElementById('hiddenInput');
    if (hiddenInput && document.activeElement !== hiddenInput) {
      hiddenInput.focus();
    }
  }
  
}

// 繪製問題UI和輸入框
function drawQuestionUI() {
  // 固定在中央精靈上方（width/2, height/2）
  const uiX = width / 2;
  const uiY = height / 2 - 150; // 在中央精靈上方

  // 半透明背景
  fill(0, 0, 0, 200);
  stroke(255);
  strokeWeight(2);
  rect(uiX - 150, uiY - 40, 300, 80, 8);

  // 問題文字或提示
  fill(255);
  textSize(16);
  textAlign(CENTER, CENTER);
  let displayText = currentQuestion.text;
  if (currentQuestion.hintDisplay) {
    displayText = "提示: " + currentQuestion.hint;
    fill(255, 150, 0); // 提示用橙色
  }
  text(displayText, uiX, uiY - 20);

  // 輸入框背景
  fill(255);
  stroke(100);
  strokeWeight(1);
  rect(uiX - 140, uiY + 10, 280, 25, 4);

  // 輸入文字
  fill(0);
  textSize(14);
  textAlign(LEFT, CENTER);
  text(userInput, uiX - 130, uiY + 22);

  // 輸入游標閃爍
  if (Math.floor(millis() / 500) % 2 === 0) {
    stroke(0);
    line(uiX - 130 + textWidth(userInput), uiY + 10, uiX - 130 + textWidth(userInput), uiY + 35);
  }

  // 提示文字
  fill(200, 100, 100);
  textSize(12);
  textAlign(CENTER, TOP);
  text(`按 ENTER 提交, BACKSPACE 刪除`, uiX, uiY + 45);
}

// 當使用者按下左方向鍵，觸發攻擊動畫（完整播放後自動回復）
function keyPressed() {
  // 如果問題正在進行中，只處理ENTER和BACKSPACE，其他交給隱藏輸入欄
  if (questionActive && currentQuestion) {
    if (keyCode === ENTER) {
      // 檢查答案
      checkAnswer();
      return false;
    } else if (keyCode === BACKSPACE) {
      // 刪除上一個字符
      userInput = userInput.slice(0, -1);
      const hiddenInput = document.getElementById('hiddenInput');
      if (hiddenInput) {
        hiddenInput.value = userInput;
      }
      return false;
    }
    // 不攔截其他鍵，讓隱藏輸入欄接收字符輸入
    return;
  }

  // 原本的攻擊邏輯
  if (keyCode === LEFT_ARROW) {
    // 只有在非攻擊時才觸發一次攻擊
    if (!isAttack) {
      prevAnimKey = currentAnimKey;
      currentAnimKey = 'attack';
      isAttack = true;
      bottomFrameIndex = 0;
      bottomLastFrameTime = millis();
    }
  }
}

// 檢查答案
function checkAnswer() {
  const inputTrimmed = userInput.trim();
  
  if (inputTrimmed === currentQuestion.answer) {
    // 答對了
    isProblem1Answered = true;
    questionActive = false;
    userInput = "";
    problem1CorrectLastFrameTime = millis();
    problem1CorrectFrameIndex = 0;
  } else {
    // 答錯，顯示提示
    showHint();
    userInput = ""; // 清空輸入，讓玩家重新開始
  }
  
  // 清空隱藏輸入欄並失去焦點，讓 p5.js 恢復鍵盤控制
  const hiddenInput = document.getElementById('hiddenInput');
  if (hiddenInput) {
    hiddenInput.value = "";
    hiddenInput.blur(); // 失去焦點
  }
}

// 顯示提示
function showHint() {
  // 提示文字暫時替換為提示內容
  currentQuestion.hintDisplay = true;
  currentQuestion.hintStartTime = millis();
  // 3秒後回復原問題
  setTimeout(() => {
    if (currentQuestion) {
      currentQuestion.hintDisplay = false;
    }
  }, 3000);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}