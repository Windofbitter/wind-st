import { describe, expect, it } from "vitest";
import { MessageService } from "../../src/application/services/MessageService";
import { FakeMessageRepository } from "./fakeRepositories";

function createService() {
  const messageRepo = new FakeMessageRepository();
  const service = new MessageService(messageRepo);
  return { messageRepo, service };
}

describe("MessageService", () => {
  it("appends and lists messages", async () => {
    const { service } = createService();

    const m1 = await service.appendMessage({
      chatId: "c1",
      role: "user",
      content: "hi",
    });
    const m2 = await service.appendMessage({
      chatId: "c1",
      role: "assistant",
      content: "hello",
      tokenCount: 42,
    });

    expect(m1.id).not.toBe(m2.id);

    const list = await service.listMessages("c1");
    expect(list.map((m) => m.content)).toEqual(["hi", "hello"]);
  });

  it("passes pagination options through to repository", async () => {
    const { service } = createService();

    for (let i = 0; i < 3; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await service.appendMessage({
        chatId: "c1",
        role: "user",
        content: `m${i}`,
      });
    }

    const page = await service.listMessages("c1", { limit: 2, offset: 1 });
    expect(page.map((m) => m.content)).toEqual(["m1", "m2"]);
  });
});
