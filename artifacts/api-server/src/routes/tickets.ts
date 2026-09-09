import { Router, type IRouter } from "express";
import {
  CompareTicketsQueryParams,
  CompareTicketsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
const TICKETS_DEV_BASE_URL = "https://api.tickets.dev/v1";
const MARKETPLACE_PRIORITY = [
  "ticketmaster",
  "stubhub",
  "vividseats",
  "seatgeek",
];

type TicketsDevSource = {
  marketplace?: string;
  url?: string;
};

type TicketsDevEvent = {
  name?: string;
  eventDateLocal?: string;
  venue?: { name?: string; city?: string };
  sources?: TicketsDevSource[];
};

type TicketsDevEventsResponse = {
  events?: TicketsDevEvent[];
};

type TicketsDevListing = {
  listingId?: string;
  section?: string;
  row?: string;
  quantity?: number;
  ticketPrice?: number;
  fee?: number;
  totalPrice?: number;
  listingUrl?: string;
  url?: string;
};

type TicketsDevSnapshot = {
  source?: string;
  eventName?: string;
  eventDateLocal?: string;
  venueName?: string;
  venueCity?: string;
  sourceUrl?: string;
  currency?: string;
  listings?: TicketsDevListing[];
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeEventName(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function matchesSelectedEvent(
  event: TicketsDevEvent,
  selectedUrl: URL,
  selectedName: string,
  selectedDate?: string | null,
): boolean {
  const selectedNameNormalized = normalizeEventName(selectedName);
  const selectedDateValue = selectedDate?.slice(0, 10);
  const sourceMatches = event.sources?.some((source) => {
    if (!source.url) return false;
    try {
      const sourceUrl = new URL(source.url);
      return (
        sourceUrl.pathname === selectedUrl.pathname &&
        sourceUrl.hostname.includes("ticketmaster")
      );
    } catch {
      return false;
    }
  });
  if (sourceMatches) return true;

  const eventNameNormalized = normalizeEventName(event.name ?? "");
  const nameMatches =
    Boolean(eventNameNormalized) &&
    (eventNameNormalized === selectedNameNormalized ||
      eventNameNormalized.includes(selectedNameNormalized) ||
      selectedNameNormalized.includes(eventNameNormalized));
  const dateMatches =
    !selectedDateValue ||
    !event.eventDateLocal ||
    event.eventDateLocal.startsWith(selectedDateValue);

  return nameMatches && dateMatches;
}

async function readJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

router.get("/tickets/compare", async (req, res): Promise<void> => {
  const parsed = CompareTicketsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Select an event before comparing tickets." });
    return;
  }

  const { eventUrl, eventName, eventDate } = parsed.data;
  let selectedEventUrl: URL;
  try {
    selectedEventUrl = new URL(eventUrl);
  } catch {
    res.status(400).json({ error: "That event does not have a valid ticket URL." });
    return;
  }

  const isTicketmasterHost =
    selectedEventUrl.hostname.endsWith("ticketmaster.com") ||
    selectedEventUrl.hostname.endsWith("ticketmaster.ca");
  if (!isTicketmasterHost) {
    res.status(400).json({ error: "Only Ticketmaster events are supported in this MVP." });
    return;
  }

  const apiKey = process.env.TICKETS_DEV_API_KEY?.trim();
  if (!apiKey || !apiKey.startsWith("tk_test_")) {
    req.log.error("Tickets.dev sandbox key is missing or not a test key");
    res.status(503).json({ error: "Sandbox ticket comparison is not configured." });
    return;
  }

  const headers = { Accept: "application/json", "x-api-key": apiKey };

  try {
    const discoveryQuery = eventName.replace(/\s*\([^)]*\)/g, "").trim();
    const discoveryQueries = [selectedEventUrl.toString()];
    if (selectedEventUrl.hostname.endsWith("ticketmaster.ca")) {
      const usTicketmasterUrl = new URL(selectedEventUrl);
      usTicketmasterUrl.hostname = usTicketmasterUrl.hostname.replace(
        "ticketmaster.ca",
        "ticketmaster.com",
      );
      discoveryQueries.push(usTicketmasterUrl.toString());
    }
    discoveryQueries.push(discoveryQuery || eventName);
    let discovery: TicketsDevEventsResponse | null = null;

    for (const query of discoveryQueries) {
      const discoveryParams = new URLSearchParams({
        query,
        pageSize: "10",
      });
      const discoveryResponse = await fetch(
        `${TICKETS_DEV_BASE_URL}/events?${discoveryParams.toString()}`,
        { headers },
      );
      const candidate = await readJson<TicketsDevEventsResponse>(discoveryResponse);

      if (!discoveryResponse.ok) {
        req.log.warn(
          { statusCode: discoveryResponse.status, queryType: query === eventName ? "name" : "url" },
          "Tickets.dev event discovery failed",
        );
        continue;
      }

      discovery = candidate;
      if (candidate?.events?.some((event) => event.sources?.length)) break;
    }

    const matchedEvent = discovery?.events?.find((event) =>
      matchesSelectedEvent(event, selectedEventUrl, eventName, eventDate),
    );
    if (!matchedEvent) {
      res.status(404).json({
        error: "Tickets.dev has no matching cross-seller event for this selection.",
      });
      return;
    }

    const discoveredSources = (matchedEvent?.sources ?? [])
      .filter(
        (source): source is Required<TicketsDevSource> =>
          Boolean(source.marketplace && source.url),
      )
      .sort((a, b) => {
        const aIndex = MARKETPLACE_PRIORITY.indexOf(a.marketplace);
        const bIndex = MARKETPLACE_PRIORITY.indexOf(b.marketplace);
        return (aIndex < 0 ? 99 : aIndex) - (bIndex < 0 ? 99 : bIndex);
      });
    req.log.info(
      {
        marketplaces: discoveredSources.map((source) => source.marketplace),
        sourceCount: discoveredSources.length,
      },
      "Tickets.dev marketplace sources discovered",
    );

    const sources = discoveredSources.filter(
      (source, index, all) =>
        all.findIndex((candidate) => candidate.marketplace === source.marketplace) ===
        index,
    );
    if (sources.length < 2) {
      res.json(
        CompareTicketsResponse.parse({
          eventName: matchedEvent.name || eventName,
          eventDate:
            matchedEvent.eventDateLocal?.slice(0, 10) ||
            eventDate ||
            "Date to be announced",
          venue: matchedEvent.venue?.name || "Venue not listed",
          city: matchedEvent.venue?.city || "City not listed",
          currency: "USD",
          demoData: true,
          listings: [],
        }),
      );
      return;
    }

    const captures = await Promise.all(
      sources.slice(0, 4).map(async (source) => {
        const captureParams = new URLSearchParams({ url: source.url });
        const response = await fetch(
          `${TICKETS_DEV_BASE_URL}/capture/${encodeURIComponent(source.marketplace)}?${captureParams.toString()}`,
          { headers },
        );
        const snapshot = await readJson<TicketsDevSnapshot>(response);

        if (!response.ok || !snapshot) {
          req.log.warn(
            {
              marketplace: source.marketplace,
              statusCode: response.status,
            },
            "Tickets.dev marketplace capture failed",
          );
          return null;
        }

        return { source, snapshot };
      }),
    );

    const successfulCaptures = captures.filter(
      (capture): capture is NonNullable<typeof capture> => Boolean(capture),
    );
    if (!successfulCaptures.length) {
      res.status(502).json({
        error: "Tickets.dev could not load sandbox listings for this event.",
      });
      return;
    }

    const successfulMarketplaces = new Set(
      successfulCaptures.map(({ source }) => source.marketplace),
    );
    if (successfulMarketplaces.size < 2) {
      res.json(
        CompareTicketsResponse.parse({
          eventName: matchedEvent.name || eventName,
          eventDate:
            matchedEvent.eventDateLocal?.slice(0, 10) ||
            eventDate ||
            "Date to be announced",
          venue: matchedEvent.venue?.name || "Venue not listed",
          city: matchedEvent.venue?.city || "City not listed",
          currency: "USD",
          demoData: true,
          listings: [],
        }),
      );
      return;
    }

    const firstSnapshot = successfulCaptures[0].snapshot;
    const currency =
      successfulCaptures.find((capture) => capture.snapshot.currency)?.snapshot
        .currency ?? "USD";

    const listings = successfulCaptures.flatMap(({ source, snapshot }) =>
      (snapshot.listings ?? [])
        .filter((listing) => isFiniteNumber(listing.totalPrice))
        .map((listing, index) => ({
          id: `${source.marketplace}-${listing.listingId ?? index}-${listing.section ?? "unknown"}-${listing.row ?? "unknown"}`,
          marketplace: source.marketplace,
          section: listing.section || "Section not listed",
          row: listing.row || "Row not listed",
          quantity: isFiniteNumber(listing.quantity) ? listing.quantity : 0,
          ticketPrice: isFiniteNumber(listing.ticketPrice)
            ? listing.ticketPrice
            : 0,
          fees: isFiniteNumber(listing.fee) ? listing.fee : 0,
          totalPrice: listing.totalPrice ?? 0,
          currency: snapshot.currency || currency,
          url: listing.listingUrl || listing.url || snapshot.sourceUrl || source.url,
        })),
    );

    res.json(
      CompareTicketsResponse.parse({
        eventName: firstSnapshot.eventName || matchedEvent?.name || eventName,
        eventDate:
          firstSnapshot.eventDateLocal?.slice(0, 10) ||
          matchedEvent?.eventDateLocal?.slice(0, 10) ||
          eventDate ||
          "Date to be announced",
        venue: firstSnapshot.venueName || matchedEvent?.venue?.name || "Venue not listed",
        city: firstSnapshot.venueCity || matchedEvent?.venue?.city || "City not listed",
        currency,
        demoData: true,
        listings,
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Tickets.dev comparison request failed");
    res.status(502).json({
      error: "We couldn't load sandbox listings. Please try again.",
    });
  }
});

export default router;