// Firebase Firestoreの関数をインポート
// CDN(Content Delivery Network)経由で
// Firebase SDK(Software Development Kit)を読み込み、軽量化
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// グローバル変数
let canvas,
  ctx,
  isDrawing = false;
let db; // Firestoreデータベースインスタンス

// 描画設定
let currentColor = "#000000";
let currentSize = 5;
let isEraser = false; // 消しゴムモード用フラグ

// 描画機能の初期化関数
export function initDrawing(database) {
  // Firestoreデータベースインスタンスをグローバル変数に代入
  db = database;

  // キャンバス要素の取得
  // Canvas APIの描画処理は、jQueryでは実装できないため、
  // 今回は全てVanilla JavaScriptで実装
  canvas = document.getElementById("drawingCanvas");
  ctx = canvas.getContext("2d"); // コンテキスト

  // キャンバスの初期設定
  setupCanvas();

  // イベントリスナーの設定
  setupEventListeners();

  // リアルタイム監視
  watchForNewDrawings();
}

// キャンバスの初期設定（起動時に1回だけ実行される）
function setupCanvas() {
  // 線の設定
  updateCanvasSettings();
  ctx.lineCap = "round"; // 線の端を丸く

  // レスポンシブ対応
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
}

// キャンバスの描画設定を更新
function updateCanvasSettings() {
  if (isEraser) {
    // 消しゴムモード
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineWidth = currentSize * 2; // 消しゴムは太めに
  } else {
    // ペンモード
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentSize;
  }
}

// キャンバスのリサイズ処理
function resizeCanvas() {
  const container = canvas.parentElement;
  const containerWidth = container.clientWidth - 40; // パディング分を引く
  const maxWidth = 800;
  const aspectRatio = 600 / 800; // height / width

  if (containerWidth < maxWidth) {
    canvas.style.width = containerWidth + "px";
    canvas.style.height = containerWidth * aspectRatio + "px";
  } else {
    canvas.style.width = maxWidth + "px";
    canvas.style.height = maxWidth * aspectRatio + "px";
  }
}

// イベントリスナーの設定
function setupEventListeners() {
  // マウスイベント
  canvas.addEventListener("mousedown", startDrawing);
  canvas.addEventListener("mousemove", draw);
  canvas.addEventListener("mouseup", stopDrawing);
  canvas.addEventListener("mouseout", stopDrawing);

  // ボタンイベント
  document.getElementById("clearBtn").addEventListener("click", clearCanvas);
  document.getElementById("saveBtn").addEventListener("click", saveDrawing);

  // 描画ツールイベント
  setupDrawingToolEvents();
}

// 描画ツールのイベントリスナー設定
function setupDrawingToolEvents() {
  // 初期サイズプレビューを設定
  updateSizePreview();

  // カラーピッカーのDOM要素取得
  const colorPicker = document.getElementById("colorPicker");

  // カラーピッカーのイベントリスナー
  // eはEventオブジェクト
  colorPicker.addEventListener("input", (e) => {
    currentColor = e.target.value;
    isEraser = false; // 色変更時は自動で消しゴムモードからペンモードに
    updateToolStates();
    updateCanvasSettings();
  });

  // サイズスライダー
  const sizeSlider = document.getElementById("sizeSlider");
  const sizeValue = document.getElementById("sizeValue");

  // サイズスライダーのイベントリスナー
  sizeSlider.addEventListener("input", (e) => {
    currentSize = parseInt(e.target.value);
    sizeValue.textContent = currentSize;
    updateSizePreview();
    updateCanvasSettings();
  });

  // ペンボタン
  document.getElementById("penBtn").addEventListener("click", () => {
    isEraser = false;
    updateToolStates();
    updateCanvasSettings();
  });

  // 消しゴムボタン
  document.getElementById("eraserBtn").addEventListener("click", () => {
    isEraser = true;
    updateToolStates();
    updateCanvasSettings();
  });
}

// サイズプレビューの更新
function updateSizePreview() {
  const sizePreview = document.getElementById("sizePreview");

  // プレビュー用のドットを作成/更新
  if (!sizePreview.querySelector(".size-dot")) {
    const dot = document.createElement("div");
    dot.className = "size-dot";
    sizePreview.appendChild(dot);
  }

  const dot = sizePreview.querySelector(".size-dot");
  dot.style.cssText = `
    width: ${currentSize}px;
    height: ${currentSize}px;
    background-color: ${isEraser ? "#ff6b6b" : currentColor};
    border-radius: 50%;
    transition: all 0.2s;
  `;
}

// ツールの状態表示を更新
function updateToolStates() {
  const penBtn = document.getElementById("penBtn");
  const eraserBtn = document.getElementById("eraserBtn");

  // classListプロパティで、htmlのclassに対して追加/削除を行える
  if (isEraser) {
    penBtn.classList.remove("active");
    eraserBtn.classList.add("active");
  } else {
    penBtn.classList.add("active");
    eraserBtn.classList.remove("active");
  }
  // プレビューも更新
  // updateSizePreview();
}

// 描画開始
function startDrawing(e) {
  isDrawing = true;
  updateCanvasSettings(); // 現在の設定を適用
  const coords = getCanvasCoordinates(e);
  ctx.beginPath();
  ctx.moveTo(coords.x, coords.y);
}

// 描画中
function draw(e) {
  if (!isDrawing) return;

  const coords = getCanvasCoordinates(e);
  ctx.lineTo(coords.x, coords.y);
  ctx.stroke();
}

// 描画終了
function stopDrawing() {
  isDrawing = false;
}

// キャンバス座標の取得（スケール調整）
function getCanvasCoordinates(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  };
}

// キャンバスクリア
function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// 描画保存
async function saveDrawing() {
  const artistName = document.getElementById("artistName").value;

  if (!artistName.trim()) {
    alert("お名前を入力してください");
    return;
  }

  try {
    // キャンバスを画像データに変換
    const imageData = canvas.toDataURL("image/png");

    // Firestoreに保存
    await addDoc(collection(db, "drawings"), {
      artistName: artistName,
      imageData: imageData,
      createdAt: serverTimestamp(),
    });

    alert("保存しました！");
  } catch (error) {
    console.error("保存エラー:", error);
    alert("保存に失敗しました");
  }
}

// リアルタイム監視
function watchForNewDrawings() {
  onSnapshot(collection(db, "drawings"), (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        const newDrawing = change.doc.data();
        if (newDrawing.artistName !== getCurrentUser()) {
          displayOtherDrawing(newDrawing);
        }
      }
    });
  });
}

// 現在のユーザー名取得
function getCurrentUser() {
  return document.getElementById("artistName").value || "unknown";
}

// 他ユーザーの描画表示
function displayOtherDrawing(drawingData) {
  const img = new Image();
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    showNotification(`${drawingData.artistName}さんが新しい絵を描きました！`);
  };
  img.src = drawingData.imageData;
}

// 通知表示
function showNotification(message) {
  const notification = document.createElement("div");
  notification.textContent = message;
  notification.className = "notification";
  document.body.appendChild(notification);

  setTimeout(() => {
    document.body.removeChild(notification);
  }, 3000);
}
