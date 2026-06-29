import { Command } from "commander";
import { type Heartbeat } from "../client.js";
import { resolveClient } from "../instance-manager.js";
import {
  createTable,
  statusLabel,
  formatDate,
  isJsonMode,
  jsonOut,
  jsonError,
} from "../utils/output.js";
import { handleError, EXIT_CODES } from "../utils/errors.js";
import chalk from "chalk";

export function eventsCommand(program: Command): void {
  const ev = program
    .command("events")
    .description("View important (state-transition) heartbeat events")
    .addHelpText(
      "after",
      `
${chalk.dim("Subcommands:")}
  ${chalk.cyan("events list <monitor-ids...>")}   Merged timeline of important events across monitors

${chalk.dim("Run")} ${chalk.cyan("kuma events list --help")} ${chalk.dim("for examples.")}
`
    );

  // ── LIST ────────────────────────────────────────────────────────────────────
  ev
    .command("list <monitor-ids...>")
    .description("Fetch important events for one or more monitors and merge into a single timeline")
    .option("--limit <n>", "Max events per monitor (default: 50)", "50")
    .option("--offset <n>", "Pagination offset (default: 0)", "0")
    .option("--json", "Output as JSON ({ ok, data })")
    .option("--instance <name>", "Target a specific instance")
    .addHelpText(
      "after",
      `
${chalk.dim("Examples:")}
  ${chalk.cyan("kuma events list 4")}                              Latest events for DNS monitor
  ${chalk.cyan("kuma events list 4 2 3")}                           Merged timeline across 3 monitors
  ${chalk.cyan("kuma events list 4 --limit 100")}                   Show more events
  ${chalk.cyan("kuma events list 4 --json")}                        Raw JSON for agent consumption
`
    )
    .action(
      async (
        monitorIds: string[],
        opts: { limit?: string; offset?: string; json?: boolean; instance?: string }
      ) => {
        const json = isJsonMode(opts);

        // Validate monitor IDs
        for (const id of monitorIds) {
          const parsed = parseInt(id, 10);
          if (isNaN(parsed) || parsed <= 0) {
            handleError(
              new Error(`Invalid monitor ID: "${id}". Must be a positive integer.`),
              opts
            );
          }
        }

        try {
          const { client } = await resolveClient(opts);
          const limit = parseInt(opts.limit ?? "50", 10);
          const offset = parseInt(opts.offset ?? "0", 10);
          const numMonitors = monitorIds.length;

          // Fetch events for each monitor
          const allEvents: Heartbeat[] = [];
          for (const id of monitorIds) {
            const parsedId = parseInt(id, 10);
            const heartbeats = await client.getImportantHeartbeatListPaged(
              parsedId,
              offset,
              limit
            );
            allEvents.push(...heartbeats);
          }
          client.disconnect();

          // Merge and sort by time descending
          allEvents.sort((a, b) => {
            const ta = new Date(a.time).getTime();
            const tb = new Date(b.time).getTime();
            return tb - ta;
          });

          if (allEvents.length === 0) {
            if (json) {
              jsonOut([]);
            }
            console.log("No important events found.");
            return;
          }

          if (json) {
            jsonOut(allEvents);
          }

          // Single monitor: Time, Status, Message
          // Multiple monitors: Monitor, Time, Status, Message
          const showMonitor = numMonitors > 1;
          const headers = showMonitor
            ? ["Monitor", "Time", "Status", "Message"]
            : ["Time", "Status", "Message"];

          const table = createTable(headers);
          allEvents.forEach((evt) => {
            if (showMonitor) {
              table.push([
                String(evt.monitorID),
                formatDate(evt.time),
                statusLabel(evt.status),
                evt.msg ?? "—",
              ]);
            } else {
              table.push([
                formatDate(evt.time),
                statusLabel(evt.status),
                evt.msg ?? "—",
              ]);
            }
          });

          console.log(table.toString());
          console.log(
            `\n${allEvents.length} event(s) across ${numMonitors} monitor(s)`
          );
        } catch (err) {
          handleError(err, opts);
        }
      }
    );
}
