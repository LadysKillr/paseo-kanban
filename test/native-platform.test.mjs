import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import TestRenderer from "react-test-renderer";
import {
  act,
  loadClientComponent,
  mockReactNative,
} from "./helpers/react-host-env.mjs";

const theme = {
  colors: {
    accent: "#6366f1",
    accentForeground: "#ffffff",
    surface0: "#11111b",
    surface1: "#1e1e2e",
    surface2: "#313244",
    foreground: "#cdd6f4",
    foregroundMuted: "#a6adc8",
    statusDanger: "#f38ba8",
    border: "#45475a",
  },
};

function asIOS(t) {
  const previous = mockReactNative.Platform.OS;
  mockReactNative.Platform.OS = "ios";
  t.after(() => (mockReactNative.Platform.OS = previous));
}

// iOS/Android have no DOM: the real portals must fall back to a native Modal.
test("原生平台：Dialog 通过原生 Modal 显示、不用 vw/vh，并响应返回键关闭", async (t) => {
  asIOS(t);
  const Dialog = loadClientComponent("components/ui/dialog", "Dialog");
  let closed = 0;
  let renderer;
  await act(async () => {
    renderer = TestRenderer.create(
      React.createElement(
        Dialog,
        {
          title: "Task",
          theme,
          viewportWidth: 90,
          viewportHeight: 80,
          onOpenChange: (open) => !open && closed++,
        },
        React.createElement("Text", null, "body"),
      ),
    );
  });
  const modals = renderer.root.findAllByType("Modal");
  assert.equal(modals.length, 1, "dialog is presented in a native Modal");
  const card = modals[0].find(
    (node) => node.type === "View" && node.props.role === "dialog",
  );
  const style = Object.assign({}, ...[card.props.style].flat(Infinity));
  assert.equal(style.width, "90%");
  assert.equal(style.height, "80%", "contained dialogs get a definite height");
  await act(async () => modals[0].props.onRequestClose());
  assert.equal(closed, 1);
});

test("原生平台：contained 弹窗即使未指定高度也获得确定高度，避免内容塌缩为 0", async (t) => {
  asIOS(t);
  const Dialog = loadClientComponent("components/ui/dialog", "Dialog");
  let renderer;
  await act(async () => {
    renderer = TestRenderer.create(
      React.createElement(
        Dialog,
        { title: "Create", theme, scroll: "contained", onOpenChange() {} },
        React.createElement("Text", null, "body"),
      ),
    );
  });
  const card = renderer.root
    .findByType("Modal")
    .find((node) => node.type === "View" && node.props.role === "dialog");
  const style = Object.assign({}, ...[card.props.style].flat(Infinity));
  assert.equal(style.height, "80%");
});

test("原生平台：Select 弹出层在原生 Modal 中按触发器位置显示并可选择", async (t) => {
  asIOS(t);
  const Select = loadClientComponent("components/ui/select", "Select");
  let picked = null;
  let renderer;
  await act(async () => {
    renderer = TestRenderer.create(
      React.createElement(Select, {
        theme,
        label: "Project",
        value: "a",
        options: [
          { value: "a", label: "Alpha" },
          { value: "b", label: "Beta" },
        ],
        onValueChange: (value) => (picked = value),
      }),
      {
        createNodeMock: () => ({
          measureInWindow: (cb) => cb(20, 100, 200, 32),
        }),
      },
    );
  });
  const trigger = renderer.root.find(
    (node) =>
      node.type === "Pressable" && node.props.accessibilityRole === "button",
  );
  await act(async () => trigger.props.onPress());
  const modal = renderer.root.findByType("Modal");
  const popover = modal.find(
    (node) =>
      node.type === "View" &&
      [node.props.style].flat(Infinity).some((s) => s?.top === 136),
  );
  const style = Object.assign({}, ...[popover.props.style].flat(Infinity));
  assert.equal(style.position, "absolute", "no web-only fixed position");
  const beta = modal
    .findAllByType("Pressable")
    .find((node) =>
      node.findAllByType("Text").some((text) => text.children.includes("Beta")),
    );
  await act(async () => beta.props.onPress());
  assert.equal(picked, "b");
  assert.equal(renderer.root.findAllByType("Modal").length, 0);
});
