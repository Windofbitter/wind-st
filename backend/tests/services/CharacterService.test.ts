import { describe, expect, it } from "vitest";
import { CharacterService } from "../../src/application/services/CharacterService";
import { FakeCharacterRepository } from "./fakeRepositories";

function createService() {
  const repo = new FakeCharacterRepository();
  const service = new CharacterService(repo);
  return { repo, service };
}

describe("CharacterService", () => {
  it("creates, lists, gets, updates and deletes characters via repository", async () => {
    const { service } = createService();

    const alice = await service.createCharacter({
      name: "Alice",
      description: "desc",
      persona: "p",
      avatarPath: "/a.png",
      creatorNotes: "n",
    });
    const bob = await service.createCharacter({
      name: "Bob",
      description: "desc2",
      persona: "p2",
      avatarPath: "/b.png",
    });

    const fetched = await service.getCharacter(alice.id);
    expect(fetched?.name).toBe("Alice");

    const all = await service.listCharacters();
    expect(all.map((c) => c.name)).toEqual(["Alice", "Bob"]);

    const filtered = await service.listCharacters({ nameContains: "Bo" });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe(bob.id);

    const updated = await service.updateCharacter(alice.id, {
      description: "updated",
      creatorNotes: null,
    });
    expect(updated?.description).toBe("updated");
    expect(updated?.creatorNotes).toBeNull();

    await service.deleteCharacter(bob.id);
    const afterDelete = await service.getCharacter(bob.id);
    expect(afterDelete).toBeNull();
  });
});
