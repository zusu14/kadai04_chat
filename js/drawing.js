// Firebase Firestoreの関数をインポート
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
let db; // Firestoreデータベース

// 描画機能の初期化関数
export function initDrawing(database) {
  db = database;

  // キャンバス要素の取得
  canvas = document.getElementById("drawingCanvas");
  ctx = canvas.getContext("2d");

  // キャンバスの初期設定
  setupCanvas();

  // イベントリスナーの設定
  setupEventListeners();

  // リアルタイム監視
  watchForNewDrawings();
}

// キャンバスの初期設定
function setupCanvas() {
  // 線の設定
  ctx.strokeStyle = "#000000"; // 黒色
  ctx.lineWidth = 2; // 線の太さ
  ctx.lineCap = "round"; // 線の端を丸く
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
}

// 描画開始
function startDrawing(e) {
  isDrawing = true;
  const rect = canvas.getBoundingClientRect();
  ctx.beginPath();
  ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
}

// 描画中
function draw(e) {
  if (!isDrawing) return;

  const rect = canvas.getBoundingClientRect();
  ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
  ctx.stroke();
}

// 描画終了
function stopDrawing() {
  isDrawing = false;
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
        if (newDrawing.artistName !== artistName) {
          displayOtherDrawing(newDrawing);
        }
      }
    });
  });
}

function getCurrentUser() {
  return document.getElementById("artistName").value || "unknown";
}

function displayOtherDrawing(drawingData) {
  const img = new Image();
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  };
  img.src = drawingData.imageData;
}

function showNotification(message) {
  const notification = document.createElement("div");
  notification.textContent = message;
  notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 10px;
      border-radius: 5px;
      z-index: 1000;
    `;
  document.body.appendChild(notification);

  setTimeout(() => {
    document.body.removeChild(notification);
  }, 3000);
}
