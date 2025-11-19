import { describe, expect, it } from "vitest";
import { LorebookService } from "../../src/application/services/LorebookService";
import {
  FakeLorebookEntryRepository,
  FakeLorebookRepository,
} from "./fakeRepositories";

function createService() {
  const lorebookRepo = new FakeLorebookRepository();
  const entryRepo = new FakeLorebookEntryRepository();
  const service = new LorebookService(lorebookRepo, entryRepo);
  return { lorebookRepo, entryRepo, service };
}

describe("LorebookService", () => {
  it("manages lorebooks and entries", async () => {
    const { service } = createService();

    const lb = await service.createLorebook({
      name: "Book",
      description: "desc",
      isGlobal: true,
    });

    const listed = await service.listLorebooks({ isGlobal: true });
    expect(listed).toHaveLength(1);

    const fetched = await service.getLorebook(lb.id);
    expect(fetched?.name).toBe("Book");

    const updated = await service.updateLorebook(lb.id, {
      description: "updated",
      isGlobal: false,
    });
    expect(updated?.description).toBe("updated");
    expect(updated?.isGlobal).toBe(false);

    const entry = await service.createLorebookEntry(lb.id, {
      keywords: ["a"],
      content: "c",
      insertionOrder: 0,
      isEnabled: true,
    });

    const entries = await service.listLorebookEntries(lb.id);
    expect(entries.map((e) => e.id)).toEqual([entry.id]);

    const updatedEntry = await service.updateLorebookEntry(entry.id, {
      content: "updated",
      isEnabled: false,
    });
    expect(updatedEntry?.content).toBe("updated");
    expect(updatedEntry?.isEnabled).toBe(false);

    await service.deleteLorebookEntry(entry.id);
    const afterDeleteEntries = await service.listLorebookEntries(lb.id);
    expect(afterDeleteEntries).toHaveLength(0);

    await service.deleteLorebook(lb.id);
    const afterDeleteLorebook = await service.getLorebook(lb.id);
    expect(afterDeleteLorebook).toBeNull();
  });

  it("throws when creating entry for missing lorebook", async () => {
    const { service } = createService();

    await expect(
      service.createLorebookEntry("missing", {
        keywords: ["x"],
        content: "c",
        insertionOrder: 0,
      }),
    ).rejects.toThrowError("Lorebook not found");
  });
});
