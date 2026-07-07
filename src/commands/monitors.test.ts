import { describe, it, expect } from "vite-plus/test";
import { Command } from "commander";
import { monitorsCommand } from "./monitors.js";

describe("monitors add command", () => {
  it("accepts --keyword option", () => {
    const program = new Command();
    monitorsCommand(program);

    const monitors = program.commands.find((c) => c.name() === "monitors");
    expect(monitors).toBeDefined();

    const addCmd = monitors!.commands.find((c) => c.name() === "add");
    expect(addCmd).toBeDefined();

    const optionNames = addCmd!.options.map((o) => o.name());
    expect(optionNames).toContain("keyword");
  });
});

describe("monitors create command", () => {
  it("accepts --keyword option", () => {
    const program = new Command();
    monitorsCommand(program);

    const monitors = program.commands.find((c) => c.name() === "monitors");
    expect(monitors).toBeDefined();

    const createCmd = monitors!.commands.find((c) => c.name() === "create");
    expect(createCmd).toBeDefined();

    const optionNames = createCmd!.options.map((o) => o.name());
    expect(optionNames).toContain("keyword");
  });
});
