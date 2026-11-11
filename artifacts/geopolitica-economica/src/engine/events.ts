import { CONFIG, clamp } from "./config";
import { EVENT_CATALOG } from "@/data/events";
import { mulberry32 } from "./rng";
import type { EventEffect, GameState } from "./types";

export interface EventAdvanceResult {
  activeEvents: EventEffect[];
  cooldowns: Record<string, number>;
  messages: string[];
}

export function advanceEvents(state: GameState): EventAdvanceResult {
  const cooldowns = Object.fromEntries(
    Object.entries(state.eventCooldowns).map(([id, months]) => [
      id,
      Math.max(0, months - 1),
    ]),
  );
  const activeEvents = state.activeEvents
    .map((event) => ({ ...event, monthsRemaining: event.monthsRemaining - 1 }))
    .filter((event) => event.monthsRemaining > 0);
  const messages: string[] = [];
  const random = mulberry32(
    (state.seed + state.turn + CONFIG.events.seedOffset) >>> 0,
  );

  while (
    activeEvents.length < CONFIG.events.maximumActive &&
    random() < CONFIG.events.drawChance
  ) {
    const eligible = EVENT_CATALOG.filter(
      (event) =>
        !activeEvents.some((active) => active.id === event.id) &&
        (cooldowns[event.id] ?? 0) === 0,
    );
    if (eligible.length === 0) break;

    const selected = eligible[Math.floor(random() * eligible.length)];
    if (!selected) break;

    activeEvents.push({
      id: selected.id,
      title: selected.title,
      description: selected.description,
      monthsRemaining: selected.duration,
      growth: selected.growth,
      inflation: selected.inflation,
      confidence: selected.confidence,
      exchangeRate: selected.exchangeRate,
    });
    cooldowns[selected.id] = CONFIG.events.cooldownMonths;
    messages.push(`Evento: ${selected.title}.`);
  }

  return { activeEvents, cooldowns, messages };
}

export function sumEventEffects(events: EventEffect[]): Omit<
  EventEffect,
  "id" | "title" | "description" | "monthsRemaining"
> {
  return events.reduce(
    (total, event) => ({
      growth: total.growth + event.growth,
      inflation: total.inflation + event.inflation,
      confidence: total.confidence + event.confidence,
      exchangeRate: total.exchangeRate + event.exchangeRate,
    }),
    { growth: 0, inflation: 0, confidence: 0, exchangeRate: 0 },
  );
}

export function applyEventConfidence(
  confidence: number,
  eventEffect: number,
): number {
  return clamp(
    confidence + eventEffect,
    CONFIG.clamp.confidenceMinimum,
    CONFIG.clamp.confidenceMaximum,
  );
}

