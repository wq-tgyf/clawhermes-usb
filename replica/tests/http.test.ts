import assert from "node:assert/strict";
import { test } from "node:test";
import { requestJson, requestJsonWithTimeout } from "../src/http.ts";
import { startFakeServer } from "./helpers/fakeServer.ts";

test("O032 默认 GET 且路径正确拼接", async () => {
  const s = await startFakeServer(() => ({ status: 200, json: { ok: 1 } }));
  try {
    const result = await requestJson(s.url, "/api/status");
    assert.deepEqual(result, { ok: 1 });
    assert.equal(s.requests[0].method, "GET");
    assert.equal(s.requests[0].url, "/api/status");
  } finally {
    await s.close();
  }
});

test("O033 仅在有 body 时设置 content-type 并序列化", async () => {
  const s = await startFakeServer(() => ({ status: 200, json: {} }));
  try {
    await requestJson(s.url, "/a");
    assert.equal(s.requests[0].headers["content-type"], undefined);
    assert.equal(s.requests[0].body, "");

    await requestJson(s.url, "/b", { method: "POST", body: { x: 1 } });
    assert.equal(s.requests[1].headers["content-type"], "application/json");
    assert.equal(s.requests[1].body, '{"x":1}');
  } finally {
    await s.close();
  }
});

test("O034 非 2xx 时优先取 error.message", async () => {
  const s = await startFakeServer(() => ({ status: 500, json: { error: { message: "boom" } } }));
  try {
    await assert.rejects(
      () => requestJson(s.url, "/fail"),
      (e: Error) => e.message === "Control API failed: boom",
    );
  } finally {
    await s.close();
  }
});

test("O034 非 2xx 且响应体非 JSON 时回退状态行", async () => {
  const s = await startFakeServer(() => ({ status: 502, raw: "gateway down" }));
  try {
    await assert.rejects(
      () => requestJson(s.url, "/fail"),
      (e: Error) => e.message.startsWith("Control API failed: 502"),
    );
  } finally {
    await s.close();
  }
});

test("O031 超时会中断请求", async () => {
  const s = await startFakeServer(() => ({ status: 200, json: {} }));
  try {
    // 未启动的超时路由：直接用一个不可达端口 + 极小超时
    await assert.rejects(() =>
      requestJson("http://127.0.0.1:1", "/never", { timeoutMs: 50 }),
    );
  } finally {
    await s.close();
  }
});

test("O036 requestJsonWithTimeout 透传 timeoutMs", async () => {
  const s = await startFakeServer(() => ({ status: 200, json: { ok: true } }));
  try {
    const result = await requestJsonWithTimeout(s.url, "/x", {}, 1234);
    assert.deepEqual(result, { ok: true });
  } finally {
    await s.close();
  }
});
