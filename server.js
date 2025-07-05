/*
 * mock-express-api.js
 * JWT 驗證示範：
 * - client API: X-Access-Token in header
 * - /api/login: 回傳 access & refresh token 於 response header
 * - /api/refresh: client header 帶 X-Access-Token & X-Refresh-Token
 */

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const app = express();
const port = 3000;

// CORS & JSON
app.use(
  cors({
    origin: "*",
    exposedHeaders: ["X-Access-Token", "X-Refresh-Token"],
  })
);
app.use(express.json());

// JWT 密鑰 (測試用)
const ACCESS_TOKEN_SECRET = "your_access_secret";
const REFRESH_TOKEN_SECRET = "your_refresh_secret";
// 儲存 Refresh Tokens
let refreshTokens = [];

// 模擬使用者資料
const users = [
  { id: 1, name: "alice", password: "password123", role: "user" },
  { id: 2, name: "bob", password: "password456", role: "admin" },
];

const TOKEN_CONST = Object.freeze({
  ACCESS_HEADER_KEY: "x-access-token",
  REFRESH_HEADER_KEY: "x-refresh-token",
});

// 產生 Access Token
function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, role: user.role },
    ACCESS_TOKEN_SECRET,
    { expiresIn: "1m" }
  );
}

// 產生 Refresh Token
function generateRefreshToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name },
    REFRESH_TOKEN_SECRET,
    { expiresIn: "5m" }
  );
}

// 登入：回傳 Token 於 Header
app.post("/api/login", authenticateToken, (req, res) => {
  const { name, password } = req.body;
  const user = users.find((u) => u.name === name && u.password === password);
  if (!user) {
    return res.status(401).json({ code: 401, message: "帳號或密碼錯誤" });
  }
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  refreshTokens.push(refreshToken);
  // 將 tokens 放入 response header
  res.set(TOKEN_CONST.ACCESS_HEADER_KEY, accessToken);
  res.set(TOKEN_CONST.REFRESH_HEADER_KEY, refreshToken);
  return res.sendStatus(200);
});

// Refresh：client header 需帶 X-Access-Token & X-Refresh-Token
app.post("/api/refresh", (req, res) => {
  const oldAccessToken = req.header(TOKEN_CONST.ACCESS_HEADER_KEY);
  const oldRefreshToken = req.header(TOKEN_CONST.REFRESH_HEADER_KEY);
  // 處理沒有任何 token 的初次訪問者 (訪客)
  if (!oldAccessToken && !oldRefreshToken) {
    console.log("偵測到新訪客，正在生成專屬 token...");

    const guestUser = { id: `guest-${Date.now()}`, name: null, role: "guest" };
    // 為訪客生成一組全新的 Access Token 和 Refresh Token
    const newAccessToken = generateAccessToken(guestUser);
    const newRefreshToken = generateRefreshToken(guestUser);
    // 在 response header 中設定新的 tokens
    res.set(TOKEN_CONST.ACCESS_HEADER_KEY, newAccessToken);
    res.set(TOKEN_CONST.REFRESH_HEADER_KEY, newRefreshToken);

    console.log("已成功為訪客生成 token。");
    return res.status(200).json({ code: 200, message: "已生成新的訪客 token" });
  }

  if(!oldAccessToken ) {
    return res
      .status(401)
      .json({ code: 401, message: "Access Token 遺失" });
  }

  if (
    !oldRefreshToken ||
    !refreshTokens.includes(oldRefreshToken)
  ) {
    return res
      .status(401)
      .json({ code: 401, message: "無效或已撤銷的 refresh token" });
  }
  jwt.verify(oldRefreshToken, REFRESH_TOKEN_SECRET, async(err, payload) => {
    if (err)
      return res
        .status(403)
        .json({ code: 403, message: "Refresh token 驗證失敗" });
    const user = users.find((u) => u.id === payload.id);
    if (!user)
      return res.status(404).json({ code: 404, message: "使用者不存在" });
    // 等 30 秒再回傳
    await new Promise((resolve) => setTimeout(resolve, 10000));
    // 生成新 Access Token
    const newAccessToken = generateAccessToken(user);
    // 回傳新 Access Token
    res.set(TOKEN_CONST.ACCESS_HEADER_KEY, newAccessToken);
    res.set(TOKEN_CONST.REFRESH_HEADER_KEY, oldRefreshToken);
    return res.sendStatus(200);
  });
});

// Logout: client header 帶 X-Refresh-Token
app.post("/api/logout",authenticateToken, (req, res) => {
  const token = req.header(TOKEN_CONST.REFRESH_HEADER_KEY);
  refreshTokens = refreshTokens.filter((t) => t !== token);
  return res.sendStatus(204);
});

// 驗證中介：從 X-Access-Token
function authenticateToken(req, res, next) {
  const token = req.header(TOKEN_CONST.ACCESS_HEADER_KEY);
  if (!token)
    return res.status(401).json({ code: 401, message: "Access Token 遺失" });
  jwt.verify(token, ACCESS_TOKEN_SECRET, (err, user) => {
    if (err)
      return res.status(401).json({ code: 401, message: "Access Token 無效" });
    req.user = user;
    next();
  });
}

// 驗證中介：從 X-Access-Token 的 name 不能是 null
function authenticateUser(req, res, next) {
  const token = req.header(TOKEN_CONST.ACCESS_HEADER_KEY);
  if (!token)
    return res.status(401).json({ code: 401, message: "Access Token 遺失" });
  jwt.verify(token, ACCESS_TOKEN_SECRET, (err, user) => {
    if (err)
      return res.status(401).json({ code: 401, message: "Access Token 無效" });
    if (!user.name)
      return res.status(403).json({ code: 403, message: "訪客無權限訪問" });
    req.user = user;
     next();
  });
}

// 測試 API：需 Access Token
app.get("/api/profile", authenticateToken,authenticateUser, (req, res) => {
  res.json({ code: 200, message: "個人資料", user: req.user });
});

app.get("/api/data", authenticateToken,authenticateUser, (req, res) => {
  res.json({
    code: 200,
    message: "一般資料",
    data: ["item1", "item2", "item3"],
  });
});

app.get("/api/admin", authenticateToken,authenticateUser, (req, res) => {
  res.json({ code: 200, message: "管理員資料", secret: "42" });
});

// 啟動伺服器
app.listen(port, () => {
  console.log(`Mock JWT API listening at http://localhost:${port}`);
});
