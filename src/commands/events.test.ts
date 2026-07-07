import { describe, it, expect } from "vite-plus/test";
import { Command } from "commander";
import { eventsCommand } from "./events.js";

describe("events command", () => {
  describe("command registration", () => {
    it("should register an events subcommand on the program", () => {
      const program = new Command();
      eventsCommand(program);

      const subcommands = program.commands.map((c) => c.name());
      expect(subcommands).toContain("events");
    });

    it("should register an 'events list' subcommand with --limit and --offset options", () => {
      const program = new Command();
      eventsCommand(program);

      const eventsCmd = program.commands.find((c: Command) => c.name() === "events");
      expect(eventsCmd).toBeDefined();

      const listCmd = eventsCmd?.commands.find((c: Command) => c.name() === "list");
      expect(listCmd).toBeDefined();

      const opts = listCmd?.options.map((o) => o.long) ?? [];
      expect(opts).toContain("--limit");
      expect(opts).toContain("--offset");
    });

    it("should register --json and --instance options on events list", () => {
      const program = new Command();
      eventsCommand(program);

      const eventsCmd = program.commands.find((c: Command) => c.name() === "events");
      const listCmd = eventsCmd?.commands.find((c: Command) => c.name() === "list");
      const opts = listCmd?.options.map((o) => o.long) ?? [];

      expect(opts).toContain("--json");
      expect(opts).toContain("--instance");
    });
  });
});
