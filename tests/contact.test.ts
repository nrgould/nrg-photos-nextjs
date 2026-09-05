import { test } from "node:test";
import assert from "node:assert/strict";
import { handleContact, draftHref } from "../src/lib/contact";
const data = {
  name: "A visitor",
  email: "visitor@example.com",
  interest: "Portraits" as const,
  message: "I would like to plan a portrait session.",
  website: "",
};
const req = (body: unknown = data, origin = "https://nicholasgouldphoto.com") =>
  new Request("https://nicholasgouldphoto.com/api/contact", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
test("an inquiry is delivered only to Nicholas, with visitor as reply-to", async () => {
  let sent;
  const result = await handleContact(
    req({
      ...data,
      to: "attacker@example.com",
      message: "<b>Literal text should stay literal.</b>",
    }),
    {
      configured: true,
      send: async (mail) => {
        sent = mail;
      },
    },
  );
  assert.equal(result.status, 200);
  assert.deepEqual(sent, {
    to: "nicholas@nicholasgouldphoto.com",
    replyTo: data.email,
    subject: "Photography inquiry: Portraits",
    text: "From: A visitor\nEmail: visitor@example.com\nInterested in: Portraits\n\n<b>Literal text should stay literal.</b>",
  });
});
test("rejects invalid, cross-origin, and oversized inquiries without delivery", async () => {
  const delivery = {
    configured: true,
    send: async () => {
      assert.fail("must not send");
    },
  };
  assert.equal(
    (await handleContact(req({ ...data, email: "invalid" }), delivery)).status,
    400,
  );
  assert.equal(
    (await handleContact(req(data, "https://other.example"), delivery)).status,
    403,
  );
  assert.equal(
    (
      await handleContact(
        req({ ...data, message: "a".repeat(17000) }),
        delivery,
      )
    ).status,
    413,
  );
  assert.equal(
    (await handleContact(req({ ...data, website: "spam.example" }), delivery))
      .status,
    200,
  );
});
test("reports unavailable service and failed delivery honestly", async () => {
  assert.equal(
    (
      await handleContact(req(), {
        configured: false,
        send: async () => {
          assert.fail();
        },
      })
    ).status,
    503,
  );
  assert.equal(
    (
      await handleContact(req(), {
        configured: true,
        send: async () => {
          throw new Error("provider failed");
        },
      })
    ).status,
    502,
  );
});
test("mailto drafts preserve special characters without adding mail headers", () => {
  const href = draftHref({
    ...data,
    name: "A & B",
    message: "Print: Hallstatt? Size & price, please.",
  });
  const url = new URL(href);
  assert.equal(url.pathname, "nicholas@nicholasgouldphoto.com");
  assert.equal(url.searchParams.get("subject"), "Portraits inquiry from A & B");
  assert.match(url.searchParams.get("body")!, /Size & price/);
  assert.equal(url.searchParams.size, 2);
});
